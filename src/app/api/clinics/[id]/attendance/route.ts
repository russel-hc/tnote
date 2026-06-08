import { NextResponse } from "next/server";
import { type ApiContext, withLogging } from "@/shared/lib/api/withLogging";
import { isValidDateString } from "@/shared/lib/utils/date";

const handleGet = async ({ request, supabase, session, params }: ApiContext) => {
  const clinicId = params?.id;
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  const studentId = searchParams.get("studentId");

  const { data: clinic } = await supabase
    .from("Clinics")
    .select("id")
    .eq("id", clinicId)
    .eq("workspace", session.workspace)
    .single();

  if (!clinic) {
    return NextResponse.json({ error: "클리닉을 찾을 수 없습니다." }, { status: 404 });
  }

  let query = supabase
    .from("ClinicAttendance")
    .select(`
      *,
      student:Users!ClinicAttendance_student_id_fkey(id, name, phone_number, school)
    `)
    .eq("clinic_id", clinicId)
    .order("attendance_date", { ascending: false });

  if (date) {
    query = query.eq("attendance_date", date);
  }

  if (studentId) {
    query = query.eq("student_id", studentId);
  }

  const { data, error } = await query;

  if (error) throw error;
  return NextResponse.json({ data });
};

const handlePost = async ({ request, supabase, session, params }: ApiContext) => {
  const clinicId = params?.id;
  const { studentIds, date, note } = await request.json();

  if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0 || !isValidDateString(date)) {
    return NextResponse.json({ error: "학생과 날짜(YYYY-MM-DD)를 선택해주세요." }, { status: 400 });
  }

  const { data: clinic } = await supabase
    .from("Clinics")
    .select("id")
    .eq("id", clinicId)
    .eq("workspace", session.workspace)
    .single();

  if (!clinic) {
    return NextResponse.json({ error: "클리닉을 찾을 수 없습니다." }, { status: 404 });
  }

  const { data: validStudents } = await supabase
    .from("Users")
    .select("id")
    .in("id", studentIds)
    .eq("workspace", session.workspace)
    .eq("role", "student");
  const validStudentIds = new Set((validStudents ?? []).map((s) => s.id));
  if (studentIds.some((studentId: string) => !validStudentIds.has(studentId))) {
    return NextResponse.json({ error: "일부 학생을 찾을 수 없습니다." }, { status: 404 });
  }

  const records = studentIds.map((studentId: string) => ({
    clinic_id: clinicId,
    student_id: studentId,
    attendance_date: date,
    note: note || null,
  }));

  const { data, error } = await supabase
    .from("ClinicAttendance")
    .upsert(records, { onConflict: "clinic_id,student_id,attendance_date" })
    .select();

  if (error) throw error;
  return NextResponse.json({ success: true, data });
};

interface Attendee {
  studentId: string;
  status?: "attended" | "absent";
  retakeExam?: boolean;
  homeworkCheck?: boolean;
  qa?: boolean;
  isRequired?: boolean;
}

