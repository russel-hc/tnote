import { NextResponse } from "next/server";
import { type ApiContext, withLogging } from "@/shared/lib/api/withLogging";
import { fetchAllRows } from "@/shared/lib/supabase/pagination";
import {
  type CalendarEvent,
  createAssignmentTaskEvent,
  createRetakeEvent,
  generateAdminClinicSessions,
  generateCourseSessions,
} from "@/shared/lib/utils/calendar";
import { STUDENT_ASSIGNMENT_TABLE } from "@/shared/lib/utils/studentAssignments";

import type {
  CalendarAssignmentTaskData,
  CalendarClinicAttendanceData,
  CalendarClinicData,
  CalendarCourseData,
  CalendarRetakeData,
} from "@/shared/types/api";

const fetchCourses = async (supabase: ApiContext["supabase"], workspace: string): Promise<CalendarCourseData[]> => {
  const { data: courses, error } = await supabase
    .from("Courses")
    .select("id, name, start_date, end_date, days_of_week")
    .eq("workspace", workspace)
    .not("start_date", "is", null)
    .not("end_date", "is", null);

  if (error) throw error;
  return (courses as CalendarCourseData[]) || [];
};

const fetchRetakes = async (supabase: ApiContext["supabase"], workspace: string): Promise<CalendarRetakeData[]> => {
  const data = await fetchAllRows<{
    id: string;
    current_scheduled_date: string | null;
    status: string;
    exam: unknown;
    student: unknown;
  }>(() =>
    supabase
      .from("RetakeAssignments")
      .select(`
        id, current_scheduled_date, status,
        student:Users!RetakeAssignments_student_id_fkey!inner(name, workspace),
        exam:Exams!inner(id, name, exam_number, course:Courses!inner(id, name))
      `)
      .eq("student.workspace", workspace)
      .order("id", { ascending: true }),
  );

  return data.map((r) => ({
    id: r.id,
    current_scheduled_date: r.current_scheduled_date,
    status: r.status,
    exam: r.exam as unknown as { name: string; course: { name: string } },
    student: r.student as unknown as { name: string },
  }));
};

const fetchAssignmentTasks = async (
  supabase: ApiContext["supabase"],
  workspace: string,
): Promise<CalendarAssignmentTaskData[]> => {
  const data = await fetchAllRows<{
    id: string;
    current_scheduled_date: string | null;
    status: string;
    assignment: unknown;
    student: unknown;
  }>(() =>
    supabase
      .from(STUDENT_ASSIGNMENT_TABLE)
      .select(`
        id, current_scheduled_date, status,
        student:Users!StudentAssignments_student_id_fkey!inner(name, workspace),
        assignment:Assignments!inner(id, name, course:Courses!inner(id, name))
      `)
      .eq("student.workspace", workspace)
      .order("id", { ascending: true }),
  );

  return data.map((r) => ({
    id: r.id,
    current_scheduled_date: r.current_scheduled_date,
    status: r.status,
    assignment: r.assignment as unknown as { name: string; course: { name: string } },
    student: r.student as unknown as { name: string },
  }));
};

const fetchClinics = async (supabase: ApiContext["supabase"], workspace: string): Promise<CalendarClinicData[]> => {
  const { data, error } = await supabase
    .from("Clinics")
    .select("id, name, start_date, end_date, operating_days")
    .eq("workspace", workspace)
    .not("start_date", "is", null)
    .not("end_date", "is", null);

  if (error) throw error;
  return (data as CalendarClinicData[]) || [];
};

const handleGet = async ({ request, supabase, session }: ApiContext) => {
  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get("start");
  const endDate = searchParams.get("end");

  const events: CalendarEvent[] = [];

  const [courses, retakes, assignmentTasks, clinics, requiredStudentsResult] = await Promise.all([
    fetchCourses(supabase, session.workspace),
    fetchRetakes(supabase, session.workspace),
    fetchAssignmentTasks(supabase, session.workspace),
    fetchClinics(supabase, session.workspace),
    supabase
      .from("Users")
      .select("id, name, required_clinic_weekdays, birth_year")
      .eq("workspace", session.workspace)
      .eq("role", "student")
      .not("required_clinic_weekdays", "is", null),
  ]);

  if (requiredStudentsResult.error) throw requiredStudentsResult.error;
  const requiredStudents = (requiredStudentsResult.data || []) as {
    id: string;
    name: string;
    required_clinic_weekdays: number[];
    birth_year: number | null;
  }[];

  let clinicAttendance: CalendarClinicAttendanceData[] = [];
  if (clinics.length > 0 && requiredStudents.length > 0) {
    let clinicAttendanceQuery = supabase
      .from("ClinicAttendance")
      .select("attendance_date, student_id, clinic_id, status, did_retake_exam, did_homework_check, did_qa")
      .in(
        "clinic_id",
        clinics.map((clinic) => clinic.id),
      )
      .in(
        "student_id",
        requiredStudents.map((student) => student.id),
      );

    if (startDate) {
      clinicAttendanceQuery = clinicAttendanceQuery.gte("attendance_date", startDate);
    }
    if (endDate) {
      clinicAttendanceQuery = clinicAttendanceQuery.lte("attendance_date", endDate);
    }

    const clinicAttendanceResult = await clinicAttendanceQuery;
    if (clinicAttendanceResult.error) throw clinicAttendanceResult.error;
    clinicAttendance = (clinicAttendanceResult.data as CalendarClinicAttendanceData[]) || [];
  }

  for (const course of courses) {
    if (course.start_date && course.end_date && course.days_of_week) {
      events.push(
        ...generateCourseSessions({
          id: course.id,
          name: course.name,
          start_date: course.start_date,
          end_date: course.end_date,
          days_of_week: course.days_of_week,
        }),
      );
    }
  }

  for (const retake of retakes) {
    if (retake.current_scheduled_date) {
      events.push(createRetakeEvent(retake, true));
    }
  }

  for (const task of assignmentTasks) {
    if (task.current_scheduled_date) {
      events.push(createAssignmentTaskEvent(task, true));
    }
  }

  for (const clinic of clinics) {
    if (clinic.start_date && clinic.end_date && clinic.operating_days) {
      events.push(
        ...generateAdminClinicSessions(
          {
            id: clinic.id,
            name: clinic.name,
            start_date: clinic.start_date,
            end_date: clinic.end_date,
            operating_days: clinic.operating_days,
          },
          requiredStudents,
          clinicAttendance.filter((attendance) => attendance.clinic_id === clinic.id),
        ),
      );
    }
  }

  let filteredEvents = events;
  if (startDate && endDate) {
    filteredEvents = events.filter((e) => e.date >= startDate && e.date <= endDate);
  }

  return NextResponse.json({ data: filteredEvents });
};

export const GET = withLogging(handleGet, { resource: "calendar", action: "read", allowedRoles: ["owner", "admin"] });
