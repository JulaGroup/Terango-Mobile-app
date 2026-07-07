import React from "react";
import { router, useLocalSearchParams } from "expo-router";
import SearchModal from "@/components/common/SearchModal";

/**
 * Search screen — hosts the search UI as a real stack route so that opening a
 * meal/product/vendor from the results and pressing back returns HERE with the
 * query and results intact (instead of losing them to a dismissed modal).
 */
export default function SearchScreen() {
  const { q } = useLocalSearchParams<{ q?: string }>();

  return (
    <SearchModal
      visible
      asScreen
      initialQuery={typeof q === "string" ? q : ""}
      onClose={() => {
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace("/(tabs)");
        }
      }}
    />
  );
}
