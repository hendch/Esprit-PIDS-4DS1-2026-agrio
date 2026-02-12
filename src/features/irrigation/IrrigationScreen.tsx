import React from "react";
import { View, Text } from "react-native";

export function IrrigationScreen() {
  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 22, fontWeight: "700" }}>Autonomous Irrigation</Text>
      <Text style={{ marginTop: 8, color: "#555" }}>
        Stub screen — will later show recommendations, ET₀/ETc, logs, alerts.
      </Text>
    </View>
  );
}
