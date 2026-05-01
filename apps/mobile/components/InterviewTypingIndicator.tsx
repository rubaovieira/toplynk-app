import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

type DotProps = {
  delayMs: number;
  color: string;
  size: number;
};

function BouncingDot({ delayMs, color, size }: DotProps) {
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const travel = size * 0.55;
    const up = Animated.timing(translateY, {
      toValue: -travel,
      duration: 320,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    const down = Animated.timing(translateY, {
      toValue: 0,
      duration: 320,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    });
    const loop = Animated.loop(Animated.sequence([up, down]));
    const start = Animated.sequence([Animated.delay(delayMs), loop]);
    start.start();
    return () => {
      start.stop();
      translateY.stopAnimation();
      translateY.setValue(0);
    };
  }, [delayMs, size, translateY]);

  const radius = size / 2;
  return (
    <Animated.View
      style={[
        {
          width: size,
          height: size,
          borderRadius: radius,
          backgroundColor: color,
          transform: [{ translateY }],
        },
      ]}
    />
  );
}

type Props = {
  /** Diâmetro de cada ponto. */
  dotSize?: number;
  color?: string;
};

/** Três pontos com bounce desfasado (estilo “a IA está a escrever”). */
export function InterviewTypingIndicator({ dotSize = 8, color = '#2196F3' }: Props) {
  return (
    <View style={styles.row} accessibilityLabel="A carregar resposta">
      <BouncingDot delayMs={0} color={color} size={dotSize} />
      <BouncingDot delayMs={140} color={color} size={dotSize} />
      <BouncingDot delayMs={280} color={color} size={dotSize} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
});
