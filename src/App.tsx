import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { FiatDashboard } from './components/FiatDashboard';
import { InsightsDashboard } from './components/InsightsDashboard';
import { SettingsDashboard } from './components/SettingsDashboard';
import { GlobalLoadingScreen } from './components/GlobalLoadingScreen';
import { LoginScreen } from './components/LoginScreen';
import { Dashboard } from './pages/Dashboard';
import { MarketDashboard as InvestDashboard } from './components/MarketDashboard';
import { MarketDashboard as TerminalDashboard } from './pages/MarketDashboard';
import { supabase } from './lib/supabase';
import { useAuthStore } from './store/useAuthStore';
import { useFiatStore } from './store/useFiatStore';
import { useMarketStore } from './store/useMarketStore';

function useAuthBootstrap() {
  const setUser = useAuthStore((s) => s.setUser);
  const setSession = useAuthStore((s) => s.setSession);
  const setLoadingAuth = useAuthStore((s) => s.setLoadingAuth);
  const setHydrating = useAuthStore((s) => s.setHydrating);

  useEffect(() => {
    let alive = true;

    const hydrateUserData = async (session: Awaited<ReturnType<typeof supabase.auth.getSession>>['data']['session']) => {
      if (!alive) return;

      if (!session?.user) {
        setHydrating(false);
        return;
      }

      setHydrating(true);
      try {
        await Promise.all([
          useFiatStore.getState().fetchUserData(),
          useMarketStore.getState().fetchUserData(),
        ]);
      } catch (err) {
        console.error('[Auth] Failed to hydrate user data:', err);
      } finally {
        if (alive) setHydrating(false);
      }
    };

    const bootstrap = async () => {
      setLoadingAuth(true);
      setHydrating(true);

      const { data, error } = await supabase.auth.getSession();
      if (!alive) return;

      if (error) {
        console.error('[Auth] Failed to read Supabase session:', error);
      }

      const session = data.session;
      setSession(session);
      setUser(session?.user ?? null);
      setLoadingAuth(false);
      await hydrateUserData(session);
    };

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoadingAuth(false);
      void hydrateUserData(session);
    });

    void bootstrap();

    return () => {
      alive = false;
      listener.subscription.unsubscribe();
    };
  }, [setHydrating, setLoadingAuth, setSession, setUser]);
}

function App() {
  useAuthBootstrap();

  const session = useAuthStore((s) => s.session);
  const isLoadingAuth = useAuthStore((s) => s.isLoadingAuth);
  const isHydrating = useAuthStore((s) => s.isHydrating);

  if (isLoadingAuth || isHydrating) {
    return <GlobalLoadingScreen />;
  }

  if (!session) {
    return <LoginScreen />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="fiat" element={<FiatDashboard />} />
          <Route path="invest" element={<InvestDashboard />} />
          <Route path="markets" element={<TerminalDashboard />} />
          <Route path="insights" element={<InsightsDashboard />} />
          <Route path="settings" element={<SettingsDashboard />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
