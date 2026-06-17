import type { Icon } from 'phosphor-react-native';
import {
  ArrowCounterClockwise,
  CheckCircle,
  Heart,
  Lightning,
  MapPin,
  Star,
  Translate,
  UsersThree,
  X,
} from 'phosphor-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Image,
  type LayoutChangeEvent,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import type { MatchProfile } from '@/lib/match-demo-deck';
import { photoUri } from '@/lib/match-demo-deck';
import { showValidationToast } from '@/lib/validation-toast';
import { StoryPhotoProgressStrip } from '@/components/StoryPhotoProgressStrip';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const CARD_MARGIN_H = 32;
const CARD_MARGIN_H_SINGLE = 14;
const CARD_RADIUS = 22;
/** Espaço: `cardFront` marginBottom + fila de ações + paddings. */
const BELOW_CARD = 156;
/** Margem mínima entre o fundo do card e a fila de ações (evita sobreposição). */
const MIN_CLEAR_BELOW_CARD = 150;
const SWIPE_X = 115;
const SWIPE_Y = 95;
/** Tempo por foto na barra estilo stories antes de avançar automaticamente. */
const STORY_PHOTO_DURATION_MS = 6500;
/** Cross-dissolve nativo (expo-image) ao mudar `source` — evita piscar de duas camadas RN. */
const PHOTO_CROSS_DISSOLVE_MS = 520;

const ACCENT = '#2196F3';
const LIKE = '#4CAF50';
const NOPE = '#F44336';
const SUPER = '#FFC107';
const BOOST = '#9C27B0';

type SwipeKind = 'pass' | 'like' | 'super';

type Props = {
  profiles: MatchProfile[];
  /** Persiste pass/like/super no servidor; se falhar, o cartão não avança. */
  onRecordSwipe?: (peerId: string, kind: SwipeKind) => Promise<void>;
};

