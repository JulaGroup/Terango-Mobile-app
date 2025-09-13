import { useEffect, useRef, useState } from "react";
import * as SecureStore from "expo-secure-store";
import { API_URL } from "@/constants/config";

type Order = any;

export function useOrderPolling(
  orderId: string | null,
  onUpdate: (order: Order) => void
) {
  const [loading, setLoading] = useState(false);
  const stopped = useRef(false);
  const attempts = useRef(0);
  const timer = useRef<any>(null);

  useEffect(() => {
    const finalStates = ["PROCESSING", "DELIVERED", "CANCELLED"];

    if (!orderId) return;

    stopped.current = false;
    attempts.current = 0;
    setLoading(true);

    const doPoll = async () => {
      try {
        const token = await SecureStore.getItemAsync("token");
        if (!token) {
          setLoading(false);
          return;
        }

        const res = await fetch(`${API_URL}/api/orders/${orderId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          // non-200 -> stop or continue depending on code
          console.log("Polling non-ok status", res.status);
        }

        const order = await res.json();
        onUpdate(order);

        if (finalStates.includes(order.status)) {
          setLoading(false);
          return;
        }

        // schedule next
        attempts.current += 1;
        if (attempts.current >= 8) {
          setLoading(false);
          return;
        }

        const delay = Math.min(
          5000,
          Math.round(1000 * Math.pow(1.8, attempts.current))
        );
        if (stopped.current) return;
        timer.current = setTimeout(doPoll, delay);
      } catch (err) {
        console.error("Polling error:", err);
        attempts.current += 1;
        if (attempts.current >= 8) {
          setLoading(false);
          return;
        }
        const delay = Math.min(
          5000,
          Math.round(1000 * Math.pow(1.8, attempts.current))
        );
        timer.current = setTimeout(doPoll, delay);
      }
    };

    doPoll();

    return () => {
      stopped.current = true;
      if (timer.current) clearTimeout(timer.current);
    };
  }, [orderId, onUpdate]);

  const stop = () => {
    stopped.current = true;
    if (timer.current) clearTimeout(timer.current);
    setLoading(false);
  };

  return { stop, loading };
}
