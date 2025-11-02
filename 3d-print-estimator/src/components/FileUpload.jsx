import { useState } from "react";
import axios from "axios";

export default function FileUpload({ onFile, setModelInfo }) {
  const [loading, setLoading] = useState(false);

  const uploadAndAnalyze = async (file) => {
    setLoading(true);
    const fd = new FormData();
    fd.append("file", file);

    try {
      // call backend just to compute model stats immediately (default params)
      //   const res = await axios.post("http://localhost:5000/api/estimate", fd);
      const res = await axios.post(
        "https://3-d-print-cost-estimator-zlt9.vercel.app/api/estimate",
        fd
      );
      setModelInfo(res.data);
      if (onFile) onFile(file);
    } catch (err) {
      console.error(err);
      alert("Upload/analysis failed. See backend logs.");
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
              ? "Analyzing..."
              : "Click to upload or drag file here (.stl)"}
          </div>
        </label>
      </div>
    </div>
  );
}
