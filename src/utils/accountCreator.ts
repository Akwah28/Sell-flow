import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, updateProfile, signOut } from 'firebase/auth';
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

  if (!email || !password || !merchantName) {
    throw new Error('Merchant name, email, and password are required.');
  }

  if (password.length < 6) {
    throw new Error('Password must be at least 6 characters.');
  }

  // Generate clean slug
  let cleanSlug = (params.storeSlug || merchantName)
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
    const cred = await createUserWithEmailAndPassword(secondaryAuth, email, password);
    const uid = cred.user.uid;

    if (cred.user) {
      await updateProfile(cred.user, { displayName: merchantName });
    }

    const storefrontUrl = `https://${cleanSlug}.mysellflow.store`;
    const newBusiness: BusinessProfile = {
      name: merchantName,
      description: `Welcome to ${merchantName}. Browse our latest collection and contact us to order!`,
      currency,
      whatsappNumber,
      storeSlug: cleanSlug,
      isVerified: false,
      ownerId: uid,
      metaTitle: `${merchantName} - Official Store`,
      metaDescription: `Discover quality items and order directly via WhatsApp from ${merchantName}.`,
      storefrontUrl,
      subdomain: cleanSlug,
      views: 0,
      clicksMessageMerchant: 0,
      clicksWhatsAppOrder: 0
    };

    // Initialize business document under the new merchant's authenticated UID
    try {
      await setDoc(doc(secondaryDb, 'businesses', uid), newBusiness);
    } catch (bizErr) {
      console.warn('Initial business profile write warning:', bizErr);
    }

    // Initialize public slug mapping
    try {
      await setDoc(doc(secondaryDb, 'slugs', cleanSlug), {
        ownerId: uid,
        businessName: merchantName
      });
    } catch (slugErr) {
      console.warn('Slug registry write warning:', slugErr);
    }

    await signOut(secondaryAuth);

    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://mysellflow.store';
    return {
      uid,
      email,
      merchantName,
      storeSlug: cleanSlug,
      storefrontUrl,
      loginUrl: `${origin}/login`,
      password
    };
  } finally {
    try {
      await deleteApp(secondaryApp);
    } catch (cleanErr) {
      console.warn('Error cleaning up secondary app:', cleanErr);
    }
  }
}
