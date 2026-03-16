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
        set((state) => {
          const existing = state.prices[symbol];
          const updated: MarketPrice = {
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

          return {
            prices: {
              ...state.prices,
              [symbol]: updated,
            },
          };
        }),

      updatePrices: (updates) =>
        set((state) => {
          const newPrices = { ...state.prices };

          Object.entries(updates).forEach(([symbol, data]) => {
            const existing = newPrices[symbol];
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

          return { prices: newPrices };
        }),

      setFlashDirection: (symbol, direction) =>
        set((state) => {
          if (!state.prices[symbol]) return state;

          return {
            prices: {
              ...state.prices,
              [symbol]: {
                ...state.prices[symbol],
                flashDirection: direction,
              },
            },
          };
        }),

      clearFlash: (symbol) =>
        set((state) => {
          if (!state.prices[symbol]) return state;

          return {
            prices: {
              ...state.prices,
              [symbol]: {
                ...state.prices[symbol],
                flashDirection: null,
              },
            },
          };
        }),

      setConnectionStatus: (status) =>
        set((state) => ({
          connection: {
            ...state.connection,
            ...status,
            isConnected: status.status === 'connected',
          },
        })),

      addWatchedSymbol: (symbol) =>
        set((state) => ({
          watchedSymbols: new Set([...state.watchedSymbols, symbol.toUpperCase()]),
        })),

      removeWatchedSymbol: (symbol) =>
        set((state) => {
          const newSet = new Set(state.watchedSymbols);
          newSet.delete(symbol.toUpperCase());
          return { watchedSymbols: newSet };
        }),

      getPrice: (symbol) => {
        const data = get().prices[symbol];
        return data?.price ?? null;
      },

      getPriceData: (symbol) => {
        return get().prices[symbol] ?? null;
      },

      isSymbolWatched: (symbol) => {
        return get().watchedSymbols.has(symbol.toUpperCase());
      },
    }),
    { name: 'MarketStore' }
  )
);
