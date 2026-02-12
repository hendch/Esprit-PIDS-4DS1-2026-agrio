import React from "react";
import { View, Text } from "react-native";

export function DiseaseDetectionScreen() {
  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 22, fontWeight: "700" }}>Offline Disease Detection</Text>
      <Text style={{ marginTop: 8, color: "#555" }}>
        Stub screen — will later use camera + on-device model inference.
      </Text>
    </View>
  );
}
