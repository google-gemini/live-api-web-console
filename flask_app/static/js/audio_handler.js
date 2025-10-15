const AudioProcessingWorkletString = `
class AudioProcessingWorklet extends AudioWorkletProcessor {
  buffer = new Int16Array(2048);
  bufferWriteIndex = 0;
  constructor() { super(); }
  process(inputs) {
    if (inputs[0].length) {
      const channel0 = inputs[0][0];
      this.processChunk(channel0);
    }
    return true;
  }
  sendAndClearBuffer(){
    this.port.postMessage({
      event: "chunk",
      // Send a copy of the buffer, not the buffer itself, as it's transferable
      data: { int16arrayBuffer: this.buffer.slice(0, this.bufferWriteIndex).buffer },
    }, [this.buffer.slice(0, this.bufferWriteIndex).buffer]); // Transferable object
    this.bufferWriteIndex = 0;
  }
  processChunk(float32Array) {
    const l = float32Array.length;
    for (let i = 0; i < l; i++) {
      // Clamp values to avoid issues if input is > 1.0 or < -1.0
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      const int16Value = s * 0x7FFF; // Max positive value for 16-bit signed integer
      this.buffer[this.bufferWriteIndex++] = int16Value;
      if(this.bufferWriteIndex >= this.buffer.length) { this.sendAndClearBuffer(); }
    }
    // It's possible that the buffer is filled exactly at the end of the loop.
    // The check inside the loop handles this. No need for a duplicate check here.
  }
}`;

const VolMeterWorkletString = `
class VolMeter extends AudioWorkletProcessor {
  volume = 0; updateIntervalInMS = 25; nextUpdateFrame = 25; // sampleRate is implicitly available in AudioWorkletProcessor
  constructor() {
    super();
    // Initialize nextUpdateFrame based on sampleRate, which is known once processor is constructed and running
    // This cannot be done directly in constructor as sampleRate is not available yet.
    // It's better to initialize it in the process method or via a message from the main thread if needed.
    // For simplicity, assuming sampleRate will be available when process is called.
    // this.nextUpdateFrame = (this.updateIntervalInMS / 1000) * sampleRate;
    this.port.onmessage = event => { 
        if (event.data.updateIntervalInMS) {
            this.updateIntervalInMS = event.data.updateIntervalInMS;
            // Re-calculate nextUpdateFrame if sampleRate is known
            // if (sampleRate) this.nextUpdateFrame = this.intervalInFrames; 
        }
    };
  }
  get intervalInFrames() { return (this.updateIntervalInMS / 1000) * sampleRate; }
  process(inputs) {
    const input = inputs[0];
    if (input.length > 0 && input[0].length > 0) { // Ensure input and channel data exist
      const samples = input[0]; let sum = 0; let rms = 0;
      for (let i = 0; i < samples.length; ++i) sum += samples[i] * samples[i];
      rms = Math.sqrt(sum / samples.length); 
      // Exponential smoothing for volume
      this.volume = Math.max(rms, this.volume * 0.7); // Apply smoothing, 0.7 is decay rate
      
      // Initialize nextUpdateFrame properly if not done
      if (this.nextUpdateFrame === 25 && sampleRate) { // Assuming 25 was placeholder
           this.nextUpdateFrame = this.intervalInFrames;
      }

      this.nextUpdateFrame -= samples.length;
      if (this.nextUpdateFrame <= 0) { // Changed to <= 0
        this.nextUpdateFrame += this.intervalInFrames; // Add interval, not reset to it
        this.port.postMessage({volume: this.volume});
      }
    }
    return true;
  }
}`;

function createWorkletFromSrc(workletName, workletString) {
  const fullWorkletString = `registerProcessor('${workletName}', ${workletString});`;
  const blob = new Blob([fullWorkletString], { type: 'application/javascript' });
  return URL.createObjectURL(blob);
}

function arrayBufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

