const tsParser = require('@typescript-eslint/parser');
const importPlugin = require('eslint-plugin-import');

// ponytail: import/no-restricted-paths over eslint-plugin-boundaries — one fewer dep,
// and the zone rule already expresses the whole architecture. Upgrade to boundaries
// only if per-file element types are ever needed.

// Dependency direction (top may import bottom only):
//   core    -> (nothing)
//   engine  -> core
//   data    -> core
//   sync    -> data, core
//   session -> engine, data, core
//   app     -> session, sync (+ core types)
const layerZones = [
  // core may not import any other src layer
  { target: './src/core', from: ['./src/engine', './src/data', './src/sync', './src/session'] },
  // engine may import core only
  { target: './src/engine', from: ['./src/data', './src/sync', './src/session'] },
  // data may import core only
  { target: './src/data', from: ['./src/engine', './src/sync', './src/session'] },
  // sync may import data + core (not engine/session)
  { target: './src/sync', from: ['./src/engine', './src/session'] },
  // session may import engine + data + core (not sync)
  { target: './src/session', from: ['./src/sync'] },
];

module.exports = [
  {
    ignores: ['node_modules/**', 'convex/_generated/**', '.expo/**', 'dist/**'],
  },
  {
    files: ['src/**/*.{ts,tsx}', 'app/**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
    },
    plugins: { import: importPlugin },
    settings: {
      'import/resolver': {
        typescript: { project: './tsconfig.json' },
        node: { extensions: ['.ts', '.tsx'] },
      },
    },
    rules: {
      'import/no-restricted-paths': ['error', { zones: layerZones }],
    },
  },
  // core and engine are pure: no React / React Native / SQLite / Drizzle / Convex.
  {
    files: ['src/core/**/*.{ts,tsx}', 'src/engine/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            'react',
            'react-native',
            'react-dom',
            '@op-engineering/op-sqlite',
            'drizzle-orm',
          ],
          patterns: ['convex', 'convex/*', '@convex/*', 'drizzle-orm/*'],
        },
      ],
    },
  },
];
