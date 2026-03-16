import { useEffect, useRef, useCallback } from 'react';
import { useMarketStore } from '../stores/useMarketStore';

interface RawBinanceTicker {
  s: string;
  c: string;
  P: string;
  p: string;
  v: string;
  h: string;
  l: string;
}

const WS_ENDPOINT = 'wss://stream.binance.com:9443/ws/!ticker@arr';
const RECONNECT_BASE_DELAY = 2000;
const RECONNECT_MAX_DELAY = 30000;
const RECONNECT_MAX_ATTEMPTS = 15;
const FLASH_DURATION = 300;

export function useBinanceTicker(symbols: string[]) {
  const wsRef = useRef<WebSocket | null>(null);
  const mountedRef = useRef(true);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flashTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const priceSnapshotRef = useRef<Record<string, number>>({});

  const {
    updatePrices,
    clearFlash,
    setConnectionStatus,
    addWatchedSymbol,
    watchedSymbols,
  } = useMarketStore();

  useEffect(() => {
    symbols.forEach((sym) => addWatchedSymbol(sym));
  }, [symbols, addWatchedSymbol]);

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

  const getReconnectDelay = useCallback((attempt: number): number => {
    const exponential = RECONNECT_BASE_DELAY * Math.pow(2, attempt);
    const jitter = Math.random() * 1000;
    return Math.min(exponential + jitter, RECONNECT_MAX_DELAY);
  }, []);

  const processMessage = useCallback(
    (rawData: RawBinanceTicker[]) => {
      if (!mountedRef.current) return;

      const updates: Record<string, any> = {};
      const watchedSet = new Set(Array.from(watchedSymbols).map((s) => s.toUpperCase()));

      for (const raw of rawData) {
        if (!watchedSet.has(raw.s)) continue;

        const currentPrice = parseFloat(raw.c);
        const previousPrice = priceSnapshotRef.current[raw.s] ?? currentPrice;

        let flashDirection: 'up' | 'down' | null = null;
        if (previousPrice !== currentPrice) {
          flashDirection = currentPrice > previousPrice ? 'up' : 'down';
        }

        priceSnapshotRef.current[raw.s] = currentPrice;

        updates[raw.s] = {
          symbol: raw.s,
          price: currentPrice,
          prevPrice: previousPrice,
          change24h: parseFloat(raw.p),
          changePercent24h: parseFloat(raw.P),
          volume24h: parseFloat(raw.v),
          high24h: parseFloat(raw.h),
          low24h: parseFloat(raw.l),
          lastUpdate: Date.now(),
          flashDirection,
        };
      }

      if (Object.keys(updates).length === 0) return;

      updatePrices(updates);

      Object.entries(updates).forEach(([symbol, data]) => {
        if (data.flashDirection) {
          clearFlashTimer(symbol);
          flashTimersRef.current[symbol] = setTimeout(() => {
            if (mountedRef.current) {
              clearFlash(symbol);
            }
          }, FLASH_DURATION);
        }
      });
    },
    [watchedSymbols, updatePrices, clearFlash, clearFlashTimer]
  );

  const connect = useCallback(() => {
    if (!mountedRef.current) return;

    if (wsRef.current) {
      wsRef.current.onopen = null;
      wsRef.current.onmessage = null;
      wsRef.current.onerror = null;
      wsRef.current.onclose = null;
      if (
        wsRef.current.readyState === WebSocket.OPEN ||
        wsRef.current.readyState === WebSocket.CONNECTING
      ) {
        wsRef.current.close();
      }
      wsRef.current = null;
    }

    setConnectionStatus({ status: 'connecting', errorMessage: null });

    try {
      const ws = new WebSocket(WS_ENDPOINT);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!mountedRef.current) {
          ws.close();
          return;
        }
        console.log('[BINANCE-WS] Stream connected');
        setConnectionStatus({
          status: 'connected',
          lastConnected: Date.now(),
          reconnectAttempt: 0,
          errorMessage: null,
        });
      };

      ws.onmessage = (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data) as RawBinanceTicker[];
          if (Array.isArray(data)) {
            processMessage(data);
          }
        } catch {
          // Drop malformed frames
        }
      };

      ws.onerror = () => {
        console.warn('[BINANCE-WS] Connection error');
        setConnectionStatus({
          status: 'error',
          errorMessage: 'WebSocket error occurred',
        });
      };

      ws.onclose = (event) => {
        console.log(`[BINANCE-WS] Closed | code=${event.code}`);
        if (!mountedRef.current) return;

        const currentAttempt = useMarketStore.getState().connection.reconnectAttempt;
        const nextAttempt = currentAttempt + 1;

        if (nextAttempt <= RECONNECT_MAX_ATTEMPTS) {
          const delay = getReconnectDelay(currentAttempt);
          console.log(`[BINANCE-WS] Reconnecting in ${Math.round(delay)}ms`);

          setConnectionStatus({
            status: 'disconnected',
            reconnectAttempt: nextAttempt,
            errorMessage: `Reconnecting (attempt ${nextAttempt})...`,
          });

          clearReconnectTimer();
          reconnectTimerRef.current = setTimeout(() => {
            if (mountedRef.current) connect();
          }, delay);
        } else {
          setConnectionStatus({
            status: 'error',
            reconnectAttempt: nextAttempt,
            errorMessage: 'Max reconnection attempts exceeded',
          });
        }
      };
    } catch (err) {
      console.error('[BINANCE-WS] Failed to create WebSocket:', err);
      setConnectionStatus({
        status: 'error',
        errorMessage: 'Failed to create WebSocket connection',
      });
    }
  }, [processMessage, getReconnectDelay, clearReconnectTimer, setConnectionStatus]);

  useEffect(() => {
    mountedRef.current = true;
    connect();

    return () => {
      mountedRef.current = false;
      clearReconnectTimer();
      clearAllFlashTimers();

      if (wsRef.current) {
        wsRef.current.onopen = null;
        wsRef.current.onmessage = null;
        wsRef.current.onerror = null;
        wsRef.current.onclose = null;
        wsRef.current.close();
        wsRef.current = null;
      }
      console.log('[BINANCE-WS] Cleanup complete');
    };
  }, [connect, clearReconnectTimer, clearAllFlashTimers]);
}
