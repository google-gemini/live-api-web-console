import React from 'react';
import { CameraIcon, ComputerDesktopIcon } from '@heroicons/react/24/solid';
import { motion } from 'framer-motion';
import uiSchema from '../../../../ui-schema.json'; // Adjust path as necessary

// Placeholder for VideoPlayer - to be defined/imported later
const VideoPlayer = ({ aspectRatio, overlayTips, theme }) => (
  <div
    className="w-full bg-rl-secondary/30 flex items-center justify-center text-rl-on-surface/70"
    style={{
      aspectRatio: aspectRatio || "16/9",
      backgroundColor: theme.secondary + '33', // Using theme secondary with opacity
      color: theme.onSurface + 'AA'
    }}
  >
    <div className="text-center">
      <ComputerDesktopIcon className="w-16 h-16 mx-auto mb-2 opacity-50" />
      <p>Video Feed / Screen Share Area</p>
      {overlayTips && <p className="text-xs opacity-70">(Real-time tips will appear here)</p>}
    </div>
  </div>
);

// Re-using ActionButton from App.jsx for consistency if it were a shared component
// For this skeleton, we define a local version or assume it's passed if it were separate
const ActionButton = ({ label, icon, variant, size, onClick, theme, isFab }) => {
  const baseStyle = "flex items-center justify-center font-medium rounded-rl transition-all duration-150 ease-in-out shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2";
  const sizeStyle = size === 'lg' ? "px-6 py-3 text-lg" : "px-4 py-2 text-sm";
  const fabStyle = isFab ? "fixed bottom-20 right-4 z-50 !rounded-full !p-4" : ""; // Example FAB style

  let variantStyle = "";
  if (variant === 'primary') {
    variantStyle = `text-rl-on-primary hover:opacity-90 focus:ring-rl-primary`;
  } else if (variant === 'secondary') {
    variantStyle = `text-rl-on-primary hover:opacity-90 focus:ring-rl-secondary`;
  }

  // Apply theme colors directly
  const backgroundColor = variant === 'primary' ? theme.primary : theme.secondary;
  const color = theme.onPrimary;
  const focusRingColor = variant === 'primary' ? theme.primary : theme.secondary;


  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`${baseStyle} ${sizeStyle} ${variantStyle} ${fabStyle}`}
      style={{ backgroundColor, color, borderColor: focusRingColor }}
    >
      {typeof icon === 'string' ? <span className="mr-2">{icon}</span> : React.cloneElement(icon, { className: "w-5 h-5 mr-2"})} {/* RTL: mr for icon before text */}
      {label}
    </motion.button>
  );
};


const MainArea = ({
  videoFeedData,
  cameraBtnData,
  screenBtnData,
  onOpenCamera,
  onStartScreenShare,
  isMobile,
  theme
}) => {
  if (!videoFeedData || !cameraBtnData || !screenBtnData) return null; // Or some loading state

  return (
    <main className="flex-1 p-1 md:p-4 overflow-y-auto bg-rl-background relative">
      {/* Action Buttons for Desktop - below player */}
      {!isMobile && (
        <div className="flex justify-center items-center space-x-4 space-x-reverse mb-3">
          <ActionButton
            {...cameraBtnData.props}
            onClick={onOpenCamera}
            icon={<CameraIcon className="w-6 h-6" />}
            theme={theme}
          />
          <ActionButton
            {...screenBtnData.props}
            onClick={onStartScreenShare}
            icon={<ComputerDesktopIcon className="w-6 h-6" />}
            theme={theme}
          />
        </div>
      )}

      <VideoPlayer
        aspectRatio={videoFeedData.props.aspectRatio}
        overlayTips={videoFeedData.props.overlayTips}
        theme={theme}
      />

      {/* Placeholder for Overlay Tips (Toasts / Speech Bubbles) */}
      {videoFeedData.props.overlayTips && (
        <div className="absolute top-16 right-6 md:top-20 md:right-10 p-2 bg-rl-surface text-rl-on-surface text-xs rounded-rl shadow-lg z-10">
          <p>💡 Tip: Keep calm and focused!</p>
        </div>
      )}
    </main>
  );
};

export default MainArea;
