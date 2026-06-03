// SPDX-License-Identifier: MIT
import React from 'react';
import { DemoBanner } from './DemoBanner';

/**
 * Responsive application shell.
 *
 * Mobile (< md): a single full-bleed column that fills the viewport. The bottom
 * TabBar (rendered by the tabbed layout) is the primary navigation. This matches
 * the source mobile app 1:1.
 *
 * Desktop (md+): a real web app shell that uses the full viewport. AppFrame no
 * longer draws a phone device frame; it simply hosts the DemoBanner at the very
 * top and lets the routed content (which on the tabbed routes is a left sidebar
 * plus a scrolling main area) fill the remaining height.
 *
 * AppFrame remains the height authority: it is a flex-col pinned to the viewport
 * height whose content region is `flex-1 min-h-0`, so children manage their own
 * internal scrolling. Internal screens use `h-full`/`min-h-0` to cooperate.
 */
export function AppFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen w-full flex flex-col bg-background overflow-hidden">
      <DemoBanner />
      {/* Content region: children fill this, not the viewport. */}
      <div className="flex-1 min-h-0 flex flex-col">
        {/* Mobile keeps the bounded phone-width column; desktop goes full width. */}
        <div className="flex-1 min-h-0 w-full max-w-[440px] md:max-w-none mx-auto flex flex-col bg-background md:bg-transparent relative overflow-hidden md:overflow-visible">
          {children}
        </div>
      </div>
    </div>
  );
}

export default AppFrame;
