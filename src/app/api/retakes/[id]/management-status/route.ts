import { NextResponse } from "next/server";
import { type ApiContext, withLogging } from "@/shared/lib/api/withLogging";

const handlePatch = async ({ request, supabase, session, params }: ApiContext) => {
  const id = params?.id;
  const { management_status } = await request.json();

  if (!management_status || typeof management_status !== "string") {
    return NextResponse.json({ error: "관리 상태는 필수입니다." }, { status: 400 });
  }

  const { data: validStatuses } = await supabase
    .from("ManagementStatuses")
    .select("name")
    .eq("workspace", session.workspace)
    .eq("category", "retake");

  const validNames = validStatuses?.map((s) => s.name) ?? [];

  if (!validNames.includes(management_status)) {
    return NextResponse.json({ error: "유효하지 않은 관리 상태입니다." }, { status: 400 });
  }

  const { data: retake, error: fetchError } = await supabase
    .from("RetakeAssignments")
    .select(`
      *,
      exam:Exams!inner(course:Courses!inner(workspace)),
      student:Users!RetakeAssignments_student_id_fkey!inner(workspace)
    `)
    .eq("id", id)
    .eq("exam.course.workspace", session.workspace)
    .eq("student.workspace", session.workspace)
    .single();

  if (fetchError || !retake) {
    return NextResponse.json({ error: "재시험을 찾을 수 없습니다." }, { status: 404 });
  }

  const { error: updateError } = await supabase.from("RetakeAssignments").update({ management_status }).eq("id", id);

  if (updateError) {
    throw updateError;
  }

  const { error: historyError } = await supabase.from("RetakeHistory").insert({
    retake_assignment_id: id,
    action_type: "management_status_change",
    previous_management_status: retake.management_status,
    new_management_status: management_status,
    performed_by: session.userId,
  });
  if (historyError) throw historyError;

  return NextResponse.json({ success: true });
};

export const PATCH = withLogging(handlePatch, {
  resource: "retake-management-status",
  action: "update",
  allowedRoles: ["owner", "admin"],
});
