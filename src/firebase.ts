import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function isQuotaError(err: unknown): boolean {
  if (!err) return false;
  const str = err instanceof Error ? err.message : String(err);
  const code = (err as any)?.code || '';
  return (
    code === 'resource-exhausted' ||
    str.includes('Quota limit exceeded') ||
    str.includes('quota metric') ||
    str.includes('Free daily read units') ||
    str.includes('quota exceeded') ||
    str.includes('Quota exceeded') ||
    str.includes('resource-exhausted')
  );
}

export function isQuotaLimitActive(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const expiry = sessionStorage.getItem('mysellflow_quota_exceeded_until');
    if (expiry && Number(expiry) > Date.now()) {
      return true;
    }
  } catch {
    // Ignore storage restrictions
  }
  return false;
}

export function markQuotaLimitActive(durationMinutes: number = 10) {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem('mysellflow_quota_exceeded_until', String(Date.now() + durationMinutes * 60 * 1000));
  } catch {
    // Ignore storage restrictions
  }
}

export function getCachedData<T>(key: string, maxAgeMinutes: number = 15): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(`mysellflow_cache_${key}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.timestamp || !parsed.data) return null;
    if (Date.now() - parsed.timestamp > maxAgeMinutes * 60 * 1000) {
      return null;
    }
    return parsed.data as T;
  } catch {
    return null;
  }
}

export function setCachedData<T>(key: string, data: T) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`mysellflow_cache_${key}`, JSON.stringify({
      timestamp: Date.now(),
      data
    }));
  } catch {
    // Ignore storage quota limits
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  if (isQuotaError(error)) {
    markQuotaLimitActive(10);
    console.warn(`[Firestore Free Quota Limit] Daily read/write units exceeded for ${operationType} on ${path || 'unknown'}. Switching gracefully to cached/fallback mode.`);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('firestore-connection-status', { detail: { isOffline: true, quotaExceeded: true } }));
      window.dispatchEvent(new CustomEvent('firestore-quota-exceeded', { detail: { operationType, path } }));
    }
    return;
  }

  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Connectivity check
let hasDispatchedStatus = false;
async function testConnection() {
  if (typeof window !== 'undefined' && !window.navigator.onLine) {
    console.warn("Firestore connection check: Browser navigator is offline. Firestore is operating in offline cache mode.");
    window.dispatchEvent(new CustomEvent('firestore-connection-status', { detail: { isOffline: true } }));
    return;
  }

  try {
    // Perform a non-blocking timeout connection race to check accessibility of the cloud instance
    const pingPromise = getDocFromServer(doc(db, 'test', 'connection'));
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 4000));
    
    await Promise.race([pingPromise, timeoutPromise]);
    if (!hasDispatchedStatus) {
      window.dispatchEvent(new CustomEvent('firestore-connection-status', { detail: { isOffline: false } }));
      hasDispatchedStatus = true;
    }
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('permission-denied') || (error as any).code === 'permission-denied') {
        // Under security rules, /test/connection is locked. Reaching it is a successful hand-shake!
        console.log("Firestore connection test: Successfully reached Firestore backend (access securely managed by rules).");
        if (!hasDispatchedStatus) {
          window.dispatchEvent(new CustomEvent('firestore-connection-status', { detail: { isOffline: false } }));
          hasDispatchedStatus = true;
        }
      } else {
        console.warn("Firestore connection test: Backend is offline, blocked, or timed out. Firestore is operating in offline mode.");
        if (!hasDispatchedStatus) {
          window.dispatchEvent(new CustomEvent('firestore-connection-status', { detail: { isOffline: true } }));
          hasDispatchedStatus = true;
        }
      }
    }
  }
}

// Start connection ping checking safely in background
if (typeof window !== 'undefined') {
  // Listen to network status changes
  window.addEventListener('online', () => testConnection());
  window.addEventListener('offline', () => {
    window.dispatchEvent(new CustomEvent('firestore-connection-status', { detail: { isOffline: true } }));
  });
  // Safely trigger on deferred load
  setTimeout(testConnection, 1000);
}
