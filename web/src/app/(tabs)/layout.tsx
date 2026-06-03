// SPDX-License-Identifier: MIT
// Layout for the tabbed shell (Plan / Chat / Settings), mirroring
// mobile/app/(tabs)/_layout.tsx. Content scrolls above a fixed bottom tab bar.
import { TabBar } from '@/components/ui/TabBar';

export default function TabsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col h-screen min-h-screen">
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">{children}</div>
      <TabBar />
    </div>
  );
}
