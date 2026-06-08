import { createClient } from "./server";

export interface Session {
  userId: string;
  phoneNumber: string;
  name: string;
  role: "owner" | "admin" | "student";
  workspace: string;
}

export async function getSession(): Promise<Session | null> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  // Authorization claims (role/workspace) come from app_metadata (service-role-only writable).
  // user_metadata fallback covers any not-yet-migrated account; it is user-writable, so app_metadata wins.
  const appMeta = user.app_metadata ?? {};
  const userMeta = user.user_metadata ?? {};
  const role = (appMeta.role ?? userMeta.role) as "owner" | "admin" | "student" | undefined;
  const workspace = (appMeta.workspace ?? userMeta.workspace) as string | undefined;
  if (!role || !workspace) {
    return null;
  }

  return {
    userId: user.id,
    phoneNumber: (user.email ?? "").replace("@tnote.local", ""),
    name: (userMeta.name as string) ?? "",
    role,
    workspace,
  };
}
