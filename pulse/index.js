// Expo entry point. `registerRootComponent` calls AppRegistry.registerComponent
// on native and renders into the root DOM node on web, so this single file
// replaces the old Create React App src/index.js.
import { registerRootComponent } from "expo";

import App from "./src/App";

registerRootComponent(App);
