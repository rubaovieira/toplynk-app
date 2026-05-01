import "@/lib/i18n";

import { BrandedSplash } from "@/components/BrandedSplash";
import * as NavigationBar from "expo-navigation-bar";
import * as Notifications from "expo-notifications";
import { useFonts } from "expo-font";
import { Stack, router } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { AppState, LogBox, Platform } from "react-native";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import "react-native-reanimated";

import { ValidationToastHost } from "@/components/ValidationToastHost";
import { useColorScheme } from "@/components/useColorScheme";
import { hydrateLocaleFromStorage } from "@/lib/i18n";
import { getApiBaseUrl } from "@/lib/api-config";
import { getAccessToken } from "@/lib/auth-storage";
import { registerExpoToken } from "@/lib/push-api";
import { registerForPushAsync } from "@/lib/push-notifications";
import { setStoredExpoPushToken } from "@/lib/push-token-storage";
import { postMyPresence } from "@/lib/users-api";

const APP_DARK_BG = "#121212";

const AppDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: APP_DARK_BG,
    card: APP_DARK_BG,
  },
};

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from "expo-router";

export const unstable_settings = {
  initialRouteName: "index",
};

SplashScreen.preventAutoHideAsync();
SplashScreen.setOptions({ fade: true, duration: 400 });

/** Metro HMR por vezes spamma call stacks após `npm install` / módulos nativos — esconder no LogBox (dev). */
if (__DEV__) {
  LogBox.ignoreLogs([
    "Requiring unknown module",
    "If you are sure the module exists, try restarting Metro",
  ]);
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (!loaded) return;
    void (async () => {
      await hydrateLocaleFromStorage();
      await SplashScreen.hideAsync();
    })();
  }, [loaded]);

  if (!loaded) {
    return (
      <>
        <StatusBar style="light" />
        <BrandedSplash />
      </>
    );
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();

  /** Android: esconde a barra de navegação (3 botões); reaparece ao deslizar de baixo para cima. Com gestos nativos do sistema, o efeito pode ser limitado (API do SO). */
  useEffect(() => {
    if (Platform.OS !== "android") return;
    void (async () => {
      try {
        await NavigationBar.setBehaviorAsync("overlay-swipe");
        await NavigationBar.setVisibilityAsync("hidden");
      } catch {
        // Activity ainda não pronta em alguns arranques; o config plugin aplica o estado no próximo cold start.
      }
    })();
  }, []);

  useEffect(() => {
    const ping = async () => {
      const base = getApiBaseUrl();
      if (!base) return;
      const token = await getAccessToken();
      if (!token) return;
      await postMyPresence(base).catch(() => undefined);
    };
    void ping();
    const interval = setInterval(() => void ping(), 60_000);
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") void ping();
    });
    return () => {
      clearInterval(interval);
      sub.remove();
    };
  }, []);

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const raw = response.notification.request.content.data;
        const data =
          raw && typeof raw === "object"
            ? (raw as Record<string, unknown>)
            : undefined;
        const type = data?.type;
        if (
          type === "message" &&
          data &&
          typeof data.conversationId === "string"
        ) {
          router.push(`/chat/${data.conversationId}`);
        } else if (type === "match") {
          router.push("/notifications");
        }
      },
    );
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (Platform.OS === "web") {
      return;
    }
    const registerPush = async () => {
      const base = getApiBaseUrl();
      const jwt = await getAccessToken();
      if (!base || !jwt) return;
      try {
        const expoToken = await registerForPushAsync();
        if (!expoToken) return;
        const platform = Platform.OS === "ios" ? "ios" : "android";
        await registerExpoToken(base, expoToken, platform);
        await setStoredExpoPushToken(expoToken);
      } catch {
        /* ignore */
      }
    };
    void registerPush();
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") void registerPush();
    });
    return () => sub.remove();
  }, []);

  return (
    <ThemeProvider value={colorScheme === "dark" ? AppDarkTheme : DefaultTheme}>
      <Stack
        screenOptions={{
          headerShown: false,
          headerBackButtonDisplayMode: "minimal",
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="login" />
        <Stack.Screen name="signup" />
        <Stack.Screen name="setup" />
        <Stack.Screen name="entrevista-ia" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="matches-search" />
        <Stack.Screen name="user-profile" />
        <Stack.Screen name="edit-profile" />
        <Stack.Screen name="notifications" />
        <Stack.Screen name="chat/[id]" />
        <Stack.Screen name="match" options={{ headerShown: true }} />
        <Stack.Screen
          name="modal"
          options={{ presentation: "modal", headerShown: true }}
        />
      </Stack>
      <ValidationToastHost />
    </ThemeProvider>
  );
}
