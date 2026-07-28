// Expo's entry point — replaces web's main.tsx / createRoot call.
// Expo doesn't render into a DOM node; `registerRootComponent` wires
// App up as the app's single root component for both native and web
// (Expo Go / dev client) builds. This file is referenced by the "main"
// field in package.json, which Expo's default template already points
// at "index.ts" (or "expo-router/entry" if you switch to file-based
// routing later — not used here since App.tsx keeps the same
// React Navigation stack structure as the original React Router setup).
import { registerRootComponent } from 'expo'
import App from './App'

registerRootComponent(App)
