import { supabase } from "./supabase";

export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  is_assistant?: boolean;
}

// Register a new user
export async function registerUser(
  email: string,
  password: string,
  fullName: string,
) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // Disable email confirmation for testing
      emailRedirectTo: undefined,
      data: {
        full_name: fullName,
      },
    },
  });

  if (error) throw error;

  // For testing: Auto-confirm the email by updating auth.users
  // In production, remove this - email verification will be required
  if (data.user) {
    try {
      await supabase.auth.admin.updateUserById(data.user.id, {
        email_confirm: true,
      });
    } catch (err) {
      console.log(
        "Note: Email auto-confirmation skipped (admin API not available in this context)",
      );
    }
  }

  return data;
}

// Login user
export async function loginUser(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return data;
}

// Logout user
export async function logoutUser() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

// Get current user
export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  return data.user;
}

// Check if user is assistant
// NOTE: This queries assistants table which may have RLS issues
// For testing, always returns false - assistants can be added manually
export async function isAssistant(userId: string): Promise<boolean> {
  try {
    // WORKAROUND: Skip querying assistants table due to RLS recursion issues
    // In production, this should be fixed by properly configuring Supabase RLS
    // For now, staff must be added to auth.users.user_metadata or verified differently

    // Check if user has assistant role in metadata
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user?.user_metadata?.role === "assistant") {
      return true;
    }

    return false;
  } catch (err) {
    console.error("Error in isAssistant:", err);
    return false;
  }
}

// Get user profile
export async function getUserProfile(
  userId: string,
): Promise<UserProfile | null> {
  try {
    const { data: user, error: userError } =
      await supabase.auth.admin.getUserById(userId);
    if (userError) return null;

    const { data: assistant } = await supabase
      .from("assistants")
      .select("id, email, full_name, role")
      .eq("id", userId)
      .single();

    return {
      id: user.id,
      email: user.email || "",
      full_name: user.user_metadata?.full_name || assistant?.full_name,
      is_assistant: !!assistant,
    };
  } catch {
    return null;
  }
}
