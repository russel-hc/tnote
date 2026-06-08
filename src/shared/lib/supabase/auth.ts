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

  const metadata = user.user_metadata;
  if (!metadata?.role || !metadata?.workspace) {
    return null;
  }

  return {
    userId: user.id,
    phoneNumber: (user.email ?? "").replace("@tnote.local", ""),
    name: (metadata.name as string) ?? "",
    role: metadata.role as "owner" | "admin" | "student",
    workspace: metadata.workspace as string,
  };
}
