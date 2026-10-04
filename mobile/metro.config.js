// Metro configuration.
//
// The pure logic the app shares with the website lives in ../shared, which is
// outside this package, so Metro has to be told to watch it — otherwise
// requiring "../../shared/validation.js" fails with "not part of the project".
//
// Only that folder is added: the website's node_modules is deliberately NOT on
// the resolver path, so the app can never pull a web dependency by accident.
const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const projectRoot = __dirname;
const sharedRoot = path.resolve(projectRoot, "..", "shared");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [sharedRoot];

module.exports = config;
