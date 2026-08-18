// Learn more https://docs.expo.io/guides/customizing-metro
const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Path separator: forward slash, or a backslash on Windows.
const SEP = "[\\\\/]";

// The project root, escaped for use inside a regex.
const ROOT = __dirname.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Keep build output out of Metro's file map.
 *
 * There is no watchman on this machine, so Metro falls back to Node's
 * recursive fs.watch. On Windows that walks everything it is given before
 * reporting ready, and with ~691 top-level packages plus these directories it
 * overruns the startup health check — which surfaces as
 * "Failed to construct transformer: Failed to start watch mode".
 *
 * Every entry is anchored to the project root. That matters: an unanchored
 * `/dist/` rule also matches node_modules/<pkg>/dist, and 91 installed
 * packages ship their code from exactly there — whatwg-fetch, for one, has
 * main "./dist/fetch.umd.js". Blocking those breaks resolution outright.
 *
 * None of these hold source Metro needs: dist is `eas update` export output,
 * the android/ios build directories are generated, and .expo is cache.
 */
const IGNORED = [
  `^${ROOT}${SEP}dist${SEP}`,
  `^${ROOT}${SEP}\\.expo${SEP}`,
  `^${ROOT}${SEP}android${SEP}build${SEP}`,
  `^${ROOT}${SEP}android${SEP}app${SEP}build${SEP}`,
  `^${ROOT}${SEP}android${SEP}\\.gradle${SEP}`,
  `^${ROOT}${SEP}ios${SEP}build${SEP}`,
  `^${ROOT}${SEP}ios${SEP}Pods${SEP}`,
];

// Exclude react-native-maps on web platform
config.resolver = {
  ...config.resolver,
  resolveRequest: (context, moduleName, platform) => {
    if (platform === "web") {
      // Exclude native-only modules on web
      if (
        moduleName === "react-native-maps" ||
        moduleName === "react-native-google-places-autocomplete"
      ) {
        return {
          type: "empty",
        };
      }
    }
    return context.resolveRequest(context, moduleName, platform);
  },

  blockList: new RegExp(IGNORED.join("|")),
};

module.exports = config;
