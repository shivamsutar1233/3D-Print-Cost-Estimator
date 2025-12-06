// API Configuration
// Update these endpoints as needed

export const API_BASE_URL = "https://3-d-print-cost-estimator-zlt9.vercel.app";
//   "http://localhost:5000";

export const API_ENDPOINTS = {
  // 3D Estimator APIs
  ESTIMATE: `${API_BASE_URL}/api/estimate`,
  SAVE_MODEL: `${API_BASE_URL}/api/save-model`,
  GET_MODEL: `${API_BASE_URL}/api/get-model`,

  // Order APIs
  GENERATE_LINK: `${API_BASE_URL}/api/generate-link`, // To be provided

  // Custom Order Details APIs
  SAVE_CUSTOM_ORDER: `${API_BASE_URL}/api/saveCustomOrderDetails`,
  GET_CUSTOM_ORDER: `${API_BASE_URL}/api/customOrderDetails`,
  UPDATE_CUSTOM_ORDER: `${API_BASE_URL}/api/updateCustomOrderDetails`,
};

export default API_ENDPOINTS;
