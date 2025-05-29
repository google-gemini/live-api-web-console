document.addEventListener('DOMContentLoaded', () => {
  const sidePanel = document.getElementById('side-panel');
  const openButton = document.getElementById('side-panel-open-button');
  const closeButton = document.getElementById('side-panel-close-button');
  const sidePanelTitle = document.getElementById('side-panel-title');
  const mainContentArea = document.getElementById('main-content-area'); // Get reference to main content
  
  const logFilterSelect = document.getElementById('log-filter-select');
  const streamingIndicatorSidePanel = document.getElementById('streaming-indicator-sidedisplay');
  const streamingIndicatorText = streamingIndicatorSidePanel ? streamingIndicatorSidePanel.querySelector('.indicator-text') : null;
  
  const loggerContainer = document.getElementById('side-panel-logger-container');
  const inputArea = document.getElementById('side-panel-input-area');
  const sendButton = document.getElementById('side-panel-send-button');
  const inputContainer = document.getElementById('side-panel-input-container');
  const inputPlaceholder = document.querySelector('.input-content-placeholder');
  const clearLogsButton = document.getElementById('clear-logs-button');

  let currentLogFilter = 'none'; // Default
  let isPanelOpen = sidePanel ? sidePanel.classList.contains('open') : true; // Initial state
  let maxLogs = 100; // Maximum number of log entries to display

  // --- Panel Toggle ---
  function setPanelOpenState(isOpen) {
    if (!sidePanel) return;
    isPanelOpen = isOpen;
    if (isOpen) {
      sidePanel.classList.add('open');
      if (openButton) openButton.style.display = 'none';
      if (closeButton) closeButton.style.display = 'block'; // Or 'flex'/'inline-flex'
      if (sidePanelTitle) sidePanelTitle.style.display = 'block'; // Or 'inline'
      if (streamingIndicatorText) streamingIndicatorText.style.display = 'inline'; // Show text
      if (mainContentArea) mainContentArea.style.paddingLeft = '400px';
    } else {
      sidePanel.classList.remove('open');
      if (openButton) openButton.style.display = 'block';
      if (closeButton) closeButton.style.display = 'none';
      if (sidePanelTitle) sidePanelTitle.style.display = 'none';
      if (streamingIndicatorText) streamingIndicatorText.style.display = 'none'; // Hide text
      if (mainContentArea) mainContentArea.style.paddingLeft = '40px';
    }
    // Update control tray's audio pulse visualizer based on panel state
    if (window.updateAudioPulseForSidePanel) {
        window.updateAudioPulseForSidePanel(isOpen);
    }
  }

  if (openButton) {
    openButton.addEventListener('click', () => setPanelOpenState(true));
  }
  if (closeButton) {
    closeButton.addEventListener('click', () => setPanelOpenState(false));
  }
  // Initial setup based on class
  setPanelOpenState(isPanelOpen);


  // --- Log Filter ---
  if (logFilterSelect) {
    logFilterSelect.addEventListener('change', (event) => {
      currentLogFilter = event.target.value;
      console.log(`Log filter changed to: ${currentLogFilter}`);
      // Here you would typically re-render or filter the logs displayed in loggerContainer
      // For now, just logging. The logger.html would need to handle this.
    });
  }

  // --- Streaming Indicator ---
  // This function can be called externally, e.g., by control-tray.js
  window.updateStreamingIndicatorSidePanel = function(isConnected) {
    if (!streamingIndicatorSidePanel) return;
    const icon = streamingIndicatorSidePanel.querySelector('.indicator-icon');
    const text = streamingIndicatorSidePanel.querySelector('.indicator-text');

    if (isConnected) {
      streamingIndicatorSidePanel.classList.add('connected');
      if (icon) icon.textContent = '🔵';
      if (text) text.textContent = 'Streaming';
    } else {
      streamingIndicatorSidePanel.classList.remove('connected');
      if (icon) icon.textContent = '⏸️';
      if (text) text.textContent = 'Paused';
    }
    // Also update input container state
    if (inputContainer) {
        if(isConnected) {
            inputContainer.classList.remove('disabled');
            if(inputArea) inputArea.disabled = false;
            if(sendButton) sendButton.disabled = false;
        } else {
            inputContainer.classList.add('disabled');
            if(inputArea) inputArea.disabled = true;
            if(sendButton) sendButton.disabled = true;
        }
    }
  };
  // Initial call based on current state (passed via Jinja to data attribute or class)
  // The connected class is set by Jinja, so this will reflect the initial state.
  const initialConnectedState = streamingIndicatorSidePanel ? streamingIndicatorSidePanel.classList.contains('connected') : false;
  window.updateStreamingIndicatorSidePanel(initialConnectedState);


  // --- Auto-scroll Logger ---
  function scrollLoggerToBottom() {
    if (loggerContainer) {
      loggerContainer.scrollTop = loggerContainer.scrollHeight;
    }
  }
  scrollLoggerToBottom(); // Call once on load

  // --- Text Input ---
  function handleSendMessage() {
    if (!inputArea || inputArea.value.trim() === '') return;
    const text = inputArea.value.trim();
    
    if (window.liveApiClientInstance && window.liveApiClientInstance.status === 'connected') {
      window.liveApiClientInstance.sendClientContent([{ text: text }]);
      // Optionally, log this outgoing message to the side panel as well
      // addLogToSidePanel({ date: new Date().toISOString(), type: 'client.textSend', message: text });
      console.log(`Message sent via LiveAPIClient: ${text}`);
    } else {
      console.warn("LiveAPIClient not connected. Message not sent:", text);
      // Optionally, provide user feedback that client is not connected
      addLogToSidePanel({ date: new Date().toISOString(), type: 'client.error', message: "Cannot send message, not connected." });
    }
    
    inputArea.value = '';
    updatePlaceholderVisibility();
    // scrollLoggerToBottom(); // Will be called by addLogToSidePanel if implemented
  }

  if (sendButton) {
    sendButton.addEventListener('click', handleSendMessage);
  }

  if (inputArea) {
    inputArea.addEventListener('keypress', (event) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault(); // Prevent new line
        handleSendMessage();
      }
    });
    inputArea.addEventListener('input', updatePlaceholderVisibility);
  }

  function updatePlaceholderVisibility() {
    if (!inputArea || !inputPlaceholder) return;
    if (inputArea.value.trim() !== '') {
      inputPlaceholder.style.display = 'none';
    } else {
      inputPlaceholder.style.display = 'flex'; // Or 'block'
    }
  }
  updatePlaceholderVisibility(); // Initial check

  }
  updatePlaceholderVisibility(); // Initial check

  // --- Helper function to format a single part (similar to render_part macro) ---
  function formatLogPartAsHTML(part) {
    if (part.text) {
      return `<p class="part part-text">${escapeHTML(part.text)}</p>`;
    } else if (part.executableCode) {
      return `<div class="part part-executableCode">
                <h5>executableCode: ${escapeHTML(part.executableCode.language)}</h5>
                <pre>${escapeHTML(part.executableCode.code)}</pre>
              </div>`;
    } else if (part.codeExecutionResult) {
      return `<div class="part part-codeExecutionResult">
                <h5>codeExecutionResult: ${escapeHTML(part.codeExecutionResult.outcome)}</h5>
                <pre>${escapeHTML(part.codeExecutionResult.output)}</pre>
              </div>`;
    } else if (part.inlineData) { // From serverContent.modelTurn.parts
        return `<div class="part part-inlinedata">Inline Data: ${escapeHTML(part.inlineData.mimeType)} (data not shown)</div>`;
    }
    // Add more part types if necessary (e.g., toolUse, toolResponse from original GenAILiveClient)
    return `<div class="part part-unknown">${escapeHTML(JSON.stringify(part, null, 2))}</div>`;
  }
  
  function escapeHTML(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/[&<>"']/g, function (match) {
      return {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      }[match];
    });
  }

  // --- Helper function to format a log message object (similar to render_log_message macro) ---
  function formatLogMessageAsHTML(logMessage) {
    if (typeof logMessage === 'string') {
      return `<span>${escapeHTML(logMessage)}</span>`;
    }
    if (typeof logMessage !== 'object' || logMessage === null) {
      return `<span>${escapeHTML(String(logMessage))}</span>`;
    }

    let html = '';
    // ClientContentLog (from client.send)
    if (logMessage.turns && Array.isArray(logMessage.turns)) {
      html += `<div class="rich-log client-content user"><h4 class="roler-user">User</h4>`;
      logMessage.turns.forEach(turn => {
        // Assuming 'turn' here can have 'text' or other part structures
        if (turn.text) html += formatLogPartAsHTML({ text: turn.text });
        else html += formatLogPartAsHTML(turn); // If 'turn' itself is a part
      });
      if (logMessage.turnComplete === false) { // Explicitly check for false
        html += `<p>turnComplete: false</p>`;
      }
      html += `</div>`;
    }
    // ToolCallLog (from server.toolCall)
    else if (logMessage.functionCalls && Array.isArray(logMessage.functionCalls)) { // Directly from message.toolCall
        html += `<div class="rich-log tool-call">`;
        logMessage.functionCalls.forEach(call => {
            html += `<h5>Function call: ${escapeHTML(call.name)} (ID: ${escapeHTML(call.id)})</h5>`;
            html += `<pre>${escapeHTML(JSON.stringify(call.args, null, 2))}</pre>`;
        });
        html += `</div>`;
    }
    // ToolCallCancellationLog (from server.toolCallCancellation)
    else if (logMessage.ids && Array.isArray(logMessage.ids)) { // Directly from message.toolCallCancellation
        html += `<div class="rich-log tool-call-cancellation">IDs: ${escapeHTML(logMessage.ids.join(', '))}</div>`;
    }
    // ToolResponseLog (from client.toolResponse)
    else if (logMessage.functionResponses && Array.isArray(logMessage.functionResponses)) {
        html += `<div class="rich-log tool-response">`;
        logMessage.functionResponses.forEach(response => {
            html += `<h5>Function Response ID: ${escapeHTML(response.id)}</h5>`;
            html += `<pre>${escapeHTML(JSON.stringify(response.response, null, 2))}</pre>`;
        });
        html += `</div>`;
    }
    // ModelTurnLog (from serverContent.modelTurn, via 'content' event)
    else if (logMessage.modelTurn && logMessage.modelTurn.parts) {
      html += `<div class="rich-log model-turn model"><h4 class="role-model">Model</h4>`;
      logMessage.modelTurn.parts.forEach(part => {
        html += formatLogPartAsHTML(part);
      });
      html += `</div>`;
    }
    // server.audioParts log
    else if (logMessage.count && logMessage.bytes !== undefined) { // Crude check for server.audio log
        html += `<span>Audio Chunks: ${logMessage.count}, Total Bytes: ${logMessage.bytes}</span>`;
    }
    // client.realtimeInput log
    else if (logMessage.media && Array.isArray(logMessage.media)) {
         html += `<span>Media chunks: ${logMessage.media.length}, types: ${logMessage.media.map(m=>escapeHTML(m.mimeType)).join(', ')}</span>`;
    }
    // server.interrupted / server.turnComplete (empty object as message)
    else if (Object.keys(logMessage).length === 0) {
        html += `<span>(Event marker)</span>`;
    }
    // Default fallback for other objects
    else {
      html += `<pre>${escapeHTML(JSON.stringify(logMessage, null, 2))}</pre>`;
    }
    return html;
  }


  // --- Function to add logs to the UI ---
  window.addLogToSidePanel = function(logEntry) {
    if (!loggerContainer) return;
    const loggerList = loggerContainer.querySelector('.logger-list');
    if (!loggerList) return;

    const lastLogItem = loggerList.lastElementChild;
    const newLogMessageStr = typeof logEntry.message === 'object' ? JSON.stringify(logEntry.message) : String(logEntry.message);

    // Log Counting Logic
    if (lastLogItem && 
        lastLogItem.dataset.logType === logEntry.type &&
        lastLogItem.dataset.logMessageStr === newLogMessageStr) {
      
      let countSpan = lastLogItem.querySelector('.count');
      let currentCount = parseInt(lastLogItem.dataset.count || '1', 10);
      currentCount++;
      lastLogItem.dataset.count = currentCount;

      if (!countSpan) {
        countSpan = document.createElement('span');
        countSpan.className = 'count';
        // Insert countSpan after the sourceSpan, or adjust as needed
        const sourceSpanExisting = lastLogItem.querySelector('.source');
        if (sourceSpanExisting && sourceSpanExisting.nextSibling) {
            lastLogItem.insertBefore(countSpan, sourceSpanExisting.nextSibling);
        } else if (sourceSpanExisting) {
            lastLogItem.appendChild(countSpan); // Fallback if no nextSibling
        } else { // Fallback if no sourceSpan (should not happen with current structure)
            const timestampSpanExisting = lastLogItem.querySelector('.timestamp');
            if (timestampSpanExisting && timestampSpanExisting.nextSibling) {
                lastLogItem.insertBefore(countSpan, timestampSpanExisting.nextSibling);
            } else {
                 lastLogItem.appendChild(countSpan);
            }
        }
      }
      countSpan.textContent = `(x${currentCount})`;
      // No new <li>, just update count. Ensure scroll if needed.
      scrollLoggerToBottom(); 
      return; // Stop further processing for this log entry
    }

    // If different, create a new log item
    const item = document.createElement('li');
    item.dataset.logType = logEntry.type;
    item.dataset.logMessageStr = newLogMessageStr;
    item.dataset.count = '1'; // Initial count for a new log entry

    let typeClass = 'plain-log';
    if (logEntry.type) {
      const typeParts = logEntry.type.split('.');
      const primaryType = typeParts[0]; 
      const secondaryType = typeParts[1];
      typeClass += ` source-${primaryType}`;
      if (primaryType === 'client') typeClass += ' send';
      else if (primaryType === 'server') typeClass += ' receive';
      if (secondaryType) typeClass += ` log-type-${secondaryType.toLowerCase()}`;
    }
    item.className = typeClass;

    const timestampSpan = document.createElement('span');
    timestampSpan.className = 'timestamp';
    timestampSpan.textContent = new Date(logEntry.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const sourceSpan = document.createElement('span');
    sourceSpan.className = 'source';
    sourceSpan.textContent = logEntry.type;

    const messageSpan = document.createElement('span');
    messageSpan.className = 'message';
    messageSpan.innerHTML = formatLogMessageAsHTML(logEntry.message);

    item.appendChild(timestampSpan);
    item.appendChild(sourceSpan);
    item.appendChild(messageSpan);

    // Count span is only added if count > 1 by the logic above, 
    // or if the original logEntry had a 'count' (e.g. from mock data, though API client logs won't have this initially)
    if (typeof logEntry.count === 'number' && logEntry.count > 1) { 
      const countSpan = document.createElement('span');
      countSpan.className = 'count';
      countSpan.textContent = `(x${logEntry.count})`;
      item.appendChild(countSpan);
      item.dataset.count = logEntry.count; // Ensure dataset reflects this initial count
    }


    loggerList.appendChild(item);

    // Enforce maxLogs
    while (loggerList.children.length > maxLogs) {
      loggerList.removeChild(loggerList.firstChild);
    }

    scrollLoggerToBottom();
  };
  console.log("addLogToSidePanel function (refined with counting & maxLogs) is now available globally.");

  // --- Clear Logs Button Functionality ---
  if (clearLogsButton) {
    clearLogsButton.addEventListener('click', () => {
      if (loggerContainer) {
        const loggerList = loggerContainer.querySelector('.logger-list');
        if (loggerList) {
          loggerList.innerHTML = ''; // Remove all child li elements
          // Optionally, add a log entry indicating logs were cleared
          // addLogToSidePanel({ date: new Date().toISOString(), type: 'client.info', message: 'Logs cleared.' });
          console.log("Logs cleared from side panel.");
        }
      }
    });
  }
});
