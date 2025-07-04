import React from 'react';
import { UserCircleIcon, WifiIcon, XMarkIcon, Bars3Icon } from '@heroicons/react/24/solid';
import { motion } from 'framer-motion';

const TopBar = ({ logoText, showAvatar, showConnectionStatus, onMenuClick, isMobile, theme }) => {
  // Simulate connection status
  const isConnected = true;

  return (
    <div
      className="flex items-center justify-between p-3 shadow-md"
      style={{ backgroundColor: theme.surface, color: theme.onSurface }}
    >
      {/* Right side (for RTL): Logo and Title */}
      <div className="flex items-center">
        {/* Placeholder for Logo Image - replace with actual <img> or SVG */}
        <div
          className="w-8 h-8 rounded-full mr-2"
          style={{ backgroundColor: theme.primary }}
        ></div>
        <h1 className="text-xl font-semibold" style={{ color: theme.onSurface }}>{logoText}</h1>
      </div>

      {/* Left side (for RTL): Avatar, Connection Status, Menu Button */}
      <div className="flex items-center space-x-3">
        {showAvatar && (
          <UserCircleIcon className="w-7 h-7" style={{ color: theme.onSurface }} />
        )}
        {showConnectionStatus && (
          <motion.div
            animate={{ scale: isConnected ? [1, 1.1, 1] : 1 }}
            transition={{ duration: isConnected ? 1.5 : 0, repeat: isConnected ? Infinity : 0 }}
          >
            <WifiIcon
              className={`w-6 h-6 ${isConnected ? 'text-rl-success' : 'text-rl-critical'}`}
              style={{ color: isConnected ? theme.success : theme.critical }}
            />
          </motion.div>
        )}
        {isMobile && (
          <button onClick={onMenuClick} className="p-1">
            <Bars3Icon className="w-7 h-7" style={{ color: theme.onSurface }}/>
          </button>
        )}
      </div>
    </div>
  );
};

export default TopBar;
