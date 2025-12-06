import { useState } from "react";
import { put } from "@vercel/blob";
// import { randomUUID } from "crypto";
import { v4 as uuid } from "uuid";
import axios from "axios";
import { generateModelId, updateUrlWithModelId } from "../utils/urlState";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "50mb",
    },
  },
};

async function uploadToBlob(file) {
  try {
    const blob = await put(
      `3-d-print-cost-estimator-blob/${uuid()}-${file.name}`,
      file,
      {
        access: "public",
        contentType: file.type,
        token: import.meta.env.VITE_BLOB_READ_WRITE_TOKEN,
      }
    );
    return blob;
  } catch (err) {
    console.error("Blob upload error:", err);
    throw new Error("Upload failed");
  }
}

async function saveModelToSheet(modelId, modelUrl) {
  try {
    const response = await axios.post(
      "https://3-d-print-cost-estimator-zlt9.vercel.app/api/save-model",
      // "http://localhost:5000/api/save-model",
      {
        modelId,
        modelUrl,
      }
    );
    return response.data;
  } catch (err) {
    console.error("Error saving model to sheet:", err);
    throw new Error("Failed to save model to sheet");
  }
}

export default function FileUpload({ onFile, setModelInfo }) {
  const [loading, setLoading] = useState(false);

  const uploadAndAnalyze = async (file) => {
    setLoading(true);
    // const fd = new FormData();
    // fd.append("file", file);

    try {
      // Step 1: Upload to Vercel Blob
      const blob = await uploadToBlob(file);

      // Step 2: Generate unique model ID
      const modelId = generateModelId();

      // Step 3: Save to Google Sheets
      await saveModelToSheet(modelId, blob.url);

      // Step 4: Update URL with model ID
      updateUrlWithModelId(modelId);

      // Step 5: Get model estimates
      const res = await axios.post(
        "https://3-d-print-cost-estimator-zlt9.vercel.app/api/estimate",
        // "http://localhost:5000/api/estimate",
        {
          url: blob.url,
        }
      );

      setModelInfo(res.data);
      if (onFile) onFile(blob);
    } catch (err) {
      console.error(err);
      alert("Upload/analysis failed. See console for details.");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    uploadAndAnalyze(f);
  };

  return (
    <div>
      <label className="block mb-2 text-sm text-gray-300">Upload Model</label>
      <div className="flex items-center gap-4">
        <label className="flex-1">
          <input
            type="file"
            accept=".stl"
            onChange={handleChange}
            className="hidden"
          />
          <div className="w-full py-4 px-6 rounded-lg border border-gray-700 text-center cursor-pointer hover:border-accent transition">
            {loading
              ? "Analyzing & Saving..."
              : "Click to upload or drag file here (.stl)"}
          </div>
        </label>
      </div>
    </div>
  );
}
