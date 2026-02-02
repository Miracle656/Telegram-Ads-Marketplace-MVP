import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

// Check if SSL certificates exist
const certPath = path.resolve(__dirname, 'certs/localhost.pem');
const keyPath = path.resolve(__dirname, 'certs/localhost-key.pem');
const hasHttps = fs.existsSync(certPath) && fs.existsSync(keyPath);

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    server: {
        host: true,
        port: 5173,
        // Only enable HTTPS if certificates exist
        ...(hasHttps && {
            https: {
                key: fs.readFileSync(keyPath),
                cert: fs.readFileSync(certPath)
            }
        })
    },
    build: {
        outDir: 'dist',
        sourcemap: true
    }
});
