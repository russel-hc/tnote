import { NextResponse } from "next/server";
import { type ApiContext, withLogging } from "@/shared/lib/api/withLogging";
import { fetchAllRows } from "@/shared/lib/supabase/pagination";
import {
  getDefaultStudentAssignmentDate,
  STUDENT_ASSIGNMENT_HISTORY_TABLE,
  STUDENT_ASSIGNMENT_TABLE,
} from "@/shared/lib/utils/studentAssignments";

const handlePost = async ({ request, supabase, session }: ApiContext) => {
  const { assignmentId, studentIds, scheduledDate } = await request.json();

  if (!assignmentId) {
    return NextResponse.json({ error: "필수 정보를 입력해주세요." }, { status: 400 });
  }

  if (!studentIds || !Array.isArray(studentIds)) {
    return NextResponse.json({ error: "필수 정보를 입력해주세요." }, { status: 400 });
  }

  const { data: assignment } = await supabase
    .from("Assignments")
    .select("id, name, course:Courses!inner(workspace)")
    .eq("id", assignmentId)
    .eq("course.workspace", session.workspace)
    .single();

  if (!assignment) {
    return NextResponse.json({ error: "과제를 찾을 수 없습니다." }, { status: 404 });
  }

  const { data: students } = await supabase
    .from("Users")
    .select("id, required_clinic_weekdays")
    .in("id", studentIds)
    .eq("workspace", session.workspace)
    .eq("role", "student");

  if (!students || students.length !== studentIds.length) {
    return NextResponse.json({ error: "일부 학생을 찾을 수 없습니다." }, { status: 404 });
  }

  const assignmentName = (assignment as unknown as { name: string }).name;
  const studentClinicDateMap = new Map<string, string | null>();
  if (!scheduledDate) {
    for (const student of students) {
      studentClinicDateMap.set(
        student.id,
        getDefaultStudentAssignmentDate(student.required_clinic_weekdays, assignmentName),
      );
    }
  }

  const records = studentIds.map((studentId: string) => ({
    assignment_id: assignmentId,
    student_id: studentId,
    current_scheduled_date: scheduledDate || studentClinicDateMap.get(studentId) || null,
  }));

  const { data, error } = await supabase
    .from(STUDENT_ASSIGNMENT_TABLE)
    .insert(records)
    .select(`
      *,
      assignment:Assignments!inner(id, name, course:Courses!inner(id, name)),
      student:Users!StudentAssignments_student_id_fkey!inner(id, phone_number, name)
    `);

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "이미 과제가 할당된 학생이 있습니다." }, { status: 409 });
    }
    throw error;
  }

  if (data && data.length > 0) {
    const historyRecords = data.map((record) => ({
      student_assignment_id: record.id,
      action_type: "assign",
      new_date: record.current_scheduled_date || null,
      performed_by: session.userId,
    }));

    await supabase.from(STUDENT_ASSIGNMENT_HISTORY_TABLE).insert(historyRecords);
  }

  return NextResponse.json({ success: true, data }, { status: 201 });
};

const handleGet = async ({ request, supabase, session }: ApiContext) => {
  const { searchParams } = new URL(request.url);
  const courseId = searchParams.get("courseId");
  let studentId = searchParams.get("studentId");
  const status = searchParams.get("status");

  if (session.role === "student") {
    studentId = session.userId;
  }

  const data = await fetchAllRows(() => {
    let query = supabase
      .from(STUDENT_ASSIGNMENT_TABLE)
      .select(`
        *,
        assignment:Assignments!inner(id, name, course:Courses!inner(id, name, workspace)),
        student:Users!StudentAssignments_student_id_fkey!inner(
          id, phone_number, name, school, workspace, parent_phone_number,
          tags:StudentTagAssignments(id, tag_id, start_date, end_date, tag:StudentTags(id, name, color))
        )
      `)
      .eq("student.workspace", session.workspace)
      .order("id", { ascending: true });

    if (courseId) query = query.eq("assignment.course_id", courseId);
    if (studentId) query = query.eq("student_id", studentId);
    if (status) query = query.eq("status", status);

    return query;
  });

  return NextResponse.json({ data });
};

export const POST = withLogging(handlePost, {
  resource: "assignment-tasks",
  action: "create",
  allowedRoles: ["owner", "admin"],
});
export const GET = withLogging(handleGet, {
  resource: "assignment-tasks",
  action: "read",
  allowedRoles: ["owner", "admin", "student"],
});
