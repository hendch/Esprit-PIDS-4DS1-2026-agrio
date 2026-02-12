export const Routes = {
    Dashboard: "Dashboard",
    Irrigation: "Irrigation",
    Satellite: "Satellite",
    DiseaseDetection: "DiseaseDetection",
    Livestock: "Livestock",
    FarmTrustLedger: "FarmTrustLedger",
  } as const;
  
  export type RouteName = (typeof Routes)[keyof typeof Routes];
  