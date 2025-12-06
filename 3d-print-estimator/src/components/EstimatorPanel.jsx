import { useState, useEffect } from "react";
import axios from "axios";
import { API_ENDPOINTS } from "../config/api";

export default function EstimatorPanel({
  modelInfo,
  previewUrl,
  customOrderDetails,
}) {
  const [activeStep, setActiveStep] = useState(1);
  const [material, setMaterial] = useState("PLA");
  const [infill, setInfill] = useState(20);
  const [layerHeight, setLayerHeight] = useState(0.2);
  const [estimate, setEstimate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [orderLoading, setOrderLoading] = useState(false);

  // Pre-populate with custom order details when they become available
  useEffect(() => {
    if (customOrderDetails) {
      setMaterial(customOrderDetails.material || "PLA");
      setInfill(customOrderDetails.infill || 20);
      setLayerHeight(customOrderDetails.layerHeight || 0.2);
      console.log("Populated form with custom order details");
    }
  }, [customOrderDetails]);

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

  async function proceedWithOrder() {
    if (!estimate || !modelInfo) return;

    setOrderLoading(true);
    try {
      // Get modelId from URL
      const urlParams = new URLSearchParams(window.location.search);
      const modelId = urlParams.get("modelId") || "guest_" + Date.now();

      // Prepare order data for saving custom order details
      const customOrderData = {
        modelId,
        material,
        infill: String(infill),
        layerHeight: String(layerHeight),
        modelUrl: previewUrl,
        volume_cm3: String(modelInfo.volume_cm3),
        dims_cm: modelInfo.dims_cm,
        supportsNeeded: String(modelInfo.supportsNeeded),
        printTime: modelInfo.printTime,
        materialCost: String(estimate.materialCost),
        serviceCharge: String(estimate.service),
        totalCost: String(estimate.total),
        referrer: window.location.href,
      };

      // Check if custom order details already exist
      let isUpdate = false;
      if (customOrderDetails) {
        isUpdate = true;
      }

      // Save or update custom order details to Google Sheets
      if (isUpdate) {
        // Update existing order details
        await axios.put(
          `${API_ENDPOINTS.UPDATE_CUSTOM_ORDER}/${modelId}`,
          customOrderData
        );
        console.log("Custom order details updated successfully");
      } else {
        // Create new order details
        await axios.post(API_ENDPOINTS.SAVE_CUSTOM_ORDER, customOrderData);
        console.log("Custom order details saved successfully");
      }

      // Prepare order data for generate link API
      const orderData = {
        ...customOrderData,
        effective_volume_cm3: estimate.effectiveVolume,
      };

      // Call generate link API (to be provided)
      const response = await axios.post(API_ENDPOINTS.GENERATE_LINK, {
        products: [
          {
            quantity: 1,
            productId: modelId,
          },
        ],
        isCustomOrder: true,
      });

      // Redirect to generated link with referrer
      if (response.data.linkId) {
        const linkWithReferrer = `https://forms.div-arch.com/checkout/${
          response.data.linkId
        }?referrer=${encodeURIComponent(window.location.href)}`;
        window.location.href = linkWithReferrer;
      }
    } catch (err) {
      console.error("Error proceeding with order:", err);
      alert("Failed to process order. Please try again.");
    } finally {
      setOrderLoading(false);
    }
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

            {/* Proceed with Order Button */}
            <button
              onClick={proceedWithOrder}
              disabled={orderLoading}
              className="btn-primary w-full mt-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {orderLoading ? "Processing..." : "Proceed with Order"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
