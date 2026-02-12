import React from "react";
import { ScrollView, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { featureRegistry } from "../../core/featureRegistry/FeatureRegistry";
import { DashboardCard } from "../../shared/components/DashboardCard";

export function DashboardScreen() {
  const nav = useNavigation<any>();
  const entries = featureRegistry.listDashboardEntries();

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      <View style={{ marginBottom: 8 }}>
        <Text style={{ fontSize: 26, fontWeight: "800" }}>AGRIO</Text>
        <Text style={{ marginTop: 6, color: "#555" }}>
          One app. Four pillars. Smarter decisions — even offline.
        </Text>
      </View>

      {entries.map((e) => (
        <DashboardCard
          key={e.routeName}
          title={e.title}
          subtitle={e.subtitle}
          emoji={e.emoji}
          onPress={() => nav.navigate(e.routeName)}
        />
      ))}
    </ScrollView>
  );
}
