import { CaretLeftIcon } from 'phosphor-react-native';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SETUP_TOTAL_STEPS } from '@/lib/setup-flow';

const ACCENT = '#2196F3';
const TRACK_BG = '#2a2a2a';

type SetupStepHeaderProps = {
  /** Etapa atual (1-based). */
  currentStep: number;
  onBack: () => void;
};

export function SetupStepHeader({ currentStep, onBack }: SetupStepHeaderProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const total = SETUP_TOTAL_STEPS;
  const ratio = Math.min(1, Math.max(0, currentStep / total));

  return (
    <View
      style={[
        styles.row,
        { paddingLeft: 12 + insets.left, paddingRight: 8 + insets.right },
      ]}>
      <Pressable
        onPress={onBack}
        hitSlop={12}
        style={({ pressed }) => [styles.sideSlot, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel={t('setup.a11yBack')}>
        <CaretLeftIcon size={22} color="#fff" weight="bold" />
      </Pressable>

      <View style={styles.trackWrap}>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${ratio * 100}%` }]} />
        </View>
      </View>

      <Text style={styles.stepBadge} accessibilityLiveRegion="polite">
        {currentStep}/{total}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    marginBottom: 8,
  },
  sideSlot: {
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackWrap: {
    flex: 1,
    minWidth: 0,
    marginRight: 10,
    justifyContent: 'center',
  },
  track: {
    width: '100%',
    height: 10,
    borderRadius: 5,
    backgroundColor: TRACK_BG,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 5,
    backgroundColor: ACCENT,
  },
  stepBadge: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.3,
    textAlign: 'right',
    flexShrink: 0,
  },
  pressed: {
    opacity: 0.85,
  },
});
