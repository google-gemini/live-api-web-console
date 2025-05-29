// --- Video Handler ---

async function startWebcam(videoElement) {
  if (!videoElement) {
    console.error("Video element not provided for webcam.");
    return null;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    videoElement.srcObject = stream;
    videoElement.style.display = 'block'; // Or 'inline', 'flex' etc. depending on layout
    console.log("Webcam started.");
    return stream;
  } catch (error) {
    console.error("Error starting webcam:", error);
    videoElement.style.display = 'none';
    return null;
  }
}

async function startScreenCapture(videoElement) {
  if (!videoElement) {
    console.error("Video element not provided for screen capture.");
    return null;
  }
  try {
    const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
    videoElement.srcObject = stream;
    videoElement.style.display = 'block';
    console.log("Screen capture started.");
    return stream;
  } catch (error) {
    console.error("Error starting screen capture:", error);
    videoElement.style.display = 'none';
    return null;
  }
}

function stopStream(stream, videoElement) {
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
    console.log("Stream stopped.");
  }
  if (videoElement) {
    videoElement.srcObject = null;
    videoElement.style.display = 'none';
  }
}

// --- Frame Capturing (Stub for now) ---
let frameCaptureIntervalId = null; // To control the interval

function captureAndSendFrame(videoElement, canvasElement, apiClient, isConnected) {
  if (!videoElement || !canvasElement ) { // apiClient removed from check for now
    // console.error("Video or canvas element not provided for frame capture.");
    return;
  }

  if (videoElement.srcObject && videoElement.readyState >= 3 && isConnected) { // videoElement.HAVE_FUTURE_DATA (3) or HAVE_ENOUGH_DATA (4)
    // console.log("Attempting to capture frame...");
    const videoWidth = videoElement.videoWidth;
    const videoHeight = videoElement.videoHeight;

    if (videoWidth === 0 || videoHeight === 0) {
        // console.warn("Video dimensions are zero, skipping frame capture for now.");
        // Schedule next attempt
        if (frameCaptureIntervalId) clearInterval(frameCaptureIntervalId); // Clear existing before setting new
        frameCaptureIntervalId = setTimeout(() => captureAndSendFrame(videoElement, canvasElement, apiClient, isConnected), 1000 / 15); // Approx 15 FPS
        return;
    }

    canvasElement.width = videoWidth * 0.25;
    canvasElement.height = videoHeight * 0.25;
    
    const context = canvasElement.getContext('2d');
    context.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);
    
    try {
        const base64Data = canvasElement.toDataURL('image/jpeg', 0.8);
        console.log("Video frame (base64):", base64Data.substring(0, 30) + "...");
        // Later: apiClient.sendRealtimeInput({ image: { data: base64Data.split(',')[1] } });
    } catch (e) {
        console.error("Error capturing frame as JPEG:", e);
    }

    // Schedule next frame capture
    if (frameCaptureIntervalId) clearInterval(frameCaptureIntervalId); // Clear existing before setting new
    frameCaptureIntervalId = setTimeout(() => captureAndSendFrame(videoElement, canvasElement, apiClient, isConnected), 1000 / 15); // Approx 15 FPS

  } else {
    // console.log("Video not active or not connected, stopping frame capture.");
    if (frameCaptureIntervalId) {
      clearInterval(frameCaptureIntervalId);
      frameCaptureIntervalId = null;
    }
  }
}

function stopFrameCapture() {
    if (frameCaptureIntervalId) {
        clearInterval(frameCaptureIntervalId);
        frameCaptureIntervalId = null;
        console.log("Frame capture stopped.");
    }
}

// Expose functions to global scope if needed, or use as module
// window.VideoHandler = { startWebcam, startScreenCapture, stopStream, captureAndSendFrame, stopFrameCapture };
// No, control-tray.js will just call them directly as they are global in this script.
// For better organization, they could be wrapped in an object like VideoHandler.xxx
// but for now, direct calls will work as long as this script is loaded first.
