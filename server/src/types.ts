/**
 * Type definitions for Gemini Live API Proxy Server
 */

import type { LiveConnectConfig, Part } from '@google/genai';

/**
 * Gemini configuration from environment variables
 */
export interface GeminiConfig {
  projectId: string;
  location: string;
  modelId: string;
  keyFilePath: string;
}

/**
 * Server configuration
 */
export interface ServerConfig {
  port: number;
  host: string;
}

/**
 * Client → Proxy message types
 */
export type ClientMessageType =
  | 'setup'
  | 'realtimeInput'
  | 'clientContent'
  | 'toolResponse';

/**
 * Setup message - sent first to configure the session
 */
export interface SetupMessage {
  type: 'setup';
  model: string;
  config: LiveConnectConfig;
}

/**
 * Realtime input message - audio/video chunks
 */
export interface RealtimeInputMessage {
  type: 'realtimeInput';
  chunks: Array<{ mimeType: string; data: string }>;
}

/**
 * Client content message - text/parts
 */
export interface ClientContentMessage {
  type: 'clientContent';
  turns: Part | Part[];
  turnComplete: boolean;
}

/**
 * Tool response message
 */
export interface ToolResponseMessage {
  type: 'toolResponse';
  functionResponses: Array<{
    id: string;
    name: string;
    response: Record<string, unknown>;
  }>;
}

/**
 * Union of all client messages
 */
export type ClientMessage =
  | SetupMessage
  | RealtimeInputMessage
  | ClientContentMessage
  | ToolResponseMessage;

/**
 * Proxy → Client message types
 */
export type ProxyMessageType =
  | 'open'
  | 'setupComplete'
  | 'audio'
  | 'content'
  | 'toolCall'
  | 'toolCallCancellation'
  | 'turnComplete'
  | 'interrupted'
  | 'error'
  | 'close';

/**
 * Base proxy message
 */
export interface ProxyMessage {
  type: ProxyMessageType;
  data?: unknown;
  error?: string;
  reason?: string;
}
