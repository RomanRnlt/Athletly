// SPDX-License-Identifier: MIT
import React from 'react';
import { DemoBanner } from './DemoBanner';

/**
 * Centered phone-width column. The source is a mobile app, so the web port
 * presents the same single-column layout inside a 440px-max frame on a neutral
 * backdrop. On small screens it fills the viewport.
 */
export function AppFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen w-full flex justify-center">
      <div className="w-full max-w-[440px] min-h-screen bg-background flex flex-col relative shadow-xl overflow-hidden">
        <DemoBanner />
        {children}
      </div>
    </div>
  );
}

export default AppFrame;
