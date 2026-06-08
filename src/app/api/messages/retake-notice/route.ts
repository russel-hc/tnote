import { NextResponse } from "next/server";
import { type ApiContext, withLogging } from "@/shared/lib/api/withLogging";
import {
  buildRecipientList,
  getWorkspaceSMSConfig,
  sendMessagesWithHistory,
  validateRecipientType,
} from "@/shared/lib/services/messageSender";
import { formatDateLongKorean, getTodayKorean } from "@/shared/lib/utils/date";

interface RetakeWithDetails {
  id: string;
  current_scheduled_date: string | null;
  status: string;
  exam: {
    id: string;
    name: string;
    exam_number: number;
    course: {
      id: string;
      name: string;
    };
  };
  student: {
    id: string;
    name: string;
    phone_number: string;
    parent_phone_number: string | null;
  };
}

const handlePost = async ({ request, supabase, session }: ApiContext) => {
  const smsConfig = await getWorkspaceSMSConfig(supabase, session.workspace);
  if (!smsConfig.config) {
    return NextResponse.json({ error: smsConfig.error }, { status: 400 });
  }

  const { retakeIds, recipientType, messageTemplate } = await request.json();

  if (!retakeIds || !Array.isArray(retakeIds) || retakeIds.length === 0) {
    return NextResponse.json({ error: "재시험 정보가 필요합니다." }, { status: 400 });
  }

  if (retakeIds.length > 1000) {
    return NextResponse.json({ error: "한 번에 최대 1000건까지 발송할 수 있습니다." }, { status: 400 });
  }

  if (!validateRecipientType(recipientType)) {
    return NextResponse.json({ error: "올바른 수신자 유형이 아닙니다." }, { status: 400 });
  }

  const { data: retakes, error: retakesError } = await supabase
    .from("RetakeAssignments")
    .select(`
      id,
      current_scheduled_date,
      status,
      exam:Exams!inner(
        id,
        name,
        exam_number,
        course:Courses!inner(id, name, workspace)
      ),
      student:Users!RetakeAssignments_student_id_fkey(
        id,
        name,
        phone_number,
        parent_phone_number
      )
    `)
    .in("id", retakeIds)
    .eq("exam.course.workspace", session.workspace);

  if (retakesError) throw retakesError;

  if (!retakes || retakes.length === 0) {
    return NextResponse.json({ error: "유효한 재시험 정보가 없습니다." }, { status: 400 });
  }

  const validRetakes = retakes as unknown as RetakeWithDetails[];

  const todayStr = getTodayKorean();

  const studentsForRecipients = validRetakes.map((retake) => ({
    id: retake.student.id,
    name: retake.student.name,
    phone_number: retake.student.phone_number,
    parent_phone_number: retake.student.parent_phone_number,
    _retake: retake,
  }));

  const recipients = buildRecipientList(studentsForRecipients, recipientType, (student) => {
    const s = student as (typeof studentsForRecipients)[number];
    return (messageTemplate || "")
      .replace(/{이름}/g, s.name)
      .replace(/{수업명}/g, s._retake.exam.course.name)
      .replace(/{시험명}/g, s._retake.exam.name)
      .replace(/{회차}/g, String(s._retake.exam.exam_number))
      .replace(/{예정일}/g, formatDateLongKorean(s._retake.current_scheduled_date))
      .replace(/{상태}/g, s._retake.status === "pending" ? "예정" : s._retake.status === "completed" ? "완료" : "불참")
      .replace(/{오늘날짜}/g, todayStr);
  });

  if (recipients.length === 0) {
    return NextResponse.json({ error: "발송 가능한 전화번호가 없습니다." }, { status: 400 });
  }

  const result = await sendMessagesWithHistory({
    supabase,
    workspace: session.workspace,
    userId: session.userId,
    messageType: "retake",
    recipients,
    senderPhoneNumber: smsConfig.config.senderPhoneNumber,
    credentials: smsConfig.config.credentials,
  });

  if (result.successCount === 0) {
    return NextResponse.json(
      {
        error: "문자 발송에 실패했습니다.",
        total: result.total,
        successCount: result.successCount,
        failCount: result.failCount,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: true,
    data: {
      total: result.total,
      successCount: result.successCount,
      failCount: result.failCount,
    },
  });
};

export const POST = withLogging(handlePost, {
  resource: "messages-retake-notice",
  action: "create",
  allowedRoles: ["owner", "admin"],
});
