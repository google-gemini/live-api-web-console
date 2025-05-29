// --- audio_streamer.js ---

class AudioStreamerJS {
  constructor(audioContext) {
    if (!audioContext) {
      throw new Error("AudioContext is required for AudioStreamerJS");
    }
    this.audioContext = audioContext;
    this.audioQueue = [];
    this.isPlaying = false;
    this.startTime = 0;
    this.totalScheduledTime = 0; // Keeps track of the time scheduled for queued audio
    this.sourceNode = null; // To keep track of the current AudioBufferSourceNode

    this.outputGainNode = this.audioContext.createGain();
    this.outputGainNode.connect(this.audioContext.destination);
    this.outputVolumeMeterNode = null;

    this.eventEmitter = {
      _events: {},
      on(event, cb) { this._events[event] = (this._events[event] || []).concat(cb); },
      off(event, cb) { if (this._events[event]) this._events[event] = this._events[event].filter(fn => fn !== cb); },
      emit(event, data) { if (this._events[event]) this._events[event].forEach(cb => cb(data)); }
    };

    this.initOutputVolumeMeter(); // Initialize the output volume meter
  }

  async initOutputVolumeMeter() {
    if (typeof utilsScript === 'undefined' || !utilsScript.createWorkletBlobUrl || !utilsScript.VolMeterWorkletString) {
      console.error("utilsScript with createWorkletBlobUrl and VolMeterWorkletString is required for output volume meter.");
      return;
    }
    try {
      const workletName = 'output-vol-meter-worklet';
      if (!utilsScript.registeredWorkletsGlobal.has(workletName)) {
         // Correctly pass the class body string to createWorkletBlobUrl
        const volMeterClassBody = utilsScript.VolMeterWorkletString; 
        const blobUrl = utilsScript.createWorkletBlobUrl('OutputVolMeterWorklet', volMeterClassBody);
        if (!blobUrl) throw new Error("Failed to create blob URL for OutputVolMeterWorklet");
        
        await this.audioContext.audioWorklet.addModule(blobUrl);
        utilsScript.registeredWorkletsGlobal.set(workletName, true); // Mark as registered
        console.log("Output Volume Meter worklet module added.");
      }
      
      this.outputVolumeMeterNode = new AudioWorkletNode(this.audioContext, 'OutputVolMeterWorklet', {
          processorOptions: { updateIntervalInMS: 100 } // Example interval
      });
      
      this.outputVolumeMeterNode.port.onmessage = (event) => {
        if (event.data && typeof event.data.volume !== 'undefined') {
          this.eventEmitter.emit('outputvolume', event.data.volume);
          // console.log("Output volume:", event.data.volume); 
        }
      };
      // Connect gain node to volume meter, then volume meter to destination (or in parallel)
      this.outputGainNode.connect(this.outputVolumeMeterNode);
      this.outputVolumeMeterNode.connect(this.audioContext.destination); // Connect meter to destination
      // To prevent double audio, ensure gain node is not directly connected to destination anymore if meter is last in chain.
      // However, standard practice is often gain -> meter -> destination, or gain -> destination and gain -> meter (parallel).
      // For simplicity and ensuring meter processes what's played:
      this.outputGainNode.disconnect(this.audioContext.destination); // Disconnect direct path
      this.outputGainNode.connect(this.outputVolumeMeterNode); // Gain -> Meter
      this.outputVolumeMeterNode.connect(this.audioContext.destination); // Meter -> Destination

      console.log("Output Volume Meter initialized and connected.");

    } catch (error) {
      console.error("Error initializing output volume meter:", error);
    }
  }


  addPCM16(pcm16Data) { // pcm16Data is Uint8Array containing Int16 data
    if (!(pcm16Data instanceof Uint8Array)) {
      console.error("pcm16Data must be a Uint8Array");
      return;
    }

    // Convert Uint8Array (representing Int16 data) to Float32Array for Web Audio API
    // Each Int16 sample is 2 bytes.
    const int16Array = new Int16Array(pcm16Data.buffer, pcm16Data.byteOffset, pcm16Data.length / 2);
    const float32Array = new Float32Array(int16Array.length);
    for (let i = 0; i < int16Array.length; i++) {
      float32Array[i] = int16Array[i] / 0x7FFF; // Convert to range [-1.0, 1.0]
    }

    this.audioQueue.push(float32Array);
    if (!this.isPlaying) {
      this.resume(); // Start playing if not already
    }
  }

