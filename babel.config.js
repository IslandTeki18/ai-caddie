module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
    // Inline .sql files as string literals so the bundled drizzle migrations
    // (./drizzle/migrations.js) can `import m from './0000_*.sql'` in the RN bundle.
    plugins: [['inline-import', { extensions: ['.sql'] }]],
  };
};
