document.addEventListener('DOMContentLoaded', () => {
  const controlTrayElement = document.querySelector('.control-tray');
  if (!controlTrayElement) return;

  // Initial state from data attributes (or default to false)
  let isConnected = controlTrayElement.dataset.connected === 'true';
  let isMuted = controlTrayElement.dataset.muted === 'true';
  let supportsVideo = controlTrayElement.dataset.supportsVideo === 'true';
  let isWebcamStreaming = controlTrayElement.dataset.webcamStreaming === 'true';
  let isScreenStreaming = controlTrayElement.dataset.screenStreaming === 'true';

  const connectButton = document.getElementById('connect-button');
  const muteButton = document.getElementById('mute-button');
  const screenShareButton = document.getElementById('screenshare-button');
  const webcamButton = document.getElementById('webcam-button');
  const settingsButton = document.getElementById('settings-button'); 

  const audioPulseElement = document.querySelector('.control-tray .audioPulse'); // More specific selector
  const audioHandler = new AudioHandler(); // Instantiate AudioHandler

  // --- Live API Client and Audio Streamer Instances ---
  // Ensure utilsScript is loaded and available for audioContextGlobal
  let audioStreamer; // Declare here, initialize after DOMContentLoaded and AudioContext is ready
  const liveApiClient = new LiveAPIClientJS({ websocketUrl: 'ws://localhost:8765' }); // Example URL, replace as needed
  window.liveApiClientInstance = liveApiClient; // Make instance globally accessible

  // --- Video Elements and State ---
  const videoElement = document.getElementById('main-video');
  const canvasElement = document.getElementById('renderCanvasControlTray'); // Hidden canvas in control_tray.html
  let currentActiveVideoStream = null;
  let isVideoEffectivelyStreaming = false; // Tracks if we *should* be sending frames

  // --- Event Handlers for AudioHandler ---
  const onAudioData = (base64Data) => {
    // console.log('Audio data (base64):', base64Data.substring(0,10) + "..."); 
    if (liveApiClient && liveApiClient.status === 'connected') {
      liveApiClient.sendRealtimeInput([{ mimeType: 'audio/pcm;rate=16000', data: base64Data }]);
    }
  };

  const onAudioVolume = (volume) => {
    // console.log('Audio volume:', volume);
    // Update CSS custom property for mic button animation
    // Make sure the --volume property is registered in CSS or this won't have visual effect beyond the data attribute
    document.documentElement.style.setProperty('--volume', `${Math.max(5, Math.min(volume * 200, 8))}px`);
    
    // Update data-volume attribute for audio_pulse.js
    if (audioPulseElement) { // Ensure audioPulseElement is not null
      audioPulseElement.setAttribute('data-volume', volume.toFixed(2));
    }
  };

  // --- Button Update Functions ---
  function updateConnectButton(connected) {
    const icon = connectButton.querySelector('.material-symbols-outlined');
    const textIndicator = document.querySelector('.control-tray .connection-container .text-indicator');
    const connectionContainer = document.querySelector('.control-tray .connection-container');

    if (connected) {
      connectButton.classList.add('connected');
      icon.textContent = 'pause';
      if (textIndicator) textIndicator.innerHTML = 'LIVE';
      if (connectionContainer) connectionContainer.classList.add('connected');
    } else {
      connectButton.classList.remove('connected');
      icon.textContent = 'play_arrow';
      if (textIndicator) textIndicator.innerHTML = '&nbsp;'; // Or some other placeholder
      if (connectionContainer) connectionContainer.classList.remove('connected');
    }
    controlTrayElement.dataset.connected = connected; // Update data attribute
  }

  function updateMuteButton(muted) {
    const icon = muteButton.querySelector('.material-symbols-outlined');
    if (muted) {
      muteButton.classList.add('muted'); // Assuming a 'muted' class might be styled
      icon.textContent = 'mic_off';
    } else {
      muteButton.classList.remove('muted');
      icon.textContent = 'mic';
    }
    controlTrayElement.dataset.muted = muted; // Update data attribute
  }

  function updateWebcamButton(streaming) {
    if (!webcamButton) return;
    const icon = webcamButton.querySelector('.material-symbols-outlined');
    if (streaming) {
      icon.textContent = 'videocam_off';
      webcamButton.classList.add('streaming'); // For potential styling
    } else {
      icon.textContent = 'videocam';
      webcamButton.classList.remove('streaming');
    }
    controlTrayElement.dataset.webcamStreaming = streaming;
    // Disable other video button if this one is active
    if (screenShareButton) screenShareButton.disabled = streaming;
  }

  function updateScreenButton(streaming) {
    if (!screenShareButton) return;
    const icon = screenShareButton.querySelector('.material-symbols-outlined');
    if (streaming) {
      icon.textContent = 'cancel_presentation';
      screenShareButton.classList.add('streaming'); // For potential styling
    } else {
      icon.textContent = 'present_to_all';
      screenShareButton.classList.remove('streaming');
    }
    controlTrayElement.dataset.screenStreaming = streaming;
    // Disable other video button if this one is active
    if (webcamButton) webcamButton.disabled = streaming;
  }

  // --- Event Handlers ---
  if (connectButton) {
    connectButton.addEventListener('click', async () => { // Made async for audioStreamer init
      isConnected = !isConnected; // This now represents the desired state

      if (isConnected) { // Attempting to connect
        if (!audioStreamer) { // Initialize audioStreamer on first connect attempt
            try {
                const globalAudioContext = await utilsScript.audioContextGlobal({ id: 'audio-out' });
                if (!globalAudioContext) throw new Error("Failed to get global AudioContext.");
                audioStreamer = new AudioStreamerJS(globalAudioContext);
                console.log("AudioStreamerJS initialized for output.");
                // Example: Hook up output volume meter from audioStreamer to an UI element if needed
                // audioStreamer.eventEmitter.on('outputvolume', (vol) => { /* update some UI */ });
            } catch (error) {
                console.error("Failed to initialize AudioStreamerJS:", error);
                isConnected = false; // Revert desired state
                updateConnectButton(isConnected); // Update button UI
                return; // Prevent further connection logic
            }
        }
        
        // Placeholder for getting current settings
        const currentSettings = window.settingsDialogGetCurrentConfig ? window.settingsDialogGetCurrentConfig() : {};
        liveApiClient.connect('gemini-model', currentSettings); // Replace 'gemini-model' as needed

      } else { // Attempting to disconnect
        liveApiClient.disconnect();
        // Note: Actual UI updates related to disconnection (button state, indicators)
        // will largely be handled by liveApiClient.on('close') event.
        // We might still want to call some immediate UI updates here.
        updateConnectButton(isConnected); // Reflect immediate intent to disconnect
        if (window.setSettingsDialogDisabled) window.setSettingsDialogDisabled(false); // Enable settings dialog
        if (window.updateStreamingIndicatorSidePanel) window.updateStreamingIndicatorSidePanel(false, 'client.disconnect'); // Update side panel
        if (currentActiveVideoStream) stopFrameCapture(); // Stop video frame sending
      }
      // console.log(`Action: Connect toggled to desired state: ${isConnected}`); // Logging intent
    });
  }

  // --- LiveAPIClient Event Handlers ---
  liveApiClient.on('open', () => {
    isConnected = true; // Update actual connection state
    updateConnectButton(isConnected);
    if (window.setSettingsDialogDisabled) window.setSettingsDialogDisabled(true);
    if (window.updateStreamingIndicatorSidePanel) window.updateStreamingIndicatorSidePanel(true, 'client.open');
    
    if (currentActiveVideoStream && isVideoEffectivelyStreaming) {
      captureAndSendFrame(videoElement, canvasElement, liveApiClient, isConnected); // Pass liveApiClient
    }
    // If mic was unmuted *before* connection, start audioHandler now
    if (!isMuted && audioHandler && !audioHandler.recording) {
        console.log("Mic was active before connection, attempting to start audioHandler now.");
        // This logic might be complex if start() was already called but failed due to no connection.
        // For now, assume audioHandler.start() can be re-attempted or handles this.
        // The onAudioData handler will now send data as liveApiClient is connected.
    }
  });

  liveApiClient.on('close', (event) => {
    isConnected = false; // Update actual connection state
    updateConnectButton(isConnected);
    if (window.setSettingsDialogDisabled) window.setSettingsDialogDisabled(false);
    if (window.updateStreamingIndicatorSidePanel) window.updateStreamingIndicatorSidePanel(false, 'client.close');
    
    if (currentActiveVideoStream) stopFrameCapture();
    
    // If audioStreamer is active, stop it to halt any queued audio playback
    if (audioStreamer) audioStreamer.stop();

    // Consider stopping audioHandler if it's running, or let mute button handle it
    // if (audioHandler && audioHandler.recording) {
    //   audioHandler.stop(); // This might interfere with explicit mute state
    // }
    console.log('LiveAPIClient connection closed.', event);
  });

  liveApiClient.on('error', (error) => {
    console.error('LiveAPIClient WebSocket Error:', error);
    // Potentially update UI to show error state
    // isConnected state might be false already or will be set by 'close' event.
    // No need to call updateConnectButton here as 'close' usually follows 'error'.
  });

  liveApiClient.on('audio', (arrayBufferData) => {
    if (audioStreamer) {
      audioStreamer.addPCM16(new Uint8Array(arrayBufferData));
    } else {
      console.warn("AudioStreamer not initialized, cannot play received audio.");
    }
  });

  liveApiClient.on('log', (logEntry) => {
    // console.log('API Log:', logEntry); // Original log
    if (window.addLogToSidePanel) { // Function to be implemented in side-panel.js
        window.addLogToSidePanel(logEntry);
    } else {
        console.log('API Log (side panel logger not available):', logEntry);
    }
  });

  // Additional specific event handlers for debugging/confirmation
  liveApiClient.on('content', (contentData) => {
    console.log('LiveAPIClient Event: content', contentData);
    // Future: Update specific UI elements with this content if needed.
    // For now, it's also logged via the 'log' event by liveApiClient.log('server.content', ...)
  });

  liveApiClient.on('toolcall', (toolCallData) => {
    console.log('LiveAPIClient Event: toolcall', toolCallData);
  });

  liveApiClient.on('toolcallcancellation', (cancellationData) => {
    console.log('LiveAPIClient Event: toolcallcancellation', cancellationData);
  });
  
  liveApiClient.on('setupcomplete', (setupData) => {
    console.log('LiveAPIClient Event: setupcomplete', setupData);
  });

  liveApiClient.on('interrupted', () => {
    console.log('LiveAPIClient Event: interrupted');
  });

  liveApiClient.on('turncomplete', () => {
    console.log('LiveAPIClient Event: turncomplete');
  });


  if (muteButton) {
    muteButton.addEventListener('click', async () => { // Made async
      isMuted = !isMuted;
      // Update UI optimistically, then attempt audio operations
      updateMuteButton(isMuted); 

      if (!isMuted) { // Mic is being unmuted (turned on)
        try {
          await audioHandler.start();
          audioHandler.eventEmitter.on('data', onAudioData);
          audioHandler.eventEmitter.on('volume', onAudioVolume);
          console.log("AudioHandler started, listeners registered.");
        } catch (error) {
          console.error("Failed to start AudioHandler:", error);
          isMuted = true; // Revert state as start failed
          updateMuteButton(isMuted); // Update UI back
          // Optionally, display an error to the user
        }
      } else { // Mic is being muted (turned off)
        try {
          await audioHandler.stop();
          audioHandler.eventEmitter.off('data', onAudioData);
          audioHandler.eventEmitter.off('volume', onAudioVolume);
          console.log("AudioHandler stopped, listeners removed.");
           // Reset volume display when muted
          if (audioPulseElement) audioPulseElement.setAttribute('data-volume', '0');
          document.documentElement.style.setProperty('--volume', `5px`);


        } catch (error) {
          console.error("Error stopping AudioHandler:", error);
          // Potentially revert state if stop failed, though less critical than start failing
        }
      }
      // console.log(`Action: Mute toggled to ${isMuted}`); // Original log moved or can be kept
    });
  }

  if (webcamButton && supportsVideo) {
    webcamButton.addEventListener('click', async () => { // Made async
      if (isScreenStreaming) return; 

      if (isWebcamStreaming) { // If webcam is currently active, stop it
        if (currentActiveVideoStream) stopStream(currentActiveVideoStream, videoElement);
        currentActiveVideoStream = null;
        isWebcamStreaming = false;
        stopFrameCapture();
        isVideoEffectivelyStreaming = false;
      } else { // Webcam is not active, start it
        if (currentActiveVideoStream) stopStream(currentActiveVideoStream, videoElement); // Stop any other stream first
        currentActiveVideoStream = await startWebcam(videoElement);
        if (currentActiveVideoStream) {
          isWebcamStreaming = true;
          isVideoEffectivelyStreaming = true;
          if (isConnected) { 
            captureAndSendFrame(videoElement, canvasElement, liveApiClient, isConnected); // Pass liveApiClient
          }
        } else {
          isWebcamStreaming = false; 
          isVideoEffectivelyStreaming = false;
        }
      }
      updateWebcamButton(isWebcamStreaming);
      // Ensure screen share button state is consistent (it's disabled if webcam is on)
      if (screenShareButton) screenShareButton.disabled = isWebcamStreaming; 
      console.log(`Action: Webcam toggled to ${isWebcamStreaming}`);
    });
  }

  if (screenShareButton && supportsVideo) {
    screenShareButton.addEventListener('click', async () => { // Made async
      if (isWebcamStreaming) return;

      if (isScreenStreaming) { // If screen share is currently active, stop it
        if (currentActiveVideoStream) stopStream(currentActiveVideoStream, videoElement);
        currentActiveVideoStream = null;
        isScreenStreaming = false;
        stopFrameCapture();
        isVideoEffectivelyStreaming = false;
      } else { // Screen share is not active, start it
        if (currentActiveVideoStream) stopStream(currentActiveVideoStream, videoElement);
        currentActiveVideoStream = await startScreenCapture(videoElement);
        if (currentActiveVideoStream) {
          isScreenStreaming = true;
          isVideoEffectivelyStreaming = true;
          if (isConnected) {
            captureAndSendFrame(videoElement, canvasElement, liveApiClient, isConnected); // Pass liveApiClient
          }
           // Add event listener for when the user stops sharing via browser UI
          currentActiveVideoStream.getVideoTracks()[0].onended = () => {
            console.log("Screen share ended by user (browser UI).");
            if (currentActiveVideoStream) stopStream(currentActiveVideoStream, videoElement);
            currentActiveVideoStream = null;
            isScreenStreaming = false;
            stopFrameCapture();
            isVideoEffectivelyStreaming = false;
            updateScreenButton(isScreenStreaming);
            if (webcamButton) webcamButton.disabled = isScreenStreaming;
          };
        } else {
          isScreenStreaming = false; // Failed to start
          isVideoEffectivelyStreaming = false;
        }
      }
      updateScreenButton(isScreenStreaming);
      // Ensure webcam button state is consistent
      if (webcamButton) webcamButton.disabled = isScreenStreaming;
      console.log(`Action: Screen share toggled to ${isScreenStreaming}`);
    });
  }

  // --- AudioPulse Interaction ---
  if (audioPulseElement) { // Ensure audioPulseElement is not null
    audioPulseElement.dataset.active = isConnected.toString();
    audioPulseElement.dataset.volume = "0.1"; // Default volume
  }

  // --- Function to be called by side-panel.js ---
  window.updateAudioPulseForSidePanel = function(isSidePanelOpen) {
    if (audioPulseElement) { // Ensure audioPulseElement is not null
      if (isSidePanelOpen) {
        audioPulseElement.style.display = 'none';
      } else {
        audioPulseElement.style.display = 'flex'; // Or 'block', depending on its original display type
      }
    }
  };
  // Initial check for side panel state - assuming side panel JS runs first and sets its state
  // This might be tricky due to script load order. A more robust solution might involve custom events or a small delay.
  // For now, let's assume the side panel is open by default if its main element exists.
  // The side-panel.js will call this function on its init.

  // --- --volume CSS Property ---
  // Set a static value for now. Could be dynamic based on mic input later.
  document.documentElement.style.setProperty('--volume', '5px');


  // --- Initial State Setup on Load ---
  updateConnectButton(isConnected);
  updateMuteButton(isMuted);
  if (supportsVideo) {
    updateWebcamButton(isWebcamStreaming);
    updateScreenButton(isScreenStreaming);
  }
});
