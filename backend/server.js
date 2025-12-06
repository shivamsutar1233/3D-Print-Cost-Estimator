// backend/server.js
import express from "express";
import cors from "cors";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import * as THREE from "three";
import { google } from "googleapis";
import { config } from "dotenv";

// Load environment variables from .env.local or .env
config();

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);
// config({ path: "./.env.local" });

const app = express();
// a.use(
//   cors({
//     origin: [
//       "http://localhost:5173",
//       "https://3-d-print-cost-estimator-zlt9.vercel.app",
//       "*.alphasquare.in",
//     ],
//     methods: ["GET", "POST", "PUT", "DELETE"],
//     allowedHeaders: ["Content-Type"],
//   })
// );
app.use(cors());
app.use(express.json());

// Google Sheets Configuration
const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID;
const GOOGLE_ORDER_SHEET_ID = process.env.GOOGLE_ORDER_SHEET_ID;
// const GOOGLE_SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
// const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY?.replace(
//   /\\n/g,
//   "\n"
// );
const SHEET_NAME = "Models"; // Name of the sheet to store models

// Initialize Google Sheets API
const auth = new google.auth.GoogleAuth({
  credentials: {
    type: "service_account",
    project_id: "whatsapp-checkout",
    private_key: process.env.GOOGLE_SHEETS_PRIVATE_KEY.replace(/\\n/g, "\n"),
    client_email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
    universe_domain: "googleapis.com",
  },
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const sheets = google.sheets({ version: "v4", auth });
// const upload = multer({ dest: path.join(__dirname, "uploads/") });

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

app.post("/api/estimate", async (req, res) => {
  try {
    if (!req.body.url)
      return res.status(400).json({ message: "No file uploaded" });

    const { material = "PLA", infill = "20", layerHeight = "0.2" } = req.body;
    // const filePath = req.file.path;
    const file = await fetch(req.body.url);
    // const nodeBuf = fs.readFileSync(fileURLToPath(new URL(req.body.url)));
    // const arrayBuffer = toArrayBuffer(nodeBuf);
    const arrayBuffer = await file.arrayBuffer();

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
    // fs.unlinkSync(filePath);

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

// Save model to Google Sheets
app.post("/api/save-model", async (req, res) => {
  try {
    const { modelId, modelUrl } = req.body;

    if (!modelId || !modelUrl) {
      return res
        .status(400)
        .json({ message: "modelId and modelUrl are required" });
    }

    if (!GOOGLE_SHEET_ID) {
      return res.status(500).json({ message: "Google Sheets not configured" });
    }

    // Append row to sheet
    const response = await sheets.spreadsheets.values.append({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `${SHEET_NAME}!A:B`,
      valueInputOption: "USER_ENTERED",
      resource: {
        values: [[modelId, modelUrl, new Date().toISOString()]],
      },
    });

    res.json({
      success: true,
      message: "Model saved to sheet",
      updatedRows: response.data.updates.updatedRows,
    });
  } catch (err) {
    console.error("Error saving model to sheet:", err);
    res.status(500).json({ message: "Error saving model", error: err.message });
  }
});

// Fetch model URL from Google Sheets by modelId
app.get("/api/get-model/:modelId", async (req, res) => {
  try {
    const { modelId } = req.params;

    if (!GOOGLE_SHEET_ID) {
      return res.status(500).json({ message: "Google Sheets not configured" });
    }

    // Read all rows from sheet
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `${SHEET_NAME}!A:B`,
    });

    const rows = response.data.values || [];
    // Skip header row (index 0) and find matching modelId
    const modelRow = rows.find((row) => row[0] === modelId);

    if (!modelRow) {
      return res.status(404).json({ message: "Model not found" });
    }

    res.json({
      modelId: modelRow[0],
      modelUrl: modelRow[1],
    });
  } catch (err) {
    console.error("Error fetching model from sheet:", err);
    res
      .status(500)
      .json({ message: "Error fetching model", error: err.message });
  }
});

// ===== CUSTOM ORDER DETAILS ENDPOINTS =====

// Helper function: Ensure CustomOrderDetails sheet and headers exist
async function ensureCustomOrderDetailsSheet() {
  try {
    const CUSTOM_SHEET_NAME = "Custom-Orders";
    const headers = [
      "Order ID",
      "Model ID",
      "Material",
      "Infill",
      "Layer Height",
      "Model URL",
      "Volume (cm³)",
      "Dimensions (cm)",
      "Supports Needed",
      "Print Time",
      "Material Cost",
      "Service Charge",
      "Total Cost",
      "Referrer",
      "Customization Options",
      "Custom Notes",
      "Special Requirements",
      "Timestamp",
    ];

    // Get all sheets
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: GOOGLE_ORDER_SHEET_ID,
    });

    const existingSheet = spreadsheet.data.sheets.find(
      (sheet) => sheet.properties.title === CUSTOM_SHEET_NAME
    );

    if (!existingSheet) {
      // Create sheet if it doesn't exist
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: GOOGLE_ORDER_SHEET_ID,
        resource: {
          requests: [
            {
              addSheet: {
                properties: {
                  title: CUSTOM_SHEET_NAME,
                },
              },
            },
          ],
        },
      });

      // Add headers
      await sheets.spreadsheets.values.update({
        spreadsheetId: GOOGLE_ORDER_SHEET_ID,
        range: `${CUSTOM_SHEET_NAME}!A1:R1`,
        valueInputOption: "USER_ENTERED",
        resource: {
          values: [headers],
        },
      });
    } else {
      // Check if headers exist
      const existingHeaders = await sheets.spreadsheets.values.get({
        spreadsheetId: GOOGLE_ORDER_SHEET_ID,
        range: `${CUSTOM_SHEET_NAME}!A1:R1`,
      });

      if (
        !existingHeaders.data.values ||
        existingHeaders.data.values[0].length === 0
      ) {
        // Add headers if missing
        await sheets.spreadsheets.values.update({
          spreadsheetId: GOOGLE_ORDER_SHEET_ID,
          range: `${CUSTOM_SHEET_NAME}!A1:R1`,
          valueInputOption: "USER_ENTERED",
          resource: {
            values: [headers],
          },
        });
      }
    }
  } catch (err) {
    console.error("Error ensuring CustomOrderDetails sheet:", err);
    throw err;
  }
}

