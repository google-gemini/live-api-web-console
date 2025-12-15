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

/**
 * Proxy Client for Gemini Live API
 *
 * This client connects to a backend WebSocket proxy server instead of
 * directly to the Gemini Live API. It maintains the same event interface
 * as GenAILiveClient for compatibility.
 */

import {
  Content,
  LiveClientToolResponse,
  LiveConnectConfig,
  LiveServerContent,
  LiveServerToolCall,
  LiveServerToolCallCancellation,
  Part,
} from "@google/genai";

import { EventEmitter } from "eventemitter3";
import { StreamingLog } from "../types";
import { base64ToArrayBuffer } from "./utils";
import type { LiveClientEventTypes } from "./genai-live-client";

/**
 * Options for the proxy client
 */
export interface ProxyClientOptions {
  proxyUrl: string;
}

/**
 * A proxy client that connects to a backend WebSocket server
 * which handles the actual Gemini Live API connection.
 */
export class GenAIProxyClient extends EventEmitter<LiveClientEventTypes> {
  private proxyUrl: string;
  private ws: WebSocket | null = null;

  private _status: "connected" | "disconnected" | "connecting" = "disconnected";
  public get status() {
    return this._status;
  }

  private _model: string | null = null;
  public get model() {
    return this._model;
  }

  protected config: LiveConnectConfig | null = null;

  public getConfig() {
    return { ...this.config };
  }

  constructor(options: ProxyClientOptions) {
    super();
    this.proxyUrl = options.proxyUrl;
    this.send = this.send.bind(this);
  }

  protected log(type: string, message: StreamingLog["message"]) {
    const log: StreamingLog = {
      date: new Date(),
      type,
      message,
    };
    this.emit("log", log);
  }

  async connect(model: string, config: LiveConnectConfig): Promise<boolean> {
    if (this._status === "connected" || this._status === "connecting") {
      return false;
    }

    this._status = "connecting";
    this.config = config;
    this._model = model;

    try {
      this.ws = new WebSocket(this.proxyUrl);

      this.ws.onopen = () => {
        this.log("client.open", "Connected to proxy");

        // Send setup message with model and config
        this.ws?.send(
          JSON.stringify({
            type: "setup",
            model,
            config,
          })
        );
      };

      this.ws.onmessage = (event: MessageEvent) => {
        this.handleProxyMessage(event);
      };

      this.ws.onerror = (event: Event) => {
        this.log("proxy.error", "WebSocket error");
        const errorEvent = new ErrorEvent("error", {
          message: "WebSocket connection error",
        });
        this.emit("error", errorEvent);
      };

      this.ws.onclose = (event: CloseEvent) => {
        this.log(
          "proxy.close",
          `disconnected ${event.reason ? `with reason: ${event.reason}` : ""}`
        );
        this._status = "disconnected";
        this.emit("close", event);
      };

      // Wait for connection to establish
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Connection timeout"));
        }, 10000);

        const onOpen = () => {
          clearTimeout(timeout);
          this.ws?.removeEventListener("open", onOpen);
          resolve();
        };

        const onError = () => {
          clearTimeout(timeout);
          this.ws?.removeEventListener("error", onError);
          reject(new Error("Connection failed"));
        };

        this.ws?.addEventListener("open", onOpen);
        this.ws?.addEventListener("error", onError);
      });

      this._status = "connected";
      return true;
    } catch (e) {
      console.error("Error connecting to proxy:", e);
      this._status = "disconnected";
      return false;
    }
  }

  public disconnect() {
    if (!this.ws) {
      return false;
    }
    this.ws.close();
    this.ws = null;
    this._status = "disconnected";

    this.log("client.close", "Disconnected");
    return true;
  }

  private handleProxyMessage(event: MessageEvent) {
    try {
      const message = JSON.parse(event.data);
      const { type, data, error, reason } = message;

      switch (type) {
        case "open":
          this.log("server.open", "Gemini session opened");
          this.emit("open");
          break;

        case "setupComplete":
          this.log("server.send", "setupComplete");
          this.emit("setupcomplete");
          break;

        case "audio":
          // data is base64 string
          if (data) {
            const arrayBuffer = base64ToArrayBuffer(data);
            this.emit("audio", arrayBuffer);
            this.log("server.audio", `buffer (${arrayBuffer.byteLength})`);
          }
          break;

        case "content":
          // data is LiveServerContent
          if (data) {
            this.emit("content", data as LiveServerContent);
            this.log("server.content", data);
          }
          break;

        case "toolCall":
          this.log("server.toolCall", data);
          this.emit("toolcall", data as LiveServerToolCall);
          break;

        case "toolCallCancellation":
          this.log("server.toolCallCancellation", data);
          this.emit(
            "toolcallcancellation",
            data as LiveServerToolCallCancellation
          );
          break;

        case "turnComplete":
          this.log("server.content", "turnComplete");
          this.emit("turncomplete");
          break;

        case "interrupted":
          this.log("server.content", "interrupted");
          this.emit("interrupted");
          break;

        case "error":
          this.log("server.error", error || "Unknown error");
          this.emit(
            "error",
            new ErrorEvent("error", { message: error || "Unknown error" })
          );
          break;

        case "close":
          this.log("server.close", reason || "Connection closed");
          break;

        default:
          console.log("Unknown message type from proxy:", type);
      }
    } catch (e) {
      console.error("Error parsing proxy message:", e);
    }
  }

  /**
   * send realtimeInput, this is base64 chunks of "audio/pcm" and/or "image/jpg"
   */
  sendRealtimeInput(chunks: Array<{ mimeType: string; data: string }>) {
    if (!this.ws || this._status !== "connected") {
      return;
    }

    this.ws.send(
      JSON.stringify({
        type: "realtimeInput",
        chunks,
      })
    );

    let hasAudio = false;
    let hasVideo = false;
    for (const ch of chunks) {
      if (ch.mimeType.includes("audio")) {
        hasAudio = true;
      }
      if (ch.mimeType.includes("image")) {
        hasVideo = true;
      }
      if (hasAudio && hasVideo) {
        break;
      }
    }
    const message =
      hasAudio && hasVideo
        ? "audio + video"
        : hasAudio
        ? "audio"
        : hasVideo
        ? "video"
        : "unknown";
    this.log("client.realtimeInput", message);
  }

  /**
   * send a response to a function call and provide the id of the functions you are responding to
   */
  sendToolResponse(toolResponse: LiveClientToolResponse) {
    if (!this.ws || this._status !== "connected") {
      return;
    }

    if (
      toolResponse.functionResponses &&
      toolResponse.functionResponses.length
    ) {
      this.ws.send(
        JSON.stringify({
          type: "toolResponse",
          functionResponses: toolResponse.functionResponses,
        })
      );
      this.log("client.toolResponse", toolResponse);
    }
  }

  /**
   * send normal content parts such as { text }
   */
  send(parts: Part | Part[], turnComplete: boolean = true) {
    if (!this.ws || this._status !== "connected") {
      return;
    }

    this.ws.send(
      JSON.stringify({
        type: "clientContent",
        turns: parts,
        turnComplete,
      })
    );
    this.log("client.send", {
      turns: Array.isArray(parts) ? parts : [parts],
      turnComplete,
    });
  }
}
