'use client';
// SPDX-License-Identifier: MIT

/**
 * Web stand-in for React Native's Alert.alert. The mobile app uses native
 * alerts for confirmations and notices; on the web we map those to the browser
 * confirm/alert dialogs so the flows (sign out, delete, withdraw consent, sync
 * result, ...) behave the same. Returns true when the user confirms.
 */
export function confirmAction(message: string): boolean {
  if (typeof window === 'undefined') return false;
  return window.confirm(message);
}

export function notify(message: string): void {
  if (typeof window === 'undefined') return;
  window.alert(message);
}
