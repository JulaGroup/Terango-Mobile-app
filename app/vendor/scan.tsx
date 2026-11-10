import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { experienceApi, Experience } from "@/lib/api";
import { PrimaryColor } from "@/constants/Colors";

// Offline-first gate scanner. A device downloads the event manifest while
// online, then validates tickets against it with no network: a ticket is valid
// if its token is in the manifest and hasn't already been scanned on this
// device. Every scan is queued and synced back when a connection is available,
// where the server reconciles double-scans across gates.

type Ticket = {
  bookingId: string;
  token: string | null;
  tier: string | null;
  holder: string | null;
  quantity: number;
  status: string;
  checkedInAt: string | null;
  gate: string | null;
};

type QueuedScan = {
  bookingId?: string;
  token?: string;
  scannedAt: string;
  gate?: string;
  synced?: boolean;
};

type Flash = {
  kind: "ok" | "dupe" | "bad" | "info";
  title: string;
  sub?: string;
};

const manifestKey = (id: string) => `evtscan:manifest:${id}`;
const queueKey = (id: string) => `evtscan:queue:${id}`;
const scannedKey = (id: string) => `evtscan:scanned:${id}`;
const DEVICE_KEY = "evtscan:deviceId";

async function getDeviceId(): Promise<string> {
  try {
    let id = await AsyncStorage.getItem(DEVICE_KEY);
    if (!id) {
      id = `dev_${Math.random().toString(36).slice(2, 10)}`;
      await AsyncStorage.setItem(DEVICE_KEY, id);
    }
    return id;
  } catch {
    return `dev_${Math.random().toString(36).slice(2, 10)}`;
  }
}

export default function EventScannerScreen() {
  const router = useRouter();
  const [step, setStep] = useState<"pick" | "scan">("pick");
  const [events, setEvents] = useState<Experience[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [event, setEvent] = useState<Experience | null>(null);

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [scanned, setScanned] = useState<Set<string>>(new Set());
  const [queue, setQueue] = useState<QueuedScan[]>([]);
  const [deviceId, setDeviceId] = useState("");
  const [preparing, setPreparing] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const [CameraComponent, setCameraComponent] = useState<any>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<Flash | null>(null);
  const lockRef = useRef(false);

  // Index tickets by token and bookingId for O(1) offline lookup.
  const byToken = useMemo(() => {
    const m = new Map<string, Ticket>();
    for (const t of tickets) {
      if (t.token) m.set(t.token, t);
      m.set(t.bookingId, t);
    }
    return m;
  }, [tickets]);

  const pendingCount = queue.filter((q) => !q.synced).length;

  // ── Load events + device id ──
  useEffect(() => {
    (async () => {
      setDeviceId(await getDeviceId());
      try {
        const all = await experienceApi.getMyExperiences();
        setEvents(
          (all || []).filter((e) => e.capacityType === "FIXED_EVENT"),
        );
      } catch {
        setEvents([]);
      } finally {
        setLoadingEvents(false);
      }
    })();
  }, []);

  // ── Camera setup (dynamic import, mirrors vendor/orders.tsx) ──
  const ensureCamera = useCallback(async () => {
    try {
      const cam: any = await import("expo-camera");
      const CV = cam.CameraView ?? cam.Camera;
      setCameraComponent(() => CV);
      const perm = await cam.Camera.requestCameraPermissionsAsync();
      setHasPermission(perm?.granted ?? perm?.status === "granted");
    } catch {
      setHasPermission(false);
    }
  }, []);

  // ── Pick an event: download manifest, restore local state ──
  const openEvent = useCallback(
    async (e: Experience) => {
      setPreparing(true);
      setEvent(e);
      try {
        // Restore any saved scans/queue first so we work even fully offline.
        const [savedScanned, savedQueue, savedManifest] = await Promise.all([
          AsyncStorage.getItem(scannedKey(e.id)),
          AsyncStorage.getItem(queueKey(e.id)),
          AsyncStorage.getItem(manifestKey(e.id)),
        ]);
        if (savedScanned) setScanned(new Set(JSON.parse(savedScanned)));
        if (savedQueue) setQueue(JSON.parse(savedQueue));
        if (savedManifest) setTickets(JSON.parse(savedManifest));

        // Then refresh the manifest if we can reach the server.
        try {
          const res = await experienceApi.getEventManifest(e.id);
          setTickets(res.tickets || []);
          await AsyncStorage.setItem(
            manifestKey(e.id),
            JSON.stringify(res.tickets || []),
          );
        } catch {
          if (!savedManifest) {
            Alert.alert(
              "No manifest yet",
              "Couldn't download tickets and none are saved on this device. Connect to the internet once to prepare for offline scanning.",
            );
          }
        }
        await ensureCamera();
        setStep("scan");
      } finally {
        setPreparing(false);
      }
    },
    [ensureCamera],
  );

  const persist = useCallback(
    async (nextScanned: Set<string>, nextQueue: QueuedScan[]) => {
      if (!event) return;
      try {
        await AsyncStorage.multiSet([
          [scannedKey(event.id), JSON.stringify([...nextScanned])],
          [queueKey(event.id), JSON.stringify(nextQueue)],
        ]);
      } catch {
        // best-effort; in-memory state still drives the UI this session
      }
    },
    [event],
  );

  const showFlash = (f: Flash) => {
    setFlash(f);
    setTimeout(() => {
      setFlash(null);
      lockRef.current = false;
    }, 1600);
  };

  // ── Handle a scanned QR ──
  const onScan = useCallback(
    async (raw: string) => {
      if (lockRef.current || !event) return;
      lockRef.current = true;
      setBusy(true);
      try {
        let token: string | undefined;
        let bookingId: string | undefined;
        try {
          const parsed = JSON.parse(raw);
          token = parsed.token;
          bookingId = parsed.bookingId;
        } catch {
          token = raw.trim(); // allow a bare token
        }
        const ref = bookingId || token || "";

        // Already scanned on this device?
        const ticket: Ticket | undefined =
          (token ? byToken.get(token) : undefined) ||
          (bookingId ? byToken.get(bookingId) : undefined);
        const localKey = ticket?.bookingId || ref;
        if (scanned.has(localKey)) {
          showFlash({
            kind: "dupe",
            title: "Already scanned",
            sub: ticket?.holder || ref,
          });
          return;
        }

        // Try the server first (authoritative); fall back to offline manifest.
        let accepted = false;
        let title = "Admitted";
        let sub = ticket?.tier || ticket?.holder || "";
        try {
          const res = await experienceApi.scanTicket({
            bookingId,
            token,
            deviceId,
            gate: deviceId,
          });
          if (res.status === "OK") {
            accepted = true;
          } else if (res.status === "ALREADY_CHECKED_IN") {
            showFlash({ kind: "dupe", title: "Already scanned", sub });
            return;
          } else if (res.status === "CONFLICT") {
            showFlash({
              kind: "dupe",
              title: "Used at another gate",
              sub,
            });
            return;
          } else {
            showFlash({
              kind: "bad",
              title:
                res.status === "UNPAID" ? "Not paid" : "Invalid ticket",
              sub: res.message,
            });
            return;
          }
        } catch {
          // Offline path: valid only if in the downloaded manifest.
          if (!ticket) {
            showFlash({
              kind: "bad",
              title: "Not recognised",
              sub: "Not in the downloaded ticket list",
            });
            return;
          }
          accepted = true;
          title = "Admitted (offline)";
        }

        if (accepted) {
          const nextScanned = new Set(scanned).add(localKey);
          const nextQueue = [
            ...queue,
            {
              bookingId,
              token,
              scannedAt: new Date().toISOString(),
              gate: deviceId,
              synced: false,
            },
          ];
          setScanned(nextScanned);
          setQueue(nextQueue);
          await persist(nextScanned, nextQueue);
          showFlash({ kind: "ok", title, sub });
        }
      } finally {
        setBusy(false);
      }
    },
    [event, byToken, scanned, queue, deviceId, persist],
  );

  // ── Sync queued scans ──
  const doSync = useCallback(async () => {
    if (!event || pendingCount === 0) return;
    setSyncing(true);
    try {
      const pending = queue.filter((q) => !q.synced);
      await experienceApi.syncScans(
        event.id,
        pending.map((q) => ({
          bookingId: q.bookingId,
          token: q.token,
          scannedAt: q.scannedAt,
          gate: q.gate,
        })),
      );
      const nextQueue = queue.map((q) => ({ ...q, synced: true }));
      setQueue(nextQueue);
      await persist(scanned, nextQueue);
      Alert.alert("Synced", `${pending.length} scan(s) uploaded.`);
    } catch (e: any) {
      Alert.alert("Sync failed", e?.message || "Try again when back online.");
    } finally {
      setSyncing(false);
    }
  }, [event, queue, scanned, pendingCount, persist]);

  // ── Render: event picker ──
  if (step === "pick") {
    return (
      <SafeAreaView style={s.safe} edges={["top"]}>
        <View style={s.header}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Scan Tickets</Text>
          <View style={{ width: 40 }} />
        </View>
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <Text style={s.pickHint}>Choose the event you're scanning for.</Text>
          {loadingEvents ? (
            <ActivityIndicator color={PrimaryColor} style={{ marginTop: 24 }} />
          ) : events.length === 0 ? (
            <View style={s.empty}>
              <Ionicons name="ticket-outline" size={40} color="#CBD5E1" />
              <Text style={s.emptyText}>No events to scan yet.</Text>
            </View>
          ) : (
            events.map((e) => (
              <TouchableOpacity
                key={e.id}
                style={s.eventRow}
                onPress={() => openEvent(e)}
                disabled={preparing}
              >
                <View style={s.eventIcon}>
                  <Ionicons name="calendar" size={18} color={PrimaryColor} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.eventName}>{e.name}</Text>
                  <Text style={s.eventSub} numberOfLines={1}>
                    {e.eventStartAt
                      ? new Date(e.eventStartAt).toLocaleString()
                      : "Date TBA"}
                    {e.isPublished === false ? " · Draft" : ""}
                  </Text>
                </View>
                {preparing && event?.id === e.id ? (
                  <ActivityIndicator color={PrimaryColor} />
                ) : (
                  <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
                )}
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Render: scanner ──
  const scannedCount = scanned.size;
  const total = tickets.reduce((n, t) => n + (t.quantity || 1), 0);

  return (
    <View style={s.scanWrap}>
      <SafeAreaView edges={["top"]} style={{ zIndex: 2 }}>
        <View style={s.scanHeader}>
          <TouchableOpacity style={s.backBtn} onPress={() => setStep("pick")}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={s.scanTitle} numberOfLines={1}>
              {event?.name}
            </Text>
            <Text style={s.scanSub}>
              {scannedCount} scanned{total ? ` / ${total}` : ""}
              {pendingCount > 0 ? ` · ${pendingCount} to sync` : ""}
            </Text>
          </View>
          <TouchableOpacity
            style={[s.syncBtn, pendingCount === 0 && { opacity: 0.4 }]}
            onPress={doSync}
            disabled={pendingCount === 0 || syncing}
          >
            {syncing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="cloud-upload-outline" size={18} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Camera */}
      <View style={s.cameraZone}>
        {hasPermission === false ? (
          <View style={s.camMsg}>
            <Ionicons name="camera-outline" size={40} color="#94A3B8" />
            <Text style={s.camMsgText}>Camera permission is required.</Text>
            <TouchableOpacity style={s.permBtn} onPress={ensureCamera}>
              <Text style={s.permBtnText}>Grant access</Text>
            </TouchableOpacity>
          </View>
        ) : CameraComponent && hasPermission ? (
          <CameraComponent
            style={StyleSheet.absoluteFill}
            facing="back"
            onBarcodeScanned={
              busy || flash
                ? undefined
                : (r: any) => r?.data && onScan(String(r.data))
            }
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
          />
        ) : (
          <View style={s.camMsg}>
            <ActivityIndicator color="#fff" />
          </View>
        )}

        {/* Reticle */}
        <View pointerEvents="none" style={s.reticle} />

        {/* Result flash */}
        {flash && (
          <View
            pointerEvents="none"
            style={[
              s.flash,
              flash.kind === "ok"
                ? { backgroundColor: "rgba(0,168,107,0.92)" }
                : flash.kind === "dupe"
                  ? { backgroundColor: "rgba(245,158,11,0.92)" }
                  : flash.kind === "bad"
                    ? { backgroundColor: "rgba(239,68,68,0.92)" }
                    : { backgroundColor: "rgba(15,23,42,0.9)" },
            ]}
          >
            <Ionicons
              name={
                flash.kind === "ok"
                  ? "checkmark-circle"
                  : flash.kind === "dupe"
                    ? "alert-circle"
                    : "close-circle"
              }
              size={64}
              color="#fff"
            />
            <Text style={s.flashTitle}>{flash.title}</Text>
            {!!flash.sub && <Text style={s.flashSub}>{flash.sub}</Text>}
          </View>
        )}
      </View>

      <View style={s.scanFooter}>
        <Text style={s.footerHint}>
          Point at a ticket QR. Works offline — sync when you're back online.
        </Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F6F6F8" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 16,
    backgroundColor: PrimaryColor,
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
  pickHint: { fontSize: 14, color: "#64748B", marginBottom: 14 },
  empty: { alignItems: "center", paddingVertical: 50, gap: 10 },
  emptyText: { color: "#94A3B8", fontWeight: "600" },
  eventRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  eventIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFF3E0",
    justifyContent: "center",
    alignItems: "center",
  },
  eventName: { fontSize: 15, fontWeight: "800", color: "#0F172A" },
  eventSub: { fontSize: 13, color: "#64748B", marginTop: 2 },

  scanWrap: { flex: 1, backgroundColor: "#0B1220" },
  scanHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  scanTitle: { color: "#fff", fontSize: 16, fontWeight: "800" },
  scanSub: { color: "#94A3B8", fontSize: 12, marginTop: 2 },
  syncBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: PrimaryColor,
    justifyContent: "center",
    alignItems: "center",
  },
  cameraZone: {
    flex: 1,
    margin: 16,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },
  camMsg: { alignItems: "center", gap: 12, padding: 24 },
  camMsgText: { color: "#CBD5E1", fontWeight: "600", textAlign: "center" },
  permBtn: {
    backgroundColor: PrimaryColor,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  permBtnText: { color: "#fff", fontWeight: "800" },
  reticle: {
    width: 230,
    height: 230,
    borderRadius: 24,
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.9)",
  },
  flash: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  flashTitle: { color: "#fff", fontSize: 24, fontWeight: "900" },
  flashSub: { color: "rgba(255,255,255,0.9)", fontSize: 15, fontWeight: "600" },
  scanFooter: {
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === "ios" ? 30 : 18,
    paddingTop: 4,
  },
  footerHint: {
    color: "#64748B",
    fontSize: 12,
    textAlign: "center",
  },
});
