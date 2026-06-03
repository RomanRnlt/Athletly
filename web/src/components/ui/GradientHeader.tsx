'use client';
// SPDX-License-Identifier: MIT

// Web port of mobile/components/ui/GradientHeader.tsx. LinearGradient -> CSS
// background gradient (BRAND_GRADIENT), safe-area inset -> a small top padding.
//
// Desktop (md+): the gradient band still spans the content area, but its inner
// row is constrained to a comfortable max-width and given roomier padding and a
// larger title, so the header reads as a page header rather than a phone bar.
import React, { type ReactNode } from 'react';
import { BRAND_GRADIENT } from '@athletly/shared';

interface GradientHeaderProps {
  title?: string;
  subtitle?: string;
  leftContent?: ReactNode;
  rightContent?: ReactNode;
  children?: ReactNode;
  /** Max-width (Tailwind class) for the constrained inner content on desktop. */
  contentMaxWidthClass?: string;
}

export function GradientHeader({
  title,
  subtitle,
  leftContent,
  rightContent,
  children,
  contentMaxWidthClass = 'md:max-w-5xl',
}: GradientHeaderProps) {
  return (
    <div style={{ background: BRAND_GRADIENT }}>
      <div className={`px-4 pt-4 pb-4 md:px-10 md:pt-8 md:pb-7 mx-auto w-full ${contentMaxWidthClass}`}>
        <div className="flex flex-row items-start justify-between">
          {leftContent && <div className="mr-2 mt-1 md:mr-3">{leftContent}</div>}
          <div className="flex-1">
            {title && (
              <h1
                className="text-white text-[26px] md:text-[34px] font-bold leading-tight"
                style={{ letterSpacing: -0.3 }}
              >
                {title}
              </h1>
            )}
            {subtitle && <p className="text-white/80 text-[15px] md:text-base mt-1">{subtitle}</p>}
          </div>
          {rightContent}
        </div>
        {children}
      </div>
    </div>
  );
}

export default GradientHeader;
