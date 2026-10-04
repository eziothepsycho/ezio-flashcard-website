// The Gradle project name, kept valid for Gradle 9.
//
// `expo prebuild` derives `rootProject.name` from app.json's `name` (see
// @expo/config-plugins/android/Name.js). This app is branded "cards.", so that
// line becomes `rootProject.name = 'cards.'` — and Gradle 9 refuses any project
// name that starts or ends with a ".":
//
//   The project name 'cards.' must not start or end with a '.'
//
// Every Gradle task fails on that, `assembleRelease` included.
//
// This plugin edits the settings.gradle *mod results*, which is what prebuild
// then writes — a plain file edit from a "dangerous" mod is overwritten by that
// write, which is why this has to go through `withSettingsGradle`. Only that one
// line changes: the app's on-screen label still comes from app.json's `name`,
// so the dot the product name ends with is kept.
const { withSettingsGradle } = require("@expo/config-plugins");

// Any name Gradle accepts; it is only the Gradle project's name.
const GRADLE_SAFE_PROJECT_NAME = "cards-mobile";

module.exports = function withGradleSafeProjectName(config) {
  return withSettingsGradle(config, (config) => {
    if (config.modResults.language !== "groovy") {
      console.warn(
        "[withGradleSafeProjectName] settings.gradle is not Groovy, so the project name was left alone."
      );
      return config;
    }

    config.modResults.contents = config.modResults.contents.replace(
      /rootProject\.name\s*=\s*['"][^'"]*['"]/,
      `rootProject.name = '${GRADLE_SAFE_PROJECT_NAME}'`
    );

    return config;
  });
};
