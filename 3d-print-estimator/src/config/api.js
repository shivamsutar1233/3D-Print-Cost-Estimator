// API Configuration
// Update these endpoints as needed

export const API_BASE_URL = "https://3-d-print-cost-estimator-zlt9.vercel.app";
// export const API_BASE_URL = "http://localhost:5000";
export const FORMS_API_BASE_URL = "https://forms-api.div-arch.com";

export const API_ENDPOINTS = {
  // 3D Estimator APIs
  ESTIMATE: `${API_BASE_URL}/api/estimate`,
  SAVE_MODEL: `${API_BASE_URL}/api/save-model`,
  GET_MODEL: `${API_BASE_URL}/api/get-model`,

  // Order APIs
  GENERATE_LINK: `${FORMS_API_BASE_URL}/api/generate-link`, // To be provided

  // Custom Order Details APIs
  SAVE_CUSTOM_ORDER: `${API_BASE_URL}/api/saveCustomOrderDetails`,
  GET_CUSTOM_ORDER: `${API_BASE_URL}/api/customOrderDetails`,
  UPDATE_CUSTOM_ORDER: `${API_BASE_URL}/api/updateCustomOrderDetails`,
  GET_MATERIALS: `${API_BASE_URL}/api/getMaterials`,
};

export default API_ENDPOINTS;
