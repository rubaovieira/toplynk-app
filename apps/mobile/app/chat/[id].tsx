import { type Href, useLocalSearchParams, useRouter } from "expo-router";
import {
  CaretLeftIcon,
  Checks,
  DotsThreeVertical,
  PaperPlaneRight,
} from "phosphor-react-native";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import type { KeyboardEvent } from "react-native";
import {
  ActivityIndicator,
  Alert,
  Image,
  Keyboard,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { ReportUserModal } from "@/components/ReportUserModal";
import { UserMoreSheet } from "@/components/UserMoreSheet";
import type { ReportReason } from "@/lib/moderation-api";
import { blockUser, submitReport } from "@/lib/moderation-api";
import { attachChatRealtime, createChatSocket } from "@/lib/chat-socket";
import type { ChatMessageRow } from "@/lib/chats-api";
import {
  fetchChatMessages,
  openChatConversation,
  sendChatMessage,
} from "@/lib/chats-api";
import { getAccessToken } from "@/lib/auth-storage";
import { getApiBaseUrl } from "@/lib/api-config";
import { type AppLocale, localeFromI18nLanguage } from "@/lib/i18n";
import { decodeJwtSub } from "@/lib/jwt-sub";
import { photoUri } from "@/lib/match-demo-deck";
import { isPeerOnline, peerPresenceSubtitle } from "@/lib/peer-presence";
import {
  fetchUserPublicProfile,
  publicProfileToMatchProfile,
} from "@/lib/users-api";
import { showValidationToast } from "@/lib/validation-toast";
import type { Socket } from "socket.io-client";

const BG = "#121212";
const AREA = "#1A1A1C";
const INCOMING = "#2C2C2E";
const OUTGOING = "#0A84FF";
const ACCENT = "#0A84FF";

const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Extra abaixo do compositor com teclado aberto (Android gestos / IME). */
const COMPOSER_PAD_KEYBOARD_ANDROID = 20;
const COMPOSER_PAD_KEYBOARD_IOS = 10;

/**
 * iOS: padding inferior = altura do teclado (janela não redimensiona como no Android).
 * Android com `softwareKeyboardLayoutMode: "resize"`: não aplicar esse padding (evita
 * duplicar o espaço com o resize nativo); só expõe se o teclado está visível.
 */
function useKeyboardBottomOverlay(): {
  bottomPad: number;
  keyboardVisible: boolean;
} {
  const [iosPad, setIosPad] = useState(0);
  const [androidVisible, setAndroidVisible] = useState(false);

  useEffect(() => {
    const readH = (e: KeyboardEvent) =>
      typeof e.endCoordinates?.height === "number"
        ? Math.max(0, e.endCoordinates.height)
        : 0;

    if (Platform.OS === "ios") {
      const s = Keyboard.addListener("keyboardWillShow", (e) =>
        setIosPad(readH(e)),
      );
      const h = Keyboard.addListener("keyboardWillHide", () => setIosPad(0));
      return () => {
        s.remove();
        h.remove();
      };
    }

    const s = Keyboard.addListener("keyboardDidShow", () =>
      setAndroidVisible(true),
    );
    const h = Keyboard.addListener("keyboardDidHide", () =>
      setAndroidVisible(false),
    );
    return () => {
      s.remove();
      h.remove();
    };
  }, []);

  if (Platform.OS === "ios") {
    return { bottomPad: iosPad, keyboardVisible: iosPad > 0 };
  }
  return { bottomPad: 0, keyboardVisible: androidVisible };
}

function localDayKeyFromDate(d: Date): string {
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${mo}-${day}`;
}

function localDayKeyFromIso(iso: string): string {
  return localDayKeyFromDate(new Date(iso));
}

function localeTagForChatFormatting(lang: AppLocale): string {
  if (lang === "en") return "en-US";
  if (lang === "es") return "es-419";
  return "pt-BR";
}

function formatDaySeparatorLabel(
  iso: string,
  lang: AppLocale,
  t: TFunction,
): string {
  const d = new Date(iso);
  const today = new Date();
  const kMsg = localDayKeyFromIso(iso);
  const kToday = localDayKeyFromDate(today);
  if (kMsg === kToday) {
    return t("chat.dayToday");
  }
  const yest = new Date(today);
  yest.setDate(yest.getDate() - 1);
  if (kMsg === localDayKeyFromDate(yest)) {
    return t("chat.dayYesterday");
  }
  return d.toLocaleDateString(localeTagForChatFormatting(lang), {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatChatTime(iso: string, lang: AppLocale): string {
  return new Date(iso).toLocaleTimeString(localeTagForChatFormatting(lang), {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

type TimelineItem =
  | { kind: "day"; key: string; label: string }
  | { kind: "msg"; message: ChatMessageRow };

function buildMessageTimeline(
  messages: ChatMessageRow[],
  lang: AppLocale,
  t: TFunction,
): TimelineItem[] {
  const out: TimelineItem[] = [];
  let lastDay: string | null = null;
  for (const m of messages) {
    const dk = localDayKeyFromIso(m.createdAt);
    if (dk !== lastDay) {
      lastDay = dk;
      out.push({
        kind: "day",
        key: `day-${dk}`,
        label: formatDaySeparatorLabel(m.createdAt, lang, t),
      });
    }
    out.push({ kind: "msg", message: m });
  }
  return out;
}

export const options = {
  headerShown: false as const,
};

function isLiveChatPeerId(id: string): boolean {
  return UUID_V4.test(id);
}

function ChatHeader({
  onBack,
  avatar,
  title,
  subtitle,
  peerOnline,
  onPressProfile,
  onMore,
  t,
}: {
  onBack: () => void;
  avatar: ReactNode;
  title: string;
  subtitle: string;
  peerOnline?: boolean;
  onPressProfile?: () => void;
  onMore: () => void;
  t: TFunction;
}) {
  return (
    <View style={styles.headerWrap}>
      <Pressable
        onPress={onBack}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel={t("chat.backA11y")}
        style={({ pressed }) => [
          styles.headerBackCircle,
          pressed && styles.headerBackPressed,
        ]}
      >
        <CaretLeftIcon size={22} color="#F2F2F7" weight="bold" />
      </Pressable>
      <Pressable
        onPress={onPressProfile}
        disabled={!onPressProfile}
        accessibilityRole={onPressProfile ? "button" : "none"}
        accessibilityLabel={
          onPressProfile ? t("chat.openProfileA11y") : undefined
        }
        style={({ pressed }) => [
          styles.headerCenter,
          onPressProfile && pressed && styles.headerCenterPressed,
          !onPressProfile && styles.headerCenterDisabled,
        ]}
      >
        {peerOnline ? (
          <View style={styles.headerAvatarRingOnline}>{avatar}</View>
        ) : (
          avatar
        )}
        <View style={styles.headerTextCol}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {title}
          </Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
      </Pressable>
      <Pressable
        onPress={onMore}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel={t("chatsTab.moreA11y")}
        style={({ pressed }) => [
          styles.headerMoreBtn,
          pressed && styles.headerMorePressed,
        ]}
      >
        <DotsThreeVertical size={18} color="#AEAEB2" weight="bold" />
      </Pressable>
    </View>
  );
}

function InvalidPeerChatScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={[styles.headerWrap, { paddingBottom: 12 }]}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={t("chat.backA11y")}
          style={({ pressed }) => [
            styles.headerBackCircle,
            pressed && styles.headerBackPressed,
          ]}
        >
          <CaretLeftIcon size={22} color="#F2F2F7" weight="bold" />
        </Pressable>
      </View>
      <View
        style={[
          styles.flex,
          {
            paddingHorizontal: 22,
            paddingBottom: Math.max(insets.bottom, 20) + 12,
          },
        ]}
      >
        <Text style={styles.invalidPeerTitle}>
          {t("chat.invalidPeerTitle")}
        </Text>
        <Text style={styles.invalidPeerSub}>{t("chat.invalidPeerSub")}</Text>
      </View>
    </SafeAreaView>
  );
}

function LiveChatScreen({ peerId }: { peerId: string }) {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const { bottomPad: keyboardBottomPad, keyboardVisible } =
    useKeyboardBottomOverlay();
  const scrollRef = useRef<ScrollView>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [myUserId, setMyUserId] = useState<string | undefined>(undefined);
  const [peerName, setPeerName] = useState("");
  const [avatarUri, setAvatarUri] = useState(() =>
    photoUri(`u-${peerId.slice(0, 8)}-a`, 128, 128),
  );
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessageRow[]>([]);
  const [draft, setDraft] = useState("");
  const [bootLoading, setBootLoading] = useState(true);
  const [authRequired, setAuthRequired] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState(false);
  const [peerLastSeenAt, setPeerLastSeenAt] = useState<string | null>(null);
  const [presenceTick, setPresenceTick] = useState(0);

  const loadMessages = useCallback(async (cid: string) => {
    const base = getApiBaseUrl();
    if (!base) return;
    const list = await fetchChatMessages(base, cid);
    setMessages(list);
    // scrollRef só existe com o ScrollView montado (bootLoading === false); o useLayoutEffect abaixo trata o arranque.
    requestAnimationFrame(() =>
      scrollRef.current?.scrollToEnd({ animated: false }),
    );
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setBootLoading(true);
      const base = getApiBaseUrl();
      const token = await getAccessToken();
      const sub = token ? decodeJwtSub(token) : undefined;
      if (!sub) {
        if (!cancelled) {
          setAuthRequired(true);
          setBootLoading(false);
        }
        return;
      }
      if (!cancelled) {
        setAuthRequired(false);
        setMyUserId(sub);
      }
      if (!base) {
        if (!cancelled) setBootLoading(false);
        return;
      }
      try {
        const opened = await openChatConversation(base, peerId);
        if (cancelled) return;
        setConversationId(opened.conversationId);
        setPeerName(opened.peerName);
        await loadMessages(opened.conversationId);
        const lang = localeFromI18nLanguage(i18n.language);
        try {
          const pub = await fetchUserPublicProfile(base, peerId);
          const mp = publicProfileToMatchProfile(pub, lang);
          const first = mp.photoSeeds[0];
          if (first) setAvatarUri(photoUri(first, 128, 128));
          const raw = pub.lastSeenAt;
          setPeerLastSeenAt(
            typeof raw === "string" && raw.trim() ? raw.trim() : null,
          );
        } catch {
          /* mantém avatar por seed */
        }
      } catch (e) {
        if (!cancelled) {
          const msg =
            e instanceof Error && e.message.trim()
              ? e.message
              : t("chat.errorOpen");
          showValidationToast(msg);
        }
      } finally {
        if (!cancelled) setBootLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [peerId, t, i18n.language, loadMessages]);

  useEffect(() => {
    const id = setInterval(() => setPresenceTick((n) => n + 1), 20_000);
    return () => clearInterval(id);
  }, []);

  const refreshPeerProfile = useCallback(async () => {
    const base = getApiBaseUrl();
    if (!base) return;
    try {
      const pub = await fetchUserPublicProfile(base, peerId);
      const lang = localeFromI18nLanguage(i18n.language);
      const mp = publicProfileToMatchProfile(pub, lang);
      const first = mp.photoSeeds[0];
      if (first) setAvatarUri(photoUri(first, 128, 128));
      const raw = pub.lastSeenAt;
      setPeerLastSeenAt(
        typeof raw === "string" && raw.trim() ? raw.trim() : null,
      );
    } catch {
      /* mantém último valor */
    }
  }, [peerId, i18n.language]);

  useEffect(() => {
    if (!conversationId) return;
    const tmr = setInterval(() => {
      void refreshPeerProfile();
    }, 45_000);
    return () => clearInterval(tmr);
  }, [conversationId, refreshPeerProfile]);

  useEffect(() => {
    if (!conversationId) return;
    const base = getApiBaseUrl();
    if (!base) return;
    let cancelled = false;
    let detachJoin: (() => void) | undefined;
    let socket: Socket | null = null;

    void (async () => {
      const token = await getAccessToken();
      if (!token) return;
      const s = createChatSocket(base, token);
      if (cancelled) {
        s.removeAllListeners();
        s.disconnect();
        return;
      }
      socket = s;
      detachJoin = attachChatRealtime(s, conversationId, (msg) => {
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        requestAnimationFrame(() =>
          scrollRef.current?.scrollToEnd({ animated: true }),
        );
      });
    })();

    return () => {
      cancelled = true;
      detachJoin?.();
      if (socket) {
        socket.removeAllListeners();
        socket.disconnect();
        socket = null;
      }
    };
  }, [conversationId]);

  const presenceSubtitle = useMemo(
    () => peerPresenceSubtitle(peerLastSeenAt, t, Date.now()),
    [peerLastSeenAt, t, presenceTick],
  );

  const peerOnline = useMemo(
    () => isPeerOnline(peerLastSeenAt, Date.now()),
    [peerLastSeenAt, presenceTick],
  );

  const lang = localeFromI18nLanguage(i18n.language);
  const timeline = useMemo(
    () => buildMessageTimeline(messages, lang, t),
    [messages, lang, t],
  );

  /** Abrir conversa / carregar histórico: garantir scroll ao fim após o ScrollView existir e o conteúdo medir. */
  useLayoutEffect(() => {
    if (bootLoading) return;
    if (!conversationId || messages.length === 0) return;
    requestAnimationFrame(() => {
      scrollRef.current?.scrollToEnd({ animated: false });
    });
  }, [bootLoading, conversationId, messages]);

  useEffect(() => {
    if (!keyboardVisible) return;
    requestAnimationFrame(() =>
      scrollRef.current?.scrollToEnd({ animated: true }),
    );
  }, [keyboardVisible]);

  const onRefresh = useCallback(async () => {
    if (!conversationId) return;
    setRefreshing(true);
    try {
      await loadMessages(conversationId);
    } catch {
      showValidationToast(t("chat.errorLoadMessages"));
    } finally {
      setRefreshing(false);
    }
  }, [conversationId, loadMessages, t]);

  const onSend = useCallback(async () => {
    const text = draft.trim();
    const base = getApiBaseUrl();
    if (!text || !conversationId || !base || sending) return;
    setSending(true);
    setDraft("");
    try {
      const msg = await sendChatMessage(base, conversationId, text);
      // Mesmo id pode chegar antes pelo WebSocket — evita duplicar.
      setMessages((prev) =>
        prev.some((m) => m.id === msg.id) ? prev : [...prev, msg],
      );
      requestAnimationFrame(() =>
        scrollRef.current?.scrollToEnd({ animated: true }),
      );
    } catch (e) {
      const msg =
        e instanceof Error && e.message.trim()
          ? e.message
          : t("chat.errorSend");
      showValidationToast(msg);
      setDraft(text);
    } finally {
      setSending(false);
    }
  }, [draft, conversationId, sending, t]);

  const openPeerProfile = useCallback(() => {
    router.push({ pathname: "/user-profile", params: { id: peerId } } as Href);
  }, [router, peerId]);

  const doBlockPeer = useCallback(async () => {
    const base = getApiBaseUrl();
    if (!base) {
      showValidationToast(t("chat.errorOpen"));
      return;
    }
    try {
      await blockUser(base, peerId);
      showValidationToast(t("chat.blockSuccess"));
      router.back();
    } catch (e) {
      const msg =
        e instanceof Error && e.message.trim() ? e.message : t("chat.blockError");
      showValidationToast(msg);
    }
  }, [peerId, router, t]);

  const onBlockPeer = useCallback(() => {
    Alert.alert(t("chat.blockConfirmTitle"), t("chat.blockConfirmBody"), [
      { text: t("chat.blockConfirmCancel"), style: "cancel" },
      {
        text: t("chat.blockConfirmOk"),
        style: "destructive",
        onPress: () => void doBlockPeer(),
      },
    ]);
  }, [doBlockPeer, t]);

  const onSubmitReport = useCallback(
    async (reason: ReportReason, details: string) => {
      const base = getApiBaseUrl();
      if (!base) {
        showValidationToast(t("chat.errorOpen"));
        return;
      }
      setReportSubmitting(true);
      try {
        await submitReport(base, {
          reportedUserId: peerId,
          reason,
          details,
          conversationId: conversationId ?? undefined,
        });
        setReportOpen(false);
        showValidationToast(t("chat.reportSuccess"));
      } catch (e) {
        const msg =
          e instanceof Error && e.message.trim()
            ? e.message
            : t("chat.reportError");
        showValidationToast(msg);
      } finally {
        setReportSubmitting(false);
      }
    },
    [peerId, conversationId, t],
  );

  if (authRequired) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.headerWrap}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={t("chat.backA11y")}
            style={({ pressed }) => [
              styles.headerBackCircle,
              pressed && styles.headerBackPressed,
            ]}
          >
            <CaretLeftIcon size={22} color="#F2F2F7" weight="bold" />
          </Pressable>
          <Text style={styles.authBannerText}>{t("chat.errorNeedLogin")}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (bootLoading || !myUserId) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <ChatHeader
          onBack={() => router.back()}
          avatar={
            <View style={styles.headerAvatarLoading}>
              <ActivityIndicator color={ACCENT} />
            </View>
          }
          title={peerName || "…"}
          subtitle={t("chat.liveThread")}
          onPressProfile={openPeerProfile}
          onMore={() => setMoreOpen(true)}
          t={t}
        />
        <UserMoreSheet
          visible={moreOpen}
          onClose={() => setMoreOpen(false)}
          onBlock={onBlockPeer}
          onReport={() => setReportOpen(true)}
        />
        <ReportUserModal
          visible={reportOpen}
          submitting={reportSubmitting}
          onClose={() => setReportOpen(false)}
          onSubmit={onSubmitReport}
        />
        <View
          style={[
            styles.flex,
            { justifyContent: "center", alignItems: "center" },
          ]}
        >
          <ActivityIndicator size="large" color={ACCENT} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ChatHeader
        onBack={() => router.back()}
        avatar={
          <Image source={{ uri: avatarUri }} style={styles.headerAvatarImg} />
        }
        title={peerName || t("chat.peerFallback")}
        subtitle={presenceSubtitle}
        peerOnline={peerOnline}
        onPressProfile={openPeerProfile}
        onMore={() => setMoreOpen(true)}
        t={t}
      />
      <UserMoreSheet
        visible={moreOpen}
        onClose={() => setMoreOpen(false)}
        onBlock={onBlockPeer}
        onReport={() => setReportOpen(true)}
      />
      <ReportUserModal
        visible={reportOpen}
        submitting={reportSubmitting}
        onClose={() => setReportOpen(false)}
        onSubmit={onSubmitReport}
      />

      <View style={[styles.flex, { paddingBottom: keyboardBottomPad }]}>
        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={ACCENT}
            />
          }
        >
          {messages.length === 0 ? (
            <Text style={styles.emptyThread}>{t("chat.emptyThread")}</Text>
          ) : null}
          {timeline.map((item) => {
            if (item.kind === "day") {
              return (
                <View key={item.key} style={styles.dateSeparatorWrap}>
                  <View style={styles.dateSeparatorChip}>
                    <Text style={styles.dateSeparatorText}>{item.label}</Text>
                  </View>
                </View>
              );
            }
            const m = item.message;
            const mine = m.senderId === myUserId;
            return (
              <View
                key={m.id}
                style={[styles.row, mine ? styles.rowMe : styles.rowThem]}
              >
                <View
                  style={[
                    styles.bubble,
                    mine ? styles.bubbleMe : styles.bubbleThem,
                  ]}
                >
                  <View style={styles.bubbleInner}>
                    <Text style={styles.bubbleText}>{m.body}</Text>
                    <View style={styles.bubbleFooter}>
                      <Text
                        style={[
                          styles.bubbleTime,
                          mine ? styles.bubbleTimeMe : styles.bubbleTimeThem,
                        ]}
                      >
                        {formatChatTime(m.createdAt, lang)}
                      </Text>
                      {mine ? (
                        <View style={styles.checkPair}>
                          <Checks
                            size={14}
                            color="rgba(255,255,255,0.75)"
                            weight="bold"
                            style={{ marginLeft: -2 }}
                          />
                        </View>
                      ) : null}
                    </View>
                  </View>
                </View>
              </View>
            );
          })}
        </ScrollView>

        <View
          style={[
            styles.inputBar,
            {
              paddingBottom: keyboardVisible
                ? Platform.OS === "android"
                  ? COMPOSER_PAD_KEYBOARD_ANDROID
                  : COMPOSER_PAD_KEYBOARD_IOS
                : Math.max(insets.bottom, 12),
            },
          ]}
        >
          <View style={styles.inputPill}>
            <TextInput
              style={styles.input}
              placeholder={t("chat.inputPlaceholder")}
              placeholderTextColor="#636366"
              value={draft}
              onChangeText={setDraft}
              editable={!!conversationId && !sending}
              multiline
              maxLength={4000}
            />
          </View>
          <Pressable
            onPress={() => void onSend()}
            disabled={!conversationId || sending || !draft.trim()}
            style={({ pressed }) => [
              styles.sendBtn,
              (!conversationId || sending || !draft.trim()) &&
                styles.sendBtnDisabled,
              pressed &&
                !(!conversationId || sending || !draft.trim()) &&
                styles.sendBtnPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={t("chat.sendA11y")}
          >
            {sending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <PaperPlaneRight
                size={18}
                color="#fff"
                weight="fill"
                style={{ marginLeft: 1 }}
              />
            )}
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

export default function ChatScreen() {
  const raw = useLocalSearchParams<{ id: string | string[] }>().id;
  const id = Array.isArray(raw) ? raw[0] : (raw ?? "");
  if (!id.trim()) {
    return <InvalidPeerChatScreen />;
  }
  if (isLiveChatPeerId(id)) {
    return <LiveChatScreen peerId={id} />;
  }
  return <InvalidPeerChatScreen />;
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: BG,
  },
  flex: {
    flex: 1,
  },
  headerWrap: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: BG,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  headerBackCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerBackPressed: {
    opacity: 0.75,
  },
  headerCenter: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    minWidth: 0,
    marginHorizontal: 6,
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: 12,
  },
  headerCenterPressed: {
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  headerCenterDisabled: {
    opacity: 1,
  },
  headerAvatarImg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#2C2C2E",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.14)",
  },
  headerAvatarRingOnline: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#34C759",
    shadowColor: "#34C759",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 8,
    elevation: 8,
  },
  headerAvatarLoading: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#2C2C2E",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.1)",
  },
  headerTextCol: {
    flex: 1,
    marginLeft: 12,
    minWidth: 0,
  },
  headerTitle: {
    color: "#F5F5F7",
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  headerSubtitle: {
    color: "#8E8E93",
    fontSize: 13,
    marginTop: 3,
    fontWeight: "500",
  },
  headerMoreBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  headerMorePressed: {
    opacity: 0.8,
  },
  authBannerText: {
    flex: 1,
    marginLeft: 10,
    color: "#E5E5EA",
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "600",
  },
  invalidPeerTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.35,
    marginTop: 8,
  },
  invalidPeerSub: {
    marginTop: 10,
    color: "#8E8E93",
    fontSize: 15,
    lineHeight: 22,
  },
  scroll: {
    flex: 1,
    backgroundColor: AREA,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 28,
  },
  emptyThread: {
    color: "#8E8E93",
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    marginTop: 32,
    marginBottom: 12,
    paddingHorizontal: 24,
  },
  row: {
    marginBottom: 12,
    flexDirection: "row",
  },
  rowMe: {
    justifyContent: "flex-end",
  },
  rowThem: {
    justifyContent: "flex-start",
  },
  dateSeparatorWrap: {
    alignItems: "center",
    marginTop: 6,
    marginBottom: 10,
  },
  dateSeparatorChip: {
    backgroundColor: "rgba(255,255,255,0.14)",
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 8,
  },
  dateSeparatorText: {
    color: "rgba(255,255,255,0.92)",
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  bubble: {
    maxWidth: "82%",
    minWidth: 72,
    borderRadius: 18,
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 6,
    paddingLeft: 12,
    paddingRight: 10,
  },
  bubbleInner: {
    flexShrink: 1,
  },
  bubbleMe: {
    backgroundColor: OUTGOING,
    borderBottomRightRadius: 4,
    ...Platform.select({
      ios: {
        shadowColor: OUTGOING,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.35,
        shadowRadius: 6,
      },
      android: { elevation: 3 },
      default: {},
    }),
  },
  bubbleThem: {
    backgroundColor: INCOMING,
    borderBottomLeftRadius: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.06)",
  },
  bubbleText: {
    color: "#fff",
    fontSize: 15.5,
    lineHeight: 21,
  },
  bubbleFooter: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "flex-end",
    alignSelf: "flex-end",
    marginTop: 4,
    gap: 4,
  },
  bubbleTime: {
    fontSize: 11,
    fontWeight: "500",
    letterSpacing: 0.1,
    marginBottom: 1,
  },
  bubbleTimeMe: {
    color: "rgba(255,255,255,0.72)",
  },
  bubbleTimeThem: {
    color: "rgba(255,255,255,0.45)",
  },
  checkPair: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 0,
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingTop: 10,
    backgroundColor: "#0A0A0B",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.1)",
    gap: 10,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
      },
      default: {},
    }),
  },
  inputPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1C1C1E",
    borderRadius: 22,
    paddingHorizontal: 16,
    minHeight: 44,
    maxHeight: 120,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.08)",
  },
  input: {
    flex: 1,
    color: "#fff",
    fontSize: 16,
    lineHeight: 22,
    paddingVertical: 11,
    maxHeight: 120,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: ACCENT,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 1,
  },
  sendBtnDisabled: {
    opacity: 0.42,
  },
  sendBtnPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.96 }],
  },
});