export function MatchSwipeDeck({ profiles, onRecordSwipe }: Props) {
  const { t } = useTranslation();
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [photoIndex, setPhotoIndex] = useState(0);
  /** Pausa o auto-advance das fotos enquanto o dedo está no cartão (estilo stories). */
  const [storyPaused, setStoryPaused] = useState(false);
  const [deckLayoutH, setDeckLayoutH] = useState(0);
  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const actionScaleAnim = useRef(new Animated.Value(0)).current;
  const [actionKind, setActionKind] = useState<SwipeKind | null>(null);
  const historyRef = useRef<number[]>([]);
  const photoCountRef = useRef(1);

  const remaining = profiles.length - index;
  const isLastInDeck = remaining === 1;

  const cardW = useMemo(
    () => SCREEN_W - (isLastInDeck ? CARD_MARGIN_H_SINGLE : CARD_MARGIN_H),
    [isLastInDeck],
  );

  const cardH = useMemo(() => {
    const bonus = isLastInDeck ? Math.round(SCREEN_H * 0.09) : 0;
    const maxByLayout = deckLayoutH >= 180 ? deckLayoutH - MIN_CLEAR_BELOW_CARD : Number.POSITIVE_INFINITY;
    const cap = Math.min(Math.round(SCREEN_H * 0.58), maxByLayout);

    if (deckLayoutH < 180) {
      const base = Math.max(280, Math.min(420, Math.round(SCREEN_H * 0.44)));
      return Math.min(cap, base + bonus);
    }
    const base = Math.max(300, Math.round(deckLayoutH - BELOW_CARD));
    return Math.min(cap, base + bonus);
  }, [deckLayoutH, isLastInDeck]);

  const onDeckLayout = useCallback((e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    if (h > 0) setDeckLayoutH(h);
  }, []);

  const current = profiles[index];
  const next = profiles[index + 1];
  const deepBack = profiles[index + 2];

  const frontPhotoSlots = useMemo(() => {
    const seeds = current?.photoSeeds ?? [];
    return seeds.length > 0 ? seeds : [`deck-fallback-${current?.id ?? 'x'}`];
  }, [current?.id, current?.photoSeeds]);

  photoCountRef.current = Math.max(1, frontPhotoSlots.length);

  const frontPhotoUri = useMemo(
    () => photoUri(frontPhotoSlots[photoIndex] ?? `deck-fallback-${current?.id ?? 'x'}`),
    [frontPhotoSlots, photoIndex, current?.id],
  );

  const advanceStoryPhoto = useCallback(() => {
    setPhotoIndex((p) => {
      const n = photoCountRef.current;
      return n > 0 ? (p + 1) % n : 0;
    });
  }, []);

  const resetPan = useCallback(() => {
    pan.setValue({ x: 0, y: 0 });
    fadeAnim.setValue(1);
  }, [pan, fadeAnim]);

  const flyOut = useCallback(
    (offX: number, offY: number, kind: SwipeKind) => {
      const peerIdSwiped = profiles[index]?.id;
      Animated.parallel([
        Animated.timing(pan.x, {
          toValue: offX,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(pan.y, {
          toValue: offY,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start(() => {
        void (async () => {
          if (onRecordSwipe && peerIdSwiped) {
            try {
              await onRecordSwipe(peerIdSwiped, kind);
            } catch {
              showValidationToast(t('discoverSwipe.swipeSaveError'));
              resetPan();
              fadeAnim.setValue(1);
              setStoryPaused(false);
              return;
            }
          }

          if (kind === 'pass') showValidationToast(t('discoverSwipe.toastPass'));
          else if (kind === 'like') showValidationToast(t('discoverSwipe.toastLike'));
          else showValidationToast(t('discoverSwipe.toastSuper'));

          setIndex((i) => {
            historyRef.current.push(i);
            return Math.min(i + 1, profiles.length);
          });
          setPhotoIndex(0);
          resetPan();
          setStoryPaused(false);
        })();
      });
    },
    [pan, fadeAnim, profiles, profiles.length, index, onRecordSwipe, resetPan, t],
  );

  const flyOutWithAnim = useCallback(
    (offX: number, offY: number, kind: SwipeKind) => {
      setActionKind(kind);
      actionScaleAnim.setValue(0);

      Animated.timing(actionScaleAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start(() => {
        setActionKind(null);
      });

      flyOut(offX, offY, kind);
    },
    [flyOut, actionScaleAnim],
  );

  const decideSwipe = useCallback(
    (dx: number, dy: number): boolean => {
      const absX = Math.abs(dx);
      const absY = Math.abs(dy);
      if (dy < -SWIPE_Y && absY >= absX) {
        flyOut(0, -SCREEN_H * 0.75, 'super');
        return true;
      }
      if (dx > SWIPE_X && absX >= absY) {
        flyOut(SCREEN_W * 1.15, 0, 'like');
        return true;
      }
      if (dx < -SWIPE_X && absX >= absY) {
        flyOut(-SCREEN_W * 1.15, 0, 'pass');
        return true;
      }
      Animated.spring(pan, {
        toValue: { x: 0, y: 0 },
        friction: 6,
        useNativeDriver: true,
      }).start();
      return false;
    },
    [flyOut, pan],
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 6 || Math.abs(g.dy) > 6,
        onPanResponderGrant: () => {
          setStoryPaused(true);
        },
        onPanResponderMove: (_, g) => {
          pan.setValue({ x: g.dx, y: g.dy });
        },
        onPanResponderRelease: (_, g) => {
          if (!decideSwipe(g.dx, g.dy)) setStoryPaused(false);
        },
        onPanResponderTerminate: (_, g) => {
          if (!decideSwipe(g.dx, g.dy)) setStoryPaused(false);
        },
      }),
    [decideSwipe, pan],
  );

  const rewind = useCallback(() => {
    const prev = historyRef.current.pop();
    if (prev === undefined) {
      showValidationToast(t('discoverSwipe.toastRewindNone'));
      return;
    }
    setIndex(prev);
    setPhotoIndex(0);
    setStoryPaused(false);
    resetPan();
    showValidationToast(t('discoverSwipe.toastRewind'));
  }, [resetPan, t]);

  useEffect(() => {
    historyRef.current = [];
    setIndex(0);
    setPhotoIndex(0);
    setStoryPaused(false);
    resetPan();
  }, [profiles, resetPan]);

  const onBoost = useCallback(() => {
    showValidationToast(t('discoverSwipe.toastBoost'));
  }, [t]);

  const rotate = pan.x.interpolate({
    inputRange: [-SCREEN_W / 2, 0, SCREEN_W / 2],
    outputRange: ['-8deg', '0deg', '8deg'],
    extrapolate: 'clamp',
  });

  if (!current) {
    return (
      <View style={styles.emptyWrap}>
        <View style={styles.emptyIconWrap}>
          <UsersThree size={32} color="#8e8e93" weight="regular" />
        </View>
        <Text style={styles.emptyTitle}>{t('discoverSwipe.emptyTitle')}</Text>
        <Text style={styles.emptySub}>{t('discoverSwipe.emptySub')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.root} onLayout={onDeckLayout}>
      {deepBack ? (
        <View style={[styles.card, { width: cardW, height: cardH }, styles.cardBehindDeep]} pointerEvents="none">
          <Image
            source={{ uri: photoUri(deepBack.photoSeeds[0] ?? `deck-fallback-${deepBack.id}`) }}
            style={styles.photo}
            resizeMode="cover"
          />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.18)', 'rgba(0,0,0,0.62)', 'rgba(0,0,0,0.88)']}
            locations={[0, 0.38, 0.74, 1]}
            pointerEvents="none"
            style={[styles.stackBottomScrim, { height: Math.round(cardH * 0.48) }]}
          />
        </View>
      ) : null}
      {next ? (
        <View style={[styles.card, { width: cardW, height: cardH }, styles.cardBehind]} pointerEvents="none">
          <Image
            source={{ uri: photoUri(next.photoSeeds[0] ?? `deck-fallback-${next.id}`) }}
            style={styles.photo}
            resizeMode="cover"
          />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.2)', 'rgba(0,0,0,0.65)', 'rgba(0,0,0,0.9)']}
            locations={[0, 0.36, 0.72, 1]}
            pointerEvents="none"
            style={[styles.stackBottomScrim, { height: Math.round(cardH * 0.46) }]}
          />
        </View>
      ) : null}

      <Animated.View
        {...panResponder.panHandlers}
        key={current.id}
        style={[
          styles.card,
          { width: cardW, height: cardH },
          styles.cardFront,
          isLastInDeck && styles.cardFrontLast,
          {
            opacity: fadeAnim,
            transform: [{ translateX: pan.x }, { translateY: pan.y }, { rotate }],
          },
        ]}>
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <ExpoImage
            source={{ uri: frontPhotoUri }}
            style={styles.photo}
            contentFit="cover"
            transition={PHOTO_CROSS_DISSOLVE_MS}
            cachePolicy="memory-disk"
          />
        </View>
        <LinearGradient
          colors={['rgba(0,0,0,0.45)', 'rgba(0,0,0,0.12)', 'transparent']}
          locations={[0, 0.4, 1]}
          pointerEvents="none"
          style={styles.topScrim}
        />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.12)', 'rgba(0,0,0,0.5)', 'rgba(0,0,0,0.82)', 'rgba(0,0,0,0.94)']}
          locations={[0, 0.28, 0.58, 0.85, 1]}
          pointerEvents="none"
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={[styles.bottomScrim, { height: Math.round(cardH * 0.46) }]}
        />

        <View style={styles.progressRow} pointerEvents="box-none">
          <StoryPhotoProgressStrip
            key={current.id}
            storyKey={current.id}
            photoCount={frontPhotoSlots.length}
            photoIndex={photoIndex}
            onTapSegment={setPhotoIndex}
            onAutoAdvance={advanceStoryPhoto}
            paused={storyPaused}
            durationMs={STORY_PHOTO_DURATION_MS}
          />
        </View>

        <View style={styles.labels} pointerEvents="none">
          <Animated.Text
            style={[
              styles.labelNope,
              {
                opacity: pan.x.interpolate({
                  inputRange: [-SWIPE_X, -40, 0],
                  outputRange: [1, 0.4, 0],
                  extrapolate: 'clamp',
                }),
              },
            ]}>
            {t('discoverSwipe.labelPass')}
          </Animated.Text>
          <Animated.Text
            style={[
              styles.labelSuper,
              { marginTop: -cardH * 0.25 },
              {
                opacity: pan.y.interpolate({
                  inputRange: [-SWIPE_Y, -40, 0],
                  outputRange: [1, 0.35, 0],
                  extrapolate: 'clamp',
                }),
              },
            ]}>
            {t('discoverSwipe.labelSuper')}
          </Animated.Text>
          <Animated.Text
            style={[
              styles.labelLike,
              {
                opacity: pan.x.interpolate({
                  inputRange: [0, 40, SWIPE_X],
                  outputRange: [0, 0.4, 1],
                  extrapolate: 'clamp',
                }),
              },
            ]}>
            {t('discoverSwipe.labelLike')}
          </Animated.Text>
        </View>

        <View style={[styles.overlayWrap, { height: Math.round(cardH * 0.42) }]} pointerEvents="box-none">
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.14)', 'rgba(0,0,0,0.58)', 'rgba(0,0,0,0.94)']}
            locations={[0, 0.25, 0.62, 1]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />
          <Pressable
            style={styles.overlayInner}
            accessibilityRole="button"
            accessibilityLabel={t('discoverSwipe.openProfileA11y')}
            onPress={() =>
              router.push({
                pathname: '/user-profile',
                params: {
                  id: current.id,
                  ...(current.cityLabel
                    ? { city: encodeURIComponent(current.cityLabel) }
                    : {}),
                },
              })
            }>
            <View style={styles.nameRow}>
              <Text style={styles.name}>{current.name}</Text>
              <CheckCircle size={18} color={ACCENT} style={styles.verified} weight="fill" />
            </View>
            <Text style={styles.headlineOverlay} numberOfLines={1}>
              {current.headline}
            </Text>
            <Text style={styles.subline} numberOfLines={2}>
              {t('discoverSwipe.subline', {
                score: Math.round(
                  typeof current.compatibility === 'number' ? current.compatibility : 0,
                ),
              })}
            </Text>
            <View style={styles.pillRow}>
              <View style={styles.pill}>
                <MapPin size={13} color="#f0f0f0" weight="fill" />
                <Text style={styles.pillText}>
                  {t('discoverSwipe.kmAway', {
                    km: (typeof current.distanceKm === 'number' ? current.distanceKm : 0).toFixed(1),
                  })}
                </Text>
              </View>
              <View style={styles.pill}>
                <Translate size={13} color="#f0f0f0" weight="regular" />
                <Text style={styles.pillText}>
                  {current.languageKey === 'en'
                    ? t('discoverSwipe.langEn')
                    : current.languageKey === 'es'
                      ? t('discoverSwipe.langEs')
                      : t('discoverSwipe.langPt')}
                </Text>
              </View>
            </View>
            <Text style={styles.taglineOverlay} numberOfLines={2}>
              {current.tagline}
            </Text>
          </Pressable>
        </View>
      </Animated.View>

      <View style={styles.actions}>
        <CircleBtn variant="sm" iconColor="#43A047" Icon={ArrowCounterClockwise} onPress={rewind} />
        <CircleBtn variant="md" iconColor={NOPE} Icon={X} onPress={() => flyOutWithAnim(-SCREEN_W * 1.15, 0, 'pass')} />
        <CircleBtn variant="lg" iconColor={SUPER} Icon={Star} onPress={() => flyOutWithAnim(0, -SCREEN_H * 0.75, 'super')} />
        <CircleBtn variant="md" iconColor={ACCENT} Icon={Heart} onPress={() => flyOutWithAnim(SCREEN_W * 1.15, 0, 'like')} />
        <CircleBtn variant="sm" iconColor={BOOST} Icon={Lightning} onPress={onBoost} />
      </View>

      {actionKind && (
        <View style={styles.actionAnimContainer} pointerEvents="none">
          <Animated.View
            style={[
              styles.actionAnimIconWrap,
              {
                borderColor: actionKind === 'like' ? ACCENT : actionKind === 'pass' ? NOPE : SUPER,
                opacity: actionScaleAnim.interpolate({
                  inputRange: [0, 0.1, 0.8, 1],
                  outputRange: [0, 1, 1, 0],
                }),
                transform: [
                  {
                    scale: actionScaleAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.5, 2],
                    }),
                  },
                  {
                    rotate: actionKind === 'pass' ? '-15deg' : actionKind === 'like' ? '15deg' : '0deg',
                  },
                ],
              },
            ]}>
            {actionKind === 'like' ? (
              <Heart size={90} color={ACCENT} weight="fill" />
            ) : actionKind === 'pass' ? (
              <X size={90} color={NOPE} weight="bold" />
            ) : (
              <Star size={90} color={SUPER} weight="fill" />
            )}
          </Animated.View>
        </View>
      )}
    </View>
  );
}

