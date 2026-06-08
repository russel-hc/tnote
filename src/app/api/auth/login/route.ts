import { NextResponse } from "next/server";
import { createClient } from "@/shared/lib/supabase/server";
import { createLogger } from "@/shared/lib/utils/logger";
import { isValidPhoneNumber, removePhoneHyphens } from "@/shared/lib/utils/phone";
import { checkAuthRateLimit } from "@/shared/lib/utils/rateLimit";

export async function POST(request: Request) {
  const logger = createLogger(request, null, "login", "auth");

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

    const { phoneNumber, password, workspaceId, isTeacher } = await request.json();

    if (!phoneNumber || !password) {
      await logger.log("warn", 400);
      await logger.flush();
      return NextResponse.json({ error: "전화번호와 비밀번호를 입력해주세요." }, { status: 400 });
    }

    const cleanedPhone = removePhoneHyphens(phoneNumber);
    if (!isValidPhoneNumber(cleanedPhone)) {
      await logger.log("warn", 400);
      await logger.flush();
      return NextResponse.json({ error: "올바른 전화번호 형식이 아닙니다." }, { status: 400 });
    }

    if (!isTeacher && !workspaceId) {
      await logger.log("warn", 400);
      await logger.flush();
      return NextResponse.json({ error: "워크스페이스를 선택해주세요." }, { status: 400 });
    }

    const supabase = await createClient();
    const email = `${cleanedPhone}@tnote.local`;

    const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError || !authData.user) {
      await logger.log("warn", 401);
      await logger.flush();
      return NextResponse.json({ error: "전화번호 또는 비밀번호가 일치하지 않습니다." }, { status: 401 });
    }

    const appMeta = authData.user.app_metadata ?? {};
    const userMeta = authData.user.user_metadata ?? {};
    const role = (appMeta.role ?? userMeta.role) as string;
    const workspace = (appMeta.workspace ?? userMeta.workspace) as string;

    if (isTeacher && !["owner", "admin"].includes(role)) {
      await supabase.auth.signOut();
      await logger.log("warn", 401);
      await logger.flush();
      return NextResponse.json({ error: "전화번호 또는 비밀번호가 일치하지 않습니다." }, { status: 401 });
    }

    if (!isTeacher && (role !== "student" || workspace !== workspaceId)) {
      await supabase.auth.signOut();
      await logger.log("warn", 401);
      await logger.flush();
      return NextResponse.json({ error: "전화번호 또는 비밀번호가 일치하지 않습니다." }, { status: 401 });
    }

    const isDefaultPassword = password === cleanedPhone;

    const logSession = {
      userId: authData.user.id,
      phoneNumber: cleanedPhone,
      name: userMeta.name as string,
      role: role as "owner" | "admin" | "student",
      workspace,
    };

    const loggerWithSession = createLogger(request, logSession, "login", "auth");
    await loggerWithSession.log("info", 200, undefined, logSession.userId);
    await loggerWithSession.flush();

    return NextResponse.json({
      success: true,
      isDefaultPassword,
      user: {
        id: logSession.userId,
        name: logSession.name,
        phoneNumber: cleanedPhone,
        role,
        workspace,
      },
    });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    await logger.log("error", 500, err);
    await logger.flush();
    return NextResponse.json({ error: "로그인 중 오류가 발생했습니다." }, { status: 500 });
  }
}