class AudioHandler {
  constructor(sampleRate = 16000) {
    this.sampleRate = sampleRate;
    this.recording = false;
    this.eventEmitter = {
      _events: {},
      on(event, cb) {
        this._events[event] = this._events[event] || [];
        this._events[event].push(cb);
      },
      off(event, cb) {
        if (this._events[event]) {
          this._events[event] = this._events[event].filter(fn => fn !== cb);
        }
      },
      emit(event, data) {
        if (this._events[event]) {
          this._events[event].forEach(cb => cb(data));
        }
      }
    };
    this.audioContext = null;
    this.mediaStreamSource = null;
    this.audioProcessingNode = null;
    this.volMeterNode = null;
    this.mediaStream = null;
  }

  async start() {
    if (this.recording) {
      console.log("Already recording.");
      return;
    }
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.audioContext = new AudioContext({ sampleRate: this.sampleRate });
      this.mediaStreamSource = this.audioContext.createMediaStreamSource(this.mediaStream);

      // AudioProcessingWorklet
      const audioProcessingWorkletUrl = createWorkletFromSrc('audio-processing-worklet', AudioProcessingWorkletString);
      await this.audioContext.audioWorklet.addModule(audioProcessingWorkletUrl);
      this.audioProcessingNode = new AudioWorkletNode(this.audioContext, 'audio-processing-worklet');
      this.audioProcessingNode.port.onmessage = (event) => {
        if (event.data && event.data.data && event.data.data.int16arrayBuffer) {
          const base64String = arrayBufferToBase64(event.data.data.int16arrayBuffer);
          this.eventEmitter.emit('data', base64String);
        }
      };

      // VolMeterWorklet
      const volMeterWorkletUrl = createWorkletFromSrc('vol-meter-worklet', VolMeterWorkletString);
      await this.audioContext.audioWorklet.addModule(volMeterWorkletUrl);
      this.volMeterNode = new AudioWorkletNode(this.audioContext, 'vol-meter-worklet');
      this.volMeterNode.port.onmessage = (event) => {
        if (event.data && typeof event.data.volume !== 'undefined') {
          this.eventEmitter.emit('volume', event.data.volume);
        }
      };
      
      this.mediaStreamSource.connect(this.audioProcessingNode);
      this.mediaStreamSource.connect(this.volMeterNode); 
      // It's common to connect worklets in parallel to the source, 
      // but if audioProcessingNode modifies the stream for volMeterNode, connect sequentially:
      // this.mediaStreamSource.connect(this.audioProcessingNode).connect(this.volMeterNode);
      // For this case, parallel connection is fine as VolMeter just needs raw audio.

      this.recording = true;
      console.log("Audio recording started.");
    } catch (error) {
      console.error("Error starting audio recording:", error);
      this.eventEmitter.emit('error', error); // Emit an error event
      // Clean up if partial setup occurred
      if (this.audioContext && this.audioContext.state !== 'closed') {
        await this.audioContext.close();
      }
      this.audioContext = null;
      this.mediaStreamSource = null;
      this.mediaStream = null;
    }
  }

  async stop() {
    if (!this.recording) {
      console.log("Not recording.");
      return;
    }
    try {
      if (this.mediaStream) {
        this.mediaStream.getTracks().forEach(track => track.stop());
      }
      if (this.mediaStreamSource) {
        this.mediaStreamSource.disconnect();
      }
      if (this.audioProcessingNode) {
        this.audioProcessingNode.port.onmessage = null; // Remove listener
        this.audioProcessingNode.disconnect();
      }
      if (this.volMeterNode) {
        this.volMeterNode.port.onmessage = null; // Remove listener
        this.volMeterNode.disconnect();
      }
      if (this.audioContext && this.audioContext.state !== 'closed') {
        await this.audioContext.close();
      }
    } catch (error) {
        console.error("Error stopping audio recording:", error);
    } finally {
        this.recording = false;
        this.mediaStream = null;
        this.mediaStreamSource = null;
        this.audioProcessingNode = null;
        this.volMeterNode = null;
        this.audioContext = null;
        console.log("Audio recording stopped.");
    }
  }
}

// Example usage (for testing, will be instantiated in control-tray.js)
// const audioHandler = new AudioHandler();
// To test:
// audioHandler.start();
// audioHandler.eventEmitter.on('data', (base64) => console.log("Data:", base64.substring(0,10)));
// audioHandler.eventEmitter.on('volume', (vol) => console.log("Vol:", vol));
// setTimeout(() => audioHandler.stop(), 5000);
