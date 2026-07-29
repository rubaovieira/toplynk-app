import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Dimensions,
  FlatList,
  Image,
  ListRenderItemInfo,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewToken,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import { LanguageSelector } from "@/components/LanguageSelector";
import { setOnboardingComplete } from "@/lib/onboarding-storage";

const { width: SCREEN_W } = Dimensions.get("window");

type Slide = {
  key: string;
  image: number;
  title: string;
  description: string;
};

const SLIDE_IMAGES = [
  require("../../assets/images/onboarding/01.jpeg"),
  require("../../assets/images/onboarding/03.jpeg"),
  require("../../assets/images/onboarding/06.jpeg"),
] as const;

const GRADIENT_START = "#2AC9B0";
const GRADIENT_END = "#3DBE6C";
const BG = "#121212";

export default function OnboardingScreen() {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<Slide>>(null);
  const [page, setPage] = useState(0);

  const slides = useMemo(
    () =>
      SLIDE_IMAGES.map((image, i) => ({
        key: String(i + 1),
        image,
        title: t(`onboarding.slide${i + 1}.title`),
        description: t(`onboarding.slide${i + 1}.description`),
      })),
    [t, i18n.language],
  );

  const finish = useCallback(async () => {
    await setOnboardingComplete();
    router.replace("/login");
  }, []);

  const onSkip = useCallback(() => {
    void finish();
  }, [finish]);

  const onContinue = useCallback(() => {
    if (page < slides.length - 1) {
      listRef.current?.scrollToIndex({ index: page + 1, animated: true });
    } else {
      void finish();
    }
  }, [page, finish, slides.length]);

  const onMomentumScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const x = e.nativeEvent.contentOffset.x;
      const idx = Math.round(x / SCREEN_W);
      setPage(Math.max(0, Math.min(idx, slides.length - 1)));
    },
    [slides.length],
  );

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const i = viewableItems[0]?.index;
      if (typeof i === "number") setPage(i);
    },
    [],
  );

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60 }).current;

  const renderItem = useCallback(({ item }: ListRenderItemInfo<Slide>) => {
    return (
      <View style={[styles.slide, { width: SCREEN_W }]}>
        <Image
          source={item.image}
          style={[StyleSheet.absoluteFill, { width: SCREEN_W, height: "100%" }]}
          resizeMode="cover"
        />
        <LinearGradient
          colors={["rgba(0,0,0,0.5)", "rgba(0,0,0,0.1)", "transparent"]}
          locations={[0, 0.5, 1]}
          pointerEvents="none"
          style={styles.topScrim}
        />
        <LinearGradient
          colors={[
            "transparent",
            "rgba(0,0,0,0.25)",
            "rgba(0,0,0,0.72)",
            "rgba(0,0,0,0.92)",
          ]}
          locations={[0, 0.4, 0.75, 1]}
          pointerEvents="none"
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.slideContent}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.body}>{item.description}</Text>
        </View>
      </View>
    );
  }, []);

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      <FlatList
        ref={listRef}
        data={slides}
        extraData={i18n.language}
        keyExtractor={(item) => item.key}
        renderItem={renderItem}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onMomentumScrollEnd}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        getItemLayout={(_, index) => ({
          length: SCREEN_W,
          offset: SCREEN_W * index,
          index,
        })}
        style={styles.list}
        bounces={false}
      />

      <View style={[styles.topBar, { top: insets.top + 12 }]} pointerEvents="box-none">
        <Text style={styles.brand}>TOPLYNK</Text>
        <LanguageSelector compact />
      </View>

      <SafeAreaView
        style={styles.bottomOverlay}
        edges={["bottom"]}
        pointerEvents="box-none"
      >
        <View style={styles.dots}>
          {slides.map((s, i) => (
            <View key={s.key} style={[styles.dot, i === page && styles.dotActive]} />
          ))}
        </View>

        <Pressable onPress={onContinue}>
          {({ pressed }) => (
            <LinearGradient
              colors={[GRADIENT_START, GRADIENT_END]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.btnGradient, pressed && styles.pressed]}
            >
              <Text style={styles.btnGradientText}>{t("onboarding.continue")}</Text>
            </LinearGradient>
          )}
        </Pressable>

        <Pressable onPress={onSkip} hitSlop={10} style={styles.skipBtn}>
          <Text style={styles.skipText}>{t("onboarding.skip")}</Text>
        </Pressable>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
  },
  list: {
    flex: 1,
  },
  /** Item de lista horizontal: dimensões explícitas + clip. `flex: 1` aqui deixa a
   *  largura ambígua no eixo principal e o fundo em `absoluteFill` sai da escala. */
  slide: {
    height: "100%",
    overflow: "hidden",
  },
  topScrim: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    height: 220,
  },
  slideContent: {
    flex: 1,
    justifyContent: "flex-end",
    paddingHorizontal: 28,
    paddingBottom: 190,
  },
  title: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "800",
    lineHeight: 34,
    textAlign: "center",
    marginBottom: 12,
  },
  body: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
  },
  topBar: {
    position: "absolute",
    left: 20,
    right: 20,
    gap: 10,
  },
  brand: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: 1,
    textAlign: "center",
  },
  bottomOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 24,
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginBottom: 16,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.35)",
  },
  dotActive: {
    backgroundColor: "#fff",
    width: 22,
  },
  btnGradient: {
    minHeight: 56,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  btnGradientText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
  },
  skipBtn: {
    alignSelf: "center",
    marginTop: 14,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  skipText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 14,
    fontWeight: "600",
  },
  pressed: {
    opacity: 0.85,
  },
});
