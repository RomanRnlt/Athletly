'use client';

// Web port of mobile/components/ui/GradientHeader.tsx. LinearGradient -> CSS
// background gradient (BRAND_GRADIENT), safe-area inset -> a small top padding.
import React, { type ReactNode } from 'react';
import { BRAND_GRADIENT } from '@athletly/shared';

interface GradientHeaderProps {
  title?: string;
  subtitle?: string;
  leftContent?: ReactNode;
  rightContent?: ReactNode;
  children?: ReactNode;
}

export function GradientHeader({
  title,
  subtitle,
  leftContent,
  rightContent,
  children,
}: GradientHeaderProps) {
  return (
    <div style={{ background: BRAND_GRADIENT }}>
      <div className="px-4 pt-4 pb-4">
        <div className="flex flex-row items-start justify-between">
          {leftContent && <div className="mr-2 mt-1">{leftContent}</div>}
          <div className="flex-1">
            {title && (
              <h1 className="text-white text-[26px] font-bold leading-tight" style={{ letterSpacing: -0.3 }}>
                {title}
              </h1>
            )}
            {subtitle && <p className="text-white/80 text-[15px] mt-1">{subtitle}</p>}
          </div>
          {rightContent}
        </div>
        {children}
      </div>
    </div>
  );
}

export default GradientHeader;
