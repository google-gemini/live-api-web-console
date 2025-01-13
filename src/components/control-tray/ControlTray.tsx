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

import cn from "classnames";

import { memo, ReactNode, RefObject, useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useLiveAPIContext } from "../../contexts/LiveAPIContext";
import { UseMediaStreamResult } from "../../hooks/use-media-stream-mux";
import { useScreenCapture } from "../../hooks/use-screen-capture";
import { useWebcam } from "../../hooks/use-webcam";
import { AudioRecorder } from "../../lib/audio-recorder";
import AudioPulse from "../audio-pulse/AudioPulse";
import "./control-tray.scss";
import { assistantConfigs } from "../../configs/assistant-configs";
import { trackEvent } from "../../configs/analytics";
const { ipcRenderer } = window.require('electron');

export type ControlTrayProps = {
  videoRef: RefObject<HTMLVideoElement>;
  children?: ReactNode;
  supportsVideo: boolean;
  onVideoStreamChange?: (stream: MediaStream | null) => void;
  modes: { value: string }[];
  selectedOption: { value: string };
  setSelectedOption: (option: { value: string }) => void;
};

type MediaStreamButtonProps = {
  isStreaming: boolean;
  onIcon: string;
  offIcon: string;
  start: () => Promise<any>;
  stop: () => any;
};

/**
 * button used for triggering webcam or screen-capture
 */
const MediaStreamButton = memo(
  ({ isStreaming, onIcon, offIcon, start, stop }: MediaStreamButtonProps) =>
    isStreaming ? (
      <button className="action-button" onClick={stop}>
        <span className="material-symbols-outlined">{onIcon}</span>
      </button>
    ) : (
      <button className="action-button" onClick={start}>
        <span className="material-symbols-outlined">{offIcon}</span>
      </button>
    ),
);

