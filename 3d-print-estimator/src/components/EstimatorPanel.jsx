import { useState, useEffect } from "react";

export default function EstimatorPanel({ modelInfo, previewUrl }) {
  const [activeStep, setActiveStep] = useState(1);
  const [material, setMaterial] = useState("PLA");
  const [infill, setInfill] = useState(20);
  const [layerHeight, setLayerHeight] = useState(0.2);
  const [estimate, setEstimate] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // whenever params or model change, update estimate
    if (!modelInfo) {
      setEstimate(null);
      return;
    }
    fetchEstimate();
    // eslint-disable-next-line
  }, [material, infill, layerHeight, modelInfo]);

  async function fetchEstimate() {
    if (!previewUrl || !modelInfo) return;
    setLoading(true);
    try {
      const fd = new FormData();
      // We must re-upload the same file to backend; since frontend only has previewUrl, we can't re-send it.
      // Simpler approach: frontend keeps last uploaded File in browser memory. For this demo we re-call backend with same default params by sending model data.
      // But our backend expects file; simplest is to call a dedicated endpoint with model stats. To keep demo simple, we call backend with no file and send modelInfo values.
      // We'll use backend endpoint /api/estimate-with-stats (not implemented). For simplicity here, we compute estimate locally using modelInfo.
      // Compute local estimate matching backend logic:

      const effectiveVolume = computeEffectiveVolume(
        modelInfo.volume_cm3,
        infill,
        modelInfo.supportsNeeded
      );
      const materialRate = { PLA: 5, ABS: 6.5, PETG: 7 }[material] || 5;
      const materialCost = effectiveVolume * materialRate;
      const total = +(materialCost + 30).toFixed(2);

      setEstimate({
        effectiveVolume: effectiveVolume.toFixed(2),
        materialCost: materialCost.toFixed(2),
        service: 30,
        total: total.toFixed(2),
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function computeEffectiveVolume(volume_cm3, infillPct, supportsNeeded) {
    const infillFraction =
      Math.min(Math.max(Number(infillPct || 20), 0), 100) / 100.0;
    const solidFactor = 0.8;
    let eff = volume_cm3 * (solidFactor * infillFraction + (1 - solidFactor));
    if (supportsNeeded) eff *= 1.2;
    return eff;
  }

  return (
    <div className="card">
      <h3 className="text-xl font-semibold mb-4">Configure & Price</h3>

      <div className="space-y-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Material</label>
          <select
            value={material}
            onChange={(e) => setMaterial(e.target.value)}
            className="w-full p-2 bg-gray-800 rounded"
          >
            <option>PLA</option>
            <option>ABS</option>
            <option>PETG</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-gray-400 mb-1">
              Infill (%)
            </label>
            <input
              type="number"
              min="0"
              max="100"
              value={infill}
              onChange={(e) => setInfill(e.target.value)}
              className="w-full p-2 bg-gray-800 rounded"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">
              Layer height (mm)
            </label>
            <input
              type="number"
              step="0.05"
              min="0.05"
              max="0.4"
              value={layerHeight}
              onChange={(e) => setLayerHeight(e.target.value)}
              className="w-full p-2 bg-gray-800 rounded"
            />
          </div>
        </div>

        <div className="pt-3 border-t border-gray-800">
          <button onClick={fetchEstimate} className="btn-primary w-full">
            Recalculate Price
          </button>
        </div>

        {loading && (
          <p className="text-sm text-gray-400 mt-2">Calculating...</p>
        )}

        {estimate && (
          <div className="mt-4 bg-gray-900 p-4 rounded">
            <div className="flex justify-between text-sm text-gray-300">
              <span>Material used</span>
              <span>{estimate.effectiveVolume} cm³</span>
            </div>
            <div className="flex justify-between text-sm text-gray-300 mt-1">
              <span>Material cost</span>
              <span>₹{estimate.materialCost}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-300 mt-1">
              <span>Service charge</span>
              <span>₹{estimate.service}</span>
            </div>
            <div className="flex justify-between text-lg font-semibold mt-3">
              <span>Total (incl. GST)</span>
              <span className="text-green-400">₹{estimate.total}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
