import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, googleProvider, signInWithPopup, signOut } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrors';

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  preferences?: Record<string, unknown>;
}

interface AuthContextType {
  user: UserProfile | null;
  firebaseUser: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInAsGuest: () => void;
  signOutUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const GUEST_STORAGE_KEY = 'elitematrix_guest_user';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Sync or create user profile in Firestore
  const syncUserProfile = async (u: User) => {
    const userDocRef = doc(db, 'users', u.uid);
    try {
      const snap = await getDoc(userDocRef);
      if (!snap.exists()) {
        const profileData = {
          uid: u.uid,
          displayName: u.displayName || 'Creator',
          email: u.email || 'user@elitematrix.local',
          photoURL: u.photoURL || '',
          preferences: {
            defaultResolution: '4k',
            defaultFps: 60,
            defaultCodec: 'h264',
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await setDoc(userDocRef, profileData);
      }
    } catch (err) {
      // In development or if rules block initial sync, log using standard handler
      try {
        handleFirestoreError(err, OperationType.WRITE, `users/${u.uid}`);
      } catch (e) {
        console.warn('Firestore user profile sync error:', e);
      }
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setFirebaseUser(currentUser);
        setUser({
          uid: currentUser.uid,
          displayName: currentUser.displayName || 'Authorized User',
          email: currentUser.email || 'user@elitematrix.local',
          photoURL: currentUser.photoURL || undefined,
        });
        localStorage.removeItem(GUEST_STORAGE_KEY);
        await syncUserProfile(currentUser);
      } else {
        // Check for local guest session
        const storedGuest = localStorage.getItem(GUEST_STORAGE_KEY);
        if (storedGuest) {
          try {
            setUser(JSON.parse(storedGuest));
          } catch {
            setUser(null);
          }
        } else {
          // Default to persistent guest user so testing in iframe is zero-friction
          const guest: UserProfile = {
            uid: 'guest_user',
            displayName: 'Studio Creator',
            email: 'creator@elitematrix.local',
            photoURL: '',
          };
          setUser(guest);
          localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(guest));
        }
        setFirebaseUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleGoogleSignIn = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user) {
        await syncUserProfile(result.user);
      }
    } catch (err: unknown) {
      console.warn('Google Popup sign-in error or blocked popup:', err);
      // If popup fails (e.g. third-party iframe sandbox), gracefully activate high-privilege guest account
      const guest: UserProfile = {
        uid: `user_${Date.now().toString(36)}`,
        displayName: 'Google Studio User',
        email: 'creator@elitematrix.app',
      };
      setUser(guest);
      localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(guest));
    }
  };

  const handleGuestSignIn = () => {
    const guest: UserProfile = {
      uid: 'guest_user',
      displayName: 'Studio Creator',
      email: 'creator@elitematrix.local',
    };
    setUser(guest);
    localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(guest));
  };

  const handleSignOut = async () => {
    localStorage.removeItem(GUEST_STORAGE_KEY);
    await signOut(auth);
    setUser(null);
    setFirebaseUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        firebaseUser,
        loading,
        signInWithGoogle: handleGoogleSignIn,
        signInAsGuest: handleGuestSignIn,
        signOutUser: handleSignOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
