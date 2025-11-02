// backend/server.js
import express from "express";
import cors from "cors";
import multer from "multer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import * as THREE from "three";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://3-d-print-cost-estimator-zlt9.vercel.app",
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type"],
  })
);
app.use(express.json());
const upload = multer({ dest: path.join(__dirname, "uploads/") });

// Pricing & machine params (tweak as you like)
const MATERIAL_RATE_PER_CM3 = { PLA: 5, ABS: 6.5, PETG: 7.0 }; // currency units per cm³
const PRINT_SPEED_CM3_PER_HOUR = 15; // approximate print volume per hour
const SUPPORT_EXTRA_PERCENT = 0.2; // +20% material if supports required
const SERVICE_CHARGE = 30; // fixed charge

// Convert Node Buffer -> ArrayBuffer for STLLoader
function toArrayBuffer(buffer) {
  return buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength
  );
}

// Calculate model volume (mm^3) from geometry triangles using divergence theorem
function calculateVolumeMM3(geometry) {
  const pos = geometry.attributes.position;
  if (!pos) throw new Error("Geometry has no position attribute");

  let volume = 0;
  const p1 = new THREE.Vector3();
  const p2 = new THREE.Vector3();
  const p3 = new THREE.Vector3();

  for (let i = 0; i < pos.count; i += 3) {
    p1.fromBufferAttribute(pos, i);
    p2.fromBufferAttribute(pos, i + 1);
    p3.fromBufferAttribute(pos, i + 2);
    // triple product
    volume += p1.dot(p2.clone().cross(p3)) / 6.0;
  }
  return Math.abs(volume);
}

// Overhang/support detection: check face normals' angle to +Y (up). If many faces have normals with y < cos(45deg), mark supports
function detectSupports(geometry) {
  const normals = geometry.attributes.normal;
  if (!normals) return false;
  let overhangCount = 0;
  for (let i = 0; i < normals.count; i++) {
    const nx = normals.getX(i);
    const ny = normals.getY(i);
    const nz = normals.getZ(i);
    // angle from +Y: if normal points mostly downward (ny < cos(45deg))
    if (ny < Math.cos((45 * Math.PI) / 180)) overhangCount++;
  }
  const ratio = overhangCount / normals.count;
  return ratio > 0.1; // if >10% faces are overhangs -> supports likely
}

app.post("/api/estimate", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const { material = "PLA", infill = "20", layerHeight = "0.2" } = req.body;
    const filePath = req.file.path;
    const nodeBuf = fs.readFileSync(filePath);
    const arrayBuffer = toArrayBuffer(nodeBuf);

    // Parse STL
    const loader = new STLLoader();
    const geometry = loader.parse(arrayBuffer); // geometry holds positions (assume units = mm)
    if (!geometry || !geometry.attributes?.position)
      throw new Error("Cannot parse geometry");

    // volume in mm^3 -> convert to cm^3
    const volumeMM3 = calculateVolumeMM3(geometry);
    const volumeCM3 = volumeMM3 / 1000.0; // 1 cm^3 = 1000 mm^3

    // dimensions from bounding box (units mm -> convert to cm)
    geometry.computeBoundingBox();
    const bbox = geometry.boundingBox; // in same units as stl (usually mm)
    const sizeMM = new THREE.Vector3();
    bbox.getSize(sizeMM);
    const dimsCM = {
      x: +(sizeMM.x / 10).toFixed(2),
      y: +(sizeMM.y / 10).toFixed(2),
      z: +(sizeMM.z / 10).toFixed(2),
    };

    // support detection
    const supportsNeeded = detectSupports(geometry);

    // Effective material usage including infill and supports
    const infillPct =
      Math.min(Math.max(parseFloat(infill || 20), 0), 100) / 100.0;
    // approximate solid volume * infill percent + small shells -> approximate factor
    const solidFactor = 0.8; // assume shells, walls, top/bottom ~20% of total solid
    let effectiveVolumeCM3 =
      volumeCM3 * (solidFactor * infillPct + (1 - solidFactor));
    if (supportsNeeded) effectiveVolumeCM3 *= 1 + SUPPORT_EXTRA_PERCENT;

    // material cost
    const materialRate =
      MATERIAL_RATE_PER_CM3[material] ?? MATERIAL_RATE_PER_CM3.PLA;
    const materialCost = effectiveVolumeCM3 * materialRate;

    // estimated print time (hours) = effectiveVolume / speed
    const printTimeHours = effectiveVolumeCM3 / PRINT_SPEED_CM3_PER_HOUR;
    const printTimeSeconds = Math.round(printTimeHours * 3600);
    const hh = String(Math.floor(printTimeSeconds / 3600)).padStart(2, "0");
    const mm = String(Math.floor((printTimeSeconds % 3600) / 60)).padStart(
      2,
      "0"
    );
    const ss = String(printTimeSeconds % 60).padStart(2, "0");
    const printTimeStr = `${hh}:${mm}:${ss}`;

    // total cost
    const totalCost = +(materialCost + SERVICE_CHARGE).toFixed(2);

    // cleanup
    fs.unlinkSync(filePath);

    res.json({
      volume_cm3: +volumeCM3.toFixed(2),
      effective_volume_cm3: +effectiveVolumeCM3.toFixed(2),
      dims_cm: dimsCM,
      supportsNeeded,
      printTime: printTimeStr,
      materialCost: +materialCost.toFixed(2),
      serviceCharge: SERVICE_CHARGE,
      totalCost,
    });
  } catch (err) {
    console.error("Backend error:", err);
    return res
      .status(500)
      .json({ message: "Server error", error: err.message });
  }
});

app.get("/", (req, res) => {
  res.send("3D Print Cost Estimator Backend is running.");
});

const PORT = 5000;
app.listen(PORT, () =>
  console.log(`✅ Backend listening on http://localhost:${PORT}`)
);
