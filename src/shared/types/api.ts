// --- Exam-related query results ---

export interface ExamWithCourseWorkspace {
  id: string;
  name: string;
  exam_number: number;
  max_score: number;
  cutline: number;
  course: {
    id: string;
    name: string;
    workspace: string;
  };
}

export interface ExamScoreWithStudent {
  student_id: string;
  score: number;
  student: {
    id: string;
    name: string;
    phone_number: string;
    parent_phone_number: string | null;
  };
}

export interface ExamAssignment {
  student_id: string;
  status: string;
}

// --- Calendar-related query results ---

export interface CalendarCourseData {
  id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  days_of_week: number[] | null;
}

export interface CalendarClinicData {
  id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  operating_days: number[];
}

export interface CalendarAttendanceRecord {
  attendance_date: string;
  student_id: string;
  clinic_id?: string;
}

export interface CalendarClinicAttendanceData {
  attendance_date: string;
  student_id: string;
  clinic_id: string;
  status: "attended" | "absent" | null;
  did_retake_exam: boolean | null;
  did_homework_check: boolean | null;
  did_qa: boolean | null;
}

export interface CalendarRetakeData {
  id: string;
  current_scheduled_date: string | null;
  status: string;
  exam: { name: string; course: { name: string } };
  student?: { name: string };
}

export interface CalendarAssignmentTaskData {
  id: string;
  current_scheduled_date: string | null;
  status: string;
  assignment: { name: string; course: { name: string } };
  student?: { name: string };
}

// --- Student Detail query results ---

export interface StudentDetailExamScore {
  id: string;
  score: number;
  created_at: string;
  exam: {
    id: string;
    name: string;
    exam_number: number;
    max_score: number | null;
    cutline: number | null;
    course: {
      id: string;
      name: string;
      workspace: string;
    };
  };
}

export interface StudentDetailClinicAttendance {
  id: string;
  attendance_date: string;
  note: string | null;
  status: "attended" | "absent";
  did_retake_exam: boolean;
  did_homework_check: boolean;
  did_qa: boolean;
  is_required: boolean;
  clinic: {
    id: string;
    name: string;
    workspace: string;
  };
}

export interface StudentDetailEnrollment {
  enrolled_at: string;
  course: {
    id: string;
    name: string;
    start_date: string | null;
    end_date: string | null;
    days_of_week: number[] | null;
  };
}

export interface StudentDetailAssignment {
  id: string;
  status: string;
  updated_at: string;
  assignment: {
    id: string;
    name: string;
    course: {
      id: string;
      name: string;
      workspace: string;
    };
  };
}

export interface StudentDetailRetake {
  id: string;
  status: string;
  management_status: string;
  current_scheduled_date: string | null;
  postpone_count: number;
  absent_count: number;
  exam: {
    id: string;
    name: string;
    exam_number: number;
    course: {
      id: string;
      name: string;
      workspace: string;
    };
  };
}

// --- Message History query results ---

export interface MessageHistoryQueryResult {
  id: string;
  batch_id: string | null;
  group_id: string | null;
  message_type: string;
  recipient_type: string;
  recipient_phone: string;
  recipient_name: string;
  student_id: string;
  message_content: string;
  status_code: string | null;
  status_message: string | null;
  is_success: boolean;
  error_message: string | null;
  sent_by: string;
  sent_at: string | null;
  created_at: string;
  sender: { id: string; name: string } | null;
}

export interface MessageHistoryGroupedBatch {
  batch_id: string;
  message_type: string;
  message_content: string;
  created_at: string;
  sender: { id: string; name: string } | null;
  total_count: number;
  success_count: number;
  fail_count: number;
  recipients: Array<{
    id: string;
    recipient_name: string;
    recipient_phone: string;
    recipient_type: string;
    is_success: boolean;
    error_message: string | null;
  }>;
}
