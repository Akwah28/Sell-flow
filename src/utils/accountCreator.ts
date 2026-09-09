import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, signOut } from 'firebase/auth';
import { initializeFirestore, doc, setDoc } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { BusinessProfile } from '../types';

export interface CreateMerchantAccountParams {
  email: string;
  password: string;
  merchantName: string;
  storeSlug?: string;
  currency?: string;
  whatsappNumber?: string;
}

export interface CreatedMerchantResult {
  uid: string;
  email: string;
  merchantName: string;
  storeSlug: string;
  storefrontUrl: string;
  loginUrl: string;
  password?: string;
}

export async function createMerchantAccountForOther(
  params: CreateMerchantAccountParams
): Promise<CreatedMerchantResult> {
  const { email, password, merchantName, currency = 'USD', whatsappNumber = '' } = params;

  const cleanEmail = (email || '').trim();
  const cleanPassword = (password || '').trim();
  const cleanMerchantName = (merchantName || '').trim();

  if (!cleanEmail || !cleanPassword || !cleanMerchantName) {
    throw new Error('Merchant name, email, and password are required.');
  }

  if (cleanPassword.length < 6) {
    throw new Error('Password must be at least 6 characters.');
  }

  // Generate clean slug
  let cleanSlug = (params.storeSlug || cleanMerchantName)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_\-]/g, '')
    .slice(0, 30);

  if (!cleanSlug || cleanSlug.length < 3) {
    cleanSlug = `shop-${Math.random().toString(36).substring(2, 7)}`;
  }

  const secondaryAppName = `AccountCreator_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
  const secondaryAuth = getAuth(secondaryApp);
  const secondaryDb = initializeFirestore(
    secondaryApp,
    { experimentalForceLongPolling: true },
    firebaseConfig.firestoreDatabaseId
  );

  try {
    // 1. Create account in Firebase Auth with cleanly trimmed credentials
    const cred = await createUserWithEmailAndPassword(secondaryAuth, cleanEmail, cleanPassword);
    const uid = cred.user.uid;

    if (cred.user) {
      await updateProfile(cred.user, { displayName: cleanMerchantName });
    }

    const storefrontUrl = `https://${cleanSlug}.mysellflow.store`;
    const newBusiness: BusinessProfile = {
      name: cleanMerchantName,
      description: `Welcome to ${cleanMerchantName}. Browse our latest collection and contact us to order!`,
      currency,
      whatsappNumber: (whatsappNumber || '').trim(),
      storeSlug: cleanSlug,
      isVerified: false,
      ownerId: uid,
      metaTitle: `${cleanMerchantName} - Official Store`,
      metaDescription: `Discover quality items and order directly via WhatsApp from ${cleanMerchantName}.`,
      storefrontUrl,
      subdomain: cleanSlug,
      views: 0,
      clicksMessageMerchant: 0,
      clicksWhatsAppOrder: 0
    };

    // 2. Initialize business document under the new merchant's authenticated UID
    try {
      await setDoc(doc(secondaryDb, 'businesses', uid), newBusiness);
    } catch (bizErr) {
      console.warn('Initial business profile write warning:', bizErr);
    }

    // 3. Initialize public slug mapping
    try {
      await setDoc(doc(secondaryDb, 'slugs', cleanSlug), {
        ownerId: uid,
        businessName: cleanMerchantName
      });
    } catch (slugErr) {
      console.warn('Slug registry write warning:', slugErr);
    }

    // 4. Verify that the newly created account credentials actually work with signIn
    await signOut(secondaryAuth);
    try {
      await signInWithEmailAndPassword(secondaryAuth, cleanEmail, cleanPassword);
      console.log('Account credentials verified successfully for:', cleanEmail);
      await signOut(secondaryAuth);
    } catch (testAuthErr: any) {
      console.error('Credential verification test failed:', testAuthErr);
      throw new Error(`Account setup check failed: ${testAuthErr?.message || 'Password could not be validated.'}`);
    }

    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://mysellflow.store';
    return {
      uid,
      email: cleanEmail,
      merchantName: cleanMerchantName,
      storeSlug: cleanSlug,
      storefrontUrl,
      loginUrl: `${origin}/login`,
      password: cleanPassword
    };
  } finally {
    try {
      await deleteApp(secondaryApp);
    } catch (cleanErr) {
      console.warn('Error cleaning up secondary app:', cleanErr);
    }
  }
}
