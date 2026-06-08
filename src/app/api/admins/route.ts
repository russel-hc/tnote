import { NextResponse } from "next/server";
import { type ApiContext, withLogging } from "@/shared/lib/api/withLogging";
import { createAdminClient } from "@/shared/lib/supabase/server";
import { isValidPhoneNumber, removePhoneHyphens } from "@/shared/lib/utils/phone";

const handleGet = async ({ supabase, session }: ApiContext) => {
  const { data, error } = await supabase
    .from("Users")
    .select("id, phone_number, name, role, created_at")
    .in("role", ["owner", "admin"])
    .eq("workspace", session.workspace);

  if (error) throw error;
  return NextResponse.json({ data });
};

const handlePost = async ({ request, supabase, session }: ApiContext) => {
  const { name, phoneNumber } = await request.json();

  if (!name || !phoneNumber) {
    return NextResponse.json({ error: "이름과 전화번호를 입력해주세요." }, { status: 400 });
  }

  if (typeof name !== "string" || name.trim().length === 0 || name.length > 50) {
    return NextResponse.json({ error: "이름은 1~50자 사이여야 합니다." }, { status: 400 });
  }

  const cleanedPhoneNumber = removePhoneHyphens(phoneNumber);
  if (!isValidPhoneNumber(cleanedPhoneNumber)) {
    return NextResponse.json({ error: "올바른 전화번호 형식이 아닙니다." }, { status: 400 });
  }

  const { data: existingUser } = await supabase
    .from("Users")
    .select("phone_number")
    .eq("phone_number", cleanedPhoneNumber)
    .eq("workspace", session.workspace)
    .single();

  if (existingUser) {
    return NextResponse.json({ error: "이미 등록된 전화번호입니다." }, { status: 409 });
  }

  const adminSupabase = createAdminClient();
  const email = `${cleanedPhoneNumber}@tnote.local`;

  const { data: authUser, error: authError } = await adminSupabase.auth.admin.createUser({
    email,
    password: cleanedPhoneNumber,
    email_confirm: true,
    user_metadata: {
      name: name.trim(),
    },
    app_metadata: {
      role: "admin",
      workspace: session.workspace,
    },
  });

  if (authError) throw authError;

  const { data: newAdmin, error: adminError } = await supabase
    .from("Users")
    .insert({
      id: authUser.user.id,
      name: name.trim(),
      phone_number: cleanedPhoneNumber,
      role: "admin",
      workspace: session.workspace,
    })
    .select("id, phone_number, name, role, created_at")
    .single();

  if (adminError) {
    await adminSupabase.auth.admin.deleteUser(authUser.user.id);
    if (adminError.code === "23505") {
      return NextResponse.json({ error: "이미 등록된 전화번호입니다." }, { status: 409 });
    }
    throw adminError;
  }

  return NextResponse.json({ success: true, data: newAdmin }, { status: 201 });
};

export const GET = withLogging(handleGet, { resource: "admins", action: "read", allowedRoles: ["owner", "admin"] });
export const POST = withLogging(handlePost, { resource: "admins", action: "create", allowedRoles: ["owner"] });
