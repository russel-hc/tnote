import { NextResponse } from "next/server";
import { type ApiContext, withLogging } from "@/shared/lib/api/withLogging";
import {
  STUDENT_ASSIGNMENT_TABLE,
  toAssignmentSubmissionStatus,
  toStudentAssignmentStatus,
} from "@/shared/lib/utils/studentAssignments";

interface ExamWithNameCourse {
  id: string;
  name: string;
  course_id: string;
  course: {
    workspace: string;
  };
}

interface AssignmentInput {
  studentId: string;
  status: string;
}

const handleGet = async ({ supabase, session, params }: ApiContext) => {
  const examId = params?.id;

  const { data: exam } = await supabase
    .from("Exams")
    .select("id, name, course_id, course:Courses!inner(workspace)")
    .eq("id", examId)
    .single();

  const typedExam = exam as unknown as ExamWithNameCourse | null;
  if (!typedExam || typedExam.course.workspace !== session.workspace) {
    return NextResponse.json({ error: "시험을 찾을 수 없습니다." }, { status: 404 });
  }

  const { data: assignment } = await supabase
    .from("Assignments")
    .select("id")
    .eq("course_id", typedExam.course_id)
    .eq("name", typedExam.name)
    .single();

  if (!assignment) {
    return NextResponse.json({ data: [] });
  }

  const { data, error } = await supabase
    .from(STUDENT_ASSIGNMENT_TABLE)
    .select(`
      id,
      status,
      student:Users!StudentAssignments_student_id_fkey(id, name, phone_number, school)
    `)
    .eq("assignment_id", assignment.id);

  if (error) throw error;
  return NextResponse.json({
    data: (data || []).map((record) => ({
      ...record,
      status: toAssignmentSubmissionStatus(record.status),
    })),
  });
};

const handlePost = async ({ request, supabase, session, params }: ApiContext) => {
  const examId = params?.id;
  const { assignments } = (await request.json()) as { assignments: AssignmentInput[] };

  if (!assignments || !Array.isArray(assignments)) {
    return NextResponse.json({ error: "과제 데이터가 필요합니다." }, { status: 400 });
  }

  const { data: exam } = await supabase
    .from("Exams")
    .select("id, name, course_id, course:Courses!inner(workspace)")
    .eq("id", examId)
    .single();

  const typedExam = exam as unknown as ExamWithNameCourse | null;
  if (!typedExam || typedExam.course.workspace !== session.workspace) {
    return NextResponse.json({ error: "시험을 찾을 수 없습니다." }, { status: 404 });
  }

  const validStatuses = ["완료", "미흡", "미제출", "검사예정", "결석"];
  for (const assignment of assignments) {
    if (!assignment.studentId || !validStatuses.includes(assignment.status)) {
      return NextResponse.json({ error: "잘못된 과제 데이터 형식입니다." }, { status: 400 });
    }
  }

  let { data: matchingAssignment } = await supabase
    .from("Assignments")
    .select("id")
    .eq("course_id", typedExam.course_id)
    .eq("name", typedExam.name)
    .single();

  if (!matchingAssignment) {
    const { data: newAssignment, error: createError } = await supabase
      .from("Assignments")
      .insert({
        course_id: typedExam.course_id,
        name: typedExam.name,
        workspace: session.workspace,
      })
      .select("id")
      .single();

    if (createError) throw createError;
    matchingAssignment = newAssignment;
  }

  const assignmentId = matchingAssignment.id;

  const { data: existingRecords, error: fetchError } = await supabase
    .from(STUDENT_ASSIGNMENT_TABLE)
    .select("id, student_id")
    .eq("assignment_id", assignmentId);

  if (fetchError) throw fetchError;

  const newStudentIds = new Set(assignments.map((a) => a.studentId));
  const toDelete = existingRecords?.filter((r) => !newStudentIds.has(r.student_id)).map((r) => r.id) || [];

  if (toDelete.length > 0) {
    const { error: deleteError } = await supabase.from(STUDENT_ASSIGNMENT_TABLE).delete().in("id", toDelete);
    if (deleteError) throw deleteError;
  }

  if (assignments.length > 0) {
    const records = assignments.map((a) => ({
      assignment_id: assignmentId,
      student_id: a.studentId,
      status: toStudentAssignmentStatus(a.status),
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from(STUDENT_ASSIGNMENT_TABLE)
      .upsert(records, { onConflict: "assignment_id,student_id" });

    if (error) throw error;
  }

  return NextResponse.json({ success: true, removed: toDelete.length, total: assignments.length });
};

export const GET = withLogging(handleGet, {
  resource: "exam-assignments",
  action: "read",
  allowedRoles: ["owner", "admin"],
});
export const POST = withLogging(handlePost, {
  resource: "exam-assignments",
  action: "create",
  allowedRoles: ["owner", "admin"],
});
