/**
 * Thin RevenueCat wrapper.
 *
 * RevenueCat (react-native-purchases) wraps Apple StoreKit + Google Play
 * Billing. It is a NATIVE module: it only works in a custom dev build / EAS
 * build, NOT in Expo Go. Every call here degrades gracefully (returns
 * unavailable) so the app still runs in Expo Go and in builds where the store
 * products are not yet configured.
 *
 * Setup required before this does anything live (see COMPLIANCE_TODO / payment
 * section): RevenueCat account, App Store Connect + Play Console subscription
 * products, the public SDK keys below, and an entitlement named "pro".
 */
import { Platform } from 'react-native';

const RC_IOS_KEY = process.env.EXPO_PUBLIC_RC_IOS_KEY;
const RC_ANDROID_KEY = process.env.EXPO_PUBLIC_RC_ANDROID_KEY;
const PRO_ENTITLEMENT = 'pro';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Purchases = any;

let purchasesModule: Purchases | null = null;
let configured = false;

function load(): Purchases | null {
  if (purchasesModule) return purchasesModule;
  try {
    // Required lazily so a missing/native-only module never breaks JS startup.
    purchasesModule = require('react-native-purchases').default;
    return purchasesModule;
  } catch {
    return null;
  }
}

export function isPurchasesAvailable(): boolean {
  const key = Platform.OS === 'ios' ? RC_IOS_KEY : RC_ANDROID_KEY;
  return !!load() && !!key;
}

/** Configure the SDK with the signed-in user's account id as the RC app user id. */
export async function configurePurchases(accountId: string): Promise<void> {
  const Purchases = load();
  if (!Purchases) return;
  const key = Platform.OS === 'ios' ? RC_IOS_KEY : RC_ANDROID_KEY;
  if (!key) return;
  try {
    await Purchases.configure({ apiKey: key, appUserID: accountId });
    configured = true;
  } catch {
    configured = false;
  }
}

export interface ProOffering {
  monthlyPriceString: string | null;
  annualPriceString: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  monthlyPackage: any | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  annualPackage: any | null;
}

/** Fetch the current Pro offering's packages + display prices, or null. */
export async function getProOffering(): Promise<ProOffering | null> {
  const Purchases = load();
  if (!Purchases || !configured) return null;
  try {
    const offerings = await Purchases.getOfferings();
    const current = offerings?.current;
    if (!current) return null;
    return {
      monthlyPriceString: current.monthly?.product?.priceString ?? null,
      annualPriceString: current.annual?.product?.priceString ?? null,
      monthlyPackage: current.monthly ?? null,
      annualPackage: current.annual ?? null,
    };
  } catch {
    return null;
  }
}

/**
 * Purchase a package. Returns true when the 'pro' entitlement is active after
 * the purchase. The backend tier flip happens via the RevenueCat webhook; this
 * return value just drives immediate UI feedback.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function purchasePackage(pkg: any): Promise<boolean> {
  const Purchases = load();
  if (!Purchases || !pkg) return false;
  const { customerInfo } = await Purchases.purchasePackage(pkg);
  return !!customerInfo?.entitlements?.active?.[PRO_ENTITLEMENT];
}

/** Restore prior purchases (App Store requirement). Returns true if Pro active. */
export async function restorePurchases(): Promise<boolean> {
  const Purchases = load();
  if (!Purchases) return false;
  try {
    const customerInfo = await Purchases.restorePurchases();
    return !!customerInfo?.entitlements?.active?.[PRO_ENTITLEMENT];
  } catch {
    return false;
  }
}
