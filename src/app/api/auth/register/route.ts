import { NextResponse } from "next/server";
import { createAdminClient } from "@/shared/lib/supabase/server";
import { createLogger } from "@/shared/lib/utils/logger";
import { validatePassword } from "@/shared/lib/utils/password";
import { isValidPhoneNumber, removePhoneHyphens } from "@/shared/lib/utils/phone";
import { checkAuthRateLimit } from "@/shared/lib/utils/rateLimit";

export async function POST(request: Request) {
  const logger = createLogger(request, null, "create", "auth");

  try {
    const { success: rateLimitOk, retryAfterMs } = checkAuthRateLimit(request);
    if (!rateLimitOk) {
      await logger.log("warn", 429);
      await logger.flush();
      return NextResponse.json(
        { error: "너무 많은 요청이 발생했습니다. 잠시 후 다시 시도해주세요." },
        { status: 429, headers: { "Retry-After": String(Math.ceil(retryAfterMs / 1000)) } },
      );
    }

    const { name, phoneNumber, password, workspaceName, agreedToTerms, agreedToPrivacy } = await request.json();

    if (!name || !phoneNumber || !password || !workspaceName) {
      await logger.log("warn", 400);
      await logger.flush();
      return NextResponse.json({ error: "모든 필수 정보를 입력해주세요." }, { status: 400 });
    }

    if (!agreedToTerms || !agreedToPrivacy) {
      await logger.log("warn", 400);
      await logger.flush();
      return NextResponse.json({ error: "이용약관과 개인정보처리방침에 동의해주세요." }, { status: 400 });
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      await logger.log("warn", 400);
      await logger.flush();
      return NextResponse.json({ error: passwordValidation.error }, { status: 400 });
    }

    const cleanedPhone = removePhoneHyphens(phoneNumber);
    if (!isValidPhoneNumber(cleanedPhone)) {
      await logger.log("warn", 400);
      await logger.flush();
      return NextResponse.json({ error: "올바른 전화번호 형식이 아닙니다." }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { data: existingUser } = await supabase
      .from("Users")
      .select("phone_number")
      .eq("phone_number", cleanedPhone)
      .single();

    if (existingUser) {
      await logger.log("warn", 409);
      await logger.flush();
      return NextResponse.json({ error: "이미 등록된 전화번호입니다." }, { status: 409 });
    }

    const { data: newWorkspace, error: workspaceError } = await supabase
      .from("Workspaces")
      .insert({
        name: workspaceName,
        owner: null,
      })
      .select()
      .single();

    if (workspaceError) throw workspaceError;

    const email = `${cleanedPhone}@tnote.local`;

    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name,
      },
      app_metadata: {
        role: "owner",
        workspace: newWorkspace.id,
      },
    });

    if (authError) {
      await supabase.from("Workspaces").delete().eq("id", newWorkspace.id);
      throw authError;
    }

    const { data: newUser, error: userError } = await supabase
      .from("Users")
      .insert({
        id: authUser.user.id,
        name,
        phone_number: cleanedPhone,
        role: "owner",
        workspace: newWorkspace.id,
      })
      .select()
      .single();

    if (userError) {
      await supabase.auth.admin.deleteUser(authUser.user.id);
      await supabase.from("Workspaces").delete().eq("id", newWorkspace.id);
      throw userError;
    }

    await supabase.from("Workspaces").update({ owner: newUser.id }).eq("id", newWorkspace.id);

    await logger.log("info", 200, undefined, newUser.id);
    await logger.flush();
    return NextResponse.json({ success: true, message: "회원가입이 완료되었습니다. 로그인해주세요." });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    await logger.log("error", 500, err);
    await logger.flush();
    return NextResponse.json({ error: "회원가입 중 오류가 발생했습니다." }, { status: 500 });
  }
}
