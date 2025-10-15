import React from 'react';
import { XMarkIcon, CogIcon, ChevronUpIcon, ChevronDownIcon, EnvelopeIcon, ChatBubbleLeftEllipsisIcon, PaperAirplaneIcon, ChatBubbleBottomCenterTextIcon } from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';
import uiSchema from '../../../../ui-schema.json'; // Adjust path as necessary

// Placeholder components to be defined or imported later
const StatusCard = ({ title, counters, theme }) => (
  <div className="p-3 rounded-rl mb-4" style={{ backgroundColor: theme.surface, border: `1px solid ${theme.secondary}`}}>
    <h3 className="text-sm font-semibold mb-2" style={{ color: theme.onSurface }}>{title}</h3>
    <div className="space-y-1">
      {counters.map(counter => (
        <div key={counter.label} className="flex justify-between items-center text-xs">
          <span style={{ color: theme.onSurface }}>{counter.label}</span>
          <motion.span
            className="font-bold px-1.5 py-0.5 rounded-sm text-xs"
            style={{ backgroundColor: theme[counter.color], color: theme.onPrimary }}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20, delay: Math.random() * 0.5 }}
          >
            {counter.count}
          </motion.span>
        </div>
      ))}
    </div>
  </div>
);

const ScrollableList = ({ title, items = [], emptyState, theme }) => (
  <div className="mb-4">
    <h3 className="text-sm font-semibold mb-1" style={{ color: theme.onSurface }}>{title}</h3>
    <div className="h-32 overflow-y-auto p-2 rounded-rl border" style={{ borderColor: theme.secondary, backgroundColor: theme.background }}>
      {items.length === 0 ? (
        <p className="text-xs text-center py-4" style={{color: theme.onSurface + '99'}}>{emptyState}</p>
      ) : (
        items.map((item, index) => <div key={index} className="p-1.5 text-xs rounded-sm mb-1" style={{backgroundColor: theme.surface}}>{item.content}</div>)
      )}
    </div>
  </div>
);

const ToggleSwitch = ({ label, state, onChange, theme }) => (
  <div className="flex items-center justify-between mb-3 p-2 rounded-rl" style={{backgroundColor: theme.surface}}>
    <span className="text-xs" style={{ color: theme.onSurface }}>{label}</span>
    <button
      onClick={onChange}
      className={`w-10 h-5 flex items-center rounded-full p-0.5 cursor-pointer transition-colors duration-300 ease-in-out`}
      style={{ backgroundColor: state ? theme.primary : theme.secondary }}
    >
      <motion.div
        className="w-4 h-4 rounded-full shadow-md"
        style={{ backgroundColor: theme.onPrimary }}
        layout
        transition={{ type: "spring", stiffness: 700, damping: 30 }}
        initial={{ x: state ? '100%' : '0%' }}
        animate={{ x: state ? '100%' : '0%' }}
      />
    </button>
  </div>
);

