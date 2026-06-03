'use client';
// SPDX-License-Identifier: MIT

// Web port of mobile/app/consent.tsx. Same content + gradient/card layout.
// Alert.alert -> confirmAction/notify. On agree, the RoutingGate redirects to
// the app once consent flips to granted.
import React, { useState } from 'react';
import { ShieldCheck, HeartPulse, Cpu, Trash2, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { signOut } from '@/lib/use-auth';
import { useConsent } from '@/lib/consent-context';
import { Colors, BRAND_GRADIENT } from '@athletly/shared';
import { confirmAction, notify } from '@/lib/dialog';

function Point({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon;
  title: string;
  children: string;
}) {
  return (
    <div className="flex flex-row gap-3">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-primary-light mt-0.5 shrink-0">
        <Icon size={18} color={Colors.primary} />
      </div>
      <div className="flex-1">
        <p className="text-text-primary text-base font-semibold mb-0.5">{title}</p>
        <p className="text-text-secondary text-sm leading-5">{children}</p>
      </div>
    </div>
  );
}

const CARD_SHADOW = '0 4px 16px rgba(0,0,0,0.08)';

export default function ConsentScreen() {
  const { setConsent } = useConsent();
  const [loading, setLoading] = useState(false);

  const handleAgree = async () => {
    setLoading(true);
    try {
      await setConsent(true);
    } catch {
      notify('Einwilligung konnte nicht gespeichert werden. Bitte erneut versuchen.');
    } finally {
      setLoading(false);
    }
  };

  const handleDecline = () => {
    const ok = confirmAction(
      'Athletly kann ohne deine Einwilligung keine Gesundheitsdaten verarbeiten und dich nicht coachen. Du wirst abgemeldet.',
    );
    if (ok) signOut();
  };

  return (
    <div className="flex-1 min-h-0 h-full bg-background relative">
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 280, background: BRAND_GRADIENT }} />

      <div className="relative h-full overflow-y-auto no-scrollbar" style={{ padding: '48px 24px 24px' }}>
        <div className="mb-6">
          <ShieldCheck size={36} color="#FFFFFF" />
          <h1 className="text-white text-3xl font-bold mt-3" style={{ letterSpacing: -0.5 }}>
            Deine Daten, deine Kontrolle
          </h1>
          <p className="text-white/80 text-base mt-2">
            Bevor es losgeht, brauchen wir deine Einwilligung.
          </p>
        </div>

        <div className="bg-white rounded-3xl p-6 flex flex-col gap-5" style={{ boxShadow: CARD_SHADOW }}>
          <Point icon={HeartPulse} title="Gesundheits- und Trainingsdaten">
            Athletly verarbeitet deine Trainings- und Gesundheitsdaten (z.B. Herzfrequenz, HRV,
            Schlaf, Erholung), um dich individuell zu coachen. Das sind besondere Kategorien
            personenbezogener Daten nach Art. 9 DSGVO.
          </Point>

          <Point icon={Cpu} title="KI-Analyse (Anthropic, USA)">
            Fuer die Coaching-Analyse werden relevante Daten an unseren KI-Dienstleister Anthropic in
            den USA uebermittelt. Die Uebermittlung ist durch das EU-US Data Privacy Framework und
            einen Auftragsverarbeitungsvertrag abgesichert. Deine Daten werden nicht zum Training der
            KI-Modelle verwendet.
          </Point>

          <Point icon={Trash2} title="Jederzeit widerrufbar">
            Du kannst diese Einwilligung jederzeit in den Einstellungen widerrufen und deine Daten
            exportieren oder vollstaendig loeschen lassen.
          </Point>

          <div className="flex flex-col gap-3 mt-1">
            <Button
              variant="primary"
              size="lg"
              label="Zustimmen und loslegen"
              onPress={handleAgree}
              loading={loading}
              disabled={loading}
            />
            <Button variant="ghost" size="md" label="Nicht jetzt" onPress={handleDecline} disabled={loading} />
          </div>

          <p className="text-text-muted text-xs text-center leading-4">
            Mit dem Tippen auf &quot;Zustimmen&quot; willigst du in die Verarbeitung deiner Gesundheitsdaten
            zur KI-gestuetzten Trainingsanalyse und die damit verbundene Uebermittlung in die USA ein.
          </p>
        </div>
      </div>
    </div>
  );
}
