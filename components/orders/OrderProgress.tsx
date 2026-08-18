import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { PrimaryColor } from "@/constants/Colors";

/**
 * Where an order is, and whose move is next.
 *
 * The second half is the point. TeranGO takes payment *after* the vendor
 * accepts, which is not what customers are used to — every other delivery app
 * charges at checkout. Saying so in prose does not land; showing "Paid" as a
 * step still ahead of them does. A customer who can see the sequence
 * understands the wait without reading a word of it.
 *
 * Uses the tinted-circle-and-bar language already established by
 * order-tracking and Express, so the surfaces look like one product.
 */

const C = {
  text: "#1F2937",
  muted: "#6B7280",
  faint: "#9CA3AF",
  track: "#E5E7EB",
  done: "#10B981",
  waiting: "#F59E0B",
};

const ORDER: string[] = [
  "PLACED",
  "ACCEPTED",
  "PAID",
  "PREPARING",
  "ON_THE_WAY",
  "DELIVERED",
];

const LABELS: Record<string, string> = {
  PLACED: "Placed",
  ACCEPTED: "Accepted",
  PAID: "Paid",
  PREPARING: "Preparing",
  ON_THE_WAY: "On the way",
  DELIVERED: "Delivered",
};

/**
 * Which stage the order has reached. Payment is tracked separately from
 * status, so an accepted order that is paid has moved past PAID, while an
 * accepted order that is not is still waiting on the customer.
 */
function reached(status: string, isPaid: boolean) {
  const s = (status || "").toUpperCase();
  // Past the end of the list on purpose. DELIVERED is the last stage, so
  // returning its own index (5) made `done = pos < index` false for it and it
  // rendered as the *current* step — an orange ring — while every earlier step
  // showed a green tick. A finished order has no current step; all six are
  // done.
  if (s === "DELIVERED") return { index: ORDER.length, awaitingPayment: false };
  if (s === "DISPATCHED" || s === "NEARBY")
    return { index: 4, awaitingPayment: false };
  if (s === "READY" || s === "PREPARING" || s === "PROCESSING")
    return { index: 3, awaitingPayment: false };
  if (s === "ACCEPTED")
    return isPaid
      ? { index: 2, awaitingPayment: false }
      : { index: 1, awaitingPayment: true };
  return { index: 0, awaitingPayment: false };
}

export function OrderProgress({
  status,
  isPaid,
  isPickup = false,
  vendorName,
}: {
  status: string;
  isPaid: boolean;
  isPickup?: boolean;
  vendorName?: string | null;
}) {
  if ((status || "").toUpperCase() === "CANCELLED") return null;

  const stages = ORDER.filter((s) => !(isPickup && s === "ON_THE_WAY"));
  const { index, awaitingPayment } = reached(status, isPaid);

  // Names the next thing that will happen, so the customer never has to guess
  // whose move it is.
  const caption = awaitingPayment
    ? `${vendorName || "The vendor"} accepted your order — pay now to start preparation.`
    : index === 0
      ? `Sent to ${vendorName || "the vendor"}. You'll pay once they accept — usually within a few minutes.`
      : index === 2
        ? "Payment received. Your order is being prepared."
        : null;

  return (
    <View style={st.wrap}>
      <View style={st.track}>
        {stages.map((stage, i) => {
          const pos = ORDER.indexOf(stage);
          const done = pos < index;
          const current = pos === index;
          const payNext = awaitingPayment && stage === "PAID";

          // The connector is drawn as two halves inside the column it belongs
          // to, rather than as its own flex item. Columns can then share the
          // row evenly and shrink with the screen instead of overflowing it.
          const prevDone = i > 0 && ORDER.indexOf(stages[i - 1]) < index;
          const nextDone = pos < index;

          return (
            <View style={st.col} key={stage}>
              <View style={st.nodeRow}>
                {i > 0 && (
                  <View
                    style={[st.bar, st.barLeft, prevDone && st.barDone]}
                  />
                )}
                {i < stages.length - 1 && (
                  <View
                    style={[st.bar, st.barRight, nextDone && st.barDone]}
                  />
                )}
                <View
                  style={[
                    st.node,
                    done && st.nodeDone,
                    current && st.nodeCurrent,
                    payNext && st.nodeWaiting,
                    !done && !current && !payNext && st.nodePending,
                  ]}
                >
                  <Ionicons
                    name={done ? "checkmark" : payNext ? "card" : "ellipse"}
                    size={done || payNext ? 13 : 7}
                    color={
                      done || payNext
                        ? "#fff"
                        : current
                          ? PrimaryColor
                          : C.faint
                    }
                  />
                </View>
              </View>
              <Text
                style={[
                  st.label,
                  current && st.labelCurrent,
                  payNext && st.labelWaiting,
                  !done && !current && !payNext && st.labelPending,
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.85}
              >
                {LABELS[stage]}
              </Text>
            </View>
          );
        })}
      </View>

      {!!caption && (
        <Text style={[st.caption, awaitingPayment && st.captionWaiting]}>
          {caption}
        </Text>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  wrap: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#F1F3F5",
    paddingVertical: 16,
    paddingHorizontal: 8,
    marginBottom: 12,
  },
  track: { flexDirection: "row", alignItems: "flex-start" },
  col: { flex: 1, minWidth: 0, alignItems: "center" },
  nodeRow: {
    width: "100%",
    height: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  node: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  nodeDone: { backgroundColor: C.done, borderColor: C.done },
  nodeCurrent: {
    backgroundColor: "rgba(255,107,0,0.12)",
    borderColor: PrimaryColor,
  },
  nodeWaiting: { backgroundColor: C.waiting, borderColor: C.waiting },
  nodePending: { backgroundColor: "transparent", borderColor: C.track },
  label: {
    marginTop: 6,
    // Sized so the longest label ("On the way") clears a ~49px column on a
    // 360dp screen without wrapping. adjustsFontSizeToFit is the safety net
    // for anything narrower.
    fontSize: 9,
    letterSpacing: -0.2,
    fontWeight: "600",
    color: C.text,
    textAlign: "center",
  },
  labelCurrent: { color: PrimaryColor, fontWeight: "800" },
  labelWaiting: { color: "#B45309", fontWeight: "800" },
  labelPending: { color: C.faint, fontWeight: "500" },
  bar: {
    position: "absolute",
    top: 12,
    height: 2,
    borderRadius: 1,
    backgroundColor: C.track,
  },
  barLeft: { left: 0, right: "50%" },
  barRight: { left: "50%", right: 0 },
  barDone: { backgroundColor: C.done },
  caption: {
    marginTop: 14,
    fontSize: 13,
    lineHeight: 18,
    color: C.muted,
    textAlign: "center",
  },
  captionWaiting: { color: "#B45309", fontWeight: "600" },
});

export default OrderProgress;
