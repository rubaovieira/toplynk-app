import { CaretLeftIcon } from "phosphor-react-native";
import { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";

const ACCENT = "#2196F3";
const TRACK_BG = "#2a2a2a";

type InterviewProgressBarProps = {
  /** 0–100. Já vem com clamp monotônico do runner. */
  percent: number;
  onBack: () => void;
  backLabel: string;
};

/** Cabeçalho da entrevista por voz. Espelha o visual do SetupStepHeader. */
export function InterviewProgressBar({ percent, onBack, backLabel }: InterviewProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, percent));
  const width = useRef(new Animated.Value(clamped)).current;

  useEffect(() => {
    Animated.timing(width, {
      toValue: clamped,
      duration: 400,
      // Animar `width` percentual exige o driver JS.
      useNativeDriver: false,
    }).start();
  }, [clamped, width]);

  const fillWidth = width.interpolate({
    inputRange: [0, 100],
    outputRange: ["0%", "100%"],
  });

  return (
    <View style={styles.row}>
      <Pressable
        onPress={onBack}
        hitSlop={12}
        style={({ pressed }) => [styles.backSlot, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel={backLabel}
      >
        <CaretLeftIcon size={22} color="#fff" weight="bold" />
      </Pressable>

      <View style={styles.trackWrap}>
        <View style={styles.track}>
          <Animated.View style={[styles.fill, { width: fillWidth }]} />
        </View>
      </View>

      <Text style={styles.percent} accessibilityLiveRegion="polite">
        {Math.round(clamped)}%
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  backSlot: {
    width: 44,
    alignItems: "center",
  },
  trackWrap: {
    flex: 1,
    paddingHorizontal: 8,
  },
  track: {
    height: 10,
    borderRadius: 5,
    backgroundColor: TRACK_BG,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: 5,
    backgroundColor: ACCENT,
  },
  percent: {
    width: 52,
    textAlign: "right",
    color: ACCENT,
    fontSize: 15,
    fontWeight: "700",
  },
  pressed: {
    opacity: 0.88,
  },
});
