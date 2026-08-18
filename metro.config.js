// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require("expo/metro-config");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Path separator: forward slash, or a backslash on Windows.
const SEP = "[\\\\/]";

/**
 * Keep build output out of Metro's file map.
 *
 * There is no watchman on this machine, so Metro falls back to Node's
 * recursive fs.watch. On Windows that walks everything it is given before
 * reporting ready, and with ~691 top-level packages plus these directories it
 * overruns the startup health check — which surfaces as
 * "Failed to construct transformer: Failed to start watch mode".
 *
 * None of these hold source Metro needs: dist is `eas update` export output,
 * the android/ios build directories are generated, and .expo is cache.
 */
const IGNORED = [
  `${SEP}dist${SEP}`,
  `${SEP}\\.expo${SEP}`,
  `${SEP}android${SEP}build${SEP}`,
  `${SEP}android${SEP}app${SEP}build${SEP}`,
  `${SEP}android${SEP}\\.gradle${SEP}`,
  `${SEP}ios${SEP}build${SEP}`,
  `${SEP}ios${SEP}Pods${SEP}`,
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
