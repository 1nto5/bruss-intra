import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [
    tsconfigPaths(), // Allows using @/lib/... imports
    react(), // Handles React/JSX
  ],
  test: {
    environment: 'jsdom', // Simulates browser DOM for React components
    globals: true, // Allows using test/expect without importing
    setupFiles: ['./vitest.setup.ts'], // Runs before each test file
  },
});
