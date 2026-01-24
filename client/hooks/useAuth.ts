import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { isAssistant } from "@/lib/auth";
import { User } from "@supabase/supabase-js";

interface AuthState {
  user: User | null;
  isAssistant: boolean;
  loading: boolean;
  error: Error | null;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAssistant: false,
    loading: true,
    error: null,
  });

  useEffect(() => {
    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setState((prev) => ({
        ...prev,
        user: session?.user ?? null,
        loading: false,
      }));

      // Only check assistant status on demand, not on initial load
      // This prevents RLS recursion issues
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const user = session?.user ?? null;
      setState((prev) => ({
        ...prev,
        user,
        loading: false,
        isAssistant: false,
      }));
    });

    return () => subscription?.unsubscribe();
  }, []);

  // Add a function to check assistant status on demand
  const checkAssistantStatus = async (userId: string) => {
    try {
      const isAss = await isAssistant(userId);
      setState((prev) => ({ ...prev, isAssistant: isAss }));
      return isAss;
    } catch (err) {
      console.error("Error checking assistant status:", err);
      setState((prev) => ({ ...prev, error: err as Error }));
      return false;
    }
  };

  return { ...state, checkAssistantStatus };
}
