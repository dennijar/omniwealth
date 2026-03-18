import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { FiatDashboard } from './components/FiatDashboard';
import { InsightsDashboard } from './components/InsightsDashboard';
import { SettingsDashboard } from './components/SettingsDashboard';
import { Dashboard } from './pages/Dashboard';
import { MarketDashboard as InvestDashboard } from './components/MarketDashboard';
import { MarketDashboard as TerminalDashboard } from './pages/MarketDashboard';

function App() {
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
