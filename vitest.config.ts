import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'convex/**/*.test.ts'],
    // convex/sync.test.ts opts into the edge-runtime env via a file pragma.
    server: { deps: { inline: ['convex-test'] } },
  },
  resolve: {
    alias: { '@': new URL('./src/', import.meta.url).pathname },
  },
});
