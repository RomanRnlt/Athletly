// SPDX-License-Identifier: MIT
// Demo mode flag + seed/scripted-data exports.
//
// DEMO_MODE turns the web app into a fully self-contained public showcase:
// no backend, no Supabase project, no API key. Every use-* hook short-circuits
// to seed data and the chat replays a scripted coaching conversation.
//
// Default OFF: with NEXT_PUBLIC_DEMO_MODE unset the app behaves exactly as
// before (real Supabase auth + services/api backend). This keeps Roman's
// personal/local dev path untouched.

/** Single source of truth for whether the app runs in the no-backend showcase mode. */
export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

export * from './seed';
export * from './script';
export { buildDemoProfile, buildDemoPlan } from './content';
