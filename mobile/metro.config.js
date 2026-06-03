// Metro config for an npm-workspaces monorepo, per Expo's documented pattern:
// https://docs.expo.dev/guides/monorepos/
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "..");

const config = getDefaultConfig(projectRoot);

// 1. Watch the workspace root so Metro picks up changes in packages/* (e.g.
//    @athletly/shared, which ships TypeScript source consumed directly).
config.watchFolders = [workspaceRoot];

// 2. Resolve modules from both the app's and the workspace root's node_modules.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

// NOTE: hierarchical lookup is intentionally left ENABLED (the default). npm's
// hoisting is partial here (e.g. expo-asset stays nested under expo/node_modules),
// so Metro must be able to walk into nested node_modules to resolve those deps.
// Disabling it (config.resolver.disableHierarchicalLookup = true) breaks
// resolution of Expo's nested transitive packages.

module.exports = withNativeWind(config, { input: "./global.css" });
