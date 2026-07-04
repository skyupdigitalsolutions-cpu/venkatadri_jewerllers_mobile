// Custom Expo config plugin — sets android:usesCleartextTraffic="true"
// so the Android app can reach http:// (plain HTTP) backend on LAN during dev.
// This runs at build time (expo prebuild / expo run:android / EAS Build).
// For Expo Go, cleartext is already permitted by Expo Go's own manifest.
const { withAndroidManifest } = require('@expo/config-plugins');

module.exports = function withCleartextTraffic(config) {
  return withAndroidManifest(config, (modConfig) => {
    const application = modConfig.modResults.manifest.application;
    if (application && application[0]) {
      application[0].$['android:usesCleartextTraffic'] = 'true';
    }
    return modConfig;
  });
};
