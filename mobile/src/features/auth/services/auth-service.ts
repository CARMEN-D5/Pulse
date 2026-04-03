import { supabase } from "@/lib/supabase/client";

export async function signInWithEmail(email: string, password: string) {
  if (!email || !password) {
    throw new Error("Email and password are required.");
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    throw error;
  }

  return data.session;
}

export async function signUpWithEmail(email: string, password: string) {
  if (!email || !password) {
    throw new Error("Email and password are required.");
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password
  });

  if (error) {
    throw error;
  }

  return data.session;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw error;
  }
}
