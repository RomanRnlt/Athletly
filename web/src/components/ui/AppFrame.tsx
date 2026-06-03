// SPDX-License-Identifier: MIT
import React from 'react';
import { DemoBanner } from './DemoBanner';

/**
 * Centered phone-width column. The source is a mobile app, so the web port
 * presents the same single-column layout.
 *
 * Mobile (< md): the column fills the viewport, full-bleed, no frame.
 *
 * Desktop (md+): the column is presented as a tasteful phone device frame,
 * vertically centered on a subtly brand-tinted backdrop, with a bounded phone
 * height, rounded bezel, border and a large soft shadow.
 *
 * AppFrame is the height authority: the column is a flex-col whose content
 * region is `flex-1 min-h-0`, so children fill the frame (not the viewport)
 * and any scrolling happens inside the phone. Internal screens use
 * `h-full`/`min-h-0` instead of `h-screen`/`min-h-screen` to cooperate.
 */
export function AppFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen w-full flex justify-center md:items-center md:p-6 lg:p-10 md:bg-gradient-to-b md:from-slate-100 md:to-slate-200">
      <div
        className={[
          // Mobile: full-bleed, fills the viewport, no frame.
          'w-full max-w-[440px] min-h-screen bg-background flex flex-col relative overflow-hidden shadow-xl',
          // Desktop: bounded phone height, rounded bezel, border, soft shadow.
          'md:min-h-0 md:h-[860px] md:max-h-[92vh] md:rounded-[2.25rem]',
          'md:border md:border-black/10 md:shadow-[0_40px_80px_-20px_rgba(15,23,42,0.45)]',
        ].join(' ')}
      >
        <DemoBanner />
        {/* Content region: children fill this, not the viewport. */}
        <div className="flex-1 min-h-0 flex flex-col">{children}</div>
      </div>
    </div>
  );
}

export default AppFrame;
