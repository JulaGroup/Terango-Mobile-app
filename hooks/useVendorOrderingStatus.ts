import { useEffect, useMemo, useRef, useState } from "react";
import { API_URL } from "@/constants/config";
import { OpeningHours } from "@/lib/api";
import {
  VendorOrderingMeta,
  VendorOrderingState,
  buildVendorOrderingState,
  normalizeVendorOrderingInput,
  VendorType,
} from "@/utils/vendorOrdering";

interface HookOptions {
  vendorId?: string | number | null;
  vendorType: VendorType;
  meta?: VendorOrderingMeta | null;
  skip?: boolean;
}

interface VendorApiResponse {
  id?: string | number;
  name?: string;
  isActive?: boolean | null;
  acceptsOrders?: boolean | null;
  openingHours?: OpeningHours | null;
}

interface HookResult extends VendorOrderingState {
  loading: boolean;
  error: Error | null;
}

interface CacheEntry {
  state: VendorOrderingState;
  fetchedAt: number;
}

const vendorStateCache = new Map<string, CacheEntry>();
const vendorFetchPromises = new Map<string, Promise<CacheEntry>>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

const buildCacheKey = (vendorType: VendorType, vendorId: string): string =>
  `${vendorType}:${vendorId}`;

const getCachedState = (key: string): CacheEntry | undefined => {
  const entry = vendorStateCache.get(key);
  if (!entry) {
    return undefined;
  }

  if (Date.now() - entry.fetchedAt > CACHE_TTL_MS) {
    vendorStateCache.delete(key);
    return undefined;
  }

  return entry;
};

const setCachedState = (key: string, entry: CacheEntry) => {
  vendorStateCache.set(key, entry);
};

const fetchVendorMeta = async (
  vendorType: VendorType,
  vendorId: string
): Promise<VendorOrderingMeta> => {
  const path = vendorType === "restaurant" ? "restaurants" : "shops";
  const response = await fetch(`${API_URL}/api/${path}/${vendorId}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch ${vendorType} ${vendorId}`);
  }

  const data: VendorApiResponse = await response.json();

  return {
    vendorId,
    vendorType,
    vendorName: data.name ?? null,
    openingHours: data.openingHours ?? null,
    isActive: data.isActive ?? null,
    acceptsOrders: data.acceptsOrders ?? null,
  };
};

export const useVendorOrderingStatus = ({
  vendorId,
  vendorType,
  meta,
  skip,
}: HookOptions): HookResult => {
  const normalizedVendorId =
    vendorId !== undefined && vendorId !== null
      ? vendorId.toString()
      : undefined;

  const initialState = useMemo(() => {
    const normalized = normalizeVendorOrderingInput(meta);
    return normalized ? buildVendorOrderingState(normalized) : undefined;
  }, [meta]);

  const [state, setState] = useState<VendorOrderingState>(
    initialState ?? { orderingDisabled: false }
  );
  const [loading, setLoading] = useState<boolean>(
    () => Boolean(normalizedVendorId) && !initialState && !skip
  );
  const [error, setError] = useState<Error | null>(null);
  const latestMetaRef = useRef(meta);

  // Keep latest meta in ref so we can compare updates
  useEffect(() => {
    latestMetaRef.current = meta;
  }, [meta]);

  useEffect(() => {
    if (skip || !normalizedVendorId) {
      setLoading(false);
      return;
    }

    const cacheKey = buildCacheKey(vendorType, normalizedVendorId);

    const cachedEntry = getCachedState(cacheKey);
    if (cachedEntry) {
      setState(cachedEntry.state);
      setLoading(false);
      return;
    }

    let isMounted = true;

    const loadState = async () => {
      try {
        setLoading(true);
        setError(null);

        let fetchPromise = vendorFetchPromises.get(cacheKey);
        if (!fetchPromise) {
          fetchPromise = fetchVendorMeta(vendorType, normalizedVendorId).then(
            (fetchedMeta) => {
              const normalized = normalizeVendorOrderingInput(fetchedMeta);
              const state = buildVendorOrderingState(normalized);
              const entry: CacheEntry = {
                state,
                fetchedAt: Date.now(),
              };
              setCachedState(cacheKey, entry);
              return entry;
            }
          );
          vendorFetchPromises.set(cacheKey, fetchPromise);
        }

        const entry = await fetchPromise;
        if (isMounted) {
          setState(entry.state);
          setLoading(false);
        }
      } catch (err) {
        if (!isMounted) {
          return;
        }
        setError(err as Error);
        setLoading(false);
        if (initialState) {
          setState(initialState);
        }
      } finally {
        vendorFetchPromises.delete(cacheKey);
      }
    };

    loadState();

    return () => {
      isMounted = false;
    };
  }, [normalizedVendorId, vendorType, skip, initialState]);

  // If meta updates with better data, recompute state and prime cache
  useEffect(() => {
    if (!normalizedVendorId || !meta) {
      return;
    }

    const cacheKey = buildCacheKey(vendorType, normalizedVendorId);
    const normalized = normalizeVendorOrderingInput(meta);
    if (!normalized) {
      return;
    }

    const nextState = buildVendorOrderingState(normalized);
    setState((previous) => {
      if (
        previous.orderingDisabled === nextState.orderingDisabled &&
        previous.disabledReason === nextState.disabledReason
      ) {
        return previous;
      }
      return nextState;
    });
    setCachedState(cacheKey, { state: nextState, fetchedAt: Date.now() });
  }, [normalizedVendorId, vendorType, meta]);

  return {
    ...state,
    loading,
    error,
  };
};
