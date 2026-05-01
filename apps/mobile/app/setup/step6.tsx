import * as Location from "expo-location";
import { MapPin } from "phosphor-react-native";
import { router } from "expo-router";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import { SetupStepHeader } from "@/components/SetupStepHeader";
import { getApiBaseUrl } from "@/lib/api-config";
import { saveLastKnownLocation } from "@/lib/location-storage";
import { getSetupUserId } from "@/lib/setup-user-session";
import { patchUserProfile } from "@/lib/users-api";
import { showValidationToast } from "@/lib/validation-toast";

const BG = "#121212";
const ACCENT = "#2196F3";

function formatCityLabel(place: Location.LocationGeocodedAddress): string {
  const city = place.city || place.subregion || place.district || "";
  const region = place.region || "";
  const country = place.country || "";
  if (city && region) return `${city}, ${region}`.trim();
  if (city && country) return `${city}, ${country}`.trim();
  if (city) return city.trim();
  if (place.name) return String(place.name).trim();
  return "";
}

export default function SetupStep6Screen() {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);

  const onBack = useCallback(() => {
    router.back();
  }, []);

  const onContinue = useCallback(async () => {
    if (Platform.OS === "web") {
      router.replace("/entrevista-ia");
      return;
    }

    setBusy(true);
    let latitude: number | undefined;
    let longitude: number | undefined;

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        showValidationToast(t("setup.step6.errorPermission"));
      } else {
        try {
          const pos = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          latitude = pos.coords.latitude;
          longitude = pos.coords.longitude;
          await saveLastKnownLocation(latitude, longitude);
        } catch {
          showValidationToast(t("setup.step6.errorFetch"));
        }
      }

      const base = getApiBaseUrl();
      const uid = await getSetupUserId();
      if (base && uid && latitude !== undefined && longitude !== undefined) {
        try {
          let cityLabel: string | undefined;
          try {
            const places = await Location.reverseGeocodeAsync({
              latitude,
              longitude,
            });
            const first = places[0];
            if (first) {
              const line = formatCityLabel(first);
              if (line) cityLabel = line.slice(0, 200);
            }
          } catch {
            /* cidade opcional */
          }
          await patchUserProfile(base, uid, {
            latitude,
            longitude,
            ...(cityLabel ? { cityLabel } : {}),
          });
        } catch (e) {
          const msg =
            e instanceof Error && e.message.trim()
              ? e.message
              : t("setup.step1.errorApi");
          showValidationToast(msg);
          setBusy(false);
          return;
        }
      }

      setBusy(false);
      router.replace("/entrevista-ia");
    } catch {
      setBusy(false);
      router.replace("/entrevista-ia");
    }
  }, [t]);

  return (
    <>
      <StatusBar style="light" />
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <SetupStepHeader currentStep={6} onBack={onBack} />
        <View style={styles.body}>
          <View style={styles.centerBlock}>
            <View style={styles.iconCircle}>
              <MapPin size={52} color="#fff" weight="fill" />
            </View>
            <Text style={styles.title}>{t("setup.step6.title")}</Text>
            <Text style={styles.subtitle}>{t("setup.step6.subtitle")}</Text>
          </View>
        </View>
        <View style={styles.footer}>
          <Pressable
            onPress={onContinue}
            disabled={busy}
            style={({ pressed }) => [
              styles.primaryBtn,
              (pressed || busy) && styles.pressed,
              busy && styles.primaryBtnDisabled,
            ]}
          >
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryBtnText}>
                {Platform.OS === "web"
                  ? t("setup.continue")
                  : t("setup.step6.cta")}
              </Text>
            )}
          </Pressable>
        </View>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: BG,
  },
  body: {
    flex: 1,
    minHeight: 0,
    paddingHorizontal: 24,
  },
  centerBlock: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 24,
  },
  iconCircle: {
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: ACCENT,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
    ...Platform.select({
      ios: {
        shadowColor: ACCENT,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.45,
        shadowRadius: 16,
      },
      android: {
        elevation: 12,
      },
      default: {},
    }),
  },
  title: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 28,
    lineHeight: 32,
    paddingHorizontal: 8,
  },
  subtitle: {
    color: "rgba(255,255,255,0.88)",
    fontSize: 16,
    lineHeight: 24,
    textAlign: "center",
    marginTop: 16,
    maxWidth: 340,
    paddingHorizontal: 8,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 12,
    paddingTop: 8,
  },
  primaryBtn: {
    backgroundColor: ACCENT,
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
  },
  primaryBtnText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
  },
  primaryBtnDisabled: {
    opacity: 0.85,
  },
  pressed: {
    opacity: 0.92,
  },
});
