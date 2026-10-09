import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Filter out internal TensorFlow/MediaPipe logs that confuse users
// This message is actually a success indicator (fallback to CPU acceleration), not an error.
const originalConsoleInfo = console.info;
const originalConsoleLog = console.log;

const shouldFilter = (args: any[]) => {
  return typeof args[0] === 'string' && args[0].includes('Created TensorFlow Lite XNNPACK delegate for CPU');
};

console.info = (...args) => {
  if (shouldFilter(args)) return;
  originalConsoleInfo(...args);
};

console.log = (...args) => {
  if (shouldFilter(args)) return;
  originalConsoleLog(...args);
};

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);