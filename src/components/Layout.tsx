import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { BottomNav } from './BottomNav';
import { Sidebar } from './Sidebar';
import { GlobalFAB } from './GlobalFAB';

export const Layout: React.FC = () => {
  useEffect(() => {
    // If a Workbox/VitePWA service worker was registered previously, it can hijack
    // localhost requests in dev and cause a blank screen. Ensure dev always bypasses SW.
    if (!import.meta.env.DEV) return;
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.getRegistrations().then((regs) => {
      regs.forEach((r) => r.unregister());
    });
  }, []);

  return (
    <div className="min-h-screen bg-[#060D1F] text-white md:flex">
      <Sidebar />

      <main className="flex-1 min-h-screen pb-20 md:pb-0">
        <Outlet />
      </main>

      <BottomNav />
      <GlobalFAB />
    </div>
  );
};

export default Layout;
