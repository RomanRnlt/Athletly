// SPDX-License-Identifier: MIT
// German message catalog. Keys are grouped by screen/domain with dotted names.
// This is the canonical key set; en.ts mirrors it exactly.

export const de = {
  // --- generic / shared ----------------------------------------------------
  'common.loading': 'Lädt',
  'common.refresh': 'Aktualisieren',
  'common.back': 'Zurück',
  'common.close': 'Schließen',
  'common.confirm': 'Bestätigen',
  'common.connect': 'Verbinden',
  'common.disconnect': 'Trennen',
  'common.connected': 'Verbunden',
  'common.notConnected': 'Nicht verbunden',
  'common.on': 'An',
  'common.unknownError': 'Unbekannter Fehler.',
  'common.showPassword': 'Passwort anzeigen',
  'common.hidePassword': 'Passwort verbergen',

  // --- app meta ------------------------------------------------------------
  'app.name': 'Athletly',
  'app.tagline': 'Dein Coach. Deine Daten. Dein Plan.',

  // --- demo banner ---------------------------------------------------------
  'demo.banner': 'Demo-Modus · kein Live-LLM angebunden · die Antworten sind vorab geskriptet',
  'demo.consentDisabled': 'Demo-Modus: Einwilligungseinstellungen sind in dieser Demo deaktiviert.',
  'demo.resetDisabled': 'Demo-Modus: Das Zurücksetzen der Daten ist in dieser Demo deaktiviert.',
  'demo.exportDisabled': 'Demo-Modus: Der Datenexport ist in dieser öffentlichen Demo deaktiviert.',
  'demo.deleteDisabled': 'Demo-Modus: Das Löschen des Accounts ist in dieser öffentlichen Demo deaktiviert.',

  // --- navigation ----------------------------------------------------------
  'nav.plan': 'Plan',
  'nav.chat': 'Chat',
  'nav.settings': 'Einstellungen',
  'nav.viewProfile': 'Profil ansehen',
  'nav.athleteFallback': 'Athlete',

  // --- login ---------------------------------------------------------------
  'login.welcome': 'Willkommen',
  'login.subtitle': 'Melde dich an oder erstelle einen Account.',
  'login.withApple': 'Mit Apple anmelden',
  'login.withGoogle': 'Mit Google anmelden',
  'login.or': 'oder',
  'login.withEmail': 'Mit E-Mail anmelden',
  'login.noAccount': 'Noch kein Konto? Account erstellen',
  'login.haveAccount': 'Schon ein Konto? Anmelden',
  'login.signIn': 'Anmelden',
  'login.createAccount': 'Konto erstellen',
  'login.emailLabel': 'E-Mail',
  'login.emailPlaceholder': 'du@example.com',
  'login.passwordLabel': 'Passwort',
  'login.passwordPlaceholder': 'Mindestens 6 Zeichen',
  'login.errorCredentialsRequired': 'E-Mail und Passwort sind erforderlich.',
  'login.errorSignInFailed': 'Anmeldung fehlgeschlagen',
  'login.appleProvider': 'Apple-Anmeldung',
  'login.googleProvider': 'Google-Anmeldung',
  'login.providerFailed': '{provider} fehlgeschlagen',

  // --- consent -------------------------------------------------------------
  'consent.title': 'Deine Daten, deine Kontrolle',
  'consent.subtitle': 'Bevor es losgeht, brauchen wir deine Einwilligung.',
  'consent.healthTitle': 'Gesundheits- und Trainingsdaten',
  'consent.healthBody':
    'Athletly verarbeitet deine Trainings- und Gesundheitsdaten (z.B. Herzfrequenz, HRV, Schlaf, Erholung), um dich individuell zu coachen. Das sind besondere Kategorien personenbezogener Daten nach Art. 9 DSGVO.',
  'consent.aiTitle': 'KI-Analyse (Anthropic, USA)',
  'consent.aiBody':
    'Für die Coaching-Analyse werden relevante Daten an unseren KI-Dienstleister Anthropic in den USA übermittelt. Die Übermittlung ist durch das EU-US Data Privacy Framework und einen Auftragsverarbeitungsvertrag abgesichert. Deine Daten werden nicht zum Training der KI-Modelle verwendet.',
  'consent.revokeTitle': 'Jederzeit widerrufbar',
  'consent.revokeBody':
    'Du kannst diese Einwilligung jederzeit in den Einstellungen widerrufen und deine Daten exportieren oder vollständig löschen lassen.',
  'consent.agree': 'Zustimmen und loslegen',
  'consent.notNow': 'Nicht jetzt',
  'consent.fineprint':
    'Mit dem Tippen auf "Zustimmen" willigst du in die Verarbeitung deiner Gesundheitsdaten zur KI-gestützten Trainingsanalyse und die damit verbundene Übermittlung in die USA ein.',
  'consent.saveFailed': 'Einwilligung konnte nicht gespeichert werden. Bitte erneut versuchen.',
  'consent.declineConfirm':
    'Athletly kann ohne deine Einwilligung keine Gesundheitsdaten verarbeiten und dich nicht coachen. Du wirst abgemeldet.',
  'consent.loadFailed': 'Einwilligungsstatus konnte nicht geladen werden',

  // --- paywall -------------------------------------------------------------
  'paywall.title': 'Athletly Pro',
  'paywall.subtitle': 'Mehr Coaching, mehr Pläne, mehr aus deinen Daten.',
  'paywall.benefit1': 'Deutlich mehr KI-Coaching pro Monat',
  'paywall.benefit2': 'Unbegrenzte Trainingspläne',
  'paywall.benefit3': 'Tiefe Analysen deiner Gesundheitsdaten',
  'paywall.benefit4': 'Früher Zugang zu neuen Features',
  'paywall.ctaBuy': 'Pro - {price} / Monat',
  'paywall.ctaRestore': 'Käufe wiederherstellen',
  'paywall.fineprint':
    'Käufe sind in der Web-Version nicht aktiv. Nutze die mobile App für das Pro-Upgrade.',
  'paywall.buyNotice':
    'Käufe sind in der Web-Version nicht verfügbar. Bitte upgrade in der mobilen App auf Pro.',
  'paywall.restoreNotice': 'Käufe wiederherstellen ist nur in der mobilen App verfügbar.',

  // --- plan ----------------------------------------------------------------
  'plan.title': 'Trainingsplan',
  'plan.subtitleDraft': 'Entwurf - im Chat bestätigen',
  'plan.subtitleActive': 'Dein aktiver Plan',
  'plan.emptyTitle': 'Noch kein Trainingsplan',
  'plan.emptyBody':
    'Sag Ohm im Chat dass du einen Plan willst. Er recherchiert und baut dir einen wissenschaftlich fundierten 2-Wochen-Plan, den du dann gemeinsam mit ihm anpassen kannst.',
  'plan.calendarWeek': 'KW {week} · Woche {current}/{total}',
  'plan.restDay': 'Ruhetag',
  'plan.today': 'Heute',
  'plan.loadFailed': 'Plan konnte nicht geladen werden',
  'plan.weekRangeSameMonth': '{start}. bis {end}. {month}',
  'plan.weekRangeCrossMonth': '{start}. {startMonth} bis {end}. {endMonth}',

  // --- rest day card -------------------------------------------------------
  'restDay.title': 'Ruhetag',
  'restDay.body': 'Erholung ist genauso wichtig wie das Training. Genieße den Tag.',

  // --- session card --------------------------------------------------------
  'session.done': 'Erledigt',
  'session.approxDuration': 'ca. {duration}',

  // --- weekly summary ------------------------------------------------------
  'weeklySummary.title': 'Wochenübersicht',
  'weeklySummary.countOnly': '{count} Einheiten',
  'weeklySummary.countWithDuration': '{count} Einheiten / ca. {duration}',
  'weeklySummary.timesSuffix': '{count}x',

  // --- chat ----------------------------------------------------------------
  'chat.title': 'Chat',
  'chat.creditLimitTitle': 'KI-Limit erreicht',
  'chat.creditLimitBody': 'Dein Kontingent ist aufgebraucht. Tippe für Upgrade auf Pro.',
  'chat.upgradeAria': 'Auf Pro upgraden',
  'chat.emptyWelcomeTitle': 'Willkommen!',
  'chat.emptyHiTitle': 'Hi.',
  'chat.emptyOnboarding':
    'Sag Ohm "Hi" damit er dich kennenlernen kann. Er fragt dich ein paar Sachen über dich und dein Training, damit er dich danach richtig coachen kann.',
  'chat.emptyDefault':
    'Frag mich was zu deinem Training, deinem Schlaf oder deinem Wochenvolumen. Wenn deine Garmin-Daten verbunden sind kann ich konkrete Zahlen ziehen.',
  'chat.subtitleTool': '{status}...',
  'chat.subtitleStreaming': 'Ohm schreibt...',
  'chat.subtitleOnboarding': 'Erstgespräch läuft',
  'chat.subtitleOnline': 'Ohm ist online',
  'chat.thinking': 'Denke nach...',
  'chat.inputPlaceholder': 'Nachricht...',
  'chat.voiceInput': 'Spracheingabe',
  'chat.sendMessage': 'Nachricht senden',
  'chat.connectionFailed': '[Verbindung zum Server fehlgeschlagen]',

  // --- onboarding bar ------------------------------------------------------
  'onboarding.title': 'Erstgespräch mit Ohm',

  // --- live activity / show work ------------------------------------------
  'liveActivity.working': 'Arbeitet…',
  'liveActivity.agentPlan': 'Plan-Agent',
  'liveActivity.agentEvaluator': 'Evaluator',
  'showWork.toolsUsed': 'Werkzeuge verwendet ({count})',
  'showWork.expand': 'Werkzeugliste ausklappen',
  'showWork.collapse': 'Werkzeugliste einklappen',

  // --- tool labels (chat "show work") --------------------------------------
  'tool.search_activities': 'Sucht deine Aktivitäten',
  'tool.get_activity_details': 'Schaut sich einen Workout genauer an',
  'tool.get_daily_metrics': 'Liest deine Gesundheitsdaten',
  'tool.get_weekly_load': 'Berechnet dein Wochenvolumen',
  'tool.web_search': 'Recherchiert im Web',
  'tool.read_athlete_profile': 'Liest dein Profil',
  'tool.update_athlete_section': 'Aktualisiert dein Profil',
  'tool.run_specialist': 'Startet einen Spezialisten-Agenten',
  'tool.evaluate_plan': 'Lässt den Plan bewerten',
  'tool.submit_plan': 'Finalisiert den Plan',
  'tool.submit_evaluation': 'Gibt die Bewertung ab',
  'tool.get_current_plan': 'Liest deinen Plan',
  'tool.update_plan': 'Passt den Plan an',
  'tool.confirm_plan': 'Aktiviert den Plan',
  'tool.fallback': 'Ruft {name} auf',

  // --- settings ------------------------------------------------------------
  'settings.title': 'Einstellungen',
  'settings.howAthletlySeesYou': 'Wie Athletly dich sieht',
  'settings.sectionServices': 'Verbundene Dienste',
  'settings.sectionSettings': 'Einstellungen',
  'settings.sectionAiUsage': 'KI-Nutzung',
  'settings.sectionPrivacy': 'Datenschutz & DSGVO',
  'settings.sectionAccount': 'Account',
  'settings.appleHealth': 'Apple Health',
  'settings.appleHealthNotImplemented': 'Apple Health: Noch nicht implementiert.',
  'settings.syncedData': 'Synced Data',
  'settings.syncedDataAria': 'Synced Data ansehen',
  'settings.syncedSummary': '{count} Aktivitäten · {sync}',
  'settings.neverSynced': 'Noch nie synchronisiert',
  'settings.sync': 'Sync',
  'settings.syncing': 'Synct...',
  'settings.notifications': 'Benachrichtigungen',
  'settings.language': 'Sprache',
  'settings.languageGerman': 'Deutsch',
  'settings.languageEnglish': 'Englisch',
  'settings.appearance': 'Erscheinungsbild',
  'settings.appearanceLight': 'Hell',
  'settings.usageLoadFailed': 'Nutzung konnte nicht geladen werden',
  'settings.aiCredits': 'KI-Credits',
  'settings.creditsUsed': '{used} genutzt',
  'settings.creditsUsedOfLimit': '{used} / {limit}',
  'settings.reset': 'Reset',
  'settings.resetOn': 'am {date}',
  'settings.upgradeToPro': 'Upgrade auf Pro',
  'settings.grandfatherNote': 'Unbegrenzter Zugang (Grandfather).',
  'settings.consentHealthData': 'Einwilligung Gesundheitsdaten',
  'settings.consentGranted': 'Erteilt',
  'settings.consentOpen': 'Offen',
  'settings.exportMyData': 'Meine Daten exportieren',
  'settings.privacyPolicy': 'Datenschutzerklärung',
  'settings.helpSupport': 'Hilfe & Support',
  'settings.resetAllData': 'Alle Daten zurücksetzen',
  'settings.signOut': 'Abmelden',
  'settings.deleteAccount': 'Account löschen',
  'settings.unknownAccount': 'unbekannter Account',
  // settings flows (alerts / confirms)
  'settings.syncDone':
    'Sync abgeschlossen: {activities} Aktivitäten und {days} Tage Gesundheitsdaten geladen.',
  'settings.disconnectConfirm':
    'Verbindung löschen und alle Garmin-Daten aus der lokalen DB entfernen?',
  'settings.resetDone':
    'Zurückgesetzt: Athlete-Profil, Garmin-Daten und Verbindung wurden gelöscht.',
  'settings.resetFailed': 'Reset fehlgeschlagen',
  'settings.resetFailedWith': 'Reset fehlgeschlagen: {message}',
  'settings.resetConfirm':
    'Dies löscht dein Athlete-Profil, alle synchronisierten Garmin-Daten und die Garmin-Verbindung. Deine Anmeldung bleibt erhalten. Fortfahren?',
  'settings.exportFailed': 'Export fehlgeschlagen',
  'settings.exportFailedWith': 'Export fehlgeschlagen: {message}',
  'settings.withdrawConsentConfirm':
    'Ohne Einwilligung kann Athletly deine Gesundheitsdaten nicht mehr verarbeiten und dich nicht coachen. Du wirst zum Einwilligungsbildschirm geleitet. Widerrufen?',
  'settings.withdrawFailed': 'Widerruf fehlgeschlagen. Bitte erneut versuchen.',
  'settings.deleteFailed': 'Löschung fehlgeschlagen',
  'settings.deleteFailedWith': 'Löschung fehlgeschlagen: {message}',
  'settings.deleteConfirm':
    'Dies löscht deinen Account und ALLE Daten unwiderruflich: Profil, Trainings- und Gesundheitsdaten, Pläne und Garmin-Verbindung. Dies kann nicht rückgängig gemacht werden. Endgültig löschen?',
  'settings.signOutConfirm': 'Aktuelle Session beenden?',

  // --- profile header ------------------------------------------------------
  'profileHeader.memberSince': 'Mitglied seit {date}',

  // --- service status ------------------------------------------------------
  'serviceStatus.lastSync': 'Letzte Sync: {time}',

  // --- garmin connect modal ------------------------------------------------
  'garmin.titleCredentials': 'Garmin Connect',
  'garmin.titleMfa': 'Code eingeben',
  'garmin.credentialsBody': 'Melde dich mit deinem Garmin Connect Konto an.',
  'garmin.emailLabel': 'E-Mail',
  'garmin.emailPlaceholder': 'garmin@example.com',
  'garmin.passwordLabel': 'Passwort',
  'garmin.passwordPlaceholder': 'Passwort',
  'garmin.connect': 'Verbinden',
  'garmin.mfaBody': 'Garmin hat einen Code an dein Gerät oder deine E-Mail geschickt.',
  'garmin.mfaLabel': '6-stelliger Code',
  'garmin.confirm': 'Bestätigen',
  'garmin.errorCredentialsRequired': 'E-Mail und Passwort sind erforderlich.',
  'garmin.errorConnectFailed': 'Verbindung fehlgeschlagen.',
  'garmin.errorCodeRequired': 'Code eingeben.',
  'garmin.errorSessionExpired': 'Login-Session abgelaufen, bitte neu starten.',
  'garmin.errorMfaFailed': 'MFA fehlgeschlagen.',
  'garmin.statusLoadFailed': 'Status konnte nicht geladen werden',
  'garmin.syncFailed': 'Sync fehlgeschlagen',
  'garmin.disconnectFailed': 'Trennen fehlgeschlagen',

  // --- athlete profile -----------------------------------------------------
  'athleteProfile.title': 'Wie Athletly dich sieht',
  'athleteProfile.subtitle': 'Was Ohm dauerhaft über dich weiß',
  'athleteProfile.emptyBanner':
    'Ohm kennt dich noch nicht. Sobald du im Chat über dich erzählst, füllen sich diese Sections automatisch.',
  'athleteProfile.sectionEmpty':
    'Noch nichts erfasst. Erzähl Ohm im Chat davon - er speichert wichtige Dinge automatisch hier ab.',
  'athleteProfile.loadFailed': 'Profil konnte nicht geladen werden',
  // section names (must match backend section names used as keys)
  'athleteProfile.section.why.title': 'Warum ich trainiere',
  'athleteProfile.section.why.hint': 'Motivation, Ziele, Identität',
  'athleteProfile.section.sports.title': 'Sportarten & Rollen',
  'athleteProfile.section.sports.hint': 'Disziplinen, Wettkämpfe, Rollen',
  'athleteProfile.section.nonNegotiable.title': 'Nicht verhandelbar (Leben & Kontext)',
  'athleteProfile.section.nonNegotiable.hint': 'Familie, Job, Schlaf, harte Constraints',
  'athleteProfile.section.response.title': 'Wie ich auf Belastung reagiere',
  'athleteProfile.section.response.hint': 'Erholungsmuster, Verletzungen, Sensibilität',
  'athleteProfile.section.history.title': 'Geschichte & Erfahrung',
  'athleteProfile.section.history.hint': 'Trainingsjahre, Bestzeiten, Erfolge',
  'athleteProfile.section.coaching.title': 'Coaching-Stil & Präferenzen',
  'athleteProfile.section.coaching.hint': 'Tonalität, Sprache, Feedback-Stil',

  // --- synced data ---------------------------------------------------------
  'syncedData.title': 'Synced Data',
  'syncedData.activities': 'Aktivitäten',
  'syncedData.health': 'Gesundheit',
  'syncedData.daysUnit': 'Tage',
  'syncedData.countActivities': '{count} Aktivitäten',
  'syncedData.countDays': '{count} Tage',
  'syncedData.all': 'Alle',
  'syncedData.empty': 'Keine Daten. Verbinde Garmin und starte einen Sync in den Einstellungen.',
  'syncedData.cat.sleep': 'Schlaf',
  'syncedData.cat.recovery': 'Recovery',
  'syncedData.cat.hrv': 'HRV',
  'syncedData.cat.rhr': 'Ruhe-HF',
  'syncedData.cat.body_battery': 'Body Battery',
  'syncedData.cat.stress': 'Stress',
  'syncedData.cat.spo2': 'SpO2',
  'syncedData.cat.steps': 'Schritte',
  'syncedData.loadFailedActivities': 'Aktivitäten konnten nicht geladen werden',
  'syncedData.loadFailedMetrics': 'Gesundheitsdaten konnten nicht geladen werden',

  // --- activity detail -----------------------------------------------------
  'activity.keyMetrics': 'Kennzahlen',
  'activity.details': 'Details',
  'activity.duration': 'Dauer',
  'activity.distance': 'Distanz',
  'activity.pace': 'Pace',
  'activity.hr': 'HF',
  'activity.maxHr': 'Max HF',
  'activity.calories': 'Kalorien',
  'activity.elevationGain': 'Aufstieg',
  'activity.trainingEffect': 'Training Effect',
  'activity.loadFailed': 'Activity konnte nicht geladen werden',
  // extra labels
  'activity.extra.training_effect_aerobic': 'Aerober Effekt',
  'activity.extra.training_effect_anaerobic': 'Anaerober Effekt',
  'activity.extra.training_effect_label': 'Effekt',
  'activity.extra.avg_cadence': 'Trittfrequenz',
  'activity.extra.max_cadence': 'Max Trittfreq.',
  'activity.extra.avg_power_w': 'Power',
  'activity.extra.max_power_w': 'Max Power',
  'activity.extra.normalized_power_w': 'Norm. Power',
  'activity.extra.avg_stride_length_m': 'Schrittlänge',
  'activity.extra.avg_vertical_oscillation': 'Vert. Osz.',
  'activity.extra.avg_ground_contact_ms': 'Bodenkontakt',
  'activity.extra.elevation_loss_m': 'Abstieg',
  'activity.extra.min_elevation_m': 'Min Höhe',
  'activity.extra.max_elevation_m': 'Max Höhe',
  'activity.extra.moving_duration_s': 'Bewegungszeit',
  'activity.extra.lap_count': 'Runden',
  'activity.extra.steps': 'Schritte',
  'activity.extra.min_temperature_c': 'Min Temp',
  'activity.extra.max_temperature_c': 'Max Temp',
  'activity.extra.device': 'Gerät',
  'activity.extra.location': 'Ort',

  // --- health detail / cards ----------------------------------------------
  'health.dayTitle': 'Tagesdetails',
  'health.noDataDay': 'Keine Daten für diesen Tag.',
  'health.noValuesDay': 'Keine Werte für diesen Tag.',
  'health.sleepPhases': 'Schlafphasen',
  'health.sleepScore': 'Schlaf-Score',
  'health.totalSleep': 'Gesamt {duration}',
  'health.dailyValues': 'Tageswerte',
  'health.sleep': 'Schlaf',
  'health.phaseDeep': 'Tief',
  'health.phaseLight': 'Leicht',
  'health.phaseRem': 'REM',
  'health.phaseAwake': 'Wach',
  'health.recovery': 'Recovery',
  'health.hrv': 'HRV',
  'health.rhr': 'Ruhe-HF',
  'health.bodyBattery': 'Body Battery',
  'health.stress': 'Stress',
  'health.spo2': 'SpO2',
  'health.respiration': 'Atmung',
  'health.vo2max': 'VO2max',
  'health.steps': 'Schritte',
  'health.intensity': 'Intensität',
  'health.activeKcal': 'Aktiv kcal',
  'health.totalKcal': 'Gesamt kcal',

  // --- relative time -------------------------------------------------------
  'time.justNow': 'Gerade eben',
  'time.minutesAgo': 'Vor {n} Min.',
  'time.hoursAgo': 'Vor {n} Std.',
  'time.daysAgoOne': 'Vor {n} Tag',
  'time.daysAgoMany': 'Vor {n} Tagen',

  // --- sport labels --------------------------------------------------------
  'sport.running': 'Laufen',
  'sport.trail_running': 'Trail',
  'sport.treadmill_running': 'Laufband',
  'sport.track_running': 'Bahn',
  'sport.indoor_running': 'Laufband',
  'sport.cycling': 'Radfahren',
  'sport.road_biking': 'Rennrad',
  'sport.mountain_biking': 'Mountainbike',
  'sport.gravel_cycling': 'Gravel',
  'sport.indoor_cycling': 'Indoor Bike',
  'sport.virtual_ride': 'Virtual Ride',
  'sport.swimming': 'Schwimmen',
  'sport.lap_swimming': 'Bahnen',
  'sport.open_water_swimming': 'Freiwasser',
  'sport.gym': 'Gym',
  'sport.strength': 'Kraft',
  'sport.strength_training': 'Kraft',
  'sport.indoor_cardio': 'Cardio',
  'sport.yoga': 'Yoga',
  'sport.pilates': 'Pilates',
  'sport.hiking': 'Wandern',
  'sport.walking': 'Gehen',

  // --- plan grammar (intents, roles, targets, group modes) -----------------
  'intent.recovery': 'Erholung',
  'intent.aerobic_base': 'Grundlage',
  'intent.tempo': 'Tempo',
  'intent.threshold': 'Schwelle',
  'intent.vo2max': 'VO2max',
  'intent.strength': 'Kraft',
  'intent.skill': 'Technik',
  'intent.competition': 'Wettkampf',
  'role.warmup': 'Aufwärmen',
  'role.work': 'Belastung',
  'role.recovery': 'Erholung',
  'role.rest': 'Pause',
  'role.cooldown': 'Auslaufen',
  'target.reps': '{amount} Wdh',
  'target.open': 'offen',
  'group.forTimeCap': 'Auf Zeit (Cap {minutes} min)',
  'group.forTime': 'Auf Zeit',

  // --- demo content (seed profile + plan + scripted chat) ------------------
  // Profile sections reuse the athleteProfile.section.* titles as keys.
  'demoContent.profile.why':
    'Halbmarathon in 1:35 in ~10 Wochen. Mittelfristig sub-1:30. Dabei gesund und konsistent bleiben, nicht ausbrennen.',
  'demoContent.profile.sports':
    'Läuft seit 4 Jahren, aktuell 4x pro Woche, ~45 km Wochenvolumen. Letzte 10k-Bestzeit 42:10. Hat schon zwei Halbmarathons finished (beste Zeit 1:41).',
  'demoContent.profile.nonNegotiable':
    'Mo/Mi/Fr morgens vor der Arbeit (~60 min), Sonntag für den langen Lauf (bis 2 Std). Dienstag/Donnerstag eher Ruhe oder Krafttraining.',
  'demoContent.profile.response':
    'Leichte Probleme mit der rechten Achillessehne in der Vergangenheit. Reagiert empfindlich auf zu schnelle Umfangsteigerungen. Sonst keine Einschränkungen.',
  'demoContent.profile.coaching':
    'Mag strukturierte Intervalle und klare Pace-Vorgaben. Läuft am liebsten morgens. Mag keine reinen Tempoläufe ohne Aufwärmen.',
  // plan
  'demoContent.plan.rationale':
    'Aufbaublock für deinen Halbmarathon in ~10 Wochen. Zwei harte Einheiten pro Woche (Schwelle + langer Lauf), der Rest locker, plus eine Krafteinheit für die Achillessehne. Umfang steigt kontrolliert um ~8% pro Woche.',
  'demoContent.plan.coach1':
    'Solide Aufbauwoche. Der Fokus liegt auf der Schwelle am Mittwoch und einem ruhigen langen Lauf am Sonntag. Halte die lockeren Läufe wirklich locker.',
  'demoContent.plan.coach2':
    'Leichte Steigerung im Umfang. Wir verlängern den langen Lauf auf 20 km und halten die Intensität bei einer harten Einheit, damit die Achillessehne mitkommt.',
  'demoContent.plan.restReason': 'Ruhetag / aktive Erholung',
  'demoContent.plan.easyRun': 'Lockerer Dauerlauf',
  'demoContent.plan.easyRunStrides': 'Lockerer Dauerlauf mit Steigerungen',
  'demoContent.plan.longRun': 'Langer Lauf {km} km',
  'demoContent.plan.intervals': 'Schwellen-Intervalle 4x1500m',
  'demoContent.plan.strength': 'Lauf-Kraft & Stabi',
  'demoContent.plan.labelContinuous': 'Dauerlauf',
  'demoContent.plan.labelWarmup': 'Warmup',
  'demoContent.plan.labelThreshold': '4x 1500m @ Schwelle',
  'demoContent.plan.labelCooldown': 'Cooldown',
  'demoContent.plan.labelLongRun': 'Long Run',
  'demoContent.plan.labelStrengthCircuit': 'Kraftzirkel',
  'demoContent.plan.noteEasy': 'Locker und gleichmäßig, Gesprächstempo.',
  'demoContent.plan.noteWarmup': 'Locker einlaufen + 3 Steigerungen.',
  'demoContent.plan.noteThreshold': 'Kontrolliert hart, gleichmäßig.',
  'demoContent.plan.noteRecovery': 'Trabpause.',
  'demoContent.plan.noteCooldown': 'Locker auslaufen.',
  'demoContent.plan.noteLongRun': 'Aerobe Ausdauer, letzte 3 km leicht progressiv.',
  'demoContent.plan.moveSquat': 'Kniebeuge',
  'demoContent.plan.moveLunge': 'Ausfallschritte',
  'demoContent.plan.movePlank': 'Plank',
  'demoContent.plan.notePerSide': 'Pro Seite.',
  // scripted chat
  'demoContent.chat.welcome':
    'Hey, ich bin Ohm, dein Coach. Schön dass du da bist. Ich sehe deine Garmin-Daten und dein Profil sind verbunden: Halbmarathon-Ziel in rund 10 Wochen, aktuell ~45 km die Woche. Frag mich was zu deinem Training, deiner Erholung oder deinem Plan. Zum Beispiel: "Wie sieht meine Woche aus?" oder "Bin ich heute bereit für ein hartes Intervalltraining?"',
  'demoContent.chat.readiness.status': 'Schaut sich deine Daten an',
  'demoContent.chat.readiness.metricsResult': 'HRV 68ms, RHR 48, Schlaf 82, Recovery 78',
  'demoContent.chat.readiness.loadResult': 'Diese Woche 42 km, letzte Woche 39 km (+8%)',
  'demoContent.chat.readiness.text1':
    'Du bist heute gut erholt. Deine HRV liegt bei 68 ms (im oberen Bereich deiner letzten Wochen), die Ruhe-HF bei 48 und dein Recovery-Score bei 78. Der Schlaf war mit 82 solide. ',
  'demoContent.chat.readiness.text2':
    'Dein Wochenvolumen ist mit +8% gegenüber letzter Woche kontrolliert gestiegen. Kurz: grünes Licht für eine harte Einheit. Wenn du heute die Schwellen-Intervalle machst, halte die Pausen wirklich locker (<140 bpm), damit die Achillessehne nicht überreizt wird.',
  'demoContent.chat.plan.statusThinking': 'Denkt nach',
  'demoContent.chat.plan.profileResult': 'Ziel: HM 1:35, 4x/Woche, Achillessehne empfindlich',
  'demoContent.chat.plan.statusStartSpecialist': 'Startet den Plan-Spezialisten',
  'demoContent.chat.plan.taskLabel': '2-Wochen-Block HM-Aufbau',
  'demoContent.chat.plan.statusPlanWorking': 'plan-Agent arbeitet',
  'demoContent.chat.plan.searchResult': '6 Läufe, letzter 9.8 km @ 5:31/km',
  'demoContent.chat.plan.loadResult': 'Schnitt 41 km/Woche, stabil',
  'demoContent.chat.plan.statusEvaluate': 'Lässt den Plan bewerten',
  'demoContent.chat.plan.evalResult': 'OK: Umfangsteigerung 8%, 1 harte Einheit/Woche, Score 0.86',
  'demoContent.chat.plan.submitResult': 'Plan gespeichert (2 Wochen, 10 Einheiten)',
  'demoContent.chat.plan.specialistDone': 'Plan-Spezialist fertig',
  'demoContent.chat.plan.text1':
    'Fertig. Ich habe dir einen 2-Wochen-Block gebaut, den du jetzt im Plan-Tab siehst. ',
  'demoContent.chat.plan.text2':
    'Der Aufbau: zwei Schlüsseleinheiten pro Woche (Schwellen-Intervalle am Mittwoch, langer Lauf am Sonntag), dazu zwei lockere Dauerläufe und eine Krafteinheit für die Achillessehne. ',
  'demoContent.chat.plan.text3':
    'Der Umfang steigt von 18 auf 20 km im langen Lauf und insgesamt um rund 8% pro Woche, also bewusst konservativ wegen der Sehne. Schau ihn dir an und sag mir, wenn du etwas verschieben willst.',
} as const;

export type MessageKey = keyof typeof de;
export type Messages = Record<MessageKey, string>;
