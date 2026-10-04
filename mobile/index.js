import { registerRootComponent } from "expo";

import App from "./App";

// Expo's entry point: hands the root component to the dev client and to any
// native build, so App.js stays a plain component.
registerRootComponent(App);
