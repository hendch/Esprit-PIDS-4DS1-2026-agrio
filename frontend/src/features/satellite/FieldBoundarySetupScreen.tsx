import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { MapPressEvent, Marker, Polygon, PROVIDER_GOOGLE } from "react-native-maps";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "../../core/theme/useTheme";
import { CROP_OPTIONS } from "./cropOptions";
import { FieldBoundaryRecord, listFieldBoundaries, saveFieldBoundary } from "./fieldBoundaryService";

type LatLng = {
  latitude: number;
  longitude: number;
};

const INITIAL_REGION = {
  latitude: 36.8065,
  longitude: 10.1815,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

const mapStyle = [
  { elementType: "geometry", stylers: [{ color: "#F3F0E8" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#4A4A4A" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#FAFAF8" }] },
  { featureType: "administrative", elementType: "geometry.stroke", stylers: [{ color: "#D6D0C4" }] },
  { featureType: "landscape.natural", elementType: "geometry", stylers: [{ color: "#E8F5E9" }] },
  { featureType: "poi", elementType: "geometry", stylers: [{ color: "#E6E2D8" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#DDEFD7" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#FFFFFF" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#DDD8CE" }] },
  { featureType: "road", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#CDE8F5" }] },
];

function computeAreaHa(points: LatLng[]): number {
  if (points.length < 3) {
    return 0;
  }

  const meanLatRad =
    points.reduce((sum, point) => sum + (point.latitude * Math.PI) / 180, 0) / points.length;
  const metersPerDegLat = 111_132;
  const metersPerDegLon = 111_320 * Math.cos(meanLatRad);

  const coords = points.map((point) => ({
    x: point.longitude * metersPerDegLon,
    y: point.latitude * metersPerDegLat,
  }));
  const closed = [...coords, coords[0]];

  let areaM2 = 0;
  for (let index = 0; index < coords.length; index += 1) {
    areaM2 += closed[index].x * closed[index + 1].y - closed[index + 1].x * closed[index].y;
  }
  return Math.abs(areaM2 / 2) / 10_000;
}

function isPointInsidePolygon(point: LatLng, polygon: LatLng[]): boolean {
  if (polygon.length < 3) {
    return false;
  }

  let inside = false;
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index, index += 1) {
    const currentPoint = polygon[index];
    const previousPoint = polygon[previous];
    const crossesLatitude =
      currentPoint.latitude > point.latitude !== previousPoint.latitude > point.latitude;

    if (!crossesLatitude) {
      continue;
    }

    const intersectLongitude =
      ((previousPoint.longitude - currentPoint.longitude) * (point.latitude - currentPoint.latitude)) /
        (previousPoint.latitude - currentPoint.latitude) +
      currentPoint.longitude;

    if (point.longitude < intersectLongitude) {
      inside = !inside;
    }
  }

  return inside;
}

function orientation(a: LatLng, b: LatLng, c: LatLng): number {
  return (b.longitude - a.longitude) * (c.latitude - a.latitude) - (b.latitude - a.latitude) * (c.longitude - a.longitude);
}

function isOnSegment(a: LatLng, b: LatLng, c: LatLng): boolean {
  return (
    Math.min(a.longitude, b.longitude) <= c.longitude &&
    c.longitude <= Math.max(a.longitude, b.longitude) &&
    Math.min(a.latitude, b.latitude) <= c.latitude &&
    c.latitude <= Math.max(a.latitude, b.latitude)
  );
}

function doSegmentsIntersect(a: LatLng, b: LatLng, c: LatLng, d: LatLng): boolean {
  const o1 = orientation(a, b, c);
  const o2 = orientation(a, b, d);
  const o3 = orientation(c, d, a);
  const o4 = orientation(c, d, b);
  const epsilon = 0.000000001;

  if (Math.abs(o1) < epsilon && isOnSegment(a, b, c)) return true;
  if (Math.abs(o2) < epsilon && isOnSegment(a, b, d)) return true;
  if (Math.abs(o3) < epsilon && isOnSegment(c, d, a)) return true;
  if (Math.abs(o4) < epsilon && isOnSegment(c, d, b)) return true;

  return (o1 > 0) !== (o2 > 0) && (o3 > 0) !== (o4 > 0);
}

function polygonOverlaps(newPolygon: LatLng[], existingPolygon: LatLng[]): boolean {
  if (newPolygon.length < 3 || existingPolygon.length < 3) {
    return false;
  }

  if (newPolygon.some((point) => isPointInsidePolygon(point, existingPolygon))) {
    return true;
  }
  if (existingPolygon.some((point) => isPointInsidePolygon(point, newPolygon))) {
    return true;
  }

  for (let newIndex = 0; newIndex < newPolygon.length; newIndex += 1) {
    const newStart = newPolygon[newIndex];
    const newEnd = newPolygon[(newIndex + 1) % newPolygon.length];
    for (let existingIndex = 0; existingIndex < existingPolygon.length; existingIndex += 1) {
      const existingStart = existingPolygon[existingIndex];
      const existingEnd = existingPolygon[(existingIndex + 1) % existingPolygon.length];
      if (doSegmentsIntersect(newStart, newEnd, existingStart, existingEnd)) {
        return true;
      }
    }
  }

  return false;
}

export function FieldBoundarySetupScreen() {
  const nav = useNavigation();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const [fieldName, setFieldName] = useState("");
  const [cropType, setCropType] = useState(CROP_OPTIONS[0].value);
  const [isCropMenuOpen, setIsCropMenuOpen] = useState(false);
  const [points, setPoints] = useState<LatLng[]>([]);
  const [lockedFields, setLockedFields] = useState<FieldBoundaryRecord[]>([]);
  const [lockedFieldsError, setLockedFieldsError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const areaHa = useMemo(() => computeAreaHa(points), [points]);
  const savedAreaHa = useMemo(
    () => lockedFields.reduce((sum, field) => sum + (field.areaHa ?? computeAreaHa(field.points)), 0),
    [lockedFields],
  );

  const loadLockedFields = useCallback(async () => {
    try {
      setLockedFieldsError(null);
      const fields = await listFieldBoundaries();
      setLockedFields(fields.filter((field) => field.points.length >= 3));
    } catch {
      setLockedFieldsError("Saved fields could not be loaded. Existing field areas are not available on the map.");
    }
  }, []);

  useEffect(() => {
    void loadLockedFields();
  }, [loadLockedFields]);

  const addPoint = (event: MapPressEvent) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    const nextPoint = { latitude, longitude };
    const touchedLockedField = lockedFields.find((field) => isPointInsidePolygon(nextPoint, field.points));
    if (touchedLockedField) {
      Alert.alert(
        "Field already saved",
        `${touchedLockedField.name} is locked on the map. Delete that field before drawing in this area again.`,
      );
      return;
    }

    setPoints((current) => [...current, nextPoint]);
  };

  const undoPoint = () => {
    setPoints((current) => current.slice(0, -1));
  };

  const clearPoints = () => {
    setPoints([]);
  };

  const onSave = async () => {
    if (!fieldName.trim()) {
      Alert.alert("Missing field name", "Please provide a field name before saving.");
      return;
    }
    if (points.length < 3) {
      Alert.alert("Boundary too small", "Add at least 3 points to create a valid field boundary.");
      return;
    }
    const overlappingField = lockedFields.find((field) => polygonOverlaps(points, field.points));
    if (overlappingField) {
      Alert.alert(
        "Boundary overlaps a saved field",
        `${overlappingField.name} is already saved. Delete it before reusing that area.`,
      );
      return;
    }

    try {
      setIsSaving(true);
      await saveFieldBoundary({
        name: fieldName.trim(),
        cropType,
        areaHa,
        points,
      });
      Alert.alert("Saved", "Field boundary saved successfully.");
      nav.goBack();
    } catch {
      Alert.alert("Save failed", "Could not save the boundary. Please check your network and try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8, borderBottomColor: colors.headerBorder }]}>
        <TouchableOpacity onPress={() => nav.goBack()}>
          <Text style={styles.backBtn}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Draw Field Border</Text>
        <View style={styles.headerSpacer} />
      </View>

      <MapView
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={INITIAL_REGION}
        onPress={addPoint}
        customMapStyle={mapStyle}
      >
        {lockedFields.map((field) => (
          <Polygon
            key={field.id}
            coordinates={field.points}
            strokeColor="#4CAF50"
            fillColor="rgba(76, 175, 80, 0.22)"
            strokeWidth={2}
            tappable={false}
          />
        ))}
        {points.map((point, index) => (
          <Marker
            key={`${point.latitude}-${point.longitude}-${index.toString()}`}
            coordinate={point}
            title={`Point ${index + 1}`}
          />
        ))}
        {points.length >= 3 ? (
          <Polygon
            coordinates={points}
            strokeColor="#2E7D32"
            fillColor="rgba(46, 125, 50, 0.2)"
            strokeWidth={2}
          />
        ) : null}
      </MapView>

      <ScrollView
        style={[styles.panel, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.panelContent}
      >
        <View style={[styles.mapStatusCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={[styles.mapStatusTitle, { color: colors.text }]}>New field boundary</Text>
          <Text style={[styles.mapStatusText, { color: colors.textSecondary }]}>
            Tap open map areas to place points. Saved fields are shown in green and stay locked until deleted.
          </Text>
          {lockedFieldsError ? (
            <Text style={styles.warningText}>{lockedFieldsError}</Text>
          ) : null}
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statPill, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Points</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>{points.length}</Text>
          </View>
          <View style={[styles.statPill, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>New area</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>{areaHa.toFixed(2)} ha</Text>
          </View>
          <View style={[styles.statPill, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Locked</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>{savedAreaHa.toFixed(2)} ha</Text>
          </View>
        </View>

        <View style={styles.actionsRow}>
          <Pressable
            style={[styles.actionBtn, { backgroundColor: colors.card, borderColor: colors.cardBorder }, points.length === 0 && styles.disabledBtn]}
            onPress={undoPoint}
            disabled={points.length === 0}
          >
            <Text style={[styles.actionBtnText, { color: colors.text }]}>Undo</Text>
          </Pressable>
          <Pressable
            style={[styles.actionBtn, { backgroundColor: colors.card, borderColor: colors.cardBorder }, points.length === 0 && styles.disabledBtn]}
            onPress={clearPoints}
            disabled={points.length === 0}
          >
            <Text style={[styles.actionBtnText, { color: colors.text }]}>Clear</Text>
          </Pressable>
        </View>

        <TextInput
          value={fieldName}
          onChangeText={setFieldName}
          placeholder="Field name"
          style={[styles.input, { backgroundColor: colors.card, borderColor: colors.cardBorder, color: colors.text }]}
          placeholderTextColor={colors.textSecondary}
        />
        <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Crop type</Text>
        <View style={styles.dropdownWrap}>
          <Pressable
            style={[styles.dropdownButton, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
            onPress={() => setIsCropMenuOpen((open) => !open)}
          >
            <Text style={[styles.dropdownValue, { color: colors.text }]}>
              {CROP_OPTIONS.find((crop) => crop.value === cropType)?.label}
            </Text>
            <Text style={[styles.dropdownIcon, { color: colors.textSecondary }]}>
              {isCropMenuOpen ? "▲" : "▼"}
            </Text>
          </Pressable>
          {isCropMenuOpen ? (
            <View style={[styles.dropdownMenu, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              {CROP_OPTIONS.map((crop) => {
                const selected = crop.value === cropType;
                return (
                  <Pressable
                    key={crop.value}
                    style={[styles.dropdownOption, selected && { backgroundColor: colors.primaryLight }]}
                    onPress={() => {
                      setCropType(crop.value);
                      setIsCropMenuOpen(false);
                    }}
                  >
                    <Text style={[styles.dropdownOptionText, { color: colors.text }]}>{crop.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}
        </View>

        <Pressable
          style={[styles.saveBtn, { backgroundColor: colors.primary }, isSaving && styles.saveBtnDisabled]}
          onPress={onSave}
          disabled={isSaving}
        >
          <Text style={styles.saveBtnText}>{isSaving ? "Saving..." : "Save Field Boundary"}</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    backgroundColor: "#FAFAF8",
  },
  backBtn: { fontSize: 24, color: "#222" },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#2C2C2C" },
  headerSpacer: { width: 18 },
  map: { flex: 1, minHeight: 320 },
  panel: { maxHeight: 320, backgroundColor: "#FAFAF8" },
  panelContent: { padding: 16, paddingBottom: 28 },
  mapStatusCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  mapStatusTitle: { fontSize: 15, fontWeight: "700", marginBottom: 4 },
  mapStatusText: { fontSize: 13, lineHeight: 18 },
  warningText: { color: "#E53935", fontSize: 12, lineHeight: 18, marginTop: 8 },
  statsRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  statPill: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  statLabel: { fontSize: 11, marginBottom: 3 },
  statValue: { fontSize: 14, fontWeight: "700" },
  actionsRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  actionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#B6B6B6",
    borderRadius: 8,
    alignItems: "center",
    backgroundColor: "#FFF",
  },
  disabledBtn: { opacity: 0.5 },
  actionBtnText: { color: "#333", fontWeight: "600" },
  inputLabel: { fontSize: 12, fontWeight: "600", marginBottom: 8 },
  dropdownWrap: { marginBottom: 12 },
  dropdownButton: {
    borderWidth: 1,
    borderRadius: 10,
    minHeight: 44,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dropdownValue: { fontSize: 14, fontWeight: "700" },
  dropdownIcon: { fontSize: 11, fontWeight: "700" },
  dropdownMenu: {
    marginTop: 6,
    borderWidth: 1,
    borderRadius: 10,
    overflow: "hidden",
  },
  dropdownOption: { paddingHorizontal: 12, paddingVertical: 11 },
  dropdownOptionText: { fontSize: 14, fontWeight: "600" },
  input: {
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#D5D5D5",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
    color: "#222",
  },
  saveBtn: {
    marginTop: 4,
    backgroundColor: "#2E7D32",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  saveBtnDisabled: { opacity: 0.7 },
  saveBtnText: { color: "#FFF", fontSize: 15, fontWeight: "700" },
});
