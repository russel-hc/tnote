import { NextResponse } from "next/server";
import { type ApiContext, withLogging } from "@/shared/lib/api/withLogging";
import { isValidDateString } from "@/shared/lib/utils/date";
import { STUDENT_ASSIGNMENT_HISTORY_TABLE, STUDENT_ASSIGNMENT_TABLE } from "@/shared/lib/utils/studentAssignments";

const handlePatch = async ({ request, supabase, session, params }: ApiContext) => {
  const id = params?.id;
  const { newDate } = await request.json();

  if (!isValidDateString(newDate)) {
    return NextResponse.json({ error: "올바른 날짜 형식(YYYY-MM-DD)이 아닙니다." }, { status: 400 });
  }

  const { data: current, error: fetchError } = await supabase
    .from(STUDENT_ASSIGNMENT_TABLE)
    .select(`
      current_scheduled_date,
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

  const previousDate = current.current_scheduled_date;

  if (previousDate === newDate) {
    return NextResponse.json({ error: "날짜가 변경되지 않았습니다." }, { status: 400 });
  }

  const { data: updated, error: updateError } = await supabase
    .from(STUDENT_ASSIGNMENT_TABLE)
    .update({
      current_scheduled_date: newDate,
    })
    .eq("id", id)
    .select()
    .single();

  if (updateError) {
    throw new Error(`과제 업데이트 실패: ${updateError.message}`);
  }

  const { error: historyError } = await supabase.from(STUDENT_ASSIGNMENT_HISTORY_TABLE).insert({
    student_assignment_id: id,
    action_type: "date_edit",
    previous_date: previousDate,
    new_date: newDate,
    note: null,
    performed_by: session.userId,
  });

  if (historyError) {
    throw new Error(`이력 저장 실패: ${historyError.message}`);
  }
  return NextResponse.json({ success: true, data: updated });
};

export const PATCH = withLogging(handlePatch, {
  resource: "assignment-task-edit-date",
  action: "update",
  allowedRoles: ["owner", "admin"],
});
