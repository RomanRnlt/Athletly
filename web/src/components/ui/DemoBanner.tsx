// SPDX-License-Identifier: MIT
import React from 'react';
import { DEMO_MODE } from '@/lib/demo';

/**
 * Thin top banner shown only in DEMO_MODE, making it explicit that no live LLM
 * is connected and the conversation is scripted. Renders nothing otherwise.
 */
export function DemoBanner() {
  if (!DEMO_MODE) return null;
  return (
    <div className="w-full bg-[#FACC15] px-3 py-1.5 flex items-center justify-center">
      <span className="text-[#1E293B] text-[11px] font-semibold text-center leading-tight">
        Demo-Modus · kein Live-LLM angebunden · die Antworten sind vorab geskriptet
      </span>
    </div>
  );
}

export default DemoBanner;
