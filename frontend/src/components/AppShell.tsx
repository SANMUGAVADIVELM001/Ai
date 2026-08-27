import React, { useEffect, useState } from 'react';
import Sidebar from './Sidebar.js';
import TopBar from './TopBar.js';

const COLLAPSED_KEY = 'pathai:sidebarCollapsed';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(COLLAPSED_KEY) === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSED_KEY, String(collapsed));
    } catch {
      // ignore
    }
  }, [collapsed]);

  return (
    <div className="min-h-screen flex bg-white">
      <Sidebar collapsed={collapsed} mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar onToggleMobile={() => setMobileOpen(true)} onToggleCollapse={() => setCollapsed((c) => !c)} />
        <main className="flex-1 px-4 sm:px-6 py-8 overflow-y-auto">
          <div className="mx-auto max-w-5xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
