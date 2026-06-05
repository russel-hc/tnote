import { NextResponse } from "next/server";
import { type ApiContext, withLogging } from "@/shared/lib/api/withLogging";
import { parseDatePrefix } from "@/shared/lib/utils/sort";
import { STUDENT_ASSIGNMENT_TABLE, toAssignmentSubmissionStatus } from "@/shared/lib/utils/studentAssignments";
import type {
  StudentDetailAssignment,
  StudentDetailClinicAttendance,
  StudentDetailEnrollment,
  StudentDetailExamScore,
  StudentDetailRetake,
} from "@/shared/types/api";

const handleGet = async ({ supabase, session, params }: ApiContext) => {
  const studentId = params?.id;
  if (!studentId) {
    return NextResponse.json({ error: "학생 ID가 필요합니다." }, { status: 400 });
  }

  const { data: student, error: studentError } = await supabase
    .from("Users")
    .select("id, phone_number, name, parent_phone_number, school, birth_year, created_at, required_clinic_weekdays")
    .eq("id", studentId)
    .eq("workspace", session.workspace)
    .single();

  if (studentError || !student) {
    return NextResponse.json({ error: "학생을 찾을 수 없습니다." }, { status: 404 });
  }

  interface TagAssignmentRow {
    id: string;
    start_date: string;
    end_date: string | null;
    tag: { id: string; name: string; color: string; workspace: string };
  }

  const baseQueries = [
    supabase
      .from("StudentTagAssignments")
      .select(`
          id,
          start_date,
          end_date,
          tag:StudentTags!inner(id, name, color, workspace)
        `)
      .eq("student_id", studentId)
      .eq("tag.workspace", session.workspace),
    supabase
      .from("CourseEnrollments")
      .select(`
          enrolled_at,
          course:Courses!inner(id, name, start_date, end_date, days_of_week)
        `)
      .eq("student_id", studentId)
      .eq("course.workspace", session.workspace),
    supabase
      .from("ExamScores")
      .select(`
          id,
          score,
          created_at,
          exam:Exams!inner(
            id,
            name,
            exam_number,
            max_score,
            cutline,
            course:Courses!inner(id, name, workspace)
          )
        `)
      .eq("student_id", studentId)
      .eq("exam.course.workspace", session.workspace),
    supabase
      .from("ClinicAttendance")
      .select(`
          id,
          attendance_date,
          note,
          status,
          did_retake_exam,
          did_homework_check,
          did_qa,
          is_required,
          clinic:Clinics!inner(id, name, workspace)
        `)
      .eq("student_id", studentId)
      .eq("clinic.workspace", session.workspace)
      .order("attendance_date", { ascending: false }),
    supabase
      .from(STUDENT_ASSIGNMENT_TABLE)
      .select(`
          id,
          status,
          updated_at,
          assignment:Assignments!inner(
            id,
            name,
            course:Courses!inner(id, name, workspace)
          )
        `)
      .eq("student_id", studentId)
      .eq("assignment.course.workspace", session.workspace),
    supabase
      .from("RetakeAssignments")
      .select(`
          id,
          status,
          management_status,
          current_scheduled_date,
          postpone_count,
          absent_count,
          exam:Exams!inner(
            id,
            name,
            exam_number,
            course:Courses!inner(id, name, workspace)
          )
        `)
      .eq("student_id", studentId)
      .eq("exam.course.workspace", session.workspace),
  ] as const;

  const [tagResult, enrollmentResult, examScoreResult, clinicResult, assignmentResult, retakeResult] =
    await Promise.all(baseQueries);

  if (tagResult.error) throw tagResult.error;
  if (enrollmentResult.error) throw enrollmentResult.error;
  if (examScoreResult.error) throw examScoreResult.error;
  if (clinicResult.error) throw clinicResult.error;
  if (assignmentResult.error) throw assignmentResult.error;
  if (retakeResult.error) throw retakeResult.error;

  const [consultationResult, messageResult] = await Promise.all([
    supabase
      .from("ConsultationLogs")
      .select(`
          id,
          title,
          content,
          created_at,
          creator:Users!ConsultationLogs_created_by_fkey(id, name)
        `)
      .eq("student_id", studentId)
      .eq("workspace", session.workspace)
      .order("created_at", { ascending: false }),
    supabase
      .from("MessageHistory")
      .select(`
          id,
          message_type,
          recipient_type,
          recipient_phone,
          message_content,
          is_success,
          sent_at,
          sender:Users!MessageHistory_sent_by_fkey(id, name)
        `)
      .eq("student_id", studentId)
      .eq("workspace", session.workspace)
      .order("sent_at", { ascending: false }),
  ]);

  if (consultationResult.error) throw consultationResult.error;
  if (messageResult.error) throw messageResult.error;

  const tags = ((tagResult.data as unknown as TagAssignmentRow[]) || []).map((assignment) => ({
    id: assignment.id,
    start_date: assignment.start_date,
    end_date: assignment.end_date,
    tag: {
      id: assignment.tag.id,
      name: assignment.tag.name,
      color: assignment.tag.color,
    },
  }));

  const courses = ((enrollmentResult.data as unknown as StudentDetailEnrollment[]) || []).map((e) => ({
    ...e.course,
    enrolled_at: e.enrolled_at,
  }));

  const examScores = (examScoreResult.data as unknown as StudentDetailExamScore[]) || [];
  const examIds = [...new Set(examScores.map((s) => s.exam.id))];

  const statsMap = new Map<string, { rank: number; total: number; average: number; median: number; highest: number }>();
  if (examIds.length > 0) {
    const { data: allScoresForExams, error: rankError } = await supabase
      .from("ExamScores")
      .select("exam_id, score")
      .in("exam_id", examIds);

    if (rankError) throw rankError;

    const scoresByExam = new Map<string, number[]>();
    for (const row of allScoresForExams || []) {
      const scores = scoresByExam.get(row.exam_id) || [];
      scores.push(row.score);
      scoresByExam.set(row.exam_id, scores);
    }

    for (const scoreData of examScores) {
      const scores = scoresByExam.get(scoreData.exam.id) || [];
      const total = scores.length;
      const rank = scores.filter((s) => s > scoreData.score).length + 1;
      const average = total > 0 ? Math.round((scores.reduce((sum, sc) => sum + sc, 0) / total) * 10) / 10 : 0;
      const highest = total > 0 ? Math.max(...scores) : 0;
      const sorted = [...scores].sort((a, b) => a - b);
      const median =
        total > 0
          ? total % 2 === 1
            ? sorted[Math.floor(total / 2)]
            : Math.round(((sorted[total / 2 - 1] + sorted[total / 2]) / 2) * 10) / 10
          : 0;
      statsMap.set(scoreData.id, { rank, total, average, median, highest });
    }
  }

  const scoresWithRank = examScores
    .map((scoreData) => {
      const stats = statsMap.get(scoreData.id) || { rank: 1, total: 1, average: 0, median: 0, highest: 0 };
      return {
        id: scoreData.id,
        score: scoreData.score,
        maxScore: scoreData.exam.max_score,
        cutline: scoreData.exam.cutline,
        rank: stats.rank,
        totalStudents: stats.total,
        average: stats.average,
        median: stats.median,
        highest: stats.highest,
        createdAt: scoreData.created_at,
        exam: {
          id: scoreData.exam.id,
          name: scoreData.exam.name,
          examNumber: scoreData.exam.exam_number,
          course: {
            id: scoreData.exam.course.id,
            name: scoreData.exam.course.name,
          },
        },
      };
    })
    .sort((a, b) => parseDatePrefix(b.exam.name) - parseDatePrefix(a.exam.name));

  const clinicHistory = ((clinicResult.data as unknown as StudentDetailClinicAttendance[]) || []).map((record) => ({
    id: record.id,
    attendanceDate: record.attendance_date,
    note: record.note,
    status: record.status,
    didRetakeExam: record.did_retake_exam,
    didHomeworkCheck: record.did_homework_check,
    didQa: record.did_qa,
    isRequired: record.is_required,
    clinic: {
      id: record.clinic.id,
      name: record.clinic.name,
    },
  }));

  const assignmentHistory = ((assignmentResult.data as unknown as StudentDetailAssignment[]) || [])
    .map((record) => ({
      id: record.id,
      status: toAssignmentSubmissionStatus(record.status),
      assignment: {
        id: record.assignment.id,
        name: record.assignment.name,
        course: {
          id: record.assignment.course.id,
          name: record.assignment.course.name,
        },
      },
    }))
    .sort((a, b) => parseDatePrefix(a.assignment.name) - parseDatePrefix(b.assignment.name));

  const retakeHistory = ((retakeResult.data as unknown as StudentDetailRetake[]) || [])
    .map((record) => ({
      id: record.id,
      status: record.status,
      managementStatus: record.management_status,
      scheduledDate: record.current_scheduled_date,
      postponeCount: record.postpone_count,
      absentCount: record.absent_count,
      exam: {
        id: record.exam.id,
        name: record.exam.name,
        examNumber: record.exam.exam_number,
        course: {
          id: record.exam.course.id,
          name: record.exam.course.name,
        },
      },
    }))
    .sort((a, b) => {
      if (!a.scheduledDate && !b.scheduledDate) return 0;
      if (!a.scheduledDate) return 1;
      if (!b.scheduledDate) return -1;
      return new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime();
    });

  interface ConsultationRow {
    id: string;
    title: string;
    content: string;
    created_at: string;
    creator: { id: string; name: string } | null;
  }

  const consultationHistory = ((consultationResult.data as unknown as ConsultationRow[]) || []).map((record) => ({
    id: record.id,
    title: record.title,
    content: record.content,
    createdAt: record.created_at,
    creator: record.creator,
  }));

  interface MessageRow {
    id: string;
    message_type: string;
    recipient_type: string;
    recipient_phone: string;
    message_content: string;
    is_success: boolean;
    sent_at: string;
    sender: { id: string; name: string } | null;
  }

  const messageHistory = ((messageResult.data as unknown as MessageRow[]) || []).map((record) => ({
    id: record.id,
    messageType: record.message_type,
    recipientType: record.recipient_type,
    recipientPhone: record.recipient_phone,
    messageContent: record.message_content,
    isSuccess: record.is_success,
    sentAt: record.sent_at,
    sender: record.sender,
  }));

  return NextResponse.json({
    data: {
      student: {
        id: student.id,
        phoneNumber: student.phone_number,
        name: student.name,
        parentPhoneNumber: student.parent_phone_number,
        school: student.school,
        birthYear: student.birth_year,
        createdAt: student.created_at,
        requiredClinicWeekdays: student.required_clinic_weekdays,
        tags,
      },
      courses,
      examScores: scoresWithRank,
      clinicHistory,
      assignmentHistory,
      retakeHistory,
      consultationHistory,
      messageHistory,
    },
  });
};

export const GET = withLogging(handleGet, {
  resource: "student-detail",
  action: "read",
  allowedRoles: ["owner", "admin"],
});
