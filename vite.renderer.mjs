import { defineConfig } from 'vite';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  resolve: {
    alias: {
      '@': __dirname,
    },
  },
  root: 'src/renderer',
  build: {
    rollupOptions: {
      input: {
        main_window: __dirname + '/src/renderer/index.html',
      },
    },
  },
});
