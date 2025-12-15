/**
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {
  GoogleGenAIOptions,
  LiveClientToolResponse,
  LiveServerMessage,
  Part,
} from "@google/genai";

/**
 * Options for direct API key mode
 */
export type ApiKeyClientOptions = GoogleGenAIOptions & { apiKey: string };

/**
 * Options for proxy mode (Vertex AI via backend)
 */
export type ProxyClientOptions = { proxyUrl: string };

/**
 * the options to initiate the client
 * - ApiKeyClientOptions: Direct connection with API key
 * - ProxyClientOptions: Connection via backend proxy (for Vertex AI)
 */
export type LiveClientOptions = ApiKeyClientOptions | ProxyClientOptions;

/**
 * Type guard to check if options are for proxy mode
 */
export function isProxyMode(options: LiveClientOptions): options is ProxyClientOptions {
  return 'proxyUrl' in options;
}

/** log types */
export type StreamingLog = {
  date: Date;
  type: string;
  count?: number;
  message:
    | string
    | ClientContentLog
    | Omit<LiveServerMessage, "text" | "data">
    | LiveClientToolResponse;
};

export type ClientContentLog = {
  turns: Part[];
  turnComplete: boolean;
};
