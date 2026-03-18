import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export interface MarketPrice {
  symbol: string;
  price: number;
  prevPrice: number;
  change24h: number;
  changePercent24h: number;
  volume24h: number;
  high24h: number;
  low24h: number;
  lastUpdate: number;
  flashDirection: 'up' | 'down' | null;
}

interface ConnectionStatus {
  isConnected: boolean;
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  lastConnected: number | null;
  reconnectAttempt: number;
  errorMessage: string | null;
}

interface MarketState {
  prices: Record<string, MarketPrice>;
  connection: ConnectionStatus;
  watchedSymbols: Set<string>;

  updatePrice: (symbol: string, data: Partial<MarketPrice>) => void;
  updatePrices: (updates: Record<string, Partial<MarketPrice>>) => void;
  setFlashDirection: (symbol: string, direction: 'up' | 'down' | null) => void;
  clearFlash: (symbol: string) => void;
  setConnectionStatus: (status: Partial<ConnectionStatus>) => void;
  addWatchedSymbol: (symbol: string) => void;
  removeWatchedSymbol: (symbol: string) => void;

  getPrice: (symbol: string) => number | null;
  getPriceData: (symbol: string) => MarketPrice | null;
  isSymbolWatched: (symbol: string) => boolean;
}

export const useMarketStore = create<MarketState>()(
  devtools(
    (set, get) => ({
      prices: {},
      connection: {
        isConnected: false,
        status: 'disconnected',
        lastConnected: null,
        reconnectAttempt: 0,
        errorMessage: null,
      },
      watchedSymbols: new Set(),

      updatePrice: (symbol, data) =>
        set(
          (state) => {
            const existing = state.prices[symbol];
            
            if (existing && existing.price === data.price && existing.flashDirection === data.flashDirection) {
              return state;
            }

            return {
              prices: {
                ...state.prices,
                [symbol]: {
                  symbol,
                  price: data.price ?? existing?.price ?? 0,
                  prevPrice: data.prevPrice ?? existing?.prevPrice ?? 0,
                  change24h: data.change24h ?? existing?.change24h ?? 0,
                  changePercent24h: data.changePercent24h ?? existing?.changePercent24h ?? 0,
                  volume24h: data.volume24h ?? existing?.volume24h ?? 0,
                  high24h: data.high24h ?? existing?.high24h ?? 0,
                  low24h: data.low24h ?? existing?.low24h ?? 0,
                  lastUpdate: data.lastUpdate ?? Date.now(),
                  flashDirection: data.flashDirection ?? null,
                },
              },
            };
          },
          false,
          'updatePrice'
        ),

      updatePrices: (updates) =>
        set(
          (state) => {
            const newPrices = { ...state.prices };
            let hasChanges = false;

            Object.entries(updates).forEach(([symbol, data]) => {
              const existing = newPrices[symbol];
              
              if (existing && existing.price === data.price && !data.flashDirection) {
                return;
              }

              hasChanges = true;
              newPrices[symbol] = {
                symbol,
                price: data.price ?? existing?.price ?? 0,
                prevPrice: data.prevPrice ?? existing?.prevPrice ?? 0,
                change24h: data.change24h ?? existing?.change24h ?? 0,
                changePercent24h: data.changePercent24h ?? existing?.changePercent24h ?? 0,
                volume24h: data.volume24h ?? existing?.volume24h ?? 0,
                high24h: data.high24h ?? existing?.high24h ?? 0,
                low24h: data.low24h ?? existing?.low24h ?? 0,
                lastUpdate: data.lastUpdate ?? Date.now(),
                flashDirection: data.flashDirection ?? null,
              };
            });

            return hasChanges ? { prices: newPrices } : state;
          },
          false,
          'updatePrices'
        ),

      setFlashDirection: (symbol, direction) =>
        set(
          (state) => {
            const price = state.prices[symbol];
            if (!price || price.flashDirection === direction) return state;

            return {
              prices: {
                ...state.prices,
                [symbol]: { ...price, flashDirection: direction },
              },
            };
          },
          false,
          'setFlashDirection'
        ),

      clearFlash: (symbol) =>
        set(
          (state) => {
            const price = state.prices[symbol];
            if (!price || price.flashDirection === null) return state;

            return {
              prices: {
                ...state.prices,
                [symbol]: { ...price, flashDirection: null },
              },
            };
          },
          false,
          'clearFlash'
        ),

      setConnectionStatus: (status) =>
        set(
          (state) => {
            const newConnection = { ...state.connection, ...status };
            newConnection.isConnected = newConnection.status === 'connected';

            if (
              state.connection.status === newConnection.status &&
              state.connection.errorMessage === newConnection.errorMessage &&
              state.connection.reconnectAttempt === newConnection.reconnectAttempt
            ) {
              return state;
            }

            return { connection: newConnection };
          },
          false,
          'setConnectionStatus'
        ),

      addWatchedSymbol: (symbol) =>
        set((state) => {
          const upper = symbol.toUpperCase();
          if (state.watchedSymbols.has(upper)) return state;
          return { watchedSymbols: new Set([...state.watchedSymbols, upper]) };
        }),

      removeWatchedSymbol: (symbol) =>
        set((state) => {
          const newSet = new Set(state.watchedSymbols);
          const deleted = newSet.delete(symbol.toUpperCase());
          return deleted ? { watchedSymbols: newSet } : state;
        }),

      getPrice: (symbol) => get().prices[symbol]?.price ?? null,
      getPriceData: (symbol) => get().prices[symbol] ?? null,
      isSymbolWatched: (symbol) => get().watchedSymbols.has(symbol.toUpperCase()),
    }),
    { name: 'MarketStore' }
  )
);

export const selectPrice = (symbol: string) => (state: MarketState) =>
  state.prices[symbol]?.price ?? null;

export const selectPriceData = (symbol: string) => (state: MarketState) =>
  state.prices[symbol] ?? null;

export const selectConnectionStatus = (state: MarketState) => state.connection.status;

export const selectIsConnected = (state: MarketState) => state.connection.isConnected;

export const selectPriceCount = (state: MarketState) => Object.keys(state.prices).length;
