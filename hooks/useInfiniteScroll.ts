import { useState, useEffect, useCallback } from "react";

interface UseInfiniteScrollOptions<T> {
  fetchFunction: (
    page: number,
    limit?: number
  ) => Promise<{
    data: T[];
    pagination: {
      hasMore: boolean;
      page: number;
      total: number;
      totalPages: number;
    };
  }>;
  limit?: number;
  initialLoad?: boolean;
}

interface UseInfiniteScrollReturn<T> {
  data: T[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  page: number;
  total: number;
  loadMore: () => void;
  refresh: () => void;
  refetch: () => void;
}

export function useInfiniteScroll<T>({
  fetchFunction,
  limit = 20,
  initialLoad = true,
}: UseInfiniteScrollOptions<T>): UseInfiniteScrollReturn<T> {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [initialLoading, setInitialLoading] = useState(initialLoad);

  const fetchData = useCallback(
    async (pageNumber: number, append = false) => {
      if (loading) return; // Prevent duplicate requests

      setLoading(true);
      setError(null);

      try {
        const response = await fetchFunction(pageNumber, limit);

        if (append) {
          setData((prev) => [...prev, ...response.data]);
        } else {
          setData(response.data);
        }

        setHasMore(response.pagination.hasMore);
        setPage(pageNumber);
        setTotal(response.pagination.total);
      } catch (err: any) {
        setError(err.message || "Failed to fetch data");
        console.error("Infinite scroll fetch error:", err);
      } finally {
        setLoading(false);
        setInitialLoading(false);
      }
    },
    [fetchFunction, limit, loading]
  );

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      fetchData(page + 1, true);
    }
  }, [loading, hasMore, page, fetchData]);

  const refresh = useCallback(() => {
    setData([]);
    setPage(1);
    setHasMore(true);
    setError(null);
    fetchData(1, false);
  }, [fetchData]);

  const refetch = refresh; // Alias for refresh

  // Initial load
  useEffect(() => {
    if (initialLoad) {
      fetchData(1, false);
    }
  }, [fetchData, initialLoad]);

  return {
    data,
    loading: loading || initialLoading,
    error,
    hasMore,
    page,
    total,
    loadMore,
    refresh,
    refetch,
  };
}

// Scroll event handler for FlatList/ScrollView
export const createScrollHandler = (loadMore: () => void, threshold = 0.8) => {
  return ({ nativeEvent }: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
    const paddingToBottom = 20;
    const isCloseToBottom =
      layoutMeasurement.height + contentOffset.y >=
      contentSize.height - paddingToBottom;

    // Alternative calculation using threshold
    const scrollPercentage =
      (layoutMeasurement.height + contentOffset.y) / contentSize.height;

    if (isCloseToBottom || scrollPercentage >= threshold) {
      loadMore();
    }
  };
};

// Hook for search with debouncing and infinite scroll
export function useSearchWithInfiniteScroll<T>({
  searchFunction,
  limit = 20,
  debounceMs = 300,
}: {
  searchFunction: (
    query: string,
    page: number,
    limit?: number
  ) => Promise<{
    data: T[];
    pagination: {
      hasMore: boolean;
      page: number;
      total: number;
      totalPages: number;
    };
  }>;
  limit?: number;
  debounceMs?: number;
}) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [query, debounceMs]);

  // Create fetch function for infinite scroll
  const fetchFunction = useCallback(
    (page: number, pageLimit?: number) => {
      return searchFunction(debouncedQuery, page, pageLimit || limit);
    },
    [searchFunction, debouncedQuery, limit]
  );

  const {
    data,
    loading,
    error,
    hasMore,
    page,
    total,
    loadMore,
    refresh,
    refetch,
  } = useInfiniteScroll({
    fetchFunction,
    limit,
    initialLoad: false, // Don't load until there's a query
  });

  // Trigger search when debounced query changes
  useEffect(() => {
    if (debouncedQuery.trim().length >= 2) {
      refresh();
    }
  }, [debouncedQuery, refresh]);

  return {
    data,
    loading,
    error,
    hasMore,
    page,
    total,
    loadMore,
    refresh,
    refetch,
    query,
    setQuery,
    debouncedQuery,
  };
}
