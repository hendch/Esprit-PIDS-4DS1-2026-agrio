import type { FeatureModule } from "../../core/featureRegistry/FeatureModule";
import { Routes } from "../../core/navigation/routes";
import { SatelliteScreen } from "./SatelliteScreen";

export const satelliteModule: FeatureModule = {
  id: "satellite",
  routes: [{ name: Routes.Satellite, component: SatelliteScreen, options: { title: "Satellite" } }],
  dashboardEntry: {
    title: "Satellite Insights",
    subtitle: "Field zones, stress detection, VRA guidance",
    routeName: Routes.Satellite,
    emoji: "🛰️",
  },
};
