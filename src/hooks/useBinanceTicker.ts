import { useEffect, useRef, useCallback } from 'react';
import { useMarketStore } from '../stores/useMarketStore';

interface RawBinanceTicker {
  s: string; // symbol
  c: string; // last price
  P: string; // price change percent (24h)
  p: string; // price change (24h)
  v: string; // volume
  h: string; // high
  l: string; // low
}

const WS_ENDPOINT = 'wss://stream.binance.com:9443/ws/!ticker@arr';
const RECONNECT_BASE_DELAY = 2_000;
const RECONNECT_MAX_DELAY  = 30_000;
const RECONNECT_MAX_ATTEMPTS = 15;
const FLASH_DURATION = 300;

export function useBinanceTicker(symbols: string[]) {
  const wsRef              = useRef<WebSocket | null>(null);
  // mountedRef tracks whether this effect is alive.
  // A shared 'active' flag (connectedRef) prevents Strict Mode double-mount
  // from opening two simultaneous sockets.
  const mountedRef         = useRef(false);
  const connectedRef       = useRef(false); // true once a socket has been opened this mount cycle
  const reconnectTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flashTimersRef     = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const priceSnapshotRef   = useRef<Record<string, number>>({});
  const symbolsRef         = useRef<Set<string>>(new Set());

  // Stable store-action references — safe to read outside render
  const updatePrices       = useMarketStore.getState().updatePrices;
  const clearFlash         = useMarketStore.getState().clearFlash;
  const setConnectionStatus = useMarketStore.getState().setConnectionStatus;

  // Keep symbolsRef in sync with the caller's array
  useEffect(() => {
    symbolsRef.current = new Set(symbols.map((s) => s.toUpperCase()));
  }, [symbols]);

  // ── Timer helpers ───────────────────────────────────────────────────────────

  const clearFlashTimer = useCallback((symbol: string) => {
    if (flashTimersRef.current[symbol]) {
      clearTimeout(flashTimersRef.current[symbol]);
      delete flashTimersRef.current[symbol];
    }
  }, []);

  const clearAllFlashTimers = useCallback(() => {
    Object.values(flashTimersRef.current).forEach(clearTimeout);
    flashTimersRef.current = {};
  }, []);

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  // ── Reconnect delay (exponential back-off + jitter) ────────────────────────

  const getReconnectDelay = useCallback((attempt: number): number => {
    const exponential = RECONNECT_BASE_DELAY * Math.pow(2, attempt);
    const jitter = Math.random() * 1_000;
    return Math.min(exponential + jitter, RECONNECT_MAX_DELAY);
  }, []);

  // ── Message processor ──────────────────────────────────────────────────────

  const processMessage = useCallback(
    (rawData: RawBinanceTicker[]) => {
      if (!mountedRef.current) return;

      const updates: Record<string, Parameters<typeof updatePrices>[0][string]> = {};
      const watchedSet = symbolsRef.current;

      for (const raw of rawData) {
        if (!watchedSet.has(raw.s)) continue;

        const currentPrice  = parseFloat(raw.c);
        const previousPrice = priceSnapshotRef.current[raw.s] ?? currentPrice;

        let flashDirection: 'up' | 'down' | null = null;
        if (previousPrice !== currentPrice) {
          flashDirection = currentPrice > previousPrice ? 'up' : 'down';
        }

        priceSnapshotRef.current[raw.s] = currentPrice;

        updates[raw.s] = {
          symbol:          raw.s,
          price:           currentPrice,
          prevPrice:       previousPrice,
          // `P` from Binance is the 24-h percent string, e.g. "2.45" => 2.45 (%)
          change24h:       parseFloat(raw.P),
          changePercent24h: parseFloat(raw.P),
          volume24h:       parseFloat(raw.v),
          high24h:         parseFloat(raw.h),
          low24h:          parseFloat(raw.l),
          lastUpdate:      Date.now(),
          flashDirection,
        };
      }

      if (Object.keys(updates).length === 0) return;

      updatePrices(updates);

      // Schedule flash-clear
      Object.entries(updates).forEach(([symbol, data]) => {
        if (data.flashDirection) {
          clearFlashTimer(symbol);
          flashTimersRef.current[symbol] = setTimeout(() => {
            if (mountedRef.current) clearFlash(symbol);
          }, FLASH_DURATION);
        }
      });
    },
    [updatePrices, clearFlash, clearFlashTimer]
  );

  // ── WebSocket connect ──────────────────────────────────────────────────────

  const connect = useCallback(() => {
    // Guard: don't open a socket if the component has been unmounted or if
    // another socket is already live (Strict Mode double-mount protection).
    if (!mountedRef.current) return;
    if (connectedRef.current) return;

    // Tear down any existing socket before creating a new one
    if (wsRef.current) {
      wsRef.current.onopen    = null;
      wsRef.current.onmessage = null;
      wsRef.current.onerror   = null;
      wsRef.current.onclose   = null;
      if (
        wsRef.current.readyState === WebSocket.OPEN ||
        wsRef.current.readyState === WebSocket.CONNECTING
      ) {
        wsRef.current.close();
      }
      wsRef.current = null;
    }

    setConnectionStatus({ status: 'connecting', errorMessage: null });
    connectedRef.current = true; // mark as "this mount cycle has a socket"

    try {
      const ws = new WebSocket(WS_ENDPOINT);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!mountedRef.current) {
          ws.close();
          return;
        }
        console.log('[BINANCE-WS] Connected');
        setConnectionStatus({
          status:           'connected',
          lastConnected:    Date.now(),
          reconnectAttempt: 0,
          errorMessage:     null,
        });
      };

      ws.onmessage = (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data as string) as RawBinanceTicker[];
          if (Array.isArray(data)) processMessage(data);
        } catch (err) {
          console.warn('[BINANCE-WS] Parse error:', err);
        }
      };

      ws.onerror = () => {
        console.warn('[BINANCE-WS] Socket error — will retry on close');
        setConnectionStatus({ status: 'error', errorMessage: 'WebSocket error' });
      };

      ws.onclose = (ev) => {
        if (!mountedRef.current) return;

        console.log(`[BINANCE-WS] Closed (code ${ev.code}, clean: ${ev.wasClean})`);
        connectedRef.current = false; // allow reconnect

        const currentAttempt = useMarketStore.getState().connection.reconnectAttempt;
        const nextAttempt    = currentAttempt + 1;

        if (nextAttempt <= RECONNECT_MAX_ATTEMPTS) {
          const delay = getReconnectDelay(currentAttempt);
          console.log(`[BINANCE-WS] Reconnecting in ${Math.round(delay)}ms (attempt ${nextAttempt})`);

          setConnectionStatus({
            status:           'disconnected',
            reconnectAttempt: nextAttempt,
            errorMessage:     `Reconnecting (${nextAttempt} / ${RECONNECT_MAX_ATTEMPTS})...`,
          });

          clearReconnectTimer();
          reconnectTimerRef.current = setTimeout(() => {
            if (mountedRef.current) connect();
          }, delay);
        } else {
          console.error('[BINANCE-WS] Max reconnect attempts reached.');
          setConnectionStatus({
            status:           'error',
            reconnectAttempt: nextAttempt,
            errorMessage:     'Max reconnect attempts exceeded. Refresh the page.',
          });
        }
      };
    } catch (err) {
      console.error('[BINANCE-WS] Failed to create WebSocket:', err);
      connectedRef.current = false;
      setConnectionStatus({
        status:       'error',
        errorMessage: 'Failed to create WebSocket',
      });
    }
  }, [processMessage, getReconnectDelay, clearReconnectTimer, setConnectionStatus]);

  // ── Effect: mount → connect, unmount → teardown ────────────────────────────

  useEffect(() => {
    mountedRef.current   = true;
    connectedRef.current = false; // fresh mount, no socket yet

    connect();

    return () => {
      mountedRef.current   = false;
      connectedRef.current = false;

      clearReconnectTimer();
      clearAllFlashTimers();

      if (wsRef.current) {
        wsRef.current.onopen    = null;
        wsRef.current.onmessage = null;
        wsRef.current.onerror   = null;
        wsRef.current.onclose   = null;
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect, clearReconnectTimer, clearAllFlashTimers]);
}
