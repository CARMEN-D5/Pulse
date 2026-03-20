/**
 * AuthProvider — listens to Firebase auth state and updates Zustand store.
 * Wrap the app root with this provider.
 */
import React, { useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../config/firebase";
import { useAuthStore } from "../features/auth/stores/authStore";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setLoading, setHasCompletedAssessment } = useAuthStore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);

      if (user) {
        // Check if user has completed the assessment
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          const data = userDoc.data();
          setHasCompletedAssessment(data?.hasCompletedAssessment ?? false);
        } catch {
          setHasCompletedAssessment(false);
        }
      } else {
        setHasCompletedAssessment(false);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, [setUser, setLoading, setHasCompletedAssessment]);

  return <>{children}</>;
}
