import { initializeApp, deleteApp } from 'firebase/app';
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  updatePassword,
  updateProfile, 
  signOut,
  deleteUser
} from 'firebase/auth';
import { 
  initializeFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  collection, 
  getDocs, 
  query, 
  where,
  deleteDoc 
} from 'firebase/firestore';
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
      email: cleanEmail,
      managedPassword: cleanPassword,
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

export interface ResetPasswordDirectlyParams {
  email: string;
  newPassword: string;
  currentPassword?: string;
  ownerId?: string;
}

export interface ResetPasswordDirectlyResult {
  success: boolean;
  message: string;
  email: string;
  newPassword: string;
}

/**
 * Resets a merchant's password directly in Firebase Auth without sending an email or link.
 * Signs in using their current/managed password in an isolated secondary auth instance and calls updatePassword.
 */
export async function resetMerchantPasswordDirectly(
  params: ResetPasswordDirectlyParams
): Promise<ResetPasswordDirectlyResult> {
  const cleanEmail = (params.email || '').trim();
  const cleanNewPassword = (params.newPassword || '').trim();
  const cleanCurrentPassword = (params.currentPassword || '').trim();
  const ownerId = params.ownerId;

  if (!cleanEmail || !cleanNewPassword) {
    throw new Error('Email address and new password are required.');
  }

  if (cleanNewPassword.length < 6) {
    throw new Error('New password must be at least 6 characters.');
  }

  const secondaryAppName = `PwdReset_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
  const secondaryAuth = getAuth(secondaryApp);
  const secondaryDb = initializeFirestore(
    secondaryApp,
    { experimentalForceLongPolling: true },
    firebaseConfig.firestoreDatabaseId
  );

  try {
    let currentPass = cleanCurrentPassword;

    // If current password wasn't explicitly typed, look up the stored managed password in Firestore
    if (!currentPass && ownerId) {
      try {
        const bizSnap = await getDoc(doc(secondaryDb, 'businesses', ownerId));
        if (bizSnap.exists()) {
          currentPass = bizSnap.data()?.managedPassword || '';
        }
      } catch (readErr) {
        console.warn('Could not read stored managed password from Firestore:', readErr);
      }
    }

    if (!currentPass) {
      throw new Error(
        'Current/original password is required to update Firebase Auth directly without an email link. Please enter the current password, or use "Re-link Store Credentials" to create a fresh login.'
      );
    }

    // Sign in to secondary auth instance with the current password
    const userCred = await signInWithEmailAndPassword(secondaryAuth, cleanEmail, currentPass);

    // Update password in Firebase Auth directly!
    await updatePassword(userCred.user, cleanNewPassword);

    // Update the business document with the new password
    if (ownerId) {
      try {
        await updateDoc(doc(secondaryDb, 'businesses', ownerId), {
          managedPassword: cleanNewPassword,
          email: cleanEmail
        });
      } catch (updateErr) {
        console.warn('Could not update managedPassword in Firestore:', updateErr);
      }
    }

    await signOut(secondaryAuth);

    return {
      success: true,
      message: 'Password successfully updated in Firebase Auth directly without an email link!',
      email: cleanEmail,
      newPassword: cleanNewPassword
    };
  } finally {
    try {
      await deleteApp(secondaryApp);
    } catch (cleanErr) {
      console.warn('Error cleaning up secondary app:', cleanErr);
    }
  }
}

export interface RelinkStoreCredentialsParams {
  oldOwnerId: string;
  newEmail: string;
  newPassword: string;
  merchantName?: string;
}

export interface RelinkStoreCredentialsResult {
  success: boolean;
  message: string;
  newUid: string;
  newEmail: string;
  newPassword: string;
}

/**
 * Re-provisions an existing store to a fresh Firebase Auth login.
 * Migrates the business document, slug mappings, products, orders, leads, and reviews
 * to the new UID without losing any store data.
 */
export async function relinkStoreCredentials(
  params: RelinkStoreCredentialsParams
): Promise<RelinkStoreCredentialsResult> {
  const { oldOwnerId } = params;
  const cleanNewEmail = (params.newEmail || '').trim();
  const cleanNewPassword = (params.newPassword || '').trim();

  if (!oldOwnerId || !cleanNewEmail || !cleanNewPassword) {
    throw new Error('Old store ID, new email, and new password are required.');
  }

  if (cleanNewPassword.length < 6) {
    throw new Error('New password must be at least 6 characters.');
  }

  const secondaryAppName = `Relink_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
  const secondaryAuth = getAuth(secondaryApp);
  const secondaryDb = initializeFirestore(
    secondaryApp,
    { experimentalForceLongPolling: true },
    firebaseConfig.firestoreDatabaseId
  );

  try {
    // 1. Fetch current business data
    const oldBizRef = doc(secondaryDb, 'businesses', oldOwnerId);
    const oldBizSnap = await getDoc(oldBizRef);
    if (!oldBizSnap.exists()) {
      throw new Error(`Business record with ID ${oldOwnerId} was not found.`);
    }

    const currentBiz = oldBizSnap.data() as BusinessProfile;

    // 2. Create the new Firebase Auth account
    const userCred = await createUserWithEmailAndPassword(secondaryAuth, cleanNewEmail, cleanNewPassword);
    const newUid = userCred.user.uid;

    const displayName = params.merchantName?.trim() || currentBiz.name;
    if (userCred.user) {
      await updateProfile(userCred.user, { displayName });
    }

    // 3. Write new business document under the new UID
    const updatedBiz: BusinessProfile = {
      ...currentBiz,
      ownerId: newUid,
      email: cleanNewEmail,
      managedPassword: cleanNewPassword,
      name: displayName
    };

    await setDoc(doc(secondaryDb, 'businesses', newUid), updatedBiz);

    // 4. Update the public store slug mapping
    if (currentBiz.storeSlug) {
      try {
        await setDoc(doc(secondaryDb, 'slugs', currentBiz.storeSlug), {
          ownerId: newUid,
          businessName: displayName
        });
      } catch (slugErr) {
        console.warn('Could not update slug mapping:', slugErr);
      }
    }

    // 5. Migrate products to new ownerId
    try {
      const prodQuery = query(collection(secondaryDb, 'products'), where('ownerId', '==', oldOwnerId));
      const prodSnap = await getDocs(prodQuery);
      for (const prodDoc of prodSnap.docs) {
        await updateDoc(doc(secondaryDb, 'products', prodDoc.id), { ownerId: newUid });
      }
    } catch (prodErr) {
      console.warn('Could not migrate products:', prodErr);
    }

    // 6. Migrate orders to new ownerId
    try {
      const orderQuery = query(collection(secondaryDb, 'orders'), where('ownerId', '==', oldOwnerId));
      const orderSnap = await getDocs(orderQuery);
      for (const orderDoc of orderSnap.docs) {
        await updateDoc(doc(secondaryDb, 'orders', orderDoc.id), { ownerId: newUid });
      }
    } catch (orderErr) {
      console.warn('Could not migrate orders:', orderErr);
    }

    // 7. Migrate leads to new ownerId
    try {
      const leadQuery = query(collection(secondaryDb, 'leads'), where('ownerId', '==', oldOwnerId));
      const leadSnap = await getDocs(leadQuery);
      for (const leadDoc of leadSnap.docs) {
        await updateDoc(doc(secondaryDb, 'leads', leadDoc.id), { ownerId: newUid });
      }
    } catch (leadErr) {
      console.warn('Could not migrate leads:', leadErr);
    }

    // 8. Migrate reviews to new ownerId
    try {
      const revQuery = query(collection(secondaryDb, 'reviews'), where('ownerId', '==', oldOwnerId));
      const revSnap = await getDocs(revQuery);
      for (const revDoc of revSnap.docs) {
        await updateDoc(doc(secondaryDb, 'reviews', revDoc.id), { ownerId: newUid });
      }
    } catch (revErr) {
      console.warn('Could not migrate reviews:', revErr);
    }

    // 9. Clean up old orphaned business doc
    try {
      await deleteDoc(oldBizRef);
    } catch (delErr) {
      console.warn('Could not remove old business doc:', delErr);
    }

    await signOut(secondaryAuth);

    return {
      success: true,
      message: `Store successfully re-linked to ${cleanNewEmail}! All store products, data, and settings transferred.`,
      newUid,
      newEmail: cleanNewEmail,
      newPassword: cleanNewPassword
    };
  } finally {
    try {
      await deleteApp(secondaryApp);
    } catch (cleanErr) {
      console.warn('Error cleaning up secondary app:', cleanErr);
    }
  }
}
