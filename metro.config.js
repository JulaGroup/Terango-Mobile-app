// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require("expo/metro-config");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

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
};

module.exports = config;
