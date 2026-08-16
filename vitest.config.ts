import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    // `store` entra por causa da sala online: a coreografia entre os clientes
    // mora na store, e o teste a exercita com um canal falso.
    include: ['lib/**/*.test.ts', 'store/**/*.test.ts'],
  },
});
