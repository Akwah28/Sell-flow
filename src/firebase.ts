import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, doc, getDocFromServer, enableMultiTabIndexedDbPersistence, setLogLevel } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Suppress non-critical Firestore logs/warnings in development console
setLogLevel('error');

const app = initializeApp(firebaseConfig);
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

// Enable offline multi-tab persistence
if (typeof window !== 'undefined') {
  enableMultiTabIndexedDbPersistence(db).catch((err) => {
    console.warn("Firestore multi-tab persistence failed to enable:", err.message);
  });
}

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

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errMessage = error instanceof Error ? error.message : String(error);
  const errCode = (error as any)?.code || '';

  const errInfo: FirestoreErrorInfo = {
    error: errMessage,
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

  const isPermissionError = 
    errCode === 'permission-denied' || 
    errMessage.toLowerCase().includes('permission') || 
    errMessage.toLowerCase().includes('insufficient');

  if (isPermissionError) {
    throw new Error(JSON.stringify(errInfo));
  } else {
    // Let the UI know if there's a non-fatal Firestore warning/error
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('firestore-error-alert', { 
        detail: { message: errMessage, code: errCode, path, operationType } 
      }));
    }
  }
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
