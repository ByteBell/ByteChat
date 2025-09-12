import React from 'react';
import ReactDOM from 'react-dom/client';
import Popup from "./components/popup"
import './tailwind.css';     // <–– injects the compiled CSS
const rootEl = document.getElementById('root');
if (!rootEl) {
  throw new Error('Missing #root element');
}
const root = ReactDOM.createRoot(rootEl as HTMLElement);

root.render(
  <React.StrictMode>
    <Popup />
  </React.StrictMode>
);