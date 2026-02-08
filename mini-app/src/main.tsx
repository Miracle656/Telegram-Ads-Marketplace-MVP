import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { TonConnectUIProvider } from '@tonconnect/ui-react';
import './index.css';

// Expand the web app to full height
if (window.Telegram?.WebApp) {
    window.Telegram.WebApp.ready();
    window.Telegram.WebApp.expand();
}

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <TonConnectUIProvider manifestUrl="https://telegram-ads-marketplace.vercel.app/tonconnect-manifest.json">
            <App />
        </TonConnectUIProvider>
    </React.StrictMode>,
);
