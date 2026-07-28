// theme.ts
//
// React Native has no CSS files and no Tailwind — there's nothing to
// "convert" index.css into directly. Every component in this migration
// already has its Tailwind classes translated inline into
// StyleSheet.create() objects, which is where color/spacing/typography
// decisions now live.
//
// The two custom theme values index.css defined are kept here as plain
// constants so they stay available and centralized if you want to
// reference them (e.g. from StyleSheet objects) instead of hardcoding
// the hex/font values in every file:
//
//   --font-sans -> FONT_SANS
//   --color-blue-const -> COLOR_BLUE_CONST
//
// Usage:
//   import { COLOR_BLUE_CONST } from '../theme'
//   const styles = StyleSheet.create({ box: { backgroundColor: COLOR_BLUE_CONST } })
//
// Font loading: Inter isn't bundled with Expo by default. Load it once
// at the app root (e.g. in App.tsx) with `expo-font` /
// `@expo-google-fonts/inter` and apply FONT_SANS via each
// StyleSheet's `fontFamily`, or set a default via a Text wrapper —
// RN has no global "body font" the way CSS does.

export const FONT_SANS = 'Inter'

export const COLOR_BLUE_CONST = '#E9F1FB'
