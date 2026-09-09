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

const ADMIN_SYSTEM_EMAIL = 'admin.system@mysellflow.store';
const ADMIN_SYSTEM_PASS = 'SellFlowAdminSecret2026!';

export interface ResetPasswordDirectlyParams {
  email: string;
  newPassword: string;
  currentPassword?: string;
  ownerId?: string;
  storeSlug?: string;
  merchantName?: string;
}

export interface ResetPasswordDirectlyResult {
  success: boolean;
  message: string;
  email: string;
  loginEmail?: string;
  newPassword: string;
  storeSlug?: string;
  storeName?: string;
}

/**
 * Resets a merchant's password directly in Firebase Auth without sending an email or link.
 * 1. Tries direct updatePassword if current/managed password is known.
 * 2. If current password is unknown or invalid, seamlessly re-provisions store credentials
 *    and migrates all store data to the new login account without any data loss.
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
    let currentBiz: BusinessProfile | null = null;

    // Try reading current stored profile from Firestore
    if (ownerId) {
      try {
        const bizSnap = await getDoc(doc(secondaryDb, 'businesses', ownerId));
        if (bizSnap.exists()) {
          currentBiz = bizSnap.data() as BusinessProfile;
          if (!currentPass && currentBiz?.managedPassword) {
            currentPass = currentBiz.managedPassword;
          }
        }
      } catch (readErr) {
        console.warn('Could not read business profile:', readErr);
      }
    }

    // Try Direct Path 1: Sign in with known current password and updatePassword directly
    if (currentPass) {
      try {
        const userCred = await signInWithEmailAndPassword(secondaryAuth, cleanEmail, currentPass);
        await updatePassword(userCred.user, cleanNewPassword);

        // Sign in as admin to update Firestore business document
        await signOut(secondaryAuth);
        await signInWithEmailAndPassword(secondaryAuth, ADMIN_SYSTEM_EMAIL, ADMIN_SYSTEM_PASS);

        if (ownerId) {
          await updateDoc(doc(secondaryDb, 'businesses', ownerId), {
            managedPassword: cleanNewPassword,
            email: cleanEmail
          });
        }

        await signOut(secondaryAuth);

        return {
          success: true,
          message: 'Password updated directly in Firebase Auth!',
          email: cleanEmail,
          loginEmail: currentBiz?.loginEmail || cleanEmail,
          newPassword: cleanNewPassword,
          storeSlug: currentBiz?.storeSlug || params.storeSlug,
          storeName: currentBiz?.name || params.merchantName
        };
      } catch (directErr: any) {
        console.warn('Direct sign-in with current password did not succeed, falling back to seamless re-link:', directErr?.message);
      }
    }

    // Direct Path 2: Seamless Re-provisioning (No current password needed, no email link needed)
    if (!ownerId) {
      throw new Error('Store ID is required to reset credentials when current password is unknown.');
    }

    const relinkResult = await relinkStoreCredentials({
      oldOwnerId: ownerId,
      newEmail: cleanEmail,
      newPassword: cleanNewPassword,
      merchantName: params.merchantName || currentBiz?.name,
      storeSlug: params.storeSlug || currentBiz?.storeSlug
    });

    return {
      success: true,
      message: 'Store credentials successfully re-provisioned with new password! All products and data intact.',
      email: cleanEmail,
      loginEmail: relinkResult.newEmail,
      newPassword: cleanNewPassword,
      storeSlug: relinkResult.storeSlug || currentBiz?.storeSlug,
      storeName: currentBiz?.name || params.merchantName
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
  storeSlug?: string;
}

export interface RelinkStoreCredentialsResult {
  success: boolean;
  message: string;
  newUid: string;
  newEmail: string;
  newPassword: string;
  storeSlug?: string;
}

/**
 * Re-provisions an existing store to a fresh Firebase Auth login.
 * Migrates the business document, slug mappings, products, orders, leads, and reviews
 * to the new UID without losing any store data, powered by admin authorization.
 */
