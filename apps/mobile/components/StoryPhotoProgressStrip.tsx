import { useCallback, useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

const FILL = '#0A84FF';
const TRACK = 'rgba(255,255,255,0.22)';

export type StoryPhotoProgressStripProps = {
  /** Troca de perfil / cartão — reinicia o timer sem depender do objeto inteiro. */
  storyKey: string;
  photoCount: number;
  photoIndex: number;
  onTapSegment: (index: number) => void;
  /** Chamado quando o segmento atual termina (ex.: `setPhotoIndex(p => (p + 1) % n)`). */
  onAutoAdvance: () => void;
  /** `true` = congela o preenchimento (ex.: dedo em cima da foto, estilo stories). */
  paused?: boolean;
  durationMs?: number;
  style?: StyleProp<ViewStyle>;
};

/**
 * Barra estilo stories: um único `Animated.Value`, um único `useEffect` por troca de índice.
 * Evita múltiplos timers e estado preso na última foto ao dar loop.
 */
export function StoryPhotoProgressStrip({
  storyKey,
  photoCount,
  photoIndex,
  onTapSegment,
  onAutoAdvance,
  paused = false,
  durationMs = 5000,
  style,
}: StoryPhotoProgressStripProps) {
  const progress = useRef(new Animated.Value(0)).current;
  const onAutoAdvanceRef = useRef(onAutoAdvance);
  onAutoAdvanceRef.current = onAutoAdvance;

  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  const runningAnimRef = useRef<Animated.CompositeAnimation | null>(null);
  const wasPausedRef = useRef(false);
  const prevStoryKeyRef = useRef(storyKey);

  const startAnim = useCallback(
    (from: number, duration: number) => {
      runningAnimRef.current?.stop();
      runningAnimRef.current = null;
      progress.stopAnimation();

      if (duration < 40) {
        progress.setValue(1);
        onAutoAdvanceRef.current();
        return;
      }

      progress.setValue(from);
      const anim = Animated.timing(progress, {
        toValue: 1,
        duration,
        useNativeDriver: false,
      });
      runningAnimRef.current = anim;
      anim.start(({ finished }) => {
        if (runningAnimRef.current === anim) runningAnimRef.current = null;
        if (finished) onAutoAdvanceRef.current();
      });
    },
    [progress],
  );

  useEffect(() => {
    if (prevStoryKeyRef.current !== storyKey) {
      prevStoryKeyRef.current = storyKey;
      wasPausedRef.current = false;
    }

    runningAnimRef.current?.stop();
    runningAnimRef.current = null;
    progress.stopAnimation();

    if (photoCount <= 1) {
      progress.setValue(1);
      return () => {
        runningAnimRef.current?.stop();
        progress.stopAnimation();
      };
    }

    progress.setValue(0);
    if (!pausedRef.current) {
      startAnim(0, durationMs);
    }

    return () => {
      runningAnimRef.current?.stop();
      progress.stopAnimation();
      runningAnimRef.current = null;
    };
  }, [storyKey, photoIndex, photoCount, durationMs, progress, startAnim]);

  useEffect(() => {
    if (photoCount <= 1) return;

    if (paused) {
      wasPausedRef.current = true;
      runningAnimRef.current?.stop();
      runningAnimRef.current = null;
      progress.stopAnimation();
      return;
    }

    if (wasPausedRef.current) {
      wasPausedRef.current = false;
      progress.stopAnimation((v) => {
        const x = typeof v === 'number' ? v : 0;
        const clamped = Math.min(1, Math.max(0, x));
        if (clamped >= 0.999) {
          onAutoAdvanceRef.current();
          return;
        }
        const remaining = Math.max(50, Math.round(durationMs * (1 - clamped)));
        startAnim(clamped, remaining);
      });
    }
  }, [paused, photoCount, durationMs, progress, startAnim]);

  if (photoCount <= 0) return null;

  return (
    <View style={[styles.row, style]}>
      {Array.from({ length: photoCount }, (_, i) => {
        const isPast = i < photoIndex;
        const isCurrent = i === photoIndex;
        const showAnimatedFill = isCurrent && photoCount > 1;

        return (
          <Pressable
            key={`${storyKey}-seg-${i}`}
            onPress={() => onTapSegment(i)}
            style={({ pressed }) => [styles.hit, pressed && styles.hitPressed]}>
            <View style={styles.track}>
              {isPast ? <View style={[styles.fill, styles.fillFull]} /> : null}
              {!isPast && !isCurrent ? <View style={[styles.fill, styles.fillEmpty]} /> : null}
              {showAnimatedFill ? (
                <Animated.View
                  style={[
                    styles.fill,
                    {
                      width: progress.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0%', '100%'],
                        extrapolate: 'clamp',
                      }),
                    },
                  ]}
                />
              ) : null}
              {isCurrent && photoCount <= 1 ? <View style={[styles.fill, styles.fillFull]} /> : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 8,
    flex: 1,
  },
  hit: {
    flex: 1,
    paddingVertical: 6,
  },
  hitPressed: {
    opacity: 0.85,
  },
  track: {
    height: 4,
    borderRadius: 2,
    backgroundColor: TRACK,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: FILL,
  },
  fillFull: {
    width: '100%',
  },
  fillEmpty: {
    width: 0,
  },
});
