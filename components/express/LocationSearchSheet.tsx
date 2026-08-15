import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AddressService, type Address } from "@/services/AddressService";
import { useAddress } from "@/context/AddressContext";

// Maps are native-only in this app — every other screen requires them lazily so
// the web build doesn't blow up. Same treatment here.
let MapView: any, Marker: any, PROVIDER_GOOGLE: any;
if (Platform.OS !== "web") {
  const Maps = require("react-native-maps");
  MapView = Maps.default;
  Marker = Maps.Marker;
  PROVIDER_GOOGLE = Maps.PROVIDER_GOOGLE;
}

const ORANGE = "#FF6B00";
const INK = "#1C1C1E";
const INK_MID = "#3A3A3C";
const INK_LIGHT = "#6B6B6E";
const DIVIDER = "#E8E8EA";

const GOOGLE_PLACES_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY;
const RECENTS_KEY = "express_recent_places_v1";
const MAX_RECENTS = 5;

/** Bounding box roughly covering The Gambia (same box LocationModal uses). */
const GAMBIA_BOUNDS = {
  minLat: 13.0,
  maxLat: 14.0,
  minLng: -17.0,
  maxLng: -13.5,
};
const isWithinGambia = (lat: number, lng: number) =>
  lat >= GAMBIA_BOUNDS.minLat &&
  lat <= GAMBIA_BOUNDS.maxLat &&
  lng >= GAMBIA_BOUNDS.minLng &&
  lng <= GAMBIA_BOUNDS.maxLng;

