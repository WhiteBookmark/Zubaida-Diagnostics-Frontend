/**
 * Centralized API Base URL configuration.
 * Safely strips leading/trailing whitespace and trailing slashes from environment variables.
 */
const rawBaseUrl = typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL
  ? String(import.meta.env.VITE_API_BASE_URL)
  : '';

export const API_BASE_URL = rawBaseUrl.trim().replace(/\/+$/, '');

/**
 * Builds a complete API URL ensuring safe slash handling.
 * @param {string} endpoint - API path (e.g., '/api/patients' or 'api/patients')
 * @returns {string} - Formatted URL
 */
export const buildApiUrl = (endpoint) => {
  if (!endpoint) return API_BASE_URL || '/';
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${API_BASE_URL}${cleanEndpoint}`;
};

export default buildApiUrl;
