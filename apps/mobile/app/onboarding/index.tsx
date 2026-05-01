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
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import { LanguageSelector } from "@/components/LanguageSelector";
import { setOnboardingComplete } from "@/lib/onboarding-storage";

const { width: SCREEN_W } = Dimensions.get("window");

type Slide = {
  key: string;
  imageUri: string;
  title: string;
  description: string;
};

const SLIDE_URIS = [
  "https://storage.googleapis.com/flutterflow-io-6f20.appspot.com/projects/top-lynk-o4k69i/assets/2gx82nl8e1qv/ChatGPT_Image_7_de_abr._de_2026%2C_02_21_27.png",
  "https://storage.googleapis.com/flutterflow-io-6f20.appspot.com/projects/top-lynk-o4k69i/assets/9w5ygkgukwoh/ChatGPT_Image_7_de_abr._de_2026%2C_02_22_43.png",
  "https://storage.googleapis.com/flutterflow-io-6f20.appspot.com/projects/top-lynk-o4k69i/assets/qv740r60jgrd/ChatGPT_Image_7_de_abr._de_2026%2C_02_25_16.png",
] as const;

const ACCENT = "#2196F3";
const BG = "#121212";

export default function OnboardingScreen() {
  const { t, i18n } = useTranslation();
  const listRef = useRef<FlatList<Slide>>(null);
  const [page, setPage] = useState(0);

  const slides = useMemo(
    () =>
      SLIDE_URIS.map((uri, i) => ({
        key: String(i + 1),
        imageUri: uri,
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
          source={{ uri: item.imageUri }}
          style={styles.illustration}
          resizeMode="cover"
        />
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.body}>{item.description}</Text>
      </View>
    );
  }, []);

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <View style={styles.languageBar}>
          <LanguageSelector compact />
        </View>
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

        <View style={styles.dots}>
          {slides.map((s, i) => (
            <View
              key={s.key}
              style={[styles.dot, i === page && styles.dotActive]}
            />
          ))}
        </View>

        <View style={styles.actions}>
          <Pressable
            onPress={onSkip}
            style={({ pressed }) => [
              styles.btnOutline,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.btnOutlineText}>{t("onboarding.skip")}</Text>
          </Pressable>
          <Pressable
            onPress={onContinue}
            style={({ pressed }) => [
              styles.btnSolid,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.btnSolidText}>{t("onboarding.continue")}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
  },
  safe: {
    flex: 1,
  },
  languageBar: {
    marginTop: 10,
    paddingHorizontal: 20,
    paddingBottom: 4,
  },
  list: {
    flex: 1,
  },
  slide: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
    justifyContent: "flex-start",
  },
  illustration: {
    width: SCREEN_W - 40,
    height: Dimensions.get("window").height * 0.42,
    borderRadius: 20,
    alignSelf: "center",
    marginBottom: 28,
  },
  title: {
    color: "#fff",
    fontSize: 26,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 14,
    paddingHorizontal: 8,
  },
  body: {
    color: "rgba(255,255,255,0.78)",
    fontSize: 16,
    lineHeight: 24,
    textAlign: "center",
    paddingHorizontal: 12,
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
    backgroundColor: "rgba(255,255,255,0.25)",
  },
  dotActive: {
    backgroundColor: ACCENT,
    width: 22,
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  btnOutline: {
    flex: 1,
    minHeight: 48,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: ACCENT,
    alignItems: "center",
    justifyContent: "center",
  },
  btnOutlineText: {
    color: ACCENT,
    fontSize: 16,
    fontWeight: "600",
  },
  btnSolid: {
    flex: 1,
    minHeight: 48,
    borderRadius: 999,
    backgroundColor: ACCENT,
    alignItems: "center",
    justifyContent: "center",
  },
  btnSolidText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  pressed: {
    opacity: 0.85,
  },
});