// POST /api/saveCustomOrderDetails - Save order details
app.post("/api/saveCustomOrderDetails", async (req, res) => {
  try {
    const {
      orderId,
      modelId,
      material,
      infill,
      layerHeight,
      modelUrl,
      volume_cm3,
      dims_cm,
      supportsNeeded,
      printTime,
      materialCost,
      serviceCharge,
      totalCost,
      referrer,
      customizationOptions,
      customNotes,
      specialRequirements,
      timestamp,
    } = req.body;

    // Validate required field
    if (!modelId) {
      return res.status(400).json({
        success: false,
        message: "modelId is required",
      });
    }

    if (!GOOGLE_ORDER_SHEET_ID) {
      return res.status(500).json({
        success: false,
        message: "Google Sheets not configured",
      });
    }

    // Ensure sheet exists
    await ensureCustomOrderDetailsSheet();

    const CUSTOM_SHEET_NAME = "Custom-Orders";
    const finalTimestamp = timestamp || new Date().toISOString();

    // Append row to sheet
    await sheets.spreadsheets.values.append({
      spreadsheetId: GOOGLE_ORDER_SHEET_ID,
      range: `${CUSTOM_SHEET_NAME}!A:R`,
      valueInputOption: "USER_ENTERED",
      resource: {
        values: [
          [
            orderId || "",
            modelId,
            material || "",
            infill || "",
            layerHeight || "",
            modelUrl || "",
            volume_cm3 || "",
            JSON.stringify(dims_cm || {}),
            supportsNeeded || "",
            printTime || "",
            materialCost || "",
            serviceCharge || "",
            totalCost || "",
            referrer || "",
            JSON.stringify(customizationOptions || {}),
            customNotes || "",
            specialRequirements || "",
            finalTimestamp,
          ],
        ],
      },
    });

    res.json({
      success: true,
      message: "Custom order details saved successfully",
      modelId,
    });
  } catch (err) {
    console.error("Error saving custom order details:", err);
    res.status(500).json({
      success: false,
      message: "Error saving custom order details",
      error: err.message,
    });
  }
});

