import { LinearGradient } from "expo-linear-gradient";
import { SparkleIcon } from "phosphor-react-native";
import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";

const GRADIENT_START = "#2196F3";
const GRADIENT_END = "#1565C0";

type VoiceOrbProps = {
  size?: number;
  /** Pulsa enquanto o assistente fala ou processa; parado quando ouve. */
  active?: boolean;
  accessibilityLabel: string;
};

/** Avatar circular do assistente. Identidade azul do fluxo pós-login. */
export function VoiceOrb({ size = 200, active = false, accessibilityLabel }: VoiceOrbProps) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!active) {
      pulse.stopAnimation();
      Animated.timing(pulse, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }).start();
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [active, pulse]);

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] });
  const haloOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.12, 0.28] });
  const haloScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1.02, 1.22] });

  return (
    <View
      style={[styles.wrap, { width: size * 1.3, height: size * 1.3 }]}
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          styles.halo,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            opacity: haloOpacity,
            transform: [{ scale: haloScale }],
          },
        ]}
      />
      <Animated.View style={{ transform: [{ scale }] }}>
        <LinearGradient
          colors={[GRADIENT_START, GRADIENT_END]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.orb, { width: size, height: size, borderRadius: size / 2 }]}
        >
          <SparkleIcon size={size * 0.34} color="#fff" weight="fill" />
        </LinearGradient>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  halo: {
    position: "absolute",
    backgroundColor: GRADIENT_START,
  },
  orb: {
    alignItems: "center",
    justifyContent: "center",
  },
});
