// Loads the Manrope family the design system is built on.
//
// The web build pulled Manrope from a Google Fonts <link> in public/index.html.
// React Native has to bundle the files, so they come from the
// @expo-google-fonts/manrope package and are registered at startup.
import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
  useFonts,
} from "@expo-google-fonts/manrope";

export default function useAppFonts() {
  const [loaded, error] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
  });

  // A font that fails to download should not wedge the app on a blank screen —
  // fall through to the system face instead.
  return loaded || Boolean(error);
}