// GET /api/customOrderDetails/:modelId - Retrieve order details
app.get("/api/customOrderDetails/:modelId", async (req, res) => {
  try {
    const { modelId } = req.params;

    if (!GOOGLE_ORDER_SHEET_ID) {
      return res.status(500).json({
        success: false,
        message: "Google Sheets not configured",
      });
    }

    const CUSTOM_SHEET_NAME = "Custom-Orders";

    // Get all rows
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: GOOGLE_ORDER_SHEET_ID,
      range: `${CUSTOM_SHEET_NAME}!A:R`,
    });

    const rows = response.data.values || [];

    // Skip header row and find matching modelId
    const headers = [
      "orderId",
      "modelId",
      "material",
      "infill",
      "layerHeight",
      "modelUrl",
      "volume_cm3",
      "dims_cm",
      "supportsNeeded",
      "printTime",
      "materialCost",
      "serviceCharge",
      "totalCost",
      "referrer",
      "customizationOptions",
      "customNotes",
      "specialRequirements",
      "timestamp",
    ];

    const dataRow = rows.slice(1).find((row) => row[1] === modelId);

    if (!dataRow) {
      return res.status(404).json({
        success: false,
        message: "Custom order details not found",
      });
    }

    // Parse JSON fields
    const data = {};
    headers.forEach((header, index) => {
      const value = dataRow[index];
      if (header === "dims_cm" || header === "customizationOptions") {
        try {
          data[header] = value ? JSON.parse(value) : {};
        } catch {
          data[header] = value || {};
        }
      } else {
        data[header] = value || "";
      }
    });

    res.json({
      success: true,
      data,
    });
  } catch (err) {
    console.error("Error retrieving custom order details:", err);
    res.status(500).json({
      success: false,
      message: "Error retrieving custom order details",
      error: err.message,
    });
  }
});

// PUT /api/updateCustomOrderDetails/:modelId - Update order details
app.put("/api/updateCustomOrderDetails/:modelId", async (req, res) => {
  try {
    const { modelId } = req.params;
    const updateData = req.body;

    if (!GOOGLE_ORDER_SHEET_ID) {
      return res.status(500).json({
        success: false,
        message: "Google Sheets not configured",
      });
    }

    const CUSTOM_SHEET_NAME = "Custom-Orders";

    // Get all rows
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: GOOGLE_ORDER_SHEET_ID,
      range: `${CUSTOM_SHEET_NAME}!A:R`,
    });

    const rows = response.data.values || [];
    const rowIndex = rows.findIndex((row) => row[1] === modelId);

    if (rowIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Custom order details not found",
      });
    }

    // Get existing row and merge updates
    const existingRow = rows[rowIndex];
    const headers = [
      "orderId",
      "modelId",
      "material",
      "infill",
      "layerHeight",
      "modelUrl",
      "volume_cm3",
      "dims_cm",
      "supportsNeeded",
      "printTime",
      "materialCost",
      "serviceCharge",
      "totalCost",
      "referrer",
      "customizationOptions",
      "customNotes",
      "specialRequirements",
      "timestamp",
    ];

    const updatedRow = [...existingRow];

    // Apply updates
    headers.forEach((header, index) => {
      if (updateData[header] !== undefined) {
        if (header === "dims_cm" || header === "customizationOptions") {
          updatedRow[index] = JSON.stringify(updateData[header]);
        } else {
          updatedRow[index] = updateData[header];
        }
      }
    });

    // Update timestamp
    updatedRow[16] = new Date().toISOString();

    // Update row in sheet
    await sheets.spreadsheets.values.update({
      spreadsheetId: GOOGLE_ORDER_SHEET_ID,
      range: `${CUSTOM_SHEET_NAME}!A${rowIndex + 1}:R${rowIndex + 1}`,
      valueInputOption: "USER_ENTERED",
      resource: {
        values: [updatedRow],
      },
    });

    res.json({
      success: true,
      message: "Custom order details updated successfully",
      modelId,
    });
  } catch (err) {
    console.error("Error updating custom order details:", err);
    res.status(500).json({
      success: false,
      message: "Error updating custom order details",
      error: err.message,
    });
  }
});

app.get("/", (req, res) => {
  res.send("3D Print Cost Estimator Backend is running.");
});

const PORT = 5000;
app.listen(PORT, () =>
  console.log(`✅ Backend listening on http://localhost:${PORT}`)
);
