import React from "react";
import { Tabs } from "expo-router";
import type { Icon } from "phosphor-react-native";
import { ChatCircle, House, User, UsersThree } from "phosphor-react-native";
import { useTranslation } from "react-i18next";
import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * Com a nav do sistema oculta (overlay), o Android costuma reportar `insets.bottom === 0`.
 * O BottomTabBar calcula altura como 49 + bottom; sem piso, a barra fica baixa demais e os ícones
 * ficam sob a zona de gestos / “rodapé” do SO.
 */
const ANDROID_TAB_BAR_MIN_BOTTOM_INSET = 44;

const TAB_ACTIVE = "#0A84FF";
const TAB_INACTIVE = "#8E8E93";

function TabBarIcon({ Icon, color }: { Icon: Icon; color: string }) {
  return (
    <Icon
      size={22}
      color={color}
      style={{ marginBottom: -2 }}
      weight="regular"
    />
  );
}

export default function TabLayout() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const androidTabSafeInsets =
    Platform.OS === "android"
      ? {
          top: insets.top,
          left: insets.left,
          right: insets.right,
          bottom: Math.max(insets.bottom, ANDROID_TAB_BAR_MIN_BOTTOM_INSET),
        }
      : undefined;

  return (
    <Tabs
      {...(androidTabSafeInsets != null
        ? { safeAreaInsets: androidTabSafeInsets }
        : {})}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: TAB_ACTIVE,
        tabBarInactiveTintColor: TAB_INACTIVE,
        tabBarStyle: {
          backgroundColor: "#121212",
          borderTopWidth: 0,
          elevation: 0,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "500",
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t("tabs.home"),
          headerShown: false,
          tabBarIcon: ({ color }) => <TabBarIcon Icon={House} color={color} />,
        }}
      />
      <Tabs.Screen
        name="matches"
        options={{
          title: t("tabs.matches"),
          headerShown: false,
          tabBarIcon: ({ color }) => (
            <TabBarIcon Icon={UsersThree} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="conversas"
        options={{
          title: t("tabs.chats"),
          headerShown: false,
          tabBarIcon: ({ color }) => (
            <TabBarIcon Icon={ChatCircle} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          title: t("tabs.profile"),
          tabBarIcon: ({ color }) => <TabBarIcon Icon={User} color={color} />,
        }}
      />
      <Tabs.Screen
        name="resumo"
        options={{
          href: null,
          title: t("interviewTab.title"),
        }}
      />
    </Tabs>
  );
}
