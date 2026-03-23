const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

const projectRoot = path.resolve(__dirname, "../..");

config.watchFolders = [projectRoot];

const blockList = [
  /node_modules\/.pnpm\/@google-cloud\+storage[^/]*\/node_modules\/@google-cloud\/storage_tmp.*/,
];

const existingBlockList = config.resolver?.blockList;
if (Array.isArray(existingBlockList)) {
  config.resolver.blockList = [...existingBlockList, ...blockList];
} else if (existingBlockList instanceof RegExp) {
  config.resolver.blockList = [existingBlockList, ...blockList];
} else {
  config.resolver = { ...(config.resolver ?? {}), blockList };
}

module.exports = config;
