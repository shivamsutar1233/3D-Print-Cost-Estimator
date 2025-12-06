// Utility functions for managing model state in URL

/**
 * Generate a unique model ID
 */
export function generateModelId() {
  return `model_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Update URL with model ID without page reload
 */
export function updateUrlWithModelId(modelId) {
  const url = new URL(window.location);
  url.searchParams.set("modelId", modelId);
  window.history.pushState({ modelId }, "", url);
}

/**
 * Get model ID from URL search params
 */
export function getModelIdFromUrl() {
  const url = new URL(window.location);
  return url.searchParams.get("modelId");
}

/**
 * Check if user has a model ID in URL (means they're loading a saved model)
 */
export function hasModelIdInUrl() {
  return !!getModelIdFromUrl();
}

/**
 * Clear model ID from URL
 */
export function clearModelIdFromUrl() {
  const url = new URL(window.location);
  url.searchParams.delete("modelId");
  window.history.pushState({}, "", url);
}
