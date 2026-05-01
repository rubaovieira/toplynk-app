import { StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Text, View } from '@/components/Themed';

/** Resumo dos dados da entrevista (guardados no dispositivo) — não é o chat da IA. */
export default function RespostasEntrevistaScreen() {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('interviewTab.title')}</Text>
      <Text style={styles.subtitle}>{t('interviewTab.subtitle')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
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
  },
});