const handlePatch = async ({ request, supabase, session, params }: ApiContext) => {
  const clinicId = params?.id;
  const body = await request.json();
  const { date } = body;

  const attendees: Attendee[] = body.attendees || (body.studentIds || []).map((id: string) => ({ studentId: id }));

  if (!Array.isArray(attendees) || !isValidDateString(date)) {
    return NextResponse.json({ error: "학생 목록과 날짜(YYYY-MM-DD)를 제공해주세요." }, { status: 400 });
  }

  const { data: clinic } = await supabase
    .from("Clinics")
    .select("id")
    .eq("id", clinicId)
    .eq("workspace", session.workspace)
    .single();

  if (!clinic) {
    return NextResponse.json({ error: "클리닉을 찾을 수 없습니다." }, { status: 404 });
  }

  const attendeeStudentIds = attendees.map((a) => a.studentId);
  if (attendeeStudentIds.length > 0) {
    const { data: validStudents } = await supabase
      .from("Users")
      .select("id")
      .in("id", attendeeStudentIds)
      .eq("workspace", session.workspace)
      .eq("role", "student");
    const validStudentIds = new Set((validStudents ?? []).map((s) => s.id));
    if (attendeeStudentIds.some((studentId) => !validStudentIds.has(studentId))) {
      return NextResponse.json({ error: "일부 학생을 찾을 수 없습니다." }, { status: 404 });
    }
  }

  const { data: existingRecords, error: fetchError } = await supabase
    .from("ClinicAttendance")
    .select("id, student_id")
    .eq("clinic_id", clinicId)
    .eq("attendance_date", date);

  if (fetchError) throw fetchError;

  const existingMap = new Map((existingRecords || []).map((r) => [r.student_id, r.id]));
  const newStudentIds = new Set(attendees.map((a) => a.studentId));

  const toDelete = (existingRecords || []).filter((r) => !newStudentIds.has(r.student_id)).map((r) => r.id);
  const toAdd = attendees.filter((a) => !existingMap.has(a.studentId));
  const toUpdate = attendees.filter((a) => existingMap.has(a.studentId));

  if (toDelete.length > 0) {
    const { error: deleteError } = await supabase.from("ClinicAttendance").delete().in("id", toDelete);
    if (deleteError) throw deleteError;
  }

  if (toAdd.length > 0) {
    const records = toAdd.map((a) => ({
      clinic_id: clinicId,
      student_id: a.studentId,
      attendance_date: date,
      status: a.status ?? "attended",
      did_retake_exam: a.retakeExam ?? false,
      did_homework_check: a.homeworkCheck ?? false,
      did_qa: a.qa ?? false,
      is_required: a.isRequired ?? false,
    }));
    const { error: insertError } = await supabase.from("ClinicAttendance").insert(records);
    if (insertError) throw insertError;
  }

  for (const a of toUpdate) {
    const recordId = existingMap.get(a.studentId);
    if (!recordId) continue;
    const { error: updateError } = await supabase
      .from("ClinicAttendance")
      .update({
        status: a.status ?? "attended",
        did_retake_exam: a.retakeExam ?? false,
        did_homework_check: a.homeworkCheck ?? false,
        did_qa: a.qa ?? false,
        is_required: a.isRequired ?? false,
      })
      .eq("id", recordId);
    if (updateError) throw updateError;
  }

  return NextResponse.json({
    success: true,
    deleted: toDelete.length,
    added: toAdd.length,
    updated: toUpdate.length,
  });
};

const handleDelete = async ({ request, supabase, session, params }: ApiContext) => {
  const clinicId = params?.id;
  const { searchParams } = new URL(request.url);
  const attendanceId = searchParams.get("attendanceId");

  if (!attendanceId) {
    return NextResponse.json({ error: "출석 ID가 필요합니다." }, { status: 400 });
  }

  const { data: clinic } = await supabase
    .from("Clinics")
    .select("id")
    .eq("id", clinicId)
    .eq("workspace", session.workspace)
    .single();

  if (!clinic) {
    return NextResponse.json({ error: "클리닉을 찾을 수 없습니다." }, { status: 404 });
  }

  const { error } = await supabase.from("ClinicAttendance").delete().eq("id", attendanceId).eq("clinic_id", clinicId);

  if (error) throw error;
  return NextResponse.json({ success: true });
};

export const GET = withLogging(handleGet, {
  resource: "clinic-attendance",
  action: "read",
  allowedRoles: ["owner", "admin"],
});
export const POST = withLogging(handlePost, {
  resource: "clinic-attendance",
  action: "create",
  allowedRoles: ["owner", "admin"],
});
export const PATCH = withLogging(handlePatch, {
  resource: "clinic-attendance",
  action: "update",
  allowedRoles: ["owner", "admin"],
});
export const DELETE = withLogging(handleDelete, {
  resource: "clinic-attendance",
  action: "delete",
  allowedRoles: ["owner", "admin"],
});
