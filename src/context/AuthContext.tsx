import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, signInWithPopup, signOut as fbSignOut, onAuthStateChanged } from 'firebase/auth';
import { auth, googleAuthProvider } from '../lib/firebase.ts';
import { UserProfile } from '../types/index.ts';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  idToken: string | null;
  loading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updatePreferences: (prefs: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Sync profile from backend
  const syncProfile = async (token?: string, currentUser?: User | null) => {
    try {
      const activeUser = currentUser || user;
      const activeToken = token || idToken;

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (activeToken) {
        headers['Authorization'] = `Bearer ${activeToken}`;
      }
      if (activeUser) {
        headers['x-user-id'] = activeUser.uid;
        headers['x-user-email'] = activeUser.email || '';
        headers['x-user-name'] = activeUser.displayName || '';
      }

      const res = await fetch('/api/auth/sync', {
        method: 'POST',
        headers,
      });

      if (res.ok) {
        const data = await res.json();
        setProfile(data.user);
      }
    } catch (err) {
      console.warn('Failed to sync profile from server:', err);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const token = await currentUser.getIdToken();
          setIdToken(token);
          await syncProfile(token, currentUser);
        } catch (e) {
          console.error('Error fetching ID token:', e);
        }
      } else {
        // Fallback demo user for preview if not signed in yet
        const localUid = localStorage.getItem('diarychat_dev_uid') || `guest_${Math.random().toString(36).substring(2, 9)}`;
        localStorage.setItem('diarychat_dev_uid', localUid);

        // Fetch guest profile
        try {
          const res = await fetch('/api/auth/sync', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-user-id': localUid,
              'x-user-email': 'guest@diarychat.local',
              'x-user-name': 'Bạn của Nhật Ký',
            },
          });
          if (res.ok) {
            const data = await res.json();
            setProfile(data.user);
          }
        } catch (e) {
          console.error('Error creating preview profile:', e);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async () => {
    try {
      setLoading(true);
      const cred = await signInWithPopup(auth, googleAuthProvider);
      setUser(cred.user);
      const token = await cred.user.getIdToken();
      setIdToken(token);
      await syncProfile(token, cred.user);
    } catch (error: any) {
      console.error('Sign-in error:', error);
      alert(`Đăng nhập Google: ${error.message || 'Không thể mở cửa sổ đăng nhập'}`);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      await fbSignOut(auth);
      setUser(null);
      setIdToken(null);
      setProfile(null);
      localStorage.removeItem('diarychat_dev_uid');
      window.location.reload();
    } catch (error) {
      console.error('Sign out error:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshProfile = async () => {
    await syncProfile();
  };

  const updatePreferences = async (prefs: Partial<UserProfile>) => {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (idToken) headers['Authorization'] = `Bearer ${idToken}`;
      if (user) {
        headers['x-user-id'] = user.uid;
        headers['x-user-email'] = user.email || '';
      } else if (profile) {
        headers['x-user-id'] = profile.uid;
        headers['x-user-email'] = profile.email;
      }

      const res = await fetch('/api/user/preferences', {
        method: 'PUT',
        headers,
        body: JSON.stringify(prefs),
      });

      if (res.ok) {
        const data = await res.json();
        setProfile(data.user);
      }
    } catch (e) {
      console.error('Failed to update preferences:', e);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        idToken,
        loading,
        signIn,
        signOut,
        refreshProfile,
        updatePreferences,
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
