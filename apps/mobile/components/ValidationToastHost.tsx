import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { setValidationToastListener } from '@/lib/validation-toast';

const VISIBILITY_MS = 4200;

export function ValidationToastHost() {
  const insets = useSafeAreaInsets();
  const [text, setText] = useState<string | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hide = useCallback(() => {
    Animated.timing(opacity, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setText(null);
    });
  }, [opacity]);

  const show = useCallback(
    (message: string) => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      setText(message);
      opacity.setValue(0);
      Animated.timing(opacity, {
        toValue: 1,
        duration: 160,
        useNativeDriver: true,
      }).start();
      hideTimer.current = setTimeout(hide, VISIBILITY_MS);
    },
    [hide, opacity],
  );

  useEffect(() => {
    setValidationToastListener(show);
    return () => {
      setValidationToastListener(null);
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [show]);

  if (text == null) {
    return null;
  }

  return (
    <View style={styles.root} pointerEvents="box-none">
      <Animated.View
        pointerEvents="none"
        style={[
          styles.wrap,
          {
            paddingTop: Math.max(insets.top, 8) + 4,
            opacity,
          },
        ]}>
        <View style={styles.banner}>
          <Text style={styles.msg}>{text}</Text>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999999,
    justifyContent: 'flex-start',
  },
  wrap: {
    paddingHorizontal: 12,
    alignItems: 'stretch',
  },
  banner: {
    backgroundColor: '#1a1a1a',
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  msg: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 22,
  },
});
