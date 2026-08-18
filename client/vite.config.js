  // import { defineConfig } from 'vite';
  // import react from '@vitejs/plugin-react';

  // export default defineConfig({
  //   plugins: [react()],
  //   server: {
  //     port: 5173,
  //     proxy: {
  //       '/api': { target: process.env.VITE_API_PROXY || 'http://localhost:5000', changeOrigin: true },
  //       '/uploads': { target: process.env.VITE_API_PROXY || 'http://localhost:5000', changeOrigin: true },
  //     },
  //   },
  // });
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  const apiProxy = env.VITE_API_PROXY || 'http://localhost:5000';

  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: apiProxy,
          changeOrigin: true,
        },
        '/uploads': {
          target: apiProxy,
          changeOrigin: true,
        },
      },
    },
  };
});
