/**
 * Environment configuration validation
 */

import type { GeminiConfig, ServerConfig } from './types.js';

/**
 * Get required environment variable or throw error
 */
function getEnvOrThrow(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

/**
 * Get optional environment variable with default
 */
function getEnvOrDefault(key: string, defaultValue: string): string {
  return process.env[key] || defaultValue;
}

/**
 * Load and validate Gemini configuration from environment
 */
export function loadGeminiConfig(): GeminiConfig {
  return {
    projectId: getEnvOrThrow('GOOGLE_PROJECT_ID'),
    location: getEnvOrDefault('GOOGLE_LOCATION', 'us-central1'),
    //GEMINI_MODEL_ID=gemini-live-2.5-flash-preview-native-audio-09-2025
    // modelId: getEnvOrDefault('GEMINI_MODEL_ID', 'gemini-2.0-flash-live-001'),
    modelId: getEnvOrDefault('GEMINI_MODEL_ID', 'gemini-live-2.5-flash-preview-native-audio-09-2025'),
    keyFilePath: getEnvOrThrow('GOOGLE_KEY_FILE'),
  };
}

/**
 * Load server configuration from environment
 */
export function loadServerConfig(): ServerConfig {
  return {
    port: parseInt(getEnvOrDefault('PROXY_PORT', '8080'), 10),
    host: getEnvOrDefault('PROXY_HOST', '0.0.0.0'),
  };
}

/**
 * Validate that the key file exists
 */
export async function validateKeyFile(keyFilePath: string): Promise<void> {
  const fs = await import('fs/promises');
  try {
    await fs.access(keyFilePath);
  } catch {
    throw new Error(`Service account key file not found: ${keyFilePath}`);
  }
}
