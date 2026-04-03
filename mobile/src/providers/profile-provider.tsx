import { createContext, ReactNode, useContext, useEffect, useState } from "react";

import { fetchProfile, type Profile } from "@/features/profile/services/profile-service";
import { useAuthSession } from "@/providers/auth-session-provider";

type ProfileContextValue = {
  errorMessage: string | null;
  isLoading: boolean;
  profile: Profile | null;
  refreshProfile: () => Promise<void>;
};

const ProfileContext = createContext<ProfileContextValue | null>(null);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { user } = useAuthSession();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function refreshProfile() {
    if (!user?.id) {
      setProfile(null);
      setIsLoading(false);
      setErrorMessage(null);
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage(null);
      const nextProfile = await fetchProfile(user.id);
      setProfile(nextProfile);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to load profile.");
      setProfile(null);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void refreshProfile();
  }, [user?.id]);

  return (
    <ProfileContext.Provider
      value={{
        errorMessage,
        isLoading,
        profile,
        refreshProfile
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const context = useContext(ProfileContext);

  if (!context) {
    throw new Error("useProfile must be used within a ProfileProvider.");
  }

  return context;
}
