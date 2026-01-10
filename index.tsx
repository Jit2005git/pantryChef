import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);

// We use a small timeout to ensure the browser has actually rendered the first frame
// of the React app before hiding the splash screen.
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Remove the initial loader once React takes over
const loader = document.getElementById('initial-loader');
if (loader) {
  setTimeout(() => {
    loader.style.opacity = '0';
    setTimeout(() => {
      loader.style.display = 'none';
    }, 500);
  }, 300);
}