'use client';
// SPDX-License-Identifier: MIT

// Web port of mobile/app/paywall.tsx.
//
// PAYMENT IS STUBBED ON WEB: there is no RevenueCat native module in the
// browser, so the purchase + restore CTAs are placeholders. The UI is identical
// to mobile; the buy button shows a notice that purchases run in the mobile
// app. Wire up a web checkout (e.g. Stripe) here when web billing is added.
import React from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Colors, BRAND_GRADIENT } from '@athletly/shared';
import { notify } from '@/lib/dialog';
import { useT, type MessageKey } from '@/i18n';

const FALLBACK_MONTHLY = '9,99 EUR';

const BENEFIT_KEYS: MessageKey[] = [
  'paywall.benefit1',
  'paywall.benefit2',
  'paywall.benefit3',
  'paywall.benefit4',
];

function Benefit({ children }: { children: string }) {
  return (
    <div className="flex flex-row items-center gap-3">
      <div className="w-6 h-6 rounded-full flex items-center justify-center bg-primary-light shrink-0">
        <Check size={14} color={Colors.primary} />
      </div>
      <span className="text-text-secondary text-sm flex-1">{children}</span>
    </div>
  );
}

const CARD_SHADOW = '0 4px 16px rgba(0,0,0,0.08)';

export default function PaywallScreen() {
  const t = useT();
  const router = useRouter();
  const monthlyPrice = FALLBACK_MONTHLY;

  const buy = () => {
    notify(t('paywall.buyNotice'));
  };

  const restore = () => {
    notify(t('paywall.restoreNotice'));
  };

  return (
    <div className="flex-1 min-h-0 h-full bg-background relative">
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 300, background: BRAND_GRADIENT }} />
      <div className="relative h-full overflow-y-auto no-scrollbar" style={{ padding: '16px 24px 24px' }}>
        <div className="flex justify-end">
          <Button variant="icon" size="sm" icon={X} onPress={() => router.back()} />
        </div>

        <div className="mb-6 mt-2">
          <Sparkles size={36} color="#FFFFFF" />
          <h1 className="text-white text-3xl font-bold mt-3" style={{ letterSpacing: -0.5 }}>
            {t('paywall.title')}
          </h1>
          <p className="text-white/80 text-base mt-2">{t('paywall.subtitle')}</p>
        </div>

        <div className="bg-white rounded-3xl p-6 flex flex-col gap-5" style={{ boxShadow: CARD_SHADOW }}>
          <div className="flex flex-col gap-3">
            {BENEFIT_KEYS.map((key) => (
              <Benefit key={key}>{t(key)}</Benefit>
            ))}
          </div>

          <div className="flex flex-col gap-3 mt-1">
            {/* Placeholder CTA: disabled-style behavior, shows a notice on click. */}
            <Button
              variant="primary"
              size="lg"
              label={t('paywall.ctaBuy', { price: monthlyPrice })}
              onPress={buy}
            />
            <Button variant="ghost" size="md" label={t('paywall.ctaRestore')} onPress={restore} />
          </div>

          <p className="text-text-muted text-xs text-center leading-4">{t('paywall.fineprint')}</p>
        </div>
      </div>
    </div>
  );
}