/** Centre of the Greater Banjul area — where the pin map opens by default. */
const DEFAULT_REGION = {
  latitude: 13.4432,
  longitude: -16.6929,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

/**
 * A place the customer picked, in coordinate form.
 *
 * This replaces the old town-shaped contract: the flow no longer cares which of
 * 16 towns a stop belongs to, only where it actually is.
 */
export interface PickedLocation {
  /** Short name for the row, e.g. "Senegambia Strip". */
  label: string;
  /** Full formatted address sent to the backend. */
  address: string;
  latitude: number;
  longitude: number;
  /** Places locality, mapped to pickupCity/dropoffCity. */
  city?: string;
  placeId?: string;
  source: "places" | "gps" | "saved" | "pin";
}

const hasPlacesKey = () =>
  !!GOOGLE_PLACES_API_KEY &&
  GOOGLE_PLACES_API_KEY !== "YOUR_ACTUAL_API_KEY_HERE" &&
  GOOGLE_PLACES_API_KEY.length > 20;

// ── Recents ─────────────────────────────────────────────────────────────────
export async function loadRecentPlaces(): Promise<PickedLocation[]> {
  try {
    const raw = await AsyncStorage.getItem(RECENTS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function rememberPlace(place: PickedLocation) {
  try {
    const existing = await loadRecentPlaces();
    // Dedupe on rounded coordinates — the same spot reached via search and via
    // pin should not appear twice.
    const key = (p: PickedLocation) =>
      `${p.latitude.toFixed(4)},${p.longitude.toFixed(4)}`;
    const next = [place, ...existing.filter((p) => key(p) !== key(place))].slice(
      0,
      MAX_RECENTS,
    );
    await AsyncStorage.setItem(RECENTS_KEY, JSON.stringify(next));
  } catch {
    /* recents are a convenience, never worth failing a booking over */
  }
}

/** Pull the locality out of a Places details payload. */
function cityFromDetails(details: any): string | undefined {
  const comps = details?.address_components;
  if (!Array.isArray(comps)) return undefined;
  const match =
    comps.find((c: any) => c.types?.includes("locality")) ||
    comps.find((c: any) =>
      c.types?.includes("administrative_area_level_2"),
    ) ||
    comps.find((c: any) =>
      c.types?.includes("administrative_area_level_1"),
    );
  return match?.long_name;
}

interface Prediction {
  placeId: string;
  main: string;
  secondary: string;
  description: string;
}

interface Props {
  visible: boolean;
  /** Which stop is being set — drives the title and the marker colour. */
  mode: "pickup" | "dropoff";
  onClose: () => void;
  onSelect: (place: PickedLocation) => void;
}

export default function LocationSearchSheet({
  visible,
  mode,
  onClose,
  onSelect,
}: Props) {
  const { addresses } = useAddress();
  const [recents, setRecents] = useState<PickedLocation[]>([]);
  const [locating, setLocating] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Prediction[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const searchDebounce = useRef<any>(null);
  const searching = query.trim().length >= 2;

  // Pin-drop fallback
  const [pinMode, setPinMode] = useState(false);
  const [pinCoords, setPinCoords] = useState(DEFAULT_REGION);
  const [pinAddress, setPinAddress] = useState("");
  const [geocodingPin, setGeocodingPin] = useState(false);
  const geocodeDebounce = useRef<any>(null);

  const title = mode === "pickup" ? "Set pickup location" : "Set drop-off";
  const dotColor = mode === "pickup" ? ORANGE : "#111827";

  useEffect(() => {
    if (visible) {
      loadRecentPlaces().then(setRecents);
      setPinMode(false);
      setQuery("");
      setResults([]);
      setSearchError(null);
    }
  }, [visible]);

  useEffect(
    () => () => {
      if (geocodeDebounce.current) clearTimeout(geocodeDebounce.current);
    },
    [],
  );

  const commit = useCallback(
    (place: PickedLocation) => {
      rememberPlace(place);
      onSelect(place);
      onClose();
    },
    [onSelect, onClose],
  );

  // ── Place search ──────────────────────────────────────────────────────────
  // Calling Places directly keeps the results in our own list and makes a
  // REQUEST_DENIED or quota problem visible instead of silently empty.
  useEffect(() => {
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    const term = query.trim();
    if (term.length < 2 || !hasPlacesKey()) {
      setResults([]);
      setSearchError(null);
      setSearchLoading(false);
      return;
    }
    setSearchLoading(true);
    searchDebounce.current = setTimeout(async () => {
      try {
        const url =
          `https://maps.googleapis.com/maps/api/place/autocomplete/json` +
          `?input=${encodeURIComponent(term)}` +
          `&components=country:gm&language=en&key=${GOOGLE_PLACES_API_KEY}`;
        const json = await (await fetch(url)).json();

        if (json.status === "OK" || json.status === "ZERO_RESULTS") {
          setSearchError(null);
          setResults(
            (json.predictions || []).map((p: any) => ({
              placeId: p.place_id,
              main: p.structured_formatting?.main_text || p.description,
              secondary: p.structured_formatting?.secondary_text || "",
              description: p.description,
            })),
          );
        } else {
          console.warn("[Places]", json.status, json.error_message);
          setResults([]);
          setSearchError(json.error_message || `Google returned ${json.status}`);
        }
      } catch (e: any) {
        console.warn("[Places] network error", e?.message);
        setResults([]);
        setSearchError("Couldn't reach the search service.");
      } finally {
        setSearchLoading(false);
      }
    }, 300);
    return () => {
      if (searchDebounce.current) clearTimeout(searchDebounce.current);
    };
  }, [query]);

  /** Resolve a prediction to real coordinates, then hand it back. */
  const choosePrediction = async (p: Prediction) => {
    try {
      setResolvingId(p.placeId);
      const url =
        `https://maps.googleapis.com/maps/api/place/details/json` +
        `?place_id=${p.placeId}` +
        `&fields=geometry,formatted_address,address_component,name` +
        `&key=${GOOGLE_PLACES_API_KEY}`;
      const json = await (await fetch(url)).json();
      const loc = json?.result?.geometry?.location;
      if (json.status !== "OK" || !loc) {
        throw new Error(json.error_message || "No coordinates for that place");
      }
      commit({
        label: json.result.name || p.main,
        address: json.result.formatted_address || p.description,
        latitude: loc.lat,
        longitude: loc.lng,
        city: cityFromDetails(json.result),
        placeId: p.placeId,
        source: "places",
      });
    } catch (e: any) {
      Alert.alert(
        "Couldn't use that place",
        e?.message || "Try another result, or drop a pin instead.",
      );
    } finally {
      setResolvingId(null);
    }
  };

  // ── Current location ──────────────────────────────────────────────────────
  const useCurrentLocation = async () => {
    try {
      setLocating(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Location permission needed",
          "Allow location access so we can use where you are, or search for the place instead.",
        );
        return;
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const { latitude, longitude } = pos.coords;
      let address = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
      try {
        address = await AddressService.getAddressFromCoordinates(
          latitude,
          longitude,
        );
      } catch {
        /* keep the coordinate string */
      }
      commit({
        label: "Current location",
        address,
        latitude,
        longitude,
        source: "gps",
      });
    } catch {
      Alert.alert("Couldn't get your location", "Please search for the place instead.");
    } finally {
      setLocating(false);
    }
  };

  // ── Pin drop ──────────────────────────────────────────────────────────────
  const openPinMode = async () => {
    setPinMode(true);
    setPinAddress("");
    // Centre on the customer if we can, so they're not dragging from Banjul.
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status === "granted") {
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const next = {
          ...DEFAULT_REGION,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        };
        setPinCoords(next);
        reverseGeocodePin(next.latitude, next.longitude);
        return;
      }
    } catch {
      /* fall through to the default region */
    }
    reverseGeocodePin(DEFAULT_REGION.latitude, DEFAULT_REGION.longitude);
  };

  const reverseGeocodePin = (latitude: number, longitude: number) => {
    if (geocodeDebounce.current) clearTimeout(geocodeDebounce.current);
    geocodeDebounce.current = setTimeout(async () => {
      if (!isWithinGambia(latitude, longitude)) {
        setPinAddress("Outside service area");
        return;
      }
      setGeocodingPin(true);
      try {
        setPinAddress(
          await AddressService.getAddressFromCoordinates(latitude, longitude),
        );
      } catch {
        setPinAddress(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
      } finally {
        setGeocodingPin(false);
      }
    }, 600);
  };

  const onPinDragEnd = (e: any) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setPinCoords((prev) => ({ ...prev, latitude, longitude }));
    reverseGeocodePin(latitude, longitude);
  };

  const confirmPin = () => {
    if (!isWithinGambia(pinCoords.latitude, pinCoords.longitude)) {
      Alert.alert(
        "Outside service area",
        "That point is outside The Gambia. Move the pin closer to a place we deliver to.",
      );
      return;
    }
    commit({
      label: "Pinned location",
      address:
        pinAddress && pinAddress !== "Outside service area"
          ? pinAddress
          : `${pinCoords.latitude.toFixed(5)}, ${pinCoords.longitude.toFixed(5)}`,
      latitude: pinCoords.latitude,
      longitude: pinCoords.longitude,
      source: "pin",
    });
  };

  const savedWithCoords = useMemo(
    () =>
      (addresses || []).filter(
        (a: Address) =>
          typeof a.latitude === "number" && typeof a.longitude === "number",
      ),
    [addresses],
  );

  const placesReady = hasPlacesKey();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={s.container} edges={["top", "left", "right"]}>
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity
            style={s.headerBtn}
            onPress={() => (pinMode ? setPinMode(false) : onClose())}
            hitSlop={8}
          >
            <Ionicons name="arrow-back" size={22} color={INK} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>
            {pinMode ? "Drop a pin" : title}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        {pinMode ? (
          // ── Pin fallback ────────────────────────────────────────────────
          <View style={{ flex: 1 }}>
            {MapView ? (
              <MapView
                style={{ flex: 1 }}
                provider={
                  Platform.OS === "android" ? PROVIDER_GOOGLE : undefined
                }
                initialRegion={pinCoords}
                onPress={(e: any) => onPinDragEnd(e)}
              >
                <Marker
                  draggable
                  coordinate={{
                    latitude: pinCoords.latitude,
                    longitude: pinCoords.longitude,
                  }}
                  onDragEnd={onPinDragEnd}
                  pinColor={mode === "pickup" ? "orange" : "red"}
                />
              </MapView>
            ) : (
              <View style={s.center}>
                <Text style={s.muted}>Map unavailable on this device.</Text>
              </View>
            )}

            <View style={s.pinFooter}>
              <Text style={s.pinHint}>
                Drag the pin or tap the map to move it
              </Text>
              <View style={s.pinAddressRow}>
                <Ionicons name="location" size={16} color={ORANGE} />
                {geocodingPin ? (
                  <ActivityIndicator size="small" color={ORANGE} />
                ) : (
                  <Text style={s.pinAddress} numberOfLines={2}>
                    {pinAddress || "Move the pin to pick a spot"}
                  </Text>
                )}
              </View>
              <TouchableOpacity
                style={[
                  s.confirmBtn,
                  pinAddress === "Outside service area" && s.confirmBtnDisabled,
                ]}
                onPress={confirmPin}
                disabled={pinAddress === "Outside service area"}
                activeOpacity={0.9}
              >
                <Text style={s.confirmBtnText}>Use this location</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          // ── Search ──────────────────────────────────────────────────────
          <View style={{ flex: 1 }}>
            {/* Search field — we call Places directly rather than using the
                autocomplete widget, so results render in our own list and any
                API error is visible instead of failing silently. */}
            <View style={s.searchWrap}>
              <Ionicons name="search" size={18} color={INK_LIGHT} />
              <TextInput
                style={s.searchField}
                placeholder={
                  placesReady ? "Search for a place…" : "Search unavailable"
                }
                placeholderTextColor={INK_LIGHT}
                value={query}
                onChangeText={setQuery}
                editable={placesReady}
                autoCorrect={false}
                returnKeyType="search"
              />
              {searchLoading && <ActivityIndicator size="small" color={ORANGE} />}
              {!searchLoading && query.length > 0 && (
                <TouchableOpacity onPress={() => setQuery("")} hitSlop={8}>
                  <Ionicons name="close-circle" size={18} color="#CBD5E1" />
                </TouchableOpacity>
              )}
            </View>

            {!placesReady && (
              <View style={s.noKeyBanner}>
                <Ionicons name="information-circle" size={18} color="#B45309" />
                <Text style={s.noKeyText}>
                  Search is unavailable right now. Pick a saved place or drop a
                  pin.
                </Text>
              </View>
            )}

            {/* Results */}
            {searching && (
              <ScrollView
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ paddingBottom: 32 }}
              >
                {searchError ? (
                  <View style={s.emptyResults}>
                    <Ionicons name="cloud-offline-outline" size={26} color="#CBD5E1" />
                    <Text style={s.emptyResultsTitle}>Search failed</Text>
                    <Text style={s.emptyResultsSub}>{searchError}</Text>
                    <TouchableOpacity
                      style={s.emptyResultsBtn}
                      onPress={openPinMode}
                    >
                      <Ionicons name="map-outline" size={16} color="#fff" />
                      <Text style={s.emptyResultsBtnText}>Drop a pin</Text>
                    </TouchableOpacity>
                  </View>
                ) : results.length > 0 ? (
                  results.map((r) => (
                    <TouchableOpacity
                      key={r.placeId}
                      style={s.row}
                      activeOpacity={0.7}
                      onPress={() => choosePrediction(r)}
                      disabled={resolvingId !== null}
                    >
                      <View style={s.rowIcon}>
                        {resolvingId === r.placeId ? (
                          <ActivityIndicator size="small" color={ORANGE} />
                        ) : (
                          <Ionicons name="location-outline" size={17} color={INK_MID} />
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.rowTitle} numberOfLines={1}>
                          {r.main}
                        </Text>
                        {!!r.secondary && (
                          <Text style={s.rowSub} numberOfLines={1}>
                            {r.secondary}
                          </Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  ))
                ) : searchLoading ? null : (
                  <View style={s.emptyResults}>
                    <Ionicons name="search" size={26} color="#CBD5E1" />
                    <Text style={s.emptyResultsTitle}>No matches</Text>
                    <Text style={s.emptyResultsSub}>
                      Plenty of places here aren&apos;t on the map. Drop a pin
                      on the exact spot instead.
                    </Text>
                    <TouchableOpacity
                      style={s.emptyResultsBtn}
                      onPress={openPinMode}
                    >
                      <Ionicons name="map-outline" size={16} color="#fff" />
                      <Text style={s.emptyResultsBtnText}>Drop a pin</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </ScrollView>
            )}

            {!searching && (
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 32 }}
            >
              {/* Current location */}
              <TouchableOpacity
                style={s.row}
                onPress={useCurrentLocation}
                disabled={locating}
                activeOpacity={0.7}
              >
                <View style={[s.rowIcon, { backgroundColor: "#FFF5EE" }]}>
                  {locating ? (
                    <ActivityIndicator size="small" color={ORANGE} />
                  ) : (
                    <Ionicons name="locate" size={18} color={ORANGE} />
                  )}
                </View>
                <Text style={s.rowTitle}>Use my current location</Text>
              </TouchableOpacity>

              {/* Saved */}
              {savedWithCoords.length > 0 && (
                <>
                  <Text style={s.sectionLabel}>Saved</Text>
                  {savedWithCoords.map((a: Address) => (
                    <TouchableOpacity
                      key={a.id}
                      style={s.row}
                      activeOpacity={0.7}
                      onPress={() =>
                        commit({
                          label: a.label || "Saved place",
                          address: a.addressLine,
                          latitude: a.latitude,
                          longitude: a.longitude,
                          city: a.city,
                          source: "saved",
                        })
                      }
                    >
                      <View style={s.rowIcon}>
                        <Ionicons
                          name={
                            a.label?.toLowerCase() === "home"
                              ? "home"
                              : a.label?.toLowerCase() === "office"
                                ? "briefcase"
                                : "bookmark"
                          }
                          size={17}
                          color={INK_MID}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.rowTitle}>{a.label}</Text>
                        <Text style={s.rowSub} numberOfLines={1}>
                          {a.addressLine}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </>
              )}

              {/* Recents */}
              {recents.length > 0 && (
                <>
                  <Text style={s.sectionLabel}>Recent</Text>
                  {recents.map((r, i) => (
                    <TouchableOpacity
                      key={`${r.latitude},${r.longitude},${i}`}
                      style={s.row}
                      activeOpacity={0.7}
                      onPress={() => commit({ ...r })}
                    >
                      <View style={s.rowIcon}>
                        <Ionicons name="time-outline" size={17} color={INK_MID} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.rowTitle}>{r.label}</Text>
                        <Text style={s.rowSub} numberOfLines={1}>
                          {r.address}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </>
              )}

              {/* Pin fallback — always available, because Places coverage in
                  The Gambia thins out fast outside the main strip. */}
              <View style={s.divider} />
              <TouchableOpacity
                style={s.row}
                onPress={openPinMode}
                activeOpacity={0.7}
              >
                <View style={[s.rowIcon, { backgroundColor: "#EEF2F7" }]}>
                  <Ionicons name="map-outline" size={18} color={INK_MID} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.rowTitle}>Can&apos;t find it? Drop a pin</Text>
                  <Text style={s.rowSub}>Pick the exact spot on a map</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={INK_LIGHT} />
              </TouchableOpacity>
            </ScrollView>
            )}
          </View>
        )}

        {/* Stop indicator */}
        <View style={[s.stopChip, { borderColor: dotColor }]}>
          <View style={[s.stopDot, { backgroundColor: dotColor }]} />
          <Text style={s.stopChipText}>
            {mode === "pickup" ? "Pickup" : "Drop-off"}
          </Text>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  muted: { color: INK_LIGHT, fontSize: 14 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: DIVIDER,
  },
  headerBtn: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: { fontSize: 16.5, fontWeight: "800", color: INK },

  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    height: 48,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    paddingHorizontal: 14,
    backgroundColor: "#F4F5F7",
    borderRadius: 12,
  },
  searchField: { flex: 1, fontSize: 15, color: INK, padding: 0 },

  emptyResults: { alignItems: "center", paddingTop: 28, paddingHorizontal: 24 },
  emptyResultsTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: INK,
    marginTop: 10,
  },
  emptyResultsSub: {
    fontSize: 13,
    color: INK_LIGHT,
    textAlign: "center",
    lineHeight: 19,
    marginTop: 6,
  },
  emptyResultsBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: ORANGE,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 11,
    marginTop: 16,
  },
  emptyResultsBtnText: { color: "#fff", fontWeight: "800", fontSize: 14 },

  noKeyBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    margin: 16,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#FEF3C7",
  },
  noKeyText: { flex: 1, fontSize: 13, color: "#92400E", lineHeight: 18 },

  sectionLabel: {
    fontSize: 11.5,
    fontWeight: "800",
    color: INK_LIGHT,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    paddingHorizontal: 16,
    marginTop: 18,
    marginBottom: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  rowIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#F4F5F7",
    justifyContent: "center",
    alignItems: "center",
  },
  rowTitle: { fontSize: 15, fontWeight: "600", color: INK },
  rowSub: { fontSize: 12.5, color: INK_LIGHT, marginTop: 2 },
  divider: {
    height: 1,
    backgroundColor: DIVIDER,
    marginVertical: 10,
    marginHorizontal: 16,
  },

  pinFooter: {
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: DIVIDER,
  },
  pinHint: { fontSize: 12.5, color: INK_LIGHT, textAlign: "center" },
  pinAddressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
    marginBottom: 14,
    minHeight: 36,
  },
  pinAddress: { flex: 1, fontSize: 14, color: INK, lineHeight: 19 },
  confirmBtn: {
    backgroundColor: ORANGE,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
  },
  confirmBtnDisabled: { backgroundColor: "#D1D5DB" },
  confirmBtnText: { color: "#fff", fontSize: 15.5, fontWeight: "800" },

  stopChip: {
    position: "absolute",
    top: 62,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1.5,
    backgroundColor: "#fff",
  },
  stopDot: { width: 7, height: 7, borderRadius: 4 },
  stopChipText: { fontSize: 11.5, fontWeight: "800", color: INK },
});
