import { NextResponse } from "next/server";
import { type ApiContext, withLogging } from "@/shared/lib/api/withLogging";
import { fetchAllRows } from "@/shared/lib/supabase/pagination";

const handleGet = async ({ supabase, session }: ApiContext) => {
  const retakeIds = await fetchAllRows<{
    id: string;
    student: unknown;
    exam: unknown;
  }>(() =>
    supabase
      .from("RetakeAssignments")
      .select(
        `
        id,
        student:Users!RetakeAssignments_student_id_fkey!inner(id, name, workspace),
        exam:Exams!inner(
          id,
          name,
          exam_number,
          course:Courses!inner(id, name, workspace)
        )
      `,
      )
      .eq("student.workspace", session.workspace)
      .order("id", { ascending: true }),
  );

  if (retakeIds.length === 0) {
    return NextResponse.json({ data: [] });
  }

  const ids = retakeIds.map((r) => r.id);

  const { data: histories, error } = await supabase
    .from("RetakeHistory")
    .select(
      `
      id,
      retake_assignment_id,
      action_type,
      previous_date,
      new_date,
      previous_status,
      new_status,
      previous_management_status,
      new_management_status,
      note,
      created_at,
      performed_by:Users!RetakeHistory_performed_by_fkey(id, name)
    `,
    )
    .in("retake_assignment_id", ids)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) throw error;

  const retakeMap = new Map(retakeIds.map((r) => [r.id, r]));
  const data = histories?.map((h) => ({
    ...h,
    retake: retakeMap.get(h.retake_assignment_id),
  }));

  return NextResponse.json({ data });
};

export const GET = withLogging(handleGet, {
  resource: "retake-history-all",
  action: "read",
  allowedRoles: ["owner", "admin"],
});