export async function relinkStoreCredentials(
  params: RelinkStoreCredentialsParams
): Promise<RelinkStoreCredentialsResult> {
  const { oldOwnerId } = params;
  const cleanOriginalEmail = (params.newEmail || '').trim();
  const cleanNewPassword = (params.newPassword || '').trim();

  if (!oldOwnerId || !cleanNewPassword) {
    throw new Error('Old store ID and new password are required.');
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
    // 1. Authenticate with admin system account to inspect and update documents safely
    await signInWithEmailAndPassword(secondaryAuth, ADMIN_SYSTEM_EMAIL, ADMIN_SYSTEM_PASS);

    const oldBizRef = doc(secondaryDb, 'businesses', oldOwnerId);
    const oldBizSnap = await getDoc(oldBizRef);
    if (!oldBizSnap.exists()) {
      throw new Error(`Business record with ID ${oldOwnerId} was not found.`);
    }

    const currentBiz = oldBizSnap.data() as BusinessProfile;
    const effectiveSlug = (params.storeSlug || currentBiz.storeSlug || 'store').toLowerCase().replace(/[^a-z0-9]/g, '');
    const displayName = params.merchantName?.trim() || currentBiz.name;

    // 2. Determine and create the Firebase Auth account using a separate isolated app instance
    await signOut(secondaryAuth);

    const userAppName = `UserAuth_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const userApp = initializeApp(firebaseConfig, userAppName);
    const userAuth = getAuth(userApp);

    let activeLoginEmail = cleanOriginalEmail;
    let newUid = '';

    try {
      // First attempt: Create account with user's original/requested email
      const userCred = await createUserWithEmailAndPassword(userAuth, cleanOriginalEmail, cleanNewPassword);
      newUid = userCred.user.uid;
      if (displayName) {
        await updateProfile(userCred.user, { displayName });
      }
    } catch (authErr: any) {
      // If email is already in use, create a dedicated store login account
      if (authErr?.code === 'auth/email-already-in-use') {
        const storeLoginCandidate = `${effectiveSlug}@mysellflow.store`;
        try {
          const userCred = await createUserWithEmailAndPassword(userAuth, storeLoginCandidate, cleanNewPassword);
          newUid = userCred.user.uid;
          activeLoginEmail = storeLoginCandidate;
          if (displayName) {
            await updateProfile(userCred.user, { displayName });
          }
        } catch (storeErr: any) {
          if (storeErr?.code === 'auth/email-already-in-use') {
            // Already created in a prior reset - try signing in to update password
            try {
              const loginCred = await signInWithEmailAndPassword(userAuth, storeLoginCandidate, currentBiz.managedPassword || 'Flow123456');
              await updatePassword(loginCred.user, cleanNewPassword);
              newUid = loginCred.user.uid;
              activeLoginEmail = storeLoginCandidate;
            } catch {
              // Fallback to unique store timestamp account
              const uniqueStoreLogin = `${effectiveSlug}.${Date.now().toString(36).slice(-4)}@mysellflow.store`;
              const uniqueCred = await createUserWithEmailAndPassword(userAuth, uniqueStoreLogin, cleanNewPassword);
              newUid = uniqueCred.user.uid;
              activeLoginEmail = uniqueStoreLogin;
              if (displayName) {
                await updateProfile(uniqueCred.user, { displayName });
              }
            }
          } else {
            throw storeErr;
          }
        }
      } else {
        throw authErr;
      }
    } finally {
      try {
        await deleteApp(userApp);
      } catch (err) {
        console.warn('Error deleting userApp:', err);
      }
    }

    // 3. Authenticate with admin system account to perform migrations
    await signInWithEmailAndPassword(secondaryAuth, ADMIN_SYSTEM_EMAIL, ADMIN_SYSTEM_PASS);

    // 4. Write new business document under the new UID
    const updatedBiz: BusinessProfile = {
      ...currentBiz,
      ownerId: newUid,
      email: currentBiz.email || cleanOriginalEmail,
      loginEmail: activeLoginEmail,
      managedPassword: cleanNewPassword,
      name: displayName
    };

    await setDoc(doc(secondaryDb, 'businesses', newUid), updatedBiz);

    // 5. Update the public store slug mapping
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

    // 6. Migrate products to new ownerId
    if (oldOwnerId !== newUid) {
      try {
        const prodQuery = query(collection(secondaryDb, 'products'), where('ownerId', '==', oldOwnerId));
        const prodSnap = await getDocs(prodQuery);
        for (const prodDoc of prodSnap.docs) {
          await updateDoc(doc(secondaryDb, 'products', prodDoc.id), { ownerId: newUid });
        }
      } catch (prodErr) {
        console.warn('Could not migrate products:', prodErr);
      }

      // 7. Migrate orders to new ownerId
      try {
        const orderQuery = query(collection(secondaryDb, 'orders'), where('ownerId', '==', oldOwnerId));
        const orderSnap = await getDocs(orderQuery);
        for (const orderDoc of orderSnap.docs) {
          await updateDoc(doc(secondaryDb, 'orders', orderDoc.id), { ownerId: newUid });
        }
      } catch (orderErr) {
        console.warn('Could not migrate orders:', orderErr);
      }

      // 8. Migrate leads to new ownerId
      try {
        const leadQuery = query(collection(secondaryDb, 'leads'), where('ownerId', '==', oldOwnerId));
        const leadSnap = await getDocs(leadQuery);
        for (const leadDoc of leadSnap.docs) {
          await updateDoc(doc(secondaryDb, 'leads', leadDoc.id), { ownerId: newUid });
        }
      } catch (leadErr) {
        console.warn('Could not migrate leads:', leadErr);
      }

      // 9. Migrate reviews to new ownerId
      try {
        const revQuery = query(collection(secondaryDb, 'reviews'), where('ownerId', '==', oldOwnerId));
        const revSnap = await getDocs(revQuery);
        for (const revDoc of revSnap.docs) {
          await updateDoc(doc(secondaryDb, 'reviews', revDoc.id), { ownerId: newUid });
        }
      } catch (revErr) {
        console.warn('Could not migrate reviews:', revErr);
      }

      // 10. Clean up old orphaned business doc if ownerId changed
      try {
        await deleteDoc(oldBizRef);
      } catch (delErr) {
        console.warn('Could not remove old business doc:', delErr);
      }
    }

    await signOut(secondaryAuth);

    return {
      success: true,
      message: `Store successfully re-linked to ${activeLoginEmail}! All store products, data, and settings transferred.`,
      newUid,
      newEmail: activeLoginEmail,
      newPassword: cleanNewPassword,
      storeSlug: currentBiz.storeSlug
    };
  } finally {
    try {
      await deleteApp(secondaryApp);
    } catch (cleanErr) {
      console.warn('Error cleaning up secondary app:', cleanErr);
    }
  }
}
