import { Alert, Linking } from "react-native";
import { LegalConfig } from "@/constants/legal";

/**
 * "Can't pay? Message us on WhatsApp" — for a customer with no Wave app, an
 * expired session, or a payment that just won't go through. Opens WhatsApp
 * pre-filled with what support needs to take payment another way, then mark
 * it paid from the admin panel (POST /api/admin/orders/:id/mark-paid — the
 * same flow as any payment made outside the app).
 *
 * WhatsApp can only message one number, so the customer picks the main line
 * or the support line.
 */

export type PaymentHelpDetails = {
  kind: "order" | "booking" | "delivery";
  /** Human-readable reference, e.g. TG1A2B3C or an Express delivery ID. */
  reference: string;
  customerName?: string | null;
  /** Restaurant/shop, experience, or route — whatever identifies it. */
  vendor?: string | null;
  /** Amount in dalasi. */
  amount?: number | null;
};

const VENDOR_LABEL: Record<PaymentHelpDetails["kind"], string> = {
  order: "Restaurant/Shop",
  booking: "Experience",
  delivery: "Delivery",
};

const digitsOnly = (phone: string) => phone.replace(/[^\d+]/g, "");

export function buildPaymentHelpMessage(details: PaymentHelpDetails): string {
  const lines = [
    `Hi TeranGO, I can't complete payment in the app for my ${details.kind}.`,
    "",
    `Name: ${details.customerName || "N/A"}`,
    `${details.kind === "order" ? "Order" : details.kind === "booking" ? "Booking" : "Delivery ID"}: ${details.reference}`,
  ];
  if (details.vendor) lines.push(`${VENDOR_LABEL[details.kind]}: ${details.vendor}`);
  if (details.amount != null) lines.push(`Amount: D${Number(details.amount).toLocaleString()}`);
  lines.push("", "Please help me pay another way.");
  return lines.join("\n");
}

export function paymentHelpWhatsAppUrl(phone: string, details: PaymentHelpDetails): string {
  return `whatsapp://send?phone=${digitsOnly(phone)}&text=${encodeURIComponent(
    buildPaymentHelpMessage(details),
  )}`;
}

function openWhatsApp(phone: string, details: PaymentHelpDetails) {
  Linking.openURL(paymentHelpWhatsAppUrl(phone, details)).catch(() => {
    Alert.alert(
      "WhatsApp Not Available",
      `Please install WhatsApp, or call us on ${LegalConfig.SUPPORT_PHONE} or ${LegalConfig.SUPPORT_LINE_PHONE}.`,
    );
  });
}

export function openPaymentHelp(details: PaymentHelpDetails) {
  Alert.alert("Message us on WhatsApp", "Which line would you like to message?", [
    {
      text: `Main line (${LegalConfig.SUPPORT_PHONE.replace("+220 ", "")})`,
      onPress: () => openWhatsApp(LegalConfig.SUPPORT_PHONE, details),
    },
    {
      text: `Support line (${LegalConfig.SUPPORT_LINE_PHONE.replace("+220 ", "")})`,
      onPress: () => openWhatsApp(LegalConfig.SUPPORT_LINE_PHONE, details),
    },
    { text: "Cancel", style: "cancel" },
  ]);
}
