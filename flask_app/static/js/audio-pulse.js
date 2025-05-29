document.addEventListener('DOMContentLoaded', () => {
  const audioPulseElement = document.querySelector('.audioPulse');
  if (!audioPulseElement) return;

  const lines = audioPulseElement.querySelectorAll('div');

  function updateVolume(element, volume) {
    const isActive = element.dataset.active === 'true';
    lines.forEach((line, index) => {
      let height;
      if (isActive) {
        const isMiddleLine = index === 1;
        height = Math.min(24, 4 + volume * (isMiddleLine ? 400 : 60));
      } else {
        height = 4; // Default height when not active
      }
      line.style.height = `${height}px`;
    });
  }

  function applyAttributes(element) {
    const isActive = element.dataset.active === 'true';
    const isHover = element.dataset.hover === 'true';
    const volume = parseFloat(element.dataset.volume) || 0;

    if (isActive) {
      element.classList.add('active');
    } else {
      element.classList.remove('active');
    }

    if (isHover) {
      element.classList.add('hover');
    } else {
      element.classList.remove('hover');
    }
    updateVolume(element, volume);
  }

  // Initial application of attributes
  applyAttributes(audioPulseElement);

  // Use MutationObserver to watch for attribute changes
  const observer = new MutationObserver((mutationsList) => {
    for (const mutation of mutationsList) {
      if (mutation.type === 'attributes' && 
          (mutation.attributeName === 'data-volume' || 
           mutation.attributeName === 'data-active' ||
           mutation.attributeName === 'data-hover')) {
        applyAttributes(mutation.target);
      }
    }
  });

  observer.observe(audioPulseElement, { attributes: true });

  // Animation logic: Replicate continuous update if active (or based on hover if preferred)
  // For this version, the height is primarily driven by data-volume changes and active state.
  // The SCSS handles the 'hover' animation.
  // If a continuous pulse is needed even without volume changes, that would be an additional timer.
  // The original React component had a setInterval for animation updates.
  // Let's add a simple interval if active to mimic some dynamic behavior,
  // assuming volume might not update frequently via attributes alone.
  // This part is tricky to directly translate without knowing the exact intended animation behavior
  // when 'active' but volume is static. The current CSS handles a 'hover' animation.
  // If 'active' implies the pulsing based on volume, then attribute changes are enough.
  // If 'active' should pulse even with static volume (like a heartbeat),
  // we might need a separate animation loop here.
  // For now, updates are driven by attribute changes.

  // Example of how to simulate volume changes for testing:
  // setTimeout(() => { audioPulseElement.dataset.volume = "0.5"; }, 2000);
  // setTimeout(() => { audioPulseElement.dataset.active = "true"; }, 3000);
  // setTimeout(() => { audioPulseElement.dataset.volume = "0.8"; }, 4000);
  // setTimeout(() => { audioPulseElement.dataset.hover = "true"; }, 5000);
});