  scheduleNextBuffer() {
    if (this.audioQueue.length === 0) {
      this.isPlaying = false;
      if (this.isCompleted) {
        this.eventEmitter.emit('ended');
        console.log("Audio streaming completed and queue empty.");
      }
      return;
    }

    this.isPlaying = true;
    const float32Array = this.audioQueue.shift();
    const audioBuffer = this.audioContext.createBuffer(1, float32Array.length, this.audioContext.sampleRate);
    audioBuffer.getChannelData(0).set(float32Array);

    this.sourceNode = this.audioContext.createBufferSource();
    this.sourceNode.buffer = audioBuffer;
    this.sourceNode.connect(this.outputGainNode); // Connect to gain node

    let scheduleTime = this.startTime;
    if (scheduleTime < this.audioContext.currentTime) {
      scheduleTime = this.audioContext.currentTime; // Ensure we don't schedule in the past
    }
    
    this.sourceNode.start(scheduleTime);
    this.startTime = scheduleTime + audioBuffer.duration; // Update start time for the next buffer
    
    this.sourceNode.onended = () => {
      // Clean up the ended sourceNode
      if (this.sourceNode) {
        this.sourceNode.disconnect();
        this.sourceNode = null;
      }
      // Schedule next if not explicitly stopped
      if (this.isPlaying) {
        this.scheduleNextBuffer();
      }
    };
  }

  stop() {
    console.log("AudioStreamerJS: stop called");
    this.isPlaying = false;
    this.isCompleted = false; // Reset completion state
    if (this.sourceNode) {
      try {
        this.sourceNode.stop(); // Stop current playback immediately
        this.sourceNode.disconnect();
      } catch(e) { console.warn("Error stopping sourceNode:", e); }
      this.sourceNode = null;
    }
    this.audioQueue = []; // Clear the queue
    this.startTime = 0; // Reset start time
    this.totalScheduledTime = 0; 
    // It might be useful to also reset the audioContext's currentTime or handle suspensions
    // if (this.audioContext.state === 'running') {
    //   this.audioContext.suspend(); // Suspend to allow it to be resumed cleanly
    // }
  }

  resume() {
    console.log("AudioStreamerJS: resume called");
    if (this.isPlaying) {
      console.log("Already playing.");
      return;
    }
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume().then(() => {
        console.log("AudioContext resumed.");
        this.startTime = this.audioContext.currentTime; // Reset start time based on resumed context
        this.totalScheduledTime = this.audioContext.currentTime;
        this.scheduleNextBuffer();
      }).catch(e => console.error("Error resuming AudioContext:", e));
    } else {
      this.startTime = this.audioContext.currentTime;
      this.totalScheduledTime = this.audioContext.currentTime;
      this.scheduleNextBuffer();
    }
  }

  complete() {
    console.log("AudioStreamerJS: complete called. No more audio will be added.");
    this.isCompleted = true;
    // If not playing and queue is empty, emit 'ended' immediately.
    if (!this.isPlaying && this.audioQueue.length === 0) {
      this.eventEmitter.emit('ended');
      console.log("Audio streaming marked complete and queue was already empty.");
    }
    // If playing, onended chain will eventually emit 'ended' when queue is empty.
  }

  // Generic method to add other worklets to the audio chain if needed
  async addWorklet(nodeName, workletBlobUrl, options = {}) {
    // This is a placeholder - actual implementation would depend on where to insert the worklet
    // For example, an output effect worklet might go between outputGainNode and destination.
    console.warn("addWorklet is a placeholder and not fully implemented for general use.");
    // Example:
    // await this.audioContext.audioWorklet.addModule(workletBlobUrl);
    // const customWorkletNode = new AudioWorkletNode(this.audioContext, nodeName, options);
    // this.outputGainNode.disconnect();
    // this.outputGainNode.connect(customWorkletNode);
    // customWorkletNode.connect(this.audioContext.destination);
    // return customWorkletNode;
  }

  setVolume(volumeLevel) { // volumeLevel between 0 and 1
    if (this.outputGainNode) {
      this.outputGainNode.gain.setValueAtTime(Math.max(0, Math.min(1, volumeLevel)), this.audioContext.currentTime);
      console.log(`Output volume set to: ${volumeLevel}`);
    }
  }
}

console.log("audio_streamer.js loaded.");
