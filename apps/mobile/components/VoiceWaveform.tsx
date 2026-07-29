import { StyleSheet, View } from "react-native";

const BAR_COUNT = 28;
const MIN_SCALE = 0.08;

type VoiceWaveformProps = {
  /** Histórico de níveis 0..1, mais recente no fim. */
  levels: number[];
  color?: string;
  height?: number;
};

/**
 * Barras alimentadas pelo metering do gravador.
 *
 * Sem Animated de propósito: os níveis já chegam a ~10 fps do
 * `useAudioRecorderState`, e animar cada barra criaria 28 animações
 * concorrentes para um efeito que a amostragem já produz.
 */
export function VoiceWaveform({ levels, color = "#2196F3", height = 56 }: VoiceWaveformProps) {
  const bars = Array.from({ length: BAR_COUNT }, (_, i) => {
    const idx = levels.length - BAR_COUNT + i;
    const level = idx >= 0 ? (levels[idx] ?? 0) : 0;
    return Math.max(MIN_SCALE, level);
  });

  return (
    <View style={[styles.wrap, { height }]} pointerEvents="none">
      {bars.map((level, i) => (
        <View
          key={i}
          style={[
            styles.bar,
            {
              height: Math.round(height * level),
              backgroundColor: color,
              opacity: 0.45 + level * 0.55,
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    paddingHorizontal: 20,
    borderRadius: 16,
  },
  bar: {
    width: 3,
    borderRadius: 2,
  },
});
