import type { User, Session } from "@supabase/supabase-js";
import type { Profile } from "./database";

export interface AuthUser {
  user: User;
  session: Session;
  profile: Profile | null;
}

export interface AuthState {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}
