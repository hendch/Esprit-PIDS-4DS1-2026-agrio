import React from "react";
import { View, Text } from "react-native";

export function LivestockScreen() {
  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 22, fontWeight: "700" }}>Livestock & Sustainability</Text>
      <Text style={{ marginTop: 8, color: "#555" }}>
        Stub screen — will later manage animals, health records, alerts, sustainability metrics.
      </Text>
    </View>
  );
}
