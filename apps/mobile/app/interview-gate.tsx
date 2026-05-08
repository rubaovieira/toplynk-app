import { router } from 'expo-router';
import { Lightbulb } from 'phosphor-react-native';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';

const BG = '#121212';
const ACCENT = '#2196F3';

export default function InterviewGateScreen() {
  const { t } = useTranslation();

  const onProceed = useCallback(() => {
    router.replace('/entrevista-ia');
  }, []);

  return (
    <>
      <StatusBar style="light" />
      <SafeAreaView style={styles.safe}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.container}>
            <Lightbulb size={64} color={ACCENT} weight="fill" />

            <Text style={styles.title}>{t('interviewGate.title')}</Text>

            <Text style={styles.subtitle}>
              {t('interviewGate.subtitle')}
            </Text>

            <View style={styles.card}>
              <Text style={styles.cardText}>
                {t('interviewGate.explanation')}
              </Text>
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            onPress={onProceed}
            style={({ pressed }) => [
              styles.primaryBtn,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.primaryBtnText}>
              {t('interviewGate.startNow')}
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: BG,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 20,
  },
  container: {
    alignItems: 'center',
    minHeight: 400,
    justifyContent: 'center',
  },
  title: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '700',
    marginTop: 20,
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 20,
    textAlign: 'center',
  },
  card: {
    backgroundColor: 'rgba(33,150,243,0.08)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(33,150,243,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginTop: 12,
  },
  cardText: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 20,
  },
  primaryBtn: {
    backgroundColor: ACCENT,
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.88,
  },
});
