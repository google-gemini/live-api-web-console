// --- utils.js ---

const utilsScript = {
  /**
   * Global AudioContext.
   * @param {object} options - Options for the AudioContext.
   * @param {string} options.id - An identifier (currently unused, but for future).
   * @returns {AudioContext}
   */
  audioContextGlobal: (options = { id: 'default' }) => {
    if (!utilsScript._audioContextGlobalInstance) {
      try {
        utilsScript._audioContextGlobalInstance = new (window.AudioContext || window.webkitAudioContext)();
        console.log(`AudioContext '${options.id}' created.`);
      } catch (e) {
        console.error("Failed to create AudioContext:", e);
        // Fallback or error display might be needed here for user
        return null;
      }
    }
    return utilsScript._audioContextGlobalInstance;
  },
  _audioContextGlobalInstance: null,

  /**
   * Decodes a base64 string to an ArrayBuffer.
   * @param {string} base64 - The base64 encoded string.
   * @returns {ArrayBuffer}
   */
  base64ToArrayBuffer: (base64) => {
    const binary_string = window.atob(base64);
    const len = binary_string.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary_string.charCodeAt(i);
    }
    return bytes.buffer;
  },

  /**
   * Creates a Blob URL for an AudioWorklet.
   * @param {string} workletName - The name to register the processor under.
   * @param {string} workletString - The string content of the worklet class.
   * @returns {string} The Blob URL for the worklet.
   */
  createWorkletBlobUrl: (workletName, workletString) => {
    // Ensure the workletString is a valid class definition string
    const fullWorkletSource = `
      class ${workletName} extends AudioWorkletProcessor {
        ${workletString.substring(workletString.indexOf('{') + 1)}
      
      registerProcessor('${workletName}', ${workletName});
    `;
    // A more robust way to ensure only the class body is injected, if workletString is the full class:
    // const classBodyRegex = /class\s*\w+\s*extends\s*AudioWorkletProcessor\s*\{([\s\S]*)\}/;
    // const match = workletString.match(classBodyRegex);
    // if (!match || match.length < 2) {
    //   console.error("Invalid workletString format. Expected a class extending AudioWorkletProcessor.");
    //   return null;
    // }
    // const classBody = match[1];
    // const fullWorkletSource = `
    //   class ${workletName} extends AudioWorkletProcessor {
    //     ${classBody}
    //   }
    //   registerProcessor('${workletName}', ${workletName});
    // `;

    const blob = new Blob([fullWorkletSource], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    console.log(`Created worklet blob URL for ${workletName}: ${url}`);
    return url;
  },
  
  /**
   * Global map for registered worklets (URL by name).
   * This helps avoid re-registering the same worklet if addModule is called multiple times.
   */
  registeredWorkletsGlobal: new Map(),

  // Store VolMeterWorkletString here for access by AudioStreamerJS if needed
  // Taken from audio_handler.js (the improved version)
  VolMeterWorkletString: `
    volume = 0; updateIntervalInMS = 25; nextUpdateFrame = 25; 
    constructor(options) {
      super(options);
      if (options && options.processorOptions && options.processorOptions.updateIntervalInMS) {
        this.updateIntervalInMS = options.processorOptions.updateIntervalInMS;
      }
      this.port.onmessage = event => { 
          if (event.data.updateIntervalInMS) {
              this.updateIntervalInMS = event.data.updateIntervalInMS;
          }
      };
    }
    get intervalInFrames() { return (this.updateIntervalInMS / 1000) * sampleRate; }
    process(inputs) {
      const input = inputs[0];
      if (input && input.length > 0 && input[0].length > 0) {
        const samples = input[0]; let sum = 0; let rms = 0;
        for (let i = 0; i < samples.length; ++i) sum += samples[i] * samples[i];
        rms = Math.sqrt(sum / samples.length); 
        this.volume = Math.max(rms, this.volume * 0.7); 
        
        if (this.nextUpdateFrame === 25 && typeof sampleRate !== 'undefined' && sampleRate > 0) {
             this.nextUpdateFrame = this.intervalInFrames;
        }

        this.nextUpdateFrame -= samples.length;
        if (this.nextUpdateFrame <= 0) { 
          this.nextUpdateFrame += this.intervalInFrames; 
          try {
            this.port.postMessage({volume: this.volume, currentTime: currentTime});
          } catch (e) {
            // Can happen if port is closed or transferred object is invalid
            // console.warn("VolMeter: Error posting message - ", e.message);
          }
        }
      }
      return !this.port // Keep processor alive until port is disconnected
    }
  ` // Note: The original VolMeterWorkletString was a full class string, this is just the body + constructor.
    // The createWorkletBlobUrl function expects this format.
    // I've adjusted createWorkletBlobUrl to inject this body into a class structure.
    // And also adjusted the VolMeterWorkletString to be just the body methods + constructor.
};

// To make it accessible as utilsScript.audioContextGlobal() etc.
window.utilsScript = utilsScript;

console.log("utils.js loaded and utilsScript object is available globally.");
