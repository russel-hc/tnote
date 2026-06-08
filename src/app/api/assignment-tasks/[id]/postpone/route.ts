import { NextResponse } from "next/server";
import { type ApiContext, withLogging } from "@/shared/lib/api/withLogging";
import { isValidDateString } from "@/shared/lib/utils/date";
import { STUDENT_ASSIGNMENT_HISTORY_TABLE, STUDENT_ASSIGNMENT_TABLE } from "@/shared/lib/utils/studentAssignments";

const handlePatch = async ({ request, supabase, session, params }: ApiContext) => {
  const id = params?.id;
  const { newDate, note } = await request.json();

  if (!isValidDateString(newDate)) {
    return NextResponse.json({ error: "올바른 날짜 형식(YYYY-MM-DD)이 아닙니다." }, { status: 400 });
  }

  if (!note || !note.trim()) {
    return NextResponse.json({ error: "연기 사유를 입력해주세요." }, { status: 400 });
  }

  const { data: current, error: fetchError } = await supabase
    .from(STUDENT_ASSIGNMENT_TABLE)
    .select(`
      current_scheduled_date,
      postpone_count,
      status,
      assignment:Assignments!inner(course:Courses!inner(workspace)),
      student:Users!StudentAssignments_student_id_fkey!inner(workspace)
    `)
    .eq("id", id)
    .eq("assignment.course.workspace", session.workspace)
    .eq("student.workspace", session.workspace)
    .single();

  if (fetchError || !current) {
    return NextResponse.json({ error: "과제를 찾을 수 없습니다." }, { status: 404 });
  }

  const { data: updated, error: updateError } = await supabase
    .from(STUDENT_ASSIGNMENT_TABLE)
    .update({
      current_scheduled_date: newDate,
      postpone_count: current.postpone_count + 1,
      status: "pending",
    })
    .eq("id", id)
    .select()
    .single();

  if (updateError) throw updateError;

  const { error: historyError } = await supabase.from(STUDENT_ASSIGNMENT_HISTORY_TABLE).insert({
    student_assignment_id: id,
    action_type: "postpone",
    previous_date: current.current_scheduled_date,
    new_date: newDate,
    previous_status: current.status,
    new_status: "pending",
    note: note || null,
    performed_by: session.userId,
  });

  if (historyError) throw historyError;
  return NextResponse.json({ success: true, data: updated });
};

export const PATCH = withLogging(handlePatch, {
  resource: "assignment-task-postpone",
  action: "update",
  allowedRoles: ["owner", "admin"],
});
