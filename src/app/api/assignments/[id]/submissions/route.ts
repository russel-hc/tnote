import { NextResponse } from "next/server";
import { type ApiContext, withLogging } from "@/shared/lib/api/withLogging";
import { STUDENT_ASSIGNMENT_TABLE, toAssignmentSubmissionStatus } from "@/shared/lib/utils/studentAssignments";

interface AssignmentWorkspaceOnly {
  id: string;
  course: {
    workspace: string;
  };
}

const handleGet = async ({ supabase, session, params }: ApiContext) => {
  const assignmentId = params?.id;

  const { data: assignment } = await supabase
    .from("Assignments")
    .select("id, course:Courses!inner(workspace)")
    .eq("id", assignmentId)
    .single();

  const typedAssignment = assignment as unknown as AssignmentWorkspaceOnly | null;
  if (!typedAssignment || typedAssignment.course.workspace !== session.workspace) {
    return NextResponse.json({ error: "과제를 찾을 수 없습니다." }, { status: 404 });
  }

  const { data, error } = await supabase
    .from(STUDENT_ASSIGNMENT_TABLE)
    .select(`
      id,
      status,
      student:Users!StudentAssignments_student_id_fkey(id, name, phone_number, school)
    `)
    .eq("assignment_id", assignmentId);

  if (error) throw error;
  return NextResponse.json({
    data: (data || []).map((record) => ({
      ...record,
      status: toAssignmentSubmissionStatus(record.status),
    })),
  });
};

export const GET = withLogging(handleGet, {
  resource: "assignment-submissions",
  action: "read",
  allowedRoles: ["owner", "admin"],
});
