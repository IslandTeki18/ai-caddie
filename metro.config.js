const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// The db factory's 'memory' branch (better-sqlite3, vitest-only) is behind a
// dynamic import that never runs on device, but static export still tries to
// resolve it. Stub the Node-only modules to empty so `expo export` works.
const NODE_ONLY = /^(better-sqlite3|drizzle-orm\/better-sqlite3(\/.*)?)$/;
const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (NODE_ONLY.test(moduleName)) return { type: 'empty' };
  return defaultResolveRequest
    ? defaultResolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: './global.css' });
