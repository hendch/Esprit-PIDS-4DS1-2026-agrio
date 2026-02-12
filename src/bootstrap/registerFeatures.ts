import { featureRegistry } from "../core/featureRegistry/FeatureRegistry";

import { dashboardModule } from "../features/dashboard/DashboardModule";
import { irrigationModule } from "../features/irrigation/IrrigationModule";
import { satelliteModule } from "../features/satellite/SatelliteModule";
import { diseaseDetectionModule } from "../features/diseaseDetection/DiseaseDetectionModule";
import { livestockModule } from "../features/livestock/LivestockModule";
// Keep ledger optional (can be hidden from dashboard)
import { farmTrustLedgerModule } from "../features/farmTrustLedger/FarmTrustLedgerModule";

let registered = false;

export function registerFeatures() {
  if (registered) return;
  registered = true;

  featureRegistry.register(dashboardModule);
  featureRegistry.register(irrigationModule);
  featureRegistry.register(satelliteModule);
  featureRegistry.register(diseaseDetectionModule);
  featureRegistry.register(livestockModule);
  featureRegistry.register(farmTrustLedgerModule);
}
