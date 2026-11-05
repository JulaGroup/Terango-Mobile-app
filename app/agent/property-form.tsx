import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  Alert,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { agentApi } from "@/lib/api";
import { uploadMultipleImages } from "@/utils/cloudinaryUpload";
import { KerSpace } from "@/constants/kerspace";

const K = KerSpace;

const TYPES = ["HOUSE", "APARTMENT", "VILLA", "OFFICE", "LAND", "COMMERCIAL"];
const typeLabel = (t: string) =>
  t.charAt(0) + t.slice(1).toLowerCase();

type Img = { url: string; id?: string };

export default function PropertyForm() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editing = !!id;

  const [loading, setLoading] = useState(editing);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [listingType, setListingType] = useState("FOR_SALE");
  const [type, setType] = useState("HOUSE");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [negotiable, setNegotiable] = useState(false);
  const [bedrooms, setBedrooms] = useState("");
  const [bathrooms, setBathrooms] = useState("");
  const [area, setArea] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [furnished, setFurnished] = useState(false);
  const [serviced, setServiced] = useState(false);
  const [featuresText, setFeaturesText] = useState("");
  const [images, setImages] = useState<Img[]>([]);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    null,
  );

  const loadForEdit = useCallback(async () => {
    try {
      const res = await agentApi.listProperties();
      const p = (res?.data ?? []).find((x) => x.id === id);
      if (p) {
        setListingType(p.listingType);
        setType(p.type);
        setTitle(p.title);
        setDescription(p.description || "");
        setPrice(String(p.price ?? ""));
        setNegotiable(!!p.negotiable);
        setBedrooms(p.bedrooms != null ? String(p.bedrooms) : "");
        setBathrooms(p.bathrooms != null ? String(p.bathrooms) : "");
        setArea(p.area != null ? String(p.area) : "");
        setAddress(p.address || "");
        setCity(p.city || "");
        setFurnished(!!p.furnished);
        setServiced(!!p.serviced);
        setFeaturesText((p.features || []).join(", "));
        setImages((p.images || []).map((i) => ({ url: i.url, id: i.id })));
        if (p.latitude != null && p.longitude != null)
          setCoords({ lat: p.latitude, lng: p.longitude });
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (editing) loadForEdit();
  }, [editing, loadForEdit]);

  const pickImages = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission needed", "Allow photo access to add images.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.9,
      selectionLimit: 10,
    });
    if (result.canceled) return;
    const uris = result.assets.map((a) => a.uri);
    setUploading(true);
    try {
      const urls = await uploadMultipleImages(uris);
      if (editing && id) {
        // Property exists — attach immediately.
        for (const url of urls) {
          try {
            const img: any = await agentApi.addImage(id, url);
            setImages((prev) => [...prev, { url, id: img?.id }]);
          } catch {
            setImages((prev) => [...prev, { url }]);
          }
        }
      } else {
        setImages((prev) => [...prev, ...urls.map((url) => ({ url }))]);
      }
    } catch {
      Alert.alert("Upload failed", "Some images could not be uploaded.");
    } finally {
      setUploading(false);
    }
  };

  const removeImage = async (img: Img) => {
    if (editing && id && img.id) {
      try {
        await agentApi.deleteImage(id, img.id);
      } catch {
        /* ignore */
      }
    }
    setImages((prev) => prev.filter((i) => i.url !== img.url));
  };

  const useCurrentLocation = async () => {
    const perm = await Location.requestForegroundPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission needed", "Allow location to pin the property.");
      return;
    }
    const loc = await Location.getCurrentPositionAsync({});
    setCoords({ lat: loc.coords.latitude, lng: loc.coords.longitude });
    Alert.alert("Location set", "The property's map pin uses your current spot.");
  };

  const canSave =
    title.trim() && price.trim() && address.trim() && city.trim();

  const save = async () => {
    if (!canSave) {
      Alert.alert("Missing info", "Title, price, address and city are required.");
      return;
    }
    const features = featuresText
      .split(",")
      .map((f) => f.trim())
      .filter(Boolean);
    const payload: any = {
      title: title.trim(),
      description: description.trim(),
      type,
      listingType,
      price: Number(price),
      negotiable,
      bedrooms: bedrooms ? Number(bedrooms) : null,
      bathrooms: bathrooms ? Number(bathrooms) : null,
      area: area ? Number(area) : null,
      address: address.trim(),
      city: city.trim(),
      furnished,
      serviced,
      features,
      latitude: coords?.lat ?? null,
      longitude: coords?.lng ?? null,
    };
    setSaving(true);
    try {
      if (editing && id) {
        await agentApi.updateProperty(id, payload);
      } else {
        await agentApi.createProperty({
          ...payload,
          images: images.map((i) => ({ url: i.url })),
        });
      }
      Alert.alert(
        editing ? "Listing updated" : "Listing submitted",
        editing
          ? "Your changes are saved."
          : "Your property has been submitted for TeranGO review. It goes live once approved.",
        [{ text: "OK", onPress: () => router.replace("/agent/listings" as any) }],
      );
    } catch (e: any) {
      Alert.alert("Couldn't save", e?.message || "Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[s.safe, s.center]}>
        <ActivityIndicator color={K.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>
          {editing ? "Edit property" : "Add property"}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Listing type */}
          <View style={s.segment}>
            {["FOR_SALE", "FOR_RENT"].map((lt) => (
              <TouchableOpacity
                key={lt}
                style={[s.segBtn, listingType === lt && s.segBtnOn]}
                onPress={() => setListingType(lt)}
              >
                <Text style={[s.segText, listingType === lt && s.segTextOn]}>
                  {lt === "FOR_SALE" ? "For Sale" : "For Rent"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Property type chips */}
          <Text style={s.label}>Property type</Text>
          <View style={s.chips}>
            {TYPES.map((t) => (
              <TouchableOpacity
                key={t}
                style={[s.chip, type === t && s.chipOn]}
                onPress={() => setType(t)}
              >
                <Text style={[s.chipText, type === t && s.chipTextOn]}>
                  {typeLabel(t)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Photos */}
          <Text style={s.label}>Photos</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <TouchableOpacity style={s.addPhoto} onPress={pickImages}>
              {uploading ? (
                <ActivityIndicator color={K.primary} />
              ) : (
                <>
                  <Ionicons name="camera" size={22} color={K.primary} />
                  <Text style={s.addPhotoText}>Add</Text>
                </>
              )}
            </TouchableOpacity>
            {images.map((img) => (
              <View key={img.url} style={s.photoWrap}>
                <Image source={{ uri: img.url }} style={s.photo} />
                <TouchableOpacity
                  style={s.photoRemove}
                  onPress={() => removeImage(img)}
                >
                  <Ionicons name="close" size={14} color="#fff" />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>

          <Field label="Title *" value={title} onChangeText={setTitle} placeholder="e.g. Modern 3-bed villa in Fajara" />
          <Field
            label={`Price * (${listingType === "FOR_RENT" ? "per month" : "total"})`}
            value={price}
            onChangeText={setPrice}
            placeholder="e.g. 1900"
            keyboardType="numeric"
          />
          <Row>
            <Text style={s.switchLabel}>Price negotiable</Text>
            <Switch
              value={negotiable}
              onValueChange={setNegotiable}
              trackColor={{ true: K.primary }}
            />
          </Row>

          <View style={s.grid3}>
            <Field label="Beds" value={bedrooms} onChangeText={setBedrooms} keyboardType="numeric" compact />
            <Field label="Baths" value={bathrooms} onChangeText={setBathrooms} keyboardType="numeric" compact />
            <Field label="Area m²" value={area} onChangeText={setArea} keyboardType="numeric" compact />
          </View>

          <Field label="Address *" value={address} onChangeText={setAddress} placeholder="Street / neighbourhood" />
          <Field label="City / area *" value={city} onChangeText={setCity} placeholder="e.g. Bakau" />

          <TouchableOpacity style={s.locBtn} onPress={useCurrentLocation}>
            <Ionicons
              name={coords ? "location" : "location-outline"}
              size={18}
              color={K.primary}
            />
            <Text style={s.locText}>
              {coords ? "Map pin set ✓ (tap to update)" : "Pin on map (use current location)"}
            </Text>
          </TouchableOpacity>

          <Field
            label="Description"
            value={description}
            onChangeText={setDescription}
            placeholder="Describe the property…"
            multiline
          />
          <Field
            label="Features (comma separated)"
            value={featuresText}
            onChangeText={setFeaturesText}
            placeholder="Parking, Generator, Borehole, Solar"
          />

          <Row>
            <Text style={s.switchLabel}>Furnished</Text>
            <Switch value={furnished} onValueChange={setFurnished} trackColor={{ true: K.primary }} />
          </Row>
          <Row>
            <Text style={s.switchLabel}>Serviced</Text>
            <Switch value={serviced} onValueChange={setServiced} trackColor={{ true: K.primary }} />
          </Row>
        </ScrollView>

        <View style={s.bottomBar}>
          <TouchableOpacity
            style={[s.saveBtn, !canSave && s.saveOff]}
            onPress={save}
            disabled={!canSave || saving}
            activeOpacity={0.9}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={s.saveText}>
                {editing ? "Save changes" : "Submit for review"}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({
  label,
  compact,
  multiline,
  ...props
}: {
  label: string;
  compact?: boolean;
  multiline?: boolean;
} & React.ComponentProps<typeof TextInput>) {
  return (
    <View style={{ marginBottom: 14, flex: compact ? 1 : undefined }}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        style={[s.input, multiline && { height: 90, textAlignVertical: "top" }]}
        placeholderTextColor={K.inkLight}
        multiline={multiline}
        {...props}
      />
    </View>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <View style={s.switchRow}>{children}</View>;
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: K.bg },
  center: { justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    backgroundColor: K.primary,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.22)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#fff" },
  label: { fontSize: 13, fontWeight: "700", color: K.inkMid, marginBottom: 6 },
  input: {
    backgroundColor: K.card,
    borderWidth: 1,
    borderColor: K.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: K.ink,
  },
  segment: { flexDirection: "row", gap: 8, marginBottom: 16 },
  segBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: K.border,
    backgroundColor: K.card,
    alignItems: "center",
  },
  segBtnOn: { backgroundColor: K.primaryLight, borderColor: K.primary },
  segText: { fontSize: 14, fontWeight: "700", color: K.inkMid },
  segTextOn: { color: K.primary },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: K.border,
    backgroundColor: K.card,
  },
  chipOn: { backgroundColor: K.primary, borderColor: K.primary },
  chipText: { fontSize: 13, fontWeight: "700", color: K.inkMid },
  chipTextOn: { color: "#fff" },
  addPhoto: {
    width: 84,
    height: 84,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: K.primary,
    borderStyle: "dashed",
    backgroundColor: K.primaryFaint,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
    marginBottom: 14,
  },
  addPhotoText: { fontSize: 12, color: K.primary, fontWeight: "700", marginTop: 2 },
  photoWrap: { marginRight: 10, marginBottom: 14 },
  photo: { width: 84, height: 84, borderRadius: 12, backgroundColor: "#EEE" },
  photoRemove: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: K.danger,
    justifyContent: "center",
    alignItems: "center",
  },
  grid3: { flexDirection: "row", gap: 10 },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: K.card,
    borderWidth: 1,
    borderColor: K.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
  },
  switchLabel: { fontSize: 15, color: K.ink, fontWeight: "600" },
  locBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: K.primaryFaint,
    borderWidth: 1,
    borderColor: K.primaryLight,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
  },
  locText: { fontSize: 14, color: K.primary, fontWeight: "700" },
  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 26,
    borderTopWidth: 1,
    borderTopColor: K.border,
  },
  saveBtn: {
    backgroundColor: K.primary,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
  },
  saveOff: { backgroundColor: "#C7C9D9" },
  saveText: { color: "#fff", fontSize: 16, fontWeight: "800" },
});
