import React, { useState, useEffect } from 'react';
import TopBar from './components/layout/TopBar';
import LeftSidebar from './components/layout/LeftSidebar';
import MainArea from './components/layout/MainArea';
import ActionButton from './components/ui/ActionButton'; // For FABs
import { CameraIcon, ComputerDesktopIcon } from '@heroicons/react/24/solid';
import uiSchema from '../../ui-schema.json'; // Adjust path as necessary

// Mock JS functions based on requirements
const openCamera = () => console.log("Camera opened");
const startScreenShare = () => console.log("Screen share started");

function App() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isSidebarOpen, setIsSidebarOpen] = useState(!isMobile); // Open by default on desktop

  const { theme, components, actions } = uiSchema;

  // Component data from schema
  const headerBarData = components.find(c => c.id === 'headerBar');
  const cameraBtnData = components.find(c => c.id === 'cameraBtn');
  const screenBtnData = components.find(c => c.id === 'screenBtn');
  const videoFeedData = components.find(c => c.id === 'videoFeed');
  const alertStatusCardData = components.find(c => c.id === 'alertStatusCard');
  const alertListData = components.find(c => c.id === 'alertList');
  const audioToggleData = components.find(c => c.id === 'audioToggle');
  const reportChannelsData = components.find(c => c.id === 'reportChannels');
  const systemCheckBtnData = components.find(c => c.id === 'systemCheckBtn');

  // Action callbacks from schema
  const getActionCallback = (actionName) => {
    const action = actions.find(a => a.name === actionName);
    if (!action) return () => console.error(`Action ${actionName} not found`);
    // This is a simplified lookup, real implementation might use a map
    if (action.callback === "openCamera()") return openCamera;
    if (action.callback === "startScreenShare()") return startScreenShare;
    return () => console.log(`Executing ${action.callback}`);
  };

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) { // If resizing to desktop
        setIsSidebarOpen(true); // Keep sidebar open on desktop
      } else {
        setIsSidebarOpen(false); // Close sidebar by default on mobile
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Initial check

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleSidebar = () => {
    if (isMobile) {
      setIsSidebarOpen(!isSidebarOpen);
    }
  };

  // Apply theme colors as CSS variables to :root
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--rl-primary', theme.primary);
    root.style.setProperty('--rl-secondary', theme.secondary);
    root.style.setProperty('--rl-success', theme.success);
    root.style.setProperty('--rl-warning', theme.warning);
    root.style.setProperty('--rl-critical', theme.critical);
    root.style.setProperty('--rl-background', theme.background);
    root.style.setProperty('--rl-surface', theme.surface);
    root.style.setProperty('--rl-on-primary', theme.onPrimary);
    root.style.setProperty('--rl-on-surface', theme.onSurface);
    root.style.setProperty('--rl-border-radius', theme.borderRadius);
    document.body.style.fontFamily = theme.fontFamily;
  }, [theme]);


  return (
    <div dir="rtl" className="flex flex-col h-screen overflow-hidden bg-rl-background text-rl-on-surface">
      <TopBar
        logoText={headerBarData.props.logoText}
        showAvatar={headerBarData.props.avatar}
        showConnectionStatus={headerBarData.props.connectionStatus}
        onMenuClick={toggleSidebar}
        isMobile={isMobile}
        theme={theme}
      />
      <div className="flex flex-1 overflow-hidden">
        <LeftSidebar
          isOpen={isSidebarOpen}
          isMobile={isMobile}
          toggleSidebar={toggleSidebar}
          alertStatusCardData={alertStatusCardData}
          alertListData={alertListData}
          audioToggleData={audioToggleData}
          reportChannelsData={reportChannelsData}
          systemCheckBtnData={systemCheckBtnData}
          getActionCallback={getActionCallback}
          theme={theme}
        />
        <MainArea
          videoFeedData={videoFeedData}
          cameraBtnData={cameraBtnData}
          screenBtnData={screenBtnData}
          onOpenCamera={getActionCallback('openCamera')}
          onStartScreenShare={getActionCallback('startScreenShare')}
          isMobile={isMobile}
          theme={theme}
        />
      </div>

      {isMobile && (
        <div className="fixed bottom-0 left-0 right-0 p-4 flex justify-center items-center gap-4 bg-rl-surface/80 backdrop-blur-sm z-40">
          <ActionButton
            {...cameraBtnData.props}
            onClick={getActionCallback('openCamera')}
            icon={<CameraIcon className="w-6 h-6" />}
            isFab={true}
            theme={theme}
          />
          <ActionButton
            {...screenBtnData.props}
            onClick={getActionCallback('startScreenShare')}
            icon={<ComputerDesktopIcon className="w-6 h-6" />}
            isFab={true}
            theme={theme}
          />
        </div>
      )}
    </div>
  );
}

export default App;