function CircleBtn({
  Icon,
  iconColor,
  onPress,
  variant,
}: {
  Icon: Icon;
  iconColor: string;
  onPress: () => void;
  variant: 'sm' | 'md' | 'lg';
}) {
  const w = variant === 'sm' ? 50 : variant === 'md' ? 64 : 76;
  const iconSize = variant === 'sm' ? 22 : variant === 'md' ? 30 : 36;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.circleBtn,
        {
          width: w,
          height: w,
          borderRadius: w / 2,
          backgroundColor: iconColor,
          borderColor: 'rgba(255,255,255,0.2)',
          borderWidth: StyleSheet.hairlineWidth,
          shadowColor: iconColor,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.5,
          shadowRadius: variant === 'lg' ? 12 : 8,
          elevation: variant === 'lg' ? 10 : 6,
        },
        pressed && { opacity: 0.8, transform: [{ scale: 0.88 }] },
      ]}>
      <Icon size={iconSize} color="#FFFFFF" weight="fill" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 10,
    paddingHorizontal: 6,
  },
  card: {
    maxWidth: '100%',
    borderRadius: CARD_RADIUS,
    overflow: 'hidden',
    backgroundColor: '#141414',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  topScrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 80,
    zIndex: 3,
  },
  bottomScrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 3,
  },
  stackBottomScrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
  cardBehindDeep: {
    position: 'absolute',
    bottom: 96,
    transform: [{ scale: 0.88 }],
    opacity: 0.42,
    zIndex: 0,
  },
  cardBehind: {
    position: 'absolute',
    bottom: 122,
    transform: [{ scale: 0.95 }],
    opacity: 0.68,
    zIndex: 1,
  },
  cardFront: {
    marginBottom: 44,
    zIndex: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 14,
  },
  cardFrontLast: {
    marginBottom: 28,
  },
  photo: {
    width: '100%',
    height: '100%',
    backgroundColor: '#1c1c1c',
  },
  progressRow: {
    position: 'absolute',
    top: 14,
    left: 14,
    right: 14,
    flexDirection: 'row',
    gap: 8,
    zIndex: 4,
  },
  labels: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  labelNope: {
    position: 'absolute',
    left: 16,
    top: '38%',
    fontSize: 28,
    fontWeight: '900',
    color: NOPE,
    borderWidth: 3,
    borderColor: NOPE,
    paddingHorizontal: 10,
    paddingVertical: 4,
    transform: [{ rotate: '-12deg' }],
  },
  labelLike: {
    position: 'absolute',
    right: 16,
    top: '38%',
    fontSize: 26,
    fontWeight: '900',
    color: LIKE,
    borderWidth: 3,
    borderColor: LIKE,
    paddingHorizontal: 10,
    paddingVertical: 4,
    transform: [{ rotate: '12deg' }],
  },
  labelSuper: {
    fontSize: 22,
    fontWeight: '900',
    color: SUPER,
    borderWidth: 3,
    borderColor: SUPER,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  overlayWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
    borderBottomLeftRadius: CARD_RADIUS,
    borderBottomRightRadius: CARD_RADIUS,
    zIndex: 5,
  },
  overlayInner: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 18,
    paddingBottom: 18,
    paddingTop: 32,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  name: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  verified: {
    marginTop: 2,
  },
  headlineOverlay: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: 15,
    fontWeight: '600',
    marginTop: 8,
    letterSpacing: -0.1,
  },
  subline: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 6,
    letterSpacing: 0.1,
    lineHeight: 18,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 14,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: 'rgba(28,28,30,0.72)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  pillText: {
    color: '#f2f2f7',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  taglineOverlay: {
    color: 'rgba(255,255,255,0.68)',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 12,
    letterSpacing: -0.05,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingTop: 16,
    paddingBottom: 16,
    paddingHorizontal: 12,
    width: '100%',
  },
  circleBtn: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
    gap: 14,
  },
  emptyIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  emptySub: {
    color: '#8e8e93',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 23,
    maxWidth: 300,
  },
  actionAnimContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
    elevation: 20,
    pointerEvents: 'none',
  },
  actionAnimIconWrap: {
    borderWidth: 6,
    borderRadius: 999,
    width: 160,
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
  },
});
