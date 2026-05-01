import { Stack, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet } from 'react-native';

import { Text, View } from '@/components/Themed';

export default function MatchScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: t('match.headerTitle') }} />
      <View style={styles.container}>
        <Text style={styles.emoji}>🎉</Text>
        <Text style={styles.title}>{t('match.title')}</Text>
        <Text style={styles.subtitle}>{t('match.subtitle')}</Text>
        <Pressable style={styles.button} onPress={() => router.back()}>
          <Text style={styles.buttonText}>{t('match.back')}</Text>
        </Pressable>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    opacity: 0.85,
    marginBottom: 28,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#2e78b7',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
});
