import { defineWorkspace } from 'vitest/config';

const alias = { '@': new URL('./src/', import.meta.url).pathname };

export default defineWorkspace([
  {
    // Pure modules (engine/session/data/core/convex) + pure app helpers. Node, fast.
    test: {
      name: 'node',
      environment: 'node',
      include: ['src/**/*.test.ts', 'convex/**/*.test.ts'],
      // convex/sync.test.ts opts into the edge-runtime env via a file pragma.
      server: { deps: { inline: ['convex-test'] } },
    },
    resolve: { alias },
  },
  {
    // React Native screen tests. `react-native` → `react-native-web` renders RN
    // components to the DOM under jsdom, sidestepping RN's flow-typed source.
    // ponytail: RN-in-vitest via babel-preset-expo fought its flow syntax; the
    // RN-web + jsdom escape hatch is the robust path for the one component test.
    esbuild: { jsx: 'automatic' },
    test: {
      name: 'components',
      environment: 'jsdom',
      include: ['src/ui/**/*.test.tsx'],
    },
    resolve: {
      alias: { ...alias, 'react-native': 'react-native-web' },
    },
  },
]);
