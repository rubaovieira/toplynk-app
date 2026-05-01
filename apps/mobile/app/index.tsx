import { Redirect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { getIsLoggedIn } from "@/lib/auth-storage";
import { getHasCompletedOnboarding } from "@/lib/onboarding-storage";

export default function GateScreen() {
  const [loading, setLoading] = useState(true);
  const [target, setTarget] = useState<"onboarding" | "login" | "tabs" | null>(
    null,
  );

  const load = useCallback(async () => {
    try {
      const onboardingDone = await getHasCompletedOnboarding();
      const loggedIn = await getIsLoggedIn();
      if (!onboardingDone) {
        setTarget("onboarding");
      } else if (!loggedIn) {
        setTarget("login");
      } else {
        setTarget("tabs");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  if (target === "tabs") {
    return <Redirect href="/(tabs)" />;
  }
  if (target === "login") {
    return <Redirect href="/login" />;
  }
  if (target === "onboarding") {
    return <Redirect href="/onboarding" />;
  }

  return null;
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#121212",
  },
});
