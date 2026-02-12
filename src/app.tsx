import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { RootNavigator } from "./core/navigation/RootNavigator";
import { AppBootstrap } from "./bootstrap/AppBootstrap";

export default function App() {
  return (
    <SafeAreaProvider>
      <AppBootstrap>
        <NavigationContainer>
          <RootNavigator />
        </NavigationContainer>
      </AppBootstrap>
    </SafeAreaProvider>
  );
}
