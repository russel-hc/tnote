import { NextResponse } from "next/server";
import { type ApiContext, withLogging } from "@/shared/lib/api/withLogging";
import { fetchAllRows } from "@/shared/lib/supabase/pagination";

const getNextClinicDate = (weekdays: number[]): string | null => {
  if (!weekdays || weekdays.length === 0) return null;

  const koreaFormatter = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" });
  const koreaToday = new Date(`${koreaFormatter.format(new Date())}T12:00:00`);

  for (let i = 1; i <= 7; i++) {
    const date = new Date(koreaToday);
    date.setDate(koreaToday.getDate() + i);
    if (weekdays.includes(date.getDay())) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    }
  }
  return null;
};

const handlePost = async ({ request, supabase, session }: ApiContext) => {
  const { examId, studentIds, scheduledDate } = await request.json();

  if (!examId) {
    return NextResponse.json({ error: "필수 정보를 입력해주세요." }, { status: 400 });
  }

  if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
    return NextResponse.json({ error: "필수 정보를 입력해주세요." }, { status: 400 });
  }

  if (studentIds.length > 100) {
    return NextResponse.json({ error: "한 번에 최대 100명까지 가능합니다." }, { status: 400 });
  }

  const { data: exam } = await supabase
    .from("Exams")
    .select("id, course:Courses!inner(workspace)")
    .eq("id", examId)
    .eq("course.workspace", session.workspace)
    .single();

  if (!exam) {
    return NextResponse.json({ error: "시험을 찾을 수 없습니다." }, { status: 404 });
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

  const { data: defaultStatus } = await supabase
    .from("ManagementStatuses")
    .select("name")
    .eq("workspace", session.workspace)
    .eq("category", "retake")
    .eq("display_order", 1)
    .single();

  const studentClinicDateMap = new Map<string, string | null>();
  if (!scheduledDate) {
    for (const student of students) {
      studentClinicDateMap.set(student.id, getNextClinicDate(student.required_clinic_weekdays));
    }
  }

  const assignments = studentIds.map((studentId: string) => ({
    exam_id: examId,
    student_id: studentId,
    current_scheduled_date: scheduledDate || studentClinicDateMap.get(studentId) || null,
    management_status: defaultStatus?.name ?? null,
  }));

  const { data, error } = await supabase
    .from("RetakeAssignments")
    .insert(assignments)
    .select(`
      *,
      exam:Exams!inner(id, name, exam_number, course:Courses!inner(id, name)),
      student:Users!RetakeAssignments_student_id_fkey!inner(id, phone_number, name)
    `);

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "이미 재시험이 할당된 학생이 있습니다." }, { status: 409 });
    }
    throw error;
  }

  if (data && data.length > 0) {
    const historyRecords = data.map((assignment) => ({
      retake_assignment_id: assignment.id,
      action_type: "assign",
      new_date: assignment.current_scheduled_date || null,
      performed_by: session.userId,
    }));

    await supabase.from("RetakeHistory").insert(historyRecords);
  }

  return NextResponse.json({ success: true, data }, { status: 201 });
};

const handleGet = async ({ request, supabase, session }: ApiContext) => {
  const { searchParams } = new URL(request.url);
  const courseId = searchParams.get("courseId");
  let studentId = searchParams.get("studentId");
  const status = searchParams.get("status");
  const managementStatus = searchParams.get("managementStatus");

  if (session.role === "student") {
    studentId = session.userId;
  }

  const data = await fetchAllRows(() => {
    let query = supabase
      .from("RetakeAssignments")
      .select(`
        *,
        exam:Exams!inner(id, name, exam_number, course:Courses!inner(id, name, workspace)),
        student:Users!RetakeAssignments_student_id_fkey!inner(
          id, phone_number, name, school, workspace, parent_phone_number,
          tags:StudentTagAssignments(id, tag_id, start_date, end_date, tag:StudentTags(id, name, color))
        )
      `)
      .eq("student.workspace", session.workspace)
      .order("id", { ascending: true });

    if (courseId) query = query.eq("exam.course_id", courseId);
    if (studentId) query = query.eq("student_id", studentId);
    if (status) query = query.eq("status", status);
    if (managementStatus) query = query.eq("management_status", managementStatus);

    return query;
  });

  return NextResponse.json({ data });
};

export const POST = withLogging(handlePost, {
  resource: "retakes",
  action: "create",
  allowedRoles: ["owner", "admin"],
});
export const GET = withLogging(handleGet, {
  resource: "retakes",
  action: "read",
  allowedRoles: ["owner", "admin", "student"],
});