const OptionList = ({ title, options, onToggle, theme }) => {
  const iconMap = {
    email: <EnvelopeIcon className="w-4 h-4 mr-2" />,
    whatsapp: <ChatBubbleLeftEllipsisIcon className="w-4 h-4 mr-2" />,
    telegram: <PaperAirplaneIcon className="w-4 h-4 mr-2 transform rotate-45" />,
    sms: <ChatBubbleBottomCenterTextIcon className="w-4 h-4 mr-2" />,
  };

  return (
    <div className="mb-4">
      <h3 className="text-sm font-semibold mb-1" style={{ color: theme.onSurface }}>{title}</h3>
      <div className="space-y-1">
        {options.map(option => (
          <div
            key={option.id}
            className="flex items-center justify-between p-1.5 rounded-rl text-xs"
            style={{ backgroundColor: theme.surface }}
          >
            <div className="flex items-center" style={{ color: option.enabled ? theme.onSurface : theme.onSurface + '77' }}>
              {iconMap[option.icon]}
              {option.label}
            </div>
            {/* This is a simplified representation. Sliders would be more complex. */}
            <button
              onClick={() => onToggle(option.id, !option.enabled)}
              className={`w-8 h-4 flex items-center rounded-full p-0.5 cursor-pointer transition-colors`}
              style={{ backgroundColor: option.enabled ? theme.primary : theme.secondary }}
            >
              <motion.div
                className="w-3 h-3 bg-white rounded-full shadow"
                layout
                transition={{ type: "spring", stiffness: 700, damping: 30 }}
                initial={{ x: option.enabled ? '100%' : '0%' }}
                animate={{ x: option.enabled ? '100%' : '0%' }}
              />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};


const LeftSidebar = ({
  isOpen,
  isMobile,
  toggleSidebar,
  alertStatusCardData,
  alertListData,
  audioToggleData,
  reportChannelsData,
  systemCheckBtnData,
  getActionCallback,
  theme
}) => {
  // Mock states for interactive elements
  const [audioEnabled, setAudioEnabled] = React.useState(audioToggleData?.props?.state || false);
  const [channels, setChannels] = React.useState(reportChannelsData?.props?.options || []);

  const handleToggleAudio = () => {
    setAudioEnabled(!audioEnabled);
    getActionCallback('toggleAudioAlerts')(); // Call the mapped action
  };

  const handleToggleChannel = (channelId, enabled) => {
    setChannels(channels.map(c => c.id === channelId ? { ...c, enabled } : c));
    getActionCallback('toggleReportChannel')(channelId, enabled); // Call the mapped action
  };

  const sidebarVariants = {
    open: { x: 0 },
    closed: { x: "100%" } // For RTL, sidebar comes from the right
  };
  const mobileOverlayVariants = {
    open: { opacity: 1, pointerEvents: 'auto' },
    closed: { opacity: 0, pointerEvents: 'none' }
  };

  if (!alertStatusCardData) return null; // Or some loading/error state

  return (
    <>
      {isMobile && (
        <AnimatePresence>
          {isOpen && (
            <motion.div
              className="fixed inset-0 bg-black/50 z-40"
              initial="closed"
              animate="open"
              exit="closed"
              variants={mobileOverlayVariants}
              onClick={toggleSidebar}
            />
          )}
        </AnimatePresence>
      )}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="sidebar"
            initial="closed"
            animate="open"
            exit="closed"
            variants={sidebarVariants}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className={`fixed top-0 right-0 h-full shadow-lg z-50 flex flex-col
                        w-[280px] p-4 space-y-3 overflow-y-auto
                        md:static md:w-[280px] md:translate-x-0 md:z-auto md:shadow-none md:border-l`}
            style={{ backgroundColor: theme.surface, color: theme.onSurface, borderColor: theme.secondary }}
          >
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-md font-semibold" style={{color: theme.onSurface}}>תפריט ניווט</h2>
              {isMobile && (
                <button onClick={toggleSidebar} className="p-1">
                  <XMarkIcon className="w-6 h-6" style={{color: theme.onSurface}}/>
                </button>
              )}
            </div>

            <StatusCard
              title={alertStatusCardData.props.title}
              counters={alertStatusCardData.props.counters}
              theme={theme}
            />
            <ScrollableList
              title={alertListData.props.title}
              emptyState={alertListData.props.emptyState}
              // items={[{content: "Test Alert 1"}, {content: "Test Alert 2"}]} // Replace with actual data
              theme={theme}
            />
            <ToggleSwitch
              label={audioToggleData.props.label}
              state={audioEnabled}
              onChange={handleToggleAudio}
              theme={theme}
            />
            <OptionList
              title={reportChannelsData.props.title}
              options={channels}
              onToggle={handleToggleChannel}
              theme={theme}
            />

            <div className="mt-auto pt-4 border-t" style={{borderColor: theme.secondary + '55'}}>
              <button
                onClick={getActionCallback('runSystemCheck')}
                className="w-full flex items-center justify-center p-2 rounded-rl text-sm font-medium transition-colors"
                style={{
                  color: theme.onSurface,
                  border: `1px solid ${theme.primary}`,
                  backgroundColor: 'transparent'
                }}
                onMouseOver={e => e.currentTarget.style.backgroundColor = theme.primary + '22'}
                onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <CogIcon className="w-5 h-5 ml-2" /> {/* RTL: ml for icon before text */}
                {systemCheckBtnData.props.label}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default LeftSidebar;
