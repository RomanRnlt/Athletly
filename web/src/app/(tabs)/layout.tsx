// SPDX-License-Identifier: MIT
// Layout for the tabbed shell (Plan / Chat / Settings).
//
// Mobile (< md): content scrolls above a fixed bottom TabBar (1:1 with the
// source mobile app).
//
// Desktop (md+): a real web app shell. A fixed left Sidebar provides primary
// navigation and the main content area scrolls independently to its right. The
// bottom TabBar is hidden on desktop.
import { TabBar } from '@/components/ui/TabBar';
import { Sidebar } from '@/components/ui/Sidebar';

export default function TabsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col md:flex-row flex-1 min-h-0 h-full">
      <Sidebar />
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">{children}</div>
      <div className="md:hidden">
        <TabBar />
      </div>
    </div>
  );
}