function ControlTray({
  videoRef,
  children,
  onVideoStreamChange = () => {},
  supportsVideo,
  modes,
  selectedOption,
  setSelectedOption,
}: ControlTrayProps) {
  const webcamStream = useWebcam();
  const screenCaptureStream = useScreenCapture();
  const videoStreams = useMemo(() => [webcamStream, screenCaptureStream], [webcamStream, screenCaptureStream]);
  const [activeVideoStream, setActiveVideoStream] = useState<MediaStream | null>(null);
  const [webcam, screenCapture] = videoStreams;
  const [inVolume, setInVolume] = useState(0);
  const [audioRecorder] = useState(() => new AudioRecorder());
  const [muted, setMuted] = useState(false);
  const connectButtonRef = useRef<HTMLButtonElement>(null);
  const [carouselIndex, setCarouselIndex] = useState(0);

  const { client, connected, connect, disconnect, volume } = useLiveAPIContext();

  useEffect(() => {
    if (!connected && connectButtonRef.current) {
      connectButtonRef.current.focus();
    }
  }, [connected]);

  useEffect(() => {
    document.documentElement.style.setProperty(
      "--volume",
      `${Math.max(5, Math.min(inVolume * 200, 8))}px`,
    );
  }, [inVolume]);

  // Add error message state
  const [showError, setShowError] = useState(false);

  useEffect(() => {
    let timeoutId: number;
    if (showError) {
      timeoutId = window.setTimeout(() => setShowError(false), 3000);
    }
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [showError]);

  // Add error message styles
  const errorMessageStyle = {
    position: 'absolute',
    bottom: '100%',
    left: '50%',
    transform: 'translateX(-50%)',
    backgroundColor: 'var(--Red-500)',
    color: 'white',
    padding: '8px 16px',
    borderRadius: '8px',
    marginBottom: '8px',
    whiteSpace: 'nowrap',
    opacity: showError ? 1 : 0,
    transition: 'opacity 0.2s ease-in-out',
    pointerEvents: 'none',
  } as const;

  useEffect(() => {
    const onData = (base64: string) => {
      client.sendRealtimeInput([
        {
          mimeType: "audio/pcm;rate=16000",
          data: base64,
        },
      ]);
    };
    if (connected && !muted && audioRecorder) {
      audioRecorder.on("data", onData).on("volume", setInVolume).start();
    } else {
      audioRecorder.stop();
    }
    return () => {
      audioRecorder.off("data", onData).off("volume", setInVolume);
    };
  }, [connected, client, muted, audioRecorder]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = activeVideoStream;
    }
    onVideoStreamChange(activeVideoStream);
  }, [activeVideoStream, onVideoStreamChange, videoRef]);

  //handler for swapping from one video-stream to the next
  const changeStreams = useCallback((next?: UseMediaStreamResult) => async () => {
    if (next) {
      try {
        const mediaStream = await next.start();
        setActiveVideoStream(mediaStream);
        onVideoStreamChange(mediaStream);
        // Send success result for screen sharing
        if (next === screenCapture) {
          ipcRenderer.send('screen-share-result', true);
        }
      } catch (error) {
        // Silently handle cancellation, but still log other errors
        if (!(error instanceof Error && error.message === 'Selection cancelled')) {
          console.error('Error changing streams:', error);
        }
        setActiveVideoStream(null);
        onVideoStreamChange(null);
        // Send failure result for screen sharing
        if (next === screenCapture) {
          ipcRenderer.send('screen-share-result', false);
        }
      }
    } else {
      setActiveVideoStream(null);
      onVideoStreamChange(null);
    }

    videoStreams.filter((msr) => msr !== next).forEach((msr) => msr.stop());
  }, [onVideoStreamChange, screenCapture, videoStreams]);

  useEffect(() => {
    setSelectedOption(modes[carouselIndex]);
    // Send carousel update to control window
    const mode = modes[carouselIndex].value as keyof typeof assistantConfigs;
    const modeName = assistantConfigs[mode].display_name;
    ipcRenderer.send('update-carousel', modeName);
  }, [carouselIndex, modes, setSelectedOption]);

  const handleCarouselChange = useCallback((direction: 'next' | 'prev') => {
    setCarouselIndex(prevIndex => {
      const newIndex = direction === 'next' 
        ? (prevIndex + 1) % modes.length
        : (prevIndex - 1 + modes.length) % modes.length;
      return newIndex;
    });
  }, [modes.length]);

  const handleConnect = () => {
    const apiKeyMatch = client.url.match(/[?&]key=([^&]*)/);
    const apiKey = apiKeyMatch ? decodeURIComponent(apiKeyMatch[1]) : "";
    
    if (!connected && !apiKey) {
      setShowError(true);
      return;
    }

    if (!connected) {
      trackEvent('chat_started', {
        assistant_mode: selectedOption.value,
      });
    }
    
    connected ? disconnect() : connect();
  };

  // Handle carousel actions from control window
  useEffect(() => {
    const handleCarouselAction = (event: any, direction: 'next' | 'prev') => {
      handleCarouselChange(direction);
    };

    ipcRenderer.on('carousel-action', handleCarouselAction);
    return () => {
      ipcRenderer.removeListener('carousel-action', handleCarouselAction);
    };
  }, [handleCarouselChange]);

  // Handle control actions from video window
  useEffect(() => {
    const handleControlAction = (event: any, action: { type: string; value: boolean }) => {
      switch (action.type) {
        case 'mic':
          setMuted(!action.value);
          break;
        case 'screen':
          if (action.value) {
            // Start screen sharing
            changeStreams(screenCapture)();
          } else {
            // Stop screen sharing
            changeStreams()();
          }
          break;
        case 'webcam':
          if (action.value) {
            changeStreams(webcam)();
          } else {
            changeStreams()();
          }
          break;
        case 'connect':
          if (action.value) {
            connect();
          } else {
            disconnect();
          }
          break;
      }
    };

    ipcRenderer.on('control-action', handleControlAction);
    return () => {
      ipcRenderer.removeListener('control-action', handleControlAction);
    };
  }, [connect, disconnect, webcam, screenCapture, changeStreams]);

  // Send state updates to video window
  useEffect(() => {
    ipcRenderer.send('update-control-state', {
      isMuted: muted,
      isScreenSharing: screenCapture.isStreaming,
      isWebcamOn: webcam.isStreaming,
      isConnected: connected
    });
  }, [muted, screenCapture.isStreaming, webcam.isStreaming, connected]);

  return (<>
    <section className="control-tray">
      <div className="control-tray-container">
        <nav className={cn("actions-nav", { disabled: !connected })}>
          <button
            className={cn("action-button mic-button")}
            onClick={() => setMuted(!muted)}
          >
            {!muted ? (
              <span className="material-symbols-outlined filled">mic</span>
            ) : (
              <span className="material-symbols-outlined filled">mic_off</span>
            )}
          </button>

          <div className="action-button no-action outlined">
            <AudioPulse volume={volume} active={connected} hover={false} />
          </div>

          {supportsVideo && (
            <>
              <MediaStreamButton
                isStreaming={screenCapture.isStreaming}
                start={changeStreams(screenCapture)}
                stop={changeStreams()}
                onIcon="cancel_presentation"
                offIcon="present_to_all"
              />
              <MediaStreamButton
                isStreaming={webcam.isStreaming}
                start={changeStreams(webcam)}
                stop={changeStreams()}
                onIcon="videocam_off"
                offIcon="videocam"
              />
            </>
          )}
          {children}
        </nav>
        
        <div className="carousel-container" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: 'auto', width: '100%' }}>
          <button
            className="carousel-button action-button"
            onClick={() => handleCarouselChange('prev')}
            style={{ 
              position: 'relative',
              width: '15%',
              height: '32px',
              background: 'transparent',
            }}
          >
            <span className="material-symbols-outlined">chevron_left</span>
          </button>

          <div className="carousel-content" style={{ width: '70%', textAlign: 'center', justifyContent: 'center' }}>
            <div className="carousel-slide">
              <span className="carousel-text">{assistantConfigs[selectedOption.value as keyof typeof assistantConfigs].display_name}</span>
            </div>
          </div>

          <button
            className="carousel-button action-button"
            onClick={() => handleCarouselChange('next')}
            style={{ 
              width: '15%',
              height: '32px',
              background: 'transparent', 
            }}
          >
            <span className="material-symbols-outlined">chevron_right</span>
          </button>
        </div>
      </div>

      <div className={cn("connection-container", { connected })}>
        <div className="connection-button-container">
        <div style={errorMessageStyle}>
            Please add your API key by clicking the key icon ⚿ in the top right
          </div>
          <button
            ref={connectButtonRef}
            className={cn("action-button connect-toggle", { connected })}
            onClick={handleConnect}
          >
            <span className="material-symbols-outlined filled">
              {connected ? "pause" : "play_arrow"}
            </span>
          </button>
        </div>
        <span className="text-indicator">Streaming</span>
      </div>


    </section>
  </>
  );
}

export default memo(ControlTray);
