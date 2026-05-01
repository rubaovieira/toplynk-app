import { Bell } from 'phosphor-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

const CARD_BG = '#121212';
const ICON_WRAP = '#2C2C2E';
const MUTED = '#8E8E93';

export type NotificationCardProps = {
  title: string;
  body: string;
  time: string;
  onPress?: () => void;
  accessibilityHint?: string;
};

/** Cartão de notificação — tema escuro, ícone à esquerda (referência layout app). */
export function NotificationCard({ title, body, time, onPress, accessibilityHint }: NotificationCardProps) {
  const content = (
    <View style={styles.row}>
      <View style={styles.iconCircle}>
        <Bell size={18} color="#fff" weight="fill" />
      </View>
      <View style={styles.textCol}>
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>
        <Text style={styles.body}>{body}</Text>
        <Text style={styles.time}>{time}</Text>
      </View>
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.card, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityHint={accessibilityHint}>
        {content}
      </Pressable>
    );
  }

  return <View style={styles.card}>{content}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: CARD_BG,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  pressed: {
    opacity: 0.92,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: ICON_WRAP,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  textCol: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 6,
    lineHeight: 22,
  },
  body: {
    fontSize: 15,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.92)',
    lineHeight: 22,
    marginBottom: 10,
  },
  time: {
    fontSize: 13,
    fontWeight: '500',
    color: MUTED,
  },
});
