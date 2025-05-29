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
  const settingsButton = document.getElementById('settings-button'); // Though no interaction is defined yet

  const audioPulseElement = document.querySelector('.audioPulse');

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
    connectButton.addEventListener('click', () => {
      isConnected = !isConnected;
      updateConnectButton(isConnected);
      if (audioPulseElement) {
        audioPulseElement.dataset.active = isConnected.toString();
      }
      console.log(`Action: Connect toggled to ${isConnected}`);
    });
  }

  if (muteButton) {
    muteButton.addEventListener('click', () => {
      isMuted = !isMuted;
      updateMuteButton(isMuted);
      console.log(`Action: Mute toggled to ${isMuted}`);
    });
  }

  if (webcamButton && supportsVideo) {
    webcamButton.addEventListener('click', () => {
      if (isScreenStreaming) return; // Don't allow if screen sharing is active
      isWebcamStreaming = !isWebcamStreaming;
      updateWebcamButton(isWebcamStreaming);
      console.log(`Action: Webcam toggled to ${isWebcamStreaming}`);
    });
  }

  if (screenShareButton && supportsVideo) {
    screenShareButton.addEventListener('click', () => {
      if (isWebcamStreaming) return; // Don't allow if webcam is active
      isScreenStreaming = !isScreenStreaming;
      updateScreenButton(isScreenStreaming);
      console.log(`Action: Screen share toggled to ${isScreenStreaming}`);
    });
  }

  // --- AudioPulse Interaction ---
  if (audioPulseElement) {
    audioPulseElement.dataset.active = isConnected.toString();
    audioPulseElement.dataset.volume = "0.1"; // Default volume
  }

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
