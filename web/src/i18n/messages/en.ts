// SPDX-License-Identifier: MIT
// English message catalog. Mirrors the key set defined in de.ts exactly.
import type { Messages } from './de';

export const en: Messages = {
  // --- generic / shared ----------------------------------------------------
  'common.loading': 'Loading',
  'common.refresh': 'Refresh',
  'common.back': 'Back',
  'common.close': 'Close',
  'common.confirm': 'Confirm',
  'common.connect': 'Connect',
  'common.disconnect': 'Disconnect',
  'common.connected': 'Connected',
  'common.notConnected': 'Not connected',
  'common.on': 'On',
  'common.unknownError': 'Unknown error.',
  'common.showPassword': 'Show password',
  'common.hidePassword': 'Hide password',

  // --- app meta ------------------------------------------------------------
  'app.name': 'Athletly',
  'app.tagline': 'Your coach. Your data. Your plan.',

  // --- demo banner ---------------------------------------------------------
  'demo.banner': 'Demo mode · no live LLM connected · responses are pre-scripted',
  'demo.consentDisabled': 'Demo mode: consent settings are disabled in this demo.',
  'demo.resetDisabled': 'Demo mode: resetting your data is disabled in this demo.',
  'demo.exportDisabled': 'Demo mode: data export is disabled in this public demo.',
  'demo.deleteDisabled': 'Demo mode: deleting your account is disabled in this public demo.',

  // --- navigation ----------------------------------------------------------
  'nav.plan': 'Plan',
  'nav.chat': 'Chat',
  'nav.settings': 'Settings',
  'nav.viewProfile': 'View profile',
  'nav.athleteFallback': 'Athlete',

  // --- login ---------------------------------------------------------------
  'login.welcome': 'Welcome',
  'login.subtitle': 'Sign in or create an account.',
  'login.withApple': 'Sign in with Apple',
  'login.withGoogle': 'Sign in with Google',
  'login.or': 'or',
  'login.withEmail': 'Sign in with email',
  'login.noAccount': "Don't have an account? Create one",
  'login.haveAccount': 'Already have an account? Sign in',
  'login.signIn': 'Sign in',
  'login.createAccount': 'Create account',
  'login.emailLabel': 'Email',
  'login.emailPlaceholder': 'you@example.com',
  'login.passwordLabel': 'Password',
  'login.passwordPlaceholder': 'At least 6 characters',
  'login.errorCredentialsRequired': 'Email and password are required.',
  'login.errorSignInFailed': 'Sign-in failed',
  'login.appleProvider': 'Apple sign-in',
  'login.googleProvider': 'Google sign-in',
  'login.providerFailed': '{provider} failed',

  // --- consent -------------------------------------------------------------
  'consent.title': 'Your data, your control',
  'consent.subtitle': 'Before we start, we need your consent.',
  'consent.healthTitle': 'Health and training data',
  'consent.healthBody':
    'Athletly processes your training and health data (e.g. heart rate, HRV, sleep, recovery) to coach you individually. These are special categories of personal data under Art. 9 GDPR.',
  'consent.aiTitle': 'AI analysis (Anthropic, USA)',
  'consent.aiBody':
    'For coaching analysis, relevant data is transferred to our AI provider Anthropic in the USA. The transfer is safeguarded by the EU-US Data Privacy Framework and a data processing agreement. Your data is not used to train the AI models.',
  'consent.revokeTitle': 'Revocable at any time',
  'consent.revokeBody':
    'You can withdraw this consent at any time in Settings and have your data exported or completely deleted.',
  'consent.agree': 'Agree and get started',
  'consent.notNow': 'Not now',
  'consent.fineprint':
    'By tapping "Agree" you consent to the processing of your health data for AI-assisted training analysis and the related transfer to the USA.',
  'consent.saveFailed': 'Consent could not be saved. Please try again.',
  'consent.declineConfirm':
    'Without your consent, Athletly cannot process your health data or coach you. You will be signed out.',
  'consent.loadFailed': 'Consent status could not be loaded',

  // --- paywall -------------------------------------------------------------
  'paywall.title': 'Athletly Pro',
  'paywall.subtitle': 'More coaching, more plans, more from your data.',
  'paywall.benefit1': 'Significantly more AI coaching per month',
  'paywall.benefit2': 'Unlimited training plans',
  'paywall.benefit3': 'Deep analyses of your health data',
  'paywall.benefit4': 'Early access to new features',
  'paywall.ctaBuy': 'Pro - {price} / month',
  'paywall.ctaRestore': 'Restore purchases',
  'paywall.fineprint':
    'Purchases are not active in the web version. Use the mobile app for the Pro upgrade.',
  'paywall.buyNotice':
    'Purchases are not available in the web version. Please upgrade to Pro in the mobile app.',
  'paywall.restoreNotice': 'Restoring purchases is only available in the mobile app.',

  // --- plan ----------------------------------------------------------------
  'plan.title': 'Training plan',
  'plan.subtitleDraft': 'Draft - confirm in chat',
  'plan.subtitleActive': 'Your active plan',
  'plan.emptyTitle': 'No training plan yet',
  'plan.emptyBody':
    'Tell Ohm in the chat that you want a plan. He researches and builds you a science-based 2-week plan that you can then adjust together with him.',
  'plan.calendarWeek': 'CW {week} · Week {current}/{total}',
  'plan.restDay': 'Rest day',
  'plan.today': 'Today',
  'plan.loadFailed': 'Plan could not be loaded',
  'plan.weekRangeSameMonth': '{start} - {end} {month}',
  'plan.weekRangeCrossMonth': '{start} {startMonth} - {end} {endMonth}',

  // --- rest day card -------------------------------------------------------
  'restDay.title': 'Rest day',
  'restDay.body': 'Recovery is just as important as training. Enjoy the day.',

  // --- session card --------------------------------------------------------
  'session.done': 'Done',
  'session.approxDuration': '~ {duration}',

  // --- weekly summary ------------------------------------------------------
  'weeklySummary.title': 'Weekly overview',
  'weeklySummary.countOnly': '{count} sessions',
  'weeklySummary.countWithDuration': '{count} sessions / ~ {duration}',
  'weeklySummary.timesSuffix': '{count}x',

  // --- chat ----------------------------------------------------------------
  'chat.title': 'Chat',
  'chat.creditLimitTitle': 'AI limit reached',
  'chat.creditLimitBody': "You've used up your quota. Tap to upgrade to Pro.",
  'chat.upgradeAria': 'Upgrade to Pro',
  'chat.emptyWelcomeTitle': 'Welcome!',
  'chat.emptyHiTitle': 'Hi.',
  'chat.emptyOnboarding':
    'Say "Hi" to Ohm so he can get to know you. He\'ll ask you a few things about you and your training so he can coach you properly afterwards.',
  'chat.emptyDefault':
    'Ask me anything about your training, your sleep, or your weekly volume. If your Garmin data is connected, I can pull concrete numbers.',
  'chat.subtitleTool': '{status}...',
  'chat.subtitleStreaming': 'Ohm is typing...',
  'chat.subtitleOnboarding': 'Intro conversation in progress',
  'chat.subtitleOnline': 'Ohm is online',
  'chat.thinking': 'Thinking...',
  'chat.inputPlaceholder': 'Message...',
  'chat.voiceInput': 'Voice input',
  'chat.sendMessage': 'Send message',
  'chat.connectionFailed': '[Connection to server failed]',

  // --- onboarding bar ------------------------------------------------------
  'onboarding.title': 'Intro conversation with Ohm',

  // --- live activity / show work ------------------------------------------
  'liveActivity.working': 'Working…',
  'liveActivity.agentPlan': 'Plan agent',
  'liveActivity.agentEvaluator': 'Evaluator',
  'showWork.toolsUsed': 'Tools used ({count})',
  'showWork.expand': 'Expand tool list',
  'showWork.collapse': 'Collapse tool list',

  // --- tool labels (chat "show work") --------------------------------------
  'tool.search_activities': 'Searching your activities',
  'tool.get_activity_details': 'Taking a closer look at a workout',
  'tool.get_daily_metrics': 'Reading your health data',
  'tool.get_weekly_load': 'Calculating your weekly volume',
  'tool.web_search': 'Researching on the web',
  'tool.read_athlete_profile': 'Reading your profile',
  'tool.update_athlete_section': 'Updating your profile',
  'tool.run_specialist': 'Starting a specialist agent',
  'tool.evaluate_plan': 'Having the plan evaluated',
  'tool.submit_plan': 'Finalizing the plan',
  'tool.submit_evaluation': 'Submitting the evaluation',
  'tool.get_current_plan': 'Reading your plan',
  'tool.update_plan': 'Adjusting the plan',
  'tool.confirm_plan': 'Activating the plan',
  'tool.fallback': 'Calling {name}',

  // --- settings ------------------------------------------------------------
  'settings.title': 'Settings',
  'settings.howAthletlySeesYou': 'How Athletly sees you',
  'settings.sectionServices': 'Connected services',
  'settings.sectionSettings': 'Settings',
  'settings.sectionAiUsage': 'AI usage',
  'settings.sectionPrivacy': 'Privacy & GDPR',
  'settings.sectionAccount': 'Account',
  'settings.appleHealth': 'Apple Health',
  'settings.appleHealthNotImplemented': 'Apple Health: Not yet implemented.',
  'settings.syncedData': 'Synced Data',
  'settings.syncedDataAria': 'View synced data',
  'settings.syncedSummary': '{count} activities · {sync}',
  'settings.neverSynced': 'Never synced',
  'settings.sync': 'Sync',
  'settings.syncing': 'Syncing...',
  'settings.notifications': 'Notifications',
  'settings.language': 'Language',
  'settings.languageGerman': 'German',
  'settings.languageEnglish': 'English',
  'settings.appearance': 'Appearance',
  'settings.appearanceLight': 'Light',
  'settings.usageLoadFailed': 'Usage could not be loaded',
  'settings.aiCredits': 'AI credits',
  'settings.creditsUsed': '{used} used',
  'settings.creditsUsedOfLimit': '{used} / {limit}',
  'settings.reset': 'Reset',
  'settings.resetOn': 'on {date}',
  'settings.upgradeToPro': 'Upgrade to Pro',
  'settings.grandfatherNote': 'Unlimited access (grandfathered).',
  'settings.consentHealthData': 'Health data consent',
  'settings.consentGranted': 'Granted',
  'settings.consentOpen': 'Pending',
  'settings.exportMyData': 'Export my data',
  'settings.privacyPolicy': 'Privacy policy',
  'settings.helpSupport': 'Help & support',
  'settings.resetAllData': 'Reset all data',
  'settings.signOut': 'Sign out',
  'settings.deleteAccount': 'Delete account',
  'settings.unknownAccount': 'unknown account',
  // settings flows (alerts / confirms)
  'settings.syncDone':
    'Sync complete: loaded {activities} activities and {days} days of health data.',
  'settings.disconnectConfirm':
    'Delete the connection and remove all Garmin data from the local DB?',
  'settings.resetDone':
    'Reset done: athlete profile, Garmin data, and connection have been deleted.',
  'settings.resetFailed': 'Reset failed',
  'settings.resetFailedWith': 'Reset failed: {message}',
  'settings.resetConfirm':
    'This deletes your athlete profile, all synced Garmin data, and the Garmin connection. Your login stays intact. Continue?',
  'settings.exportFailed': 'Export failed',
  'settings.exportFailedWith': 'Export failed: {message}',
  'settings.withdrawConsentConfirm':
    'Without consent, Athletly can no longer process your health data or coach you. You will be taken to the consent screen. Withdraw?',
  'settings.withdrawFailed': 'Withdrawal failed. Please try again.',
  'settings.deleteFailed': 'Deletion failed',
  'settings.deleteFailedWith': 'Deletion failed: {message}',
  'settings.deleteConfirm':
    'This irreversibly deletes your account and ALL data: profile, training and health data, plans, and Garmin connection. This cannot be undone. Delete permanently?',
  'settings.signOutConfirm': 'End the current session?',

  // --- profile header ------------------------------------------------------
  'profileHeader.memberSince': 'Member since {date}',

  // --- service status ------------------------------------------------------
  'serviceStatus.lastSync': 'Last sync: {time}',

  // --- garmin connect modal ------------------------------------------------
  'garmin.titleCredentials': 'Garmin Connect',
  'garmin.titleMfa': 'Enter code',
  'garmin.credentialsBody': 'Sign in with your Garmin Connect account.',
  'garmin.emailLabel': 'Email',
  'garmin.emailPlaceholder': 'garmin@example.com',
  'garmin.passwordLabel': 'Password',
  'garmin.passwordPlaceholder': 'Password',
  'garmin.connect': 'Connect',
  'garmin.mfaBody': 'Garmin sent a code to your device or email.',
  'garmin.mfaLabel': '6-digit code',
  'garmin.confirm': 'Confirm',
  'garmin.errorCredentialsRequired': 'Email and password are required.',
  'garmin.errorConnectFailed': 'Connection failed.',
  'garmin.errorCodeRequired': 'Enter the code.',
  'garmin.errorSessionExpired': 'Login session expired, please restart.',
  'garmin.errorMfaFailed': 'MFA failed.',
  'garmin.statusLoadFailed': 'Status could not be loaded',
  'garmin.syncFailed': 'Sync failed',
  'garmin.disconnectFailed': 'Disconnect failed',

  // --- athlete profile -----------------------------------------------------
  'athleteProfile.title': 'How Athletly sees you',
  'athleteProfile.subtitle': 'What Ohm permanently knows about you',
  'athleteProfile.emptyBanner':
    "Ohm doesn't know you yet. As soon as you tell him about yourself in the chat, these sections fill in automatically.",
  'athleteProfile.sectionEmpty':
    'Nothing captured yet. Tell Ohm about it in the chat - he saves important things here automatically.',
  'athleteProfile.loadFailed': 'Profile could not be loaded',
  // section names (must match backend section names used as keys)
  'athleteProfile.section.why.title': 'Why I train',
  'athleteProfile.section.why.hint': 'Motivation, goals, identity',
  'athleteProfile.section.sports.title': 'Sports & roles',
  'athleteProfile.section.sports.hint': 'Disciplines, competitions, roles',
  'athleteProfile.section.nonNegotiable.title': 'Non-negotiable (life & context)',
  'athleteProfile.section.nonNegotiable.hint': 'Family, job, sleep, hard constraints',
  'athleteProfile.section.response.title': 'How I respond to load',
  'athleteProfile.section.response.hint': 'Recovery patterns, injuries, sensitivity',
  'athleteProfile.section.history.title': 'History & experience',
  'athleteProfile.section.history.hint': 'Years training, personal bests, achievements',
  'athleteProfile.section.coaching.title': 'Coaching style & preferences',
  'athleteProfile.section.coaching.hint': 'Tone, language, feedback style',

  // --- synced data ---------------------------------------------------------
  'syncedData.title': 'Synced Data',
  'syncedData.activities': 'Activities',
  'syncedData.health': 'Health',
  'syncedData.daysUnit': 'days',
  'syncedData.countActivities': '{count} activities',
  'syncedData.countDays': '{count} days',
  'syncedData.all': 'All',
  'syncedData.empty': 'No data. Connect Garmin and start a sync in Settings.',
  'syncedData.cat.sleep': 'Sleep',
  'syncedData.cat.recovery': 'Recovery',
  'syncedData.cat.hrv': 'HRV',
  'syncedData.cat.rhr': 'Resting HR',
  'syncedData.cat.body_battery': 'Body Battery',
  'syncedData.cat.stress': 'Stress',
  'syncedData.cat.spo2': 'SpO2',
  'syncedData.cat.steps': 'Steps',
  'syncedData.loadFailedActivities': 'Activities could not be loaded',
  'syncedData.loadFailedMetrics': 'Health data could not be loaded',

  // --- activity detail -----------------------------------------------------
  'activity.keyMetrics': 'Key metrics',
  'activity.details': 'Details',
  'activity.duration': 'Duration',
  'activity.distance': 'Distance',
  'activity.pace': 'Pace',
  'activity.hr': 'HR',
  'activity.maxHr': 'Max HR',
  'activity.calories': 'Calories',
  'activity.elevationGain': 'Ascent',
  'activity.trainingEffect': 'Training Effect',
  'activity.loadFailed': 'Activity could not be loaded',
  // extra labels
  'activity.extra.training_effect_aerobic': 'Aerobic effect',
  'activity.extra.training_effect_anaerobic': 'Anaerobic effect',
  'activity.extra.training_effect_label': 'Effect',
  'activity.extra.avg_cadence': 'Cadence',
  'activity.extra.max_cadence': 'Max cadence',
  'activity.extra.avg_power_w': 'Power',
  'activity.extra.max_power_w': 'Max power',
  'activity.extra.normalized_power_w': 'Norm. power',
  'activity.extra.avg_stride_length_m': 'Stride length',
  'activity.extra.avg_vertical_oscillation': 'Vert. osc.',
  'activity.extra.avg_ground_contact_ms': 'Ground contact',
  'activity.extra.elevation_loss_m': 'Descent',
  'activity.extra.min_elevation_m': 'Min elevation',
  'activity.extra.max_elevation_m': 'Max elevation',
  'activity.extra.moving_duration_s': 'Moving time',
  'activity.extra.lap_count': 'Laps',
  'activity.extra.steps': 'Steps',
  'activity.extra.min_temperature_c': 'Min temp',
  'activity.extra.max_temperature_c': 'Max temp',
  'activity.extra.device': 'Device',
  'activity.extra.location': 'Location',

  // --- health detail / cards ----------------------------------------------
  'health.dayTitle': 'Day details',
  'health.noDataDay': 'No data for this day.',
  'health.noValuesDay': 'No values for this day.',
  'health.sleepPhases': 'Sleep phases',
  'health.sleepScore': 'Sleep score',
  'health.totalSleep': 'Total {duration}',
  'health.dailyValues': 'Daily values',
  'health.sleep': 'Sleep',
  'health.phaseDeep': 'Deep',
  'health.phaseLight': 'Light',
  'health.phaseRem': 'REM',
  'health.phaseAwake': 'Awake',
  'health.recovery': 'Recovery',
  'health.hrv': 'HRV',
  'health.rhr': 'Resting HR',
  'health.bodyBattery': 'Body Battery',
  'health.stress': 'Stress',
  'health.spo2': 'SpO2',
  'health.respiration': 'Respiration',
  'health.vo2max': 'VO2max',
  'health.steps': 'Steps',
  'health.intensity': 'Intensity',
  'health.activeKcal': 'Active kcal',
  'health.totalKcal': 'Total kcal',

  // --- relative time -------------------------------------------------------
  'time.justNow': 'Just now',
  'time.minutesAgo': '{n} min ago',
  'time.hoursAgo': '{n} hr ago',
  'time.daysAgoOne': '{n} day ago',
  'time.daysAgoMany': '{n} days ago',

  // --- sport labels --------------------------------------------------------
  'sport.running': 'Running',
  'sport.trail_running': 'Trail',
  'sport.treadmill_running': 'Treadmill',
  'sport.track_running': 'Track',
  'sport.indoor_running': 'Treadmill',
  'sport.cycling': 'Cycling',
  'sport.road_biking': 'Road bike',
  'sport.mountain_biking': 'Mountain bike',
  'sport.gravel_cycling': 'Gravel',
  'sport.indoor_cycling': 'Indoor bike',
  'sport.virtual_ride': 'Virtual ride',
  'sport.swimming': 'Swimming',
  'sport.lap_swimming': 'Lap swimming',
  'sport.open_water_swimming': 'Open water',
  'sport.gym': 'Gym',
  'sport.strength': 'Strength',
  'sport.strength_training': 'Strength',
  'sport.indoor_cardio': 'Cardio',
  'sport.yoga': 'Yoga',
  'sport.pilates': 'Pilates',
  'sport.hiking': 'Hiking',
  'sport.walking': 'Walking',

  // --- plan grammar (intents, roles, targets, group modes) -----------------
  'intent.recovery': 'Recovery',
  'intent.aerobic_base': 'Base',
  'intent.tempo': 'Tempo',
  'intent.threshold': 'Threshold',
  'intent.vo2max': 'VO2max',
  'intent.strength': 'Strength',
  'intent.skill': 'Skill',
  'intent.competition': 'Race',
  'role.warmup': 'Warm-up',
  'role.work': 'Work',
  'role.recovery': 'Recovery',
  'role.rest': 'Rest',
  'role.cooldown': 'Cool-down',
  'target.reps': '{amount} reps',
  'target.open': 'open',
  'group.forTimeCap': 'For time (cap {minutes} min)',
  'group.forTime': 'For time',

  // --- demo content (seed profile + plan + scripted chat) ------------------
  'demoContent.profile.why':
    'Half marathon in 1:35 in ~10 weeks. Mid-term sub-1:30. Stay healthy and consistent, no burnout.',
  'demoContent.profile.sports':
    'Running for 4 years, currently 4x per week, ~45 km weekly volume. Latest 10k PB 42:10. Has finished two half marathons (best time 1:41).',
  'demoContent.profile.nonNegotiable':
    'Mon/Wed/Fri mornings before work (~60 min), Sunday for the long run (up to 2 hrs). Tuesday/Thursday rather rest or strength training.',
  'demoContent.profile.response':
    'Minor issues with the right Achilles tendon in the past. Sensitive to volume increases that are too fast. Otherwise no limitations.',
  'demoContent.profile.coaching':
    'Likes structured intervals and clear pace targets. Prefers running in the morning. Dislikes pure tempo runs without a warm-up.',
  // plan
  'demoContent.plan.rationale':
    'Build block for your half marathon in ~10 weeks. Two hard sessions per week (threshold + long run), the rest easy, plus one strength session for the Achilles. Volume rises in a controlled way by ~8% per week.',
  'demoContent.plan.coach1':
    'Solid build week. The focus is on the threshold on Wednesday and a calm long run on Sunday. Keep the easy runs truly easy.',
  'demoContent.plan.coach2':
    'Slight increase in volume. We extend the long run to 20 km and keep the intensity at one hard session so the Achilles can keep up.',
  'demoContent.plan.restReason': 'Rest day / active recovery',
  'demoContent.plan.easyRun': 'Easy run',
  'demoContent.plan.easyRunStrides': 'Easy run with strides',
  'demoContent.plan.longRun': 'Long run {km} km',
  'demoContent.plan.intervals': 'Threshold intervals 4x1500m',
  'demoContent.plan.strength': 'Running strength & stability',
  'demoContent.plan.labelContinuous': 'Continuous run',
  'demoContent.plan.labelWarmup': 'Warm-up',
  'demoContent.plan.labelThreshold': '4x 1500m @ threshold',
  'demoContent.plan.labelCooldown': 'Cool-down',
  'demoContent.plan.labelLongRun': 'Long run',
  'demoContent.plan.labelStrengthCircuit': 'Strength circuit',
  'demoContent.plan.noteEasy': 'Easy and steady, conversational pace.',
  'demoContent.plan.noteWarmup': 'Easy warm-up jog + 3 strides.',
  'demoContent.plan.noteThreshold': 'Controlled hard, steady.',
  'demoContent.plan.noteRecovery': 'Jog recovery.',
  'demoContent.plan.noteCooldown': 'Easy cool-down jog.',
  'demoContent.plan.noteLongRun': 'Aerobic endurance, last 3 km slightly progressive.',
  'demoContent.plan.moveSquat': 'Squat',
  'demoContent.plan.moveLunge': 'Lunges',
  'demoContent.plan.movePlank': 'Plank',
  'demoContent.plan.notePerSide': 'Per side.',
  // scripted chat
  'demoContent.chat.welcome':
    'Hey, I\'m Ohm, your coach. Glad you\'re here. I can see your Garmin data and profile are connected: half-marathon goal in about 10 weeks, currently ~45 km a week. Ask me anything about your training, your recovery, or your plan. For example: "What does my week look like?" or "Am I ready for a hard interval session today?"',
  'demoContent.chat.readiness.status': 'Looking at your data',
  'demoContent.chat.readiness.metricsResult': 'HRV 68ms, RHR 48, sleep 82, recovery 78',
  'demoContent.chat.readiness.loadResult': 'This week 42 km, last week 39 km (+8%)',
  'demoContent.chat.readiness.text1':
    "You're well recovered today. Your HRV is at 68 ms (in the upper range of your recent weeks), resting HR at 48, and your recovery score at 78. Sleep was solid at 82. ",
  'demoContent.chat.readiness.text2':
    'Your weekly volume rose in a controlled way, +8% over last week. In short: green light for a hard session. If you do the threshold intervals today, keep the recoveries truly easy (<140 bpm) so the Achilles tendon doesn\'t get overloaded.',
  'demoContent.chat.plan.statusThinking': 'Thinking',
  'demoContent.chat.plan.profileResult': 'Goal: HM 1:35, 4x/week, sensitive Achilles',
  'demoContent.chat.plan.statusStartSpecialist': 'Starting the plan specialist',
  'demoContent.chat.plan.taskLabel': '2-week HM build block',
  'demoContent.chat.plan.statusPlanWorking': 'plan agent working',
  'demoContent.chat.plan.searchResult': '6 runs, latest 9.8 km @ 5:31/km',
  'demoContent.chat.plan.loadResult': 'Avg 41 km/week, stable',
  'demoContent.chat.plan.statusEvaluate': 'Having the plan evaluated',
  'demoContent.chat.plan.evalResult': 'OK: 8% volume increase, 1 hard session/week, score 0.86',
  'demoContent.chat.plan.submitResult': 'Plan saved (2 weeks, 10 sessions)',
  'demoContent.chat.plan.specialistDone': 'Plan specialist done',
  'demoContent.chat.plan.text1':
    'Done. I built you a 2-week block that you can now see in the Plan tab. ',
  'demoContent.chat.plan.text2':
    'The structure: two key sessions per week (threshold intervals on Wednesday, long run on Sunday), plus two easy runs and one strength session for the Achilles. ',
  'demoContent.chat.plan.text3':
    'Volume goes from 18 to 20 km on the long run and rises by about 8% per week overall, deliberately conservative because of the tendon. Take a look and tell me if you want to move anything.',
};
