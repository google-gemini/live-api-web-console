document.addEventListener('DOMContentLoaded', () => {
  const controlTrayElement = document.querySelector('.control-tray'); // To read initial connected state
  const settingsDialogToggle = document.getElementById('settings-dialog-toggle');
  const settingsDialogElement = document.getElementById('settings-dialog-element');
  const settingsDialogCloseButton = document.getElementById('settings-dialog-close-button');

  if (!settingsDialogToggle || !settingsDialogElement) {
    // console.log("Settings dialog toggle or element not found. Skipping JS setup.");
    return;
  }

  // --- Dialog DOM Elements ---
  const responseModalitySelect = document.getElementById('response-modality');
  const voiceSelectorSelect = document.getElementById('voice-selector');
  const systemInstructionsTextarea = document.getElementById('system-instructions');
  const functionDescriptionInputs = settingsDialogElement.querySelectorAll('.fd-row-description');

  // --- Dialog Toggle ---
  settingsDialogToggle.addEventListener('click', () => {
    if (settingsDialogElement.classList.contains('open')) {
      settingsDialogElement.classList.remove('open');
      // settingsDialogElement.close(); // If using <dialog> showModal
    } else {
      settingsDialogElement.classList.add('open');
      // settingsDialogElement.showModal(); // If using <dialog> showModal
    }
    console.log('Settings dialog toggled');
  });

  if (settingsDialogCloseButton) {
    settingsDialogCloseButton.addEventListener('click', () => {
        settingsDialogElement.classList.remove('open');
        // settingsDialogElement.close(); // If using <dialog> showModal
        console.log('Settings dialog closed');
    });
  }


  // --- Input Handling ---
  if (responseModalitySelect) {
    responseModalitySelect.addEventListener('change', (event) => {
      console.log(`Response modality updated: ${event.target.value}`);
    });
  }

  if (voiceSelectorSelect) {
    voiceSelectorSelect.addEventListener('change', (event) => {
      console.log(`Voice selector updated: ${event.target.value}`);
    });
  }

  if (systemInstructionsTextarea) {
    systemInstructionsTextarea.addEventListener('input', (event) => {
      // Using 'input' for more immediate feedback than 'change'
      console.log(`System instructions updated: ${event.target.value}`);
    });
  }

  functionDescriptionInputs.forEach(input => {
    input.addEventListener('change', (event) => {
      const funcName = event.target.dataset.funcName;
      console.log(`Function '${funcName}' description updated: ${event.target.value}`);
    });
  });

  // --- Disable Fields when Connected ---
  // This function can be called from control-tray.js or other places
  // For now, it's defined here and can be called based on initial connected state.
  window.setSettingsDialogDisabled = function(isDisabled) {
    if (!settingsDialogElement) return;

    console.log(`Setting dialog fields disabled state to: ${isDisabled}`);
    
    if (responseModalitySelect) responseModalitySelect.disabled = isDisabled;
    if (voiceSelectorSelect) voiceSelectorSelect.disabled = isDisabled;
    if (systemInstructionsTextarea) systemInstructionsTextarea.disabled = isDisabled;
    functionDescriptionInputs.forEach(input => {
      input.disabled = isDisabled;
    });

    // Visually indicate that the dialog is disabled (e.g., by adding a class)
    const dialogContainer = settingsDialogElement.querySelector('.dialog-container');
    if (dialogContainer) {
        if (isDisabled) {
            dialogContainer.classList.add('disabled-state'); // You'd need to style this class
        } else {
            dialogContainer.classList.remove('disabled-state');
        }
    }
    // Also, the connected indicator text is handled by Jinja template based on 'connected' var
  };

  // Initial check based on data passed to control_tray, which is then passed to settings_dialog.html
  // However, the actual 'connected' state for the dialog is best managed via its own 'connected' variable passed during include.
  // The `controlTrayElement.dataset.connected` is for the overall control tray, not specifically the dialog.
  // For the settings dialog, the `{% if connected %}` block in `settings_dialog.html` handles the indicator.
  // The disabling of fields is handled by the `setSettingsDialogDisabled` function.
  // We need to know the initial connected state for the dialog itself.
  // Let's assume the `connected` variable passed to settings_dialog.html is the source of truth.
  // This JS runs after the HTML is rendered, so we can't directly access Jinja variables.
  // The simplest way is to have a small script block in settings_dialog.html that calls this function,
  // or check for the presence of the connected-indicator.
  
  const connectedIndicator = settingsDialogElement.querySelector('.connected-indicator');
  if (connectedIndicator && window.getComputedStyle(connectedIndicator).display !== 'none') {
      window.setSettingsDialogDisabled(true);
  } else {
      window.setSettingsDialogDisabled(false);
  }

});
