import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Expand the web app to full height
if (window.Telegram?.WebApp) {
    window.Telegram.WebApp.ready();
    window.Telegram.WebApp.expand();
}

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
);
