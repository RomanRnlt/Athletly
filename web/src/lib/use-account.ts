'use client';

// Web port of mobile/lib/use-account.ts. The export uses a browser file
// download (Blob + anchor) instead of the native Share sheet; the delete flow
// is identical.
import { apiDelete, apiGet } from './api';
import { signOut } from './use-auth';

/**
 * Fetch the full account data export (GDPR Art. 20) and trigger a JSON file
 * download in the browser.
 */
export async function exportAccountData(): Promise<void> {
  const data = await apiGet<Record<string, unknown>>('/account/export');
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'athletly-datenexport.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Irreversibly delete the account and all its data (GDPR Art. 17), then sign
 * out locally so the auth listener routes the user back to /login.
 */
export async function deleteAccount(): Promise<void> {
  await apiDelete('/account');
  await signOut();
}
