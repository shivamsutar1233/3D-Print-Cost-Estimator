import { useState } from "react";
import FileUpload from "./components/FileUpload";
import Preview3D from "./components/Preview3D";
import EstimatorPanel from "./components/EstimatorPanel";

export default function App() {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [modelInfo, setModelInfo] = useState(null);

  return (
    <div className="max-w-6xl mx-auto p-8">
      <header className="mb-6">
        <h1 className="text-4xl font-bold text-center bg-clip-text text-transparent bg-gradient-to-r from-violet-500 to-pink-400">
          3D Print Cost Estimator
        </h1>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left: preview + upload + stats */}
        <div className="space-y-6">
          <div className="card">
            <FileUpload
              onFile={(f) => {
                setFile(f);
                setPreviewUrl(URL.createObjectURL(f));
              }}
              setModelInfo={setModelInfo}
            />
          </div>

          <div className="card">
            <Preview3D previewUrl={previewUrl} />
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold mb-3">Model Stats</h3>
            {modelInfo ? (
              <div className="grid grid-cols-1 gap-2 text-sm text-gray-300">
                <div className="flex justify-between">
                  <span>Material Volume</span>
                  <span className="font-semibold">
                    {modelInfo.volume_cm3} cm³
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Dimensions (W × D × H)</span>
                  <span className="font-semibold">
                    {modelInfo.dims_cm.x} × {modelInfo.dims_cm.y} ×{" "}
                    {modelInfo.dims_cm.z} cm
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Estimated Print Time</span>
                  <span className="font-semibold">{modelInfo.printTime}</span>
                </div>
                <div className="flex justify-between">
                  <span>Supports Needed</span>
                  <span className="font-semibold">
                    {modelInfo.supportsNeeded ? "Yes" : "No"}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted">Upload an STL to get stats</p>
            )}
          </div>
        </div>

        {/* Right: Estimator */}
        <div>
          <EstimatorPanel modelInfo={modelInfo} previewUrl={previewUrl} />
        </div>
      </div>
    </div>
  );
}
