import { Image, StyleSheet, View } from "react-native";

/** Igual ao `backgroundColor` da splash nativa em `app.json` / plugin. */
const BG = "#121212";

/**
 * Splash em JS alinhada à nativa: logo + fundo, evita flash entre splash e fontes.
 */
export function BrandedSplash() {
  return (
    <View
      style={styles.root}
      accessibilityRole="image"
      accessibilityLabel="TopLynk"
    >
      <Image
        source={require("@/assets/images/toplynk-logo.png")}
        style={styles.logo}
        resizeMode="contain"
        accessibilityIgnoresInvertColors
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  logo: {
    width: "100%",
    maxWidth: 320,
    height: 120,
  },
});
