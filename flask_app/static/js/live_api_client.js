// --- live_api_client.js ---

class LiveAPIClientJS {
  constructor(options = {}) {
    this.websocketUrl = options.websocketUrl || 'ws://localhost:8080/api/live'; // Default, will be overridden
    this.config = options.config || {};
    this.eventHandlers = {}; // Simple event emitter store
    this.status = 'disconnected'; // 'disconnected', 'connecting', 'connected'
    this.socket = null;
    this.model = null; // Store the model being used
    this.connectConfig = null; // Store connection config
  }

  // --- Event Emitter Methods ---
  on(eventName, callback) {
    if (!this.eventHandlers[eventName]) {
      this.eventHandlers[eventName] = [];
    }
    this.eventHandlers[eventName].push(callback);
  }

  off(eventName, callback) {
    if (this.eventHandlers[eventName]) {
      this.eventHandlers[eventName] = this.eventHandlers[eventName].filter(cb => cb !== callback);
    }
  }

  emit(eventName, data) {
    if (this.eventHandlers[eventName]) {
      this.eventHandlers[eventName].forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event handler for ${eventName}:`, error);
        }
      });
    }
  }

  // --- Logging Method ---
  log(type, message) {
    // console.log(`LOG [${type}]:`, message); // For local debugging
    this.emit('log', { date: new Date().toISOString(), type, message });
  }

  // --- WebSocket Connection Methods ---
  connect(model, connectConfig = {}) {
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      console.warn("WebSocket already open or connecting.");
      return;
    }

    this.status = 'connecting';
    this.model = model;
    this.connectConfig = connectConfig; // Store config used for this connection attempt
    this.log('client.connecting', `Attempting to connect to ${this.websocketUrl} with model ${model}`);

    try {
      this.socket = new WebSocket(this.websocketUrl);
    } catch (error) {
        console.error("WebSocket instantiation error:", error);
        this.status = 'disconnected';
        this.emit('error', error);
        this.log('client.error', `WebSocket instantiation failed: ${error.message}`);
        return;
    }


    this.socket.onopen = () => {
      this.status = 'connected';
      this.emit('open');
      this.log('client.open', `Connected to ${this.websocketUrl}`);
      // Example: Send initial configuration if required by the backend
      // This would typically include the model and any specific settings from connectConfig
      const initialPayload = {
        type: 'config', // Or 'connect', 'initialize' - depends on backend protocol
        model: this.model,
        config: { ...this.config, ...this.connectConfig } // Merge general config with connection-specific config
      };
      this.socket.send(JSON.stringify(initialPayload));
      this.log('client.config', `Sent initial config: ${JSON.stringify(initialPayload)}`);
    };

    this.socket.onclose = (event) => {
      const reason = `${event.code} ${event.reason || ''}`.trim();
      this.status = 'disconnected';
      this.emit('close', event);
      this.log('client.close', `Disconnected from ${this.websocketUrl}. Reason: ${reason || 'N/A'}`);
      this.socket = null; // Clean up socket reference
    };

    this.socket.onerror = (event) => {
      // WebSocket errors are often generic. The 'close' event usually provides more details.
      this.emit('error', event);
      this.log('client.error', `WebSocket error occurred. See console for details. Current status: ${this.status}`);
      // If the socket is not already closed or closing, it might be a good idea to try to close it.
      if (this.socket && this.socket.readyState !== WebSocket.CLOSING && this.socket.readyState !== WebSocket.CLOSED) {
          this.socket.close();
      }
    };

    this.socket.onmessage = (event) => {
      this.handleMessage(event.data);
    };
  }

  disconnect() {
    if (this.socket) {
      this.log('client.disconnect', 'Disconnecting...');
      this.socket.close();
      // Status will be updated in onclose event
    }
  }

  // --- Data Sending Methods ---
  send(type, payload) {
    if (this.socket && this.status === 'connected') {
      try {
        this.socket.send(JSON.stringify({ type, payload }));
      } catch (error) {
        console.error("Error sending message:", error);
        this.log('client.error', `Error sending message: ${error.message}`);
      }
    } else {
      console.warn(`Cannot send message of type '${type}', socket not connected. Status: ${this.status}`);
    }
  }

  sendRealtimeInput(chunks) { // chunks is expected to be an array of { mimeType, data }
    if (!Array.isArray(chunks)) {
        console.error("sendRealtimeInput expects chunks to be an array.");
        return;
    }
    this.send('realtimeInput', { media: chunks }); // Backend expects { media: [...] }
    // Logging individual chunks can be too verbose. Log a summary.
    const mimeTypes = chunks.map(c => c.mimeType.split(';')[0]).join(', ');
    this.log('client.realtimeInput', `Sending media chunks (${mimeTypes}), count: ${chunks.length}`);
  }

  sendClientContent(parts, turnComplete = true) {
    const payloadParts = Array.isArray(parts) ? parts : [parts]; // Ensure parts is an array
    this.send('clientContent', { turns: payloadParts, turnComplete });
    this.log('client.send', { turns: payloadParts, turnComplete });
  }

  // --- Message Handling ---
  handleMessage(jsonData) {
    let message;
    try {
      message = JSON.parse(jsonData);
    } catch (error) {
      this.log('client.error', `Error parsing JSON from server: ${error.message}. Raw data: ${jsonData}`);
      console.error("Error parsing JSON from server:", error, "Raw data:", jsonData);
      return;
    }

    this.log('server.receive', message); // Log the raw received message object
    this.emit('message', message); // Emit raw message for general purpose listeners

    if (message.setupComplete) {
      this.emit('setupcomplete', message.setupComplete); // message.setupComplete often contains config
      this.log('server.setupComplete', message.setupComplete);
    }

    if (message.toolCall) {
      this.emit('toolcall', message.toolCall);
      this.log('server.toolCall', message.toolCall);
    }

    if (message.toolCallCancellation) {
      this.emit('toolcallcancellation', message.toolCallCancellation);
      this.log('server.toolCallCancellation', message.toolCallCancellation);
    }
    
    if (message.serverError) { // Assuming a top-level 'serverError' field for critical errors
        this.emit('error', message.serverError);
        this.log('server.error', message.serverError);
    }

    if (message.serverContent) {
      const serverContent = message.serverContent;
      this.log('server.serverContent', serverContent); // Log the serverContent object

      if (serverContent.interrupted) {
        this.emit('interrupted');
        this.log('server.interrupted', {}); // Log interruption event
      }
      if (serverContent.turnComplete) {
        this.emit('turncomplete');
        this.log('server.turnComplete', {}); // Log turn completion
      }

      if (serverContent.modelTurn && serverContent.modelTurn.parts) {
        const modelTurn = serverContent.modelTurn;
        const audioParts = [];
        const remainingParts = [];

        for (const part of modelTurn.parts) {
          if (part.inlineData && part.inlineData.mimeType && part.inlineData.mimeType.startsWith('audio/pcm')) {
            audioParts.push(part);
          } else {
            remainingParts.push(part);
          }
        }

        if (audioParts.length > 0) {
          this.log('server.audioParts', { count: audioParts.length });
          for (const audioPart of audioParts) {
            if (audioPart.inlineData.data && typeof utilsScript !== 'undefined' && utilsScript.base64ToArrayBuffer) {
              try {
                const audioBuffer = utilsScript.base64ToArrayBuffer(audioPart.inlineData.data);
                this.emit('audio', audioBuffer); // Emit ArrayBuffer
                this.log('server.audio', { bytes: audioBuffer.byteLength });
              } catch (e) {
                this.log('client.error', `Error decoding audio part: ${e.message}`);
                console.error("Error decoding audio part:", e, audioPart);
              }
            } else {
              this.log('client.warn', "Audio part received but data is missing or utilsScript not available for decoding.");
            }
          }
        }

        if (remainingParts.length > 0) {
          const contentToEmit = { modelTurn: { parts: remainingParts } };
          this.emit('content', contentToEmit);
          this.log('server.content', contentToEmit);
        }
      }
    }
    // Note: The original GenAILiveClient also had direct `message.audioData` handling
    // This is covered if the server sends such a message, but the new structure prioritizes `serverContent`.
    // If the server can send *only* `{ audioData: "base64" }` without `serverContent` wrapper,
    // that could be an additional check here. For now, assuming it's within serverContent.
  }

  // --- Configuration ---
  setConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    this.log('client.configUpdate', `Configuration updated: ${JSON.stringify(this.config)}`);
    // If connected, might need to send updated config to server
    // if (this.status === 'connected') {
    //   this.send('configUpdate', this.config);
    // }
  }
}

console.log("live_api_client.js loaded.");
