// SPDX-License-Identifier: MIT
import { Share } from 'react-native';
import { apiDelete, apiGet } from './api';
import { signOut } from './use-auth';

/**
 * Fetch the full account data export (GDPR Art. 20) and hand it to the native
 * share sheet so the user can save or send their data.
 *
 * Note: this shares the JSON as text via the OS share sheet. A file-based
 * export (expo-file-system + expo-sharing) is the planned polish step; see the
 * compliance TODO.
 */
export async function exportAccountData(): Promise<void> {
  const data = await apiGet<Record<string, unknown>>('/account/export');
  const json = JSON.stringify(data, null, 2);
  await Share.share({
    title: 'Athletly Datenexport',
    message: json,
  });
}

/**
 * Irreversibly delete the account and all its data (GDPR Art. 17), then sign
 * out locally so the auth listener routes the user back to /login.
 */
export async function deleteAccount(): Promise<void> {
  await apiDelete('/account');
  await signOut();
}
