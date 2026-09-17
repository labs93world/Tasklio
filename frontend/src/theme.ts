// Design tokens for this app. Light theme only.Always modify the colors and theme to Dark, Light or Dark and Light according to the design guidelines.
//
// The keys match the "color" block of /app/design_guidelines.json. Fill the
// values from that file (or from the user's brand colors). Keep every key; do
// not add a second theme or colors file; do not write color literals in
// components.
//
// How the names work: a plain key is a background, and its `on` partner is the
// text or icon color that sits on top of it. Always use them as a pair.
//   <View style={{ backgroundColor: colors.brandPrimary }}>
//     <Text style={{ color: colors.onBrandPrimary }}>Continue</Text>
//   </View>
//
// Styling a screen or component: build the sheet with makeStyles so colors
// and layout live together and follow the active scheme:
//   const useStyles = makeStyles((colors) => ({
//     card: { backgroundColor: colors.surfaceSecondary, padding: 16 },
//     title: { color: colors.onSurfaceSecondary, fontSize: 16 },
//   }));
//   function Screen() {
//     const styles = useStyles();
//     return <View style={styles.card}><Text style={styles.title}>Hi</Text></View>;
//   }
// For color props that are not styles (icon color, placeholderTextColor,
// ActivityIndicator) read useTheme().colors inside the component.
// Never call StyleSheet.create with color values at module level; it cannot
// follow the scheme.
//
// To support dark mode later: add `dark` to `themes` with every key filled.
// Nothing else changes; the device setting takes over automatically.
// Feel free to add as many new colors as you need to support the design guidelines.

import { useMemo } from "react";
import { Appearance, StyleSheet, useColorScheme } from "react-native";

export type ColorScheme = "light" | "dark";

const light = {
  // ---------------------------------------------------------------------------
  // Surfaces: warm obsidian, from the screen down to small fills.
  // Custom premium black + gold identity for Tasklio (not copied from refs).
  // ---------------------------------------------------------------------------
  surface: "#0B0B0E", // primary canvas, most of every screen
  onSurface: "#FAF7F0", // text and icons on the canvas
  surfaceSecondary: "#15151B", // cards, sheets, list rows
  onSurfaceSecondary: "#EDEAE2", // text and icons on cards, sheets, rows
  surfaceTertiary: "#1F1F27", // input backgrounds, chips, deepest nesting
  onSurfaceTertiary: "#C9C6BF", // text on inputs and chips
  surfaceInverse: "#F5C542", // tooltips, snackbars, anything popping against theme
  onSurfaceInverse: "#0B0B0E", // text and icons on the inverse surface
  muted: "#8B8880", // subdued text: captions, timestamps, placeholders

  // ---------------------------------------------------------------------------
  // Brand: gold identity color and the fills built from it.
  // ---------------------------------------------------------------------------
  brand: "#F5C542", // base hue, anchor only
  onBrand: "#0B0B0E", // text and icons placed directly on brand
  brandPrimary: "#F5C542", // primary CTA, active states, highlights
  onBrandPrimary: "#0B0B0E", // text and icons on brandPrimary
  brandSecondary: "#2A2410", // secondary CTA, muted gold surfaces
  onBrandSecondary: "#F5C542", // text and icons on brandSecondary
  brandTertiary: "#191813", // chips, tags, subtle brand moments
  onBrandTertiary: "#E8C86A", // text and icons on brandTertiary

  // ---------------------------------------------------------------------------
  // Status: semantic only, never decorative.
  // ---------------------------------------------------------------------------
  success: "#3BD48A",
  onSuccess: "#062015",
  warning: "#F5B942",
  onWarning: "#241900",
  error: "#FF6B6B",
  onError: "#2A0B0B",
  info: "#5AC8FA",
  onInfo: "#04212B",

  // ---------------------------------------------------------------------------
  // Game accent hues (icon color + soft tile background). Custom palette.
  // ---------------------------------------------------------------------------
  accentSpin: "#F5C542",
  accentSpinSoft: "#2E2712",
  accentPuzzle: "#38D6C4",
  accentPuzzleSoft: "#0F2E2B",
  accentQuiz: "#8E7CFF",
  accentQuizSoft: "#211E3D",
  accentTap: "#FF7A6B",
  accentTapSoft: "#331917",
  accentLucky: "#F58EE0",
  accentLuckySoft: "#301A2C",

  // ---------------------------------------------------------------------------
  // Lines
  // ---------------------------------------------------------------------------
  border: "#26262F", // hairline outline
  borderStrong: "#3A3A46", // focus rings, selected outlines
  divider: "#1C1C23", // subtle list separators
};

export type ThemeColors = typeof light;

export const defaultScheme = "light" satisfies ColorScheme;

export const themes: { light: ThemeColors; dark?: ThemeColors } = { light };

// In-app theme toggle, only after `dark` exists in `themes`. Call
// setColorScheme("dark"), setColorScheme("light"), or setColorScheme(null) to
// follow the device. Every useTheme() consumer re-renders. Persisting the
// choice and re-applying it on launch is the toggle's job.
export function setColorScheme(scheme: ColorScheme | null) {
  // RN 0.86 re-reads the device scheme only for the literal "unspecified";
  // null would pin useColorScheme() to null and the app to light.
  Appearance.setColorScheme?.(scheme ?? "unspecified");
}

// Keep native surfaces (alerts, pickers, navigation chrome) on the schemes this
// app ships: light only forces light; once `dark` exists the device decides.
// Optional call because react-native-web does not implement it.
setColorScheme?.(themes.dark ? null : defaultScheme);

export function useTheme(): { scheme: ColorScheme; colors: ThemeColors } {
  const system = useColorScheme();
  const scheme: ColorScheme = system && themes[system] ? system : defaultScheme;
  return { scheme, colors: themes[scheme] ?? themes.light };
}

// Themed StyleSheet: returns a hook that builds the sheet from the active
// scheme's colors and memoizes it until the scheme changes.
export function makeStyles<T extends StyleSheet.NamedStyles<T> | StyleSheet.NamedStyles<any>>(
  factory: (colors: ThemeColors) => T & StyleSheet.NamedStyles<any>,
): () => T {
  return function useStyles(): T {
    const { colors } = useTheme();
    return useMemo(() => StyleSheet.create(factory(colors)), [colors]);
  };
}


