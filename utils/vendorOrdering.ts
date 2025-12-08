import { OpeningHours } from "@/lib/api";
import {
  getOperatingStatus,
  formatDayLabel,
  formatTimeLabel,
  OperatingStatus,
  OperatingStatusInput,
} from "@/utils/openingHours";

export type VendorType = "shop" | "restaurant";

export interface VendorOrderingInput extends OperatingStatusInput {
  vendorType?: VendorType;
  vendorName?: string | null;
}

export interface VendorOrderingState {
  orderingDisabled: boolean;
  disabledReason?: string;
  status?: OperatingStatus;
}

const DEFAULT_STATE: VendorOrderingState = {
  orderingDisabled: false,
  disabledReason: undefined,
  status: undefined,
};

const formatVendorLabel = (vendorType?: VendorType): string => {
  switch (vendorType) {
    case "restaurant":
      return "restaurant";
    case "shop":
    default:
      return "shop";
  }
};

export const buildVendorOrderingState = (
  input: VendorOrderingInput | null | undefined,
  referenceDate: Date = new Date()
): VendorOrderingState => {
  if (!input) {
    return DEFAULT_STATE;
  }

  const status = getOperatingStatus(input, referenceDate);
  if (status.isOpen) {
    return { orderingDisabled: false, status };
  }

  const vendorLabel = formatVendorLabel(input.vendorType);
  let disabledReason: string | undefined;

  switch (status.reason) {
    case "inactive":
      disabledReason = `This ${vendorLabel} is offline right now.`;
      break;
    case "not_accepting_orders":
      disabledReason = `This ${vendorLabel} has paused new orders.`;
      break;
    case "outside_hours":
    default: {
      const nextOpening = status.nextOpening;
      if (nextOpening) {
        disabledReason = `This ${vendorLabel} is closed. Opens ${formatDayLabel(
          nextOpening.day
        )} ${formatTimeLabel(nextOpening.time)}.`;
      } else {
        disabledReason = `This ${vendorLabel} is currently closed.`;
      }
    }
  }

  return {
    orderingDisabled: true,
    disabledReason,
    status,
  };
};

export interface VendorOrderingMeta {
  vendorId?: string | number | null;
  vendorType: VendorType;
  openingHours?: OpeningHours | null;
  isActive?: boolean | null;
  acceptsOrders?: boolean | null;
  vendorName?: string | null;
}

export const normalizeVendorOrderingInput = (
  meta?: VendorOrderingMeta | null
): VendorOrderingInput | undefined => {
  if (!meta) {
    return undefined;
  }

  return {
    openingHours: meta.openingHours ?? undefined,
    isActive: meta.isActive ?? undefined,
    acceptsOrders: meta.acceptsOrders ?? undefined,
    vendorType: meta.vendorType,
    vendorName: meta.vendorName ?? undefined,
  };
};
