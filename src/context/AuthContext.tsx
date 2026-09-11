import React, { createContext, useContext, useState, useEffect } from "react";
import { User, onAuthStateChanged } from "firebase/auth";
import { auth, loginWithGoogle, logoutUser, fetchUserProfile, syncUserRecord } from "../lib/firebase";

interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  photoURL: string;
  academicGoal: string;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: () => Promise<User>;
  signOut: () => Promise<void>;
  updateAcademicGoal: (goal: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const p = (await fetchUserProfile(currentUser.uid)) as UserProfile | null;
          if (p) {
            setProfile(p);
          } else {
            setProfile({
              id: currentUser.uid,
              email: currentUser.email || "",
              displayName: currentUser.displayName || "Student",
              photoURL: currentUser.photoURL || "",
              academicGoal: "Maintain strong academic standing and balanced mental wellness",
            });
          }
        } catch (err) {
          console.error("Failed to load user profile:", err);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async () => {
    const loggedUser = await loginWithGoogle();
    setUser(loggedUser);
    const p = (await fetchUserProfile(loggedUser.uid)) as UserProfile | null;
    if (p) setProfile(p);
    return loggedUser;
  };

  const signOut = async () => {
    await logoutUser();
    setUser(null);
    setProfile(null);
  };

  const updateAcademicGoal = async (goal: string) => {
    if (!user) return;
    await syncUserRecord(user, goal);
    setProfile((prev) => (prev ? { ...prev, academicGoal: goal } : null));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        signIn,
        signOut,
        updateAcademicGoal,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
