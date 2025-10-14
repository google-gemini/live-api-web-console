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

import { useRef, useState } from "react";
import "./App.scss";
import { LiveAPIProvider } from "./contexts/LiveAPIContext";
import SidePanel from "./components/side-panel/SidePanel";
import { Altair } from "./components/altair/Altair";
import ControlTray from "./components/control-tray/ControlTray";
import cn from "classnames";
import { LiveClientOptions } from "./types";

const API_KEY = process.env.REACT_APP_GEMINI_API_KEY as string;
const USE_VERTEX_AI = process.env.REACT_APP_USE_VERTEX_AI === 'true';
const PROJECT_ID = process.env.REACT_APP_GOOGLE_CLOUD_PROJECT as string;
const LOCATION = process.env.REACT_APP_GOOGLE_CLOUD_LOCATION as string;


function createApiOptions(): LiveClientOptions {
  if (USE_VERTEX_AI) {
    // Vertex AI configuration (supports WIF)
    if (!PROJECT_ID || !LOCATION) {
      throw new Error(
        "When using Vertex AI, set REACT_APP_GOOGLE_CLOUD_PROJECT and REACT_APP_GOOGLE_CLOUD_LOCATION in .env"
      );
    }
    
    return {
      vertexai: true,
      project: PROJECT_ID,
      location: LOCATION,
    };
  } else {
    if (!API_KEY) {
      throw new Error("set REACT_APP_GEMINI_API_KEY in .env");
    }
    
    return {
      apiKey: API_KEY,
    };
  }
}

const apiOptions: LiveClientOptions = createApiOptions();

function App() {
  // this video reference is used for displaying the active stream, whether that is the webcam or screen capture
  // feel free to style as you see fit
  const videoRef = useRef<HTMLVideoElement>(null);
  // either the screen capture, the video or null, if null we hide it
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);

  return (
    <div className="App">
      <LiveAPIProvider options={apiOptions}>
        <div className="streaming-console">
          <SidePanel />
          <main>
            <div className="main-app-area">
              {/* APP goes here */}
              <Altair />
              <video
                className={cn("stream", {
                  hidden: !videoRef.current || !videoStream,
                })}
                ref={videoRef}
                autoPlay
                playsInline
              />
            </div>

            <ControlTray
              videoRef={videoRef}
              supportsVideo={true}
              onVideoStreamChange={setVideoStream}
              enableEditingSettings={true}
            >
              {/* put your own buttons here */}
            </ControlTray>
          </main>
        </div>
      </LiveAPIProvider>
    </div>
  );
}

export default App;
