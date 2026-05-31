export type TagColor =
  | "red"
  | "orange"
  | "yellow"
  | "green"
  | "blue"
  | "indigo"
  | "purple"
  | "pink"
  | "brown"
  | "black"
  | "white";

export interface StudentTag {
  id: string;
  workspace: string;
  name: string;
  color: TagColor;
  hidden_by_default: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface StudentTagAssignment {
  id: string;
  student_id: string;
  tag_id: string;
  start_date: string;
  end_date: string | null;
  created_at?: string;
  tag?: StudentTag;
}

export interface Student {
  id: string;
  phone_number: string;
  name: string;
  parent_phone_number: string | null;
  school: string | null;
  branch: string | null;
  birth_year: number | null;
  required_clinic_weekdays: number[] | null;
  enrolled_at?: string;
  created_at?: string;
  consultation_count?: number;
  tags?: StudentTagAssignment[];
}

export interface Course {
  id: string;
  name: string;
  created_at?: string;
  student_count?: number;
  start_date: string | null;
  end_date: string | null;
  days_of_week: number[] | null;
}

export interface Clinic {
  id: string;
  name: string;
  operating_days: number[];
  start_date?: string;
  end_date?: string;
  created_at: string;
  updated_at: string;
}

export type AttendanceStatus = "attended" | "absent";

export interface AttendanceRecord {
  id: string;
  attendance_date: string;
  note?: string;
  status: AttendanceStatus;
  did_retake_exam: boolean;
  did_homework_check: boolean;
  did_qa: boolean;
  is_required: boolean;
  student: Student;
}

export type StatusColor = "success" | "warning" | "danger" | "info" | "neutral";

export interface ManagementStatusItem {
  id: string;
  name: string;
  display_order: number;
  color: StatusColor;
  created_at?: string;
  updated_at?: string;
}

export type ManagementStatus = string;

export interface Assignment {
  id: string;
  workspace: string;
  course_id: string;
  name: string;
  course?: Pick<Course, "id" | "name">;
  created_at: string;
  updated_at: string;
}

export type AssignmentSubmissionStatus = "완료" | "미흡" | "미제출" | "검사예정" | "결석";

export interface Exam {
  id: string;
  name: string;
  exam_number: number;
  max_score?: number;
  cutline?: number;
  course: Pick<Course, "id" | "name">;
}

export interface RetakeStudent {
  id: string;
  phone_number: string;
  name: string;
  school: string;
  tags?: StudentTagAssignment[];
}

export interface Retake {
  id: string;
  exam_id: string;
  student_id: string;
  current_scheduled_date: string | null;
  status: "pending" | "completed" | "absent";
  management_status: ManagementStatus;
  postpone_count: number;
  absent_count: number;
  note: string | null;
  exam: Pick<Exam, "id" | "name" | "exam_number"> & { course: Pick<Course, "id" | "name"> };
  student: RetakeStudent;
}

export type AssignmentTaskStatus = "pending" | "completed" | "insufficient" | "not_submitted" | "absent";

export interface AssignmentTask {
  id: string;
  assignment_id: string;
  student_id: string;
  current_scheduled_date: string | null;
  status: AssignmentTaskStatus;
  postpone_count: number;
  absent_count: number;
  note: string | null;
  assignment: Pick<Assignment, "id" | "name"> & { course: Pick<Course, "id" | "name"> };
  student: RetakeStudent;
}

export type RetakeActionType =
  | "assign"
  | "postpone"
  | "absent"
  | "complete"
  | "insufficient"
  | "not_submitted"
  | "status_change"
  | "management_status_change"
  | "note_update"
  | "date_edit";

export type AssignmentTaskActionType =
  | "assign"
  | "postpone"
  | "absent"
  | "complete"
  | "insufficient"
  | "not_submitted"
  | "status_change"
  | "note_update"
  | "date_edit";

export interface RetakeHistory {
  id: string;
  action_type: RetakeActionType;
  previous_date: string | null;
  new_date: string | null;
  previous_status: string | null;
  new_status: string | null;
  previous_management_status: string | null;
  new_management_status: string | null;
  note: string | null;
  created_at: string;
  performed_by: {
    id: string;
    name: string;
  } | null;
}

export interface AssignmentTaskHistory {
  id: string;
  action_type: AssignmentTaskActionType;
  previous_date: string | null;
  new_date: string | null;
  previous_status: string | null;
  new_status: string | null;
  note: string | null;
  created_at: string;
  performed_by: {
    id: string;
    name: string;
  } | null;
}

export interface ConsultationLog {
  id: string;
  student_id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface ConsultationWithDetails {
  id: string;
  student_id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
  is_read: boolean;
  student: Pick<Student, "id" | "name" | "phone_number" | "school">;
  creator?: {
    id: string;
    name: string;
  } | null;
  updater?: {
    id: string;
    name: string;
  } | null;
}

export interface Admin {
  id: string;
  phone_number: string;
  name: string;
  role: "owner" | "admin";
  created_at: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  type: "course" | "retake" | "clinic" | "assignment";
  allDay?: boolean;
  start?: Date;
  end?: Date;
  metadata?: Record<string, unknown>;
}

export type RecipientType = "student" | "parent" | "both";

export interface SendMessageRequest {
  recipientType: RecipientType;
  recipientIds: string[];
  text: string;
  subject?: string;
}

export interface SendMessageResponse {
  success: boolean;
  data?: {
    groupId: string;
    total: number;
    successCount: number;
    failCount: number;
  };
  error?: string;
}

export interface ConsultationTemplate {
  id: string;
  name: string;
  content: string;
  created_at: string;
  created_by: string;
}
