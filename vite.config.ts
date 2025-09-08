import { defineConfig, UserConfig } from 'vite';
import react from '@vitejs/plugin-react';
import eslint from 'vite-plugin-eslint2';
import dts from 'vite-plugin-dts';
import tsconfigPaths from 'vite-tsconfig-paths';
import { resolve } from 'node:path';

const libraryOptions: UserConfig = {
  build: {
    lib: {
      name: 'react-lasso-select',
      entry: resolve(__dirname, 'lib/index.ts'),
      formats: ['es'],
      fileName: 'index'
    },
    rollupOptions: {
      external: ['react', 'react/jsx-runtime', 'prop-types']
    }
  }
};

const staticPageOptions: UserConfig = {
  base: '/react-lasso-select/'
};

export default defineConfig(({ mode }) => {
  return {
    plugins: [
      react(),
      eslint(),
      tsconfigPaths(),
      dts({
        include: ['lib'],
        rollupTypes: true,
        tsconfigPath: './tsconfig.app.json'
      })
    ],
    ...(mode === 'build:ci' ? staticPageOptions : libraryOptions)
  };
});
