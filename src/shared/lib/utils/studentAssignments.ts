import type { AssignmentSubmissionStatus } from "@/shared/types";

export const STUDENT_ASSIGNMENT_TABLE = "StudentAssignments";
export const STUDENT_ASSIGNMENT_HISTORY_TABLE = "StudentAssignmentHistory";

export const STUDENT_ASSIGNMENT_OPEN_STATUSES = ["pending", "absent"] as const;

export type StudentAssignmentStatus = "pending" | "completed" | "absent" | "insufficient" | "not_submitted";

const SUBMISSION_STATUS_TO_STUDENT_ASSIGNMENT_STATUS: Record<AssignmentSubmissionStatus, StudentAssignmentStatus> = {
  완료: "completed",
  미흡: "insufficient",
  미제출: "not_submitted",
  검사예정: "pending",
  결석: "absent",
};

const STUDENT_ASSIGNMENT_STATUS_TO_SUBMISSION_STATUS: Record<StudentAssignmentStatus, AssignmentSubmissionStatus> = {
  pending: "검사예정",
  absent: "결석",
  completed: "완료",
  insufficient: "미흡",
  not_submitted: "미제출",
};

export const toStudentAssignmentStatus = (status: string): StudentAssignmentStatus => {
  if (status in SUBMISSION_STATUS_TO_STUDENT_ASSIGNMENT_STATUS) {
    return SUBMISSION_STATUS_TO_STUDENT_ASSIGNMENT_STATUS[status as AssignmentSubmissionStatus];
  }

  if (status in STUDENT_ASSIGNMENT_STATUS_TO_SUBMISSION_STATUS) {
    return status as StudentAssignmentStatus;
  }

  return "pending";
};

export const toAssignmentSubmissionStatus = (status: string): AssignmentSubmissionStatus => {
  if (status in STUDENT_ASSIGNMENT_STATUS_TO_SUBMISSION_STATUS) {
    return STUDENT_ASSIGNMENT_STATUS_TO_SUBMISSION_STATUS[status as StudentAssignmentStatus];
  }

  if (status in SUBMISSION_STATUS_TO_STUDENT_ASSIGNMENT_STATUS) {
    return status as AssignmentSubmissionStatus;
  }

  return "검사예정";
};

const parseClassDate = (assignmentName: string): Date => {
  const koreaFormatter = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" });
  const koreaToday = new Date(`${koreaFormatter.format(new Date())}T12:00:00`);

  const match = assignmentName.match(/^(\d{1,2})\/(\d{1,2})/);
  if (!match) return koreaToday;

  const month = Number.parseInt(match[1], 10);
  const day = Number.parseInt(match[2], 10);
  const classDate = new Date(koreaToday.getFullYear(), month - 1, day, 12, 0, 0);

  const threeMonthsLater = new Date(koreaToday);
  threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);
  if (classDate > threeMonthsLater) {
    classDate.setFullYear(classDate.getFullYear() - 1);
  }

  return classDate;
};

export const getDefaultStudentAssignmentDate = (
  clinicWeekdays: number[] | null | undefined,
  assignmentName: string,
): string | null => {
  if (!clinicWeekdays || clinicWeekdays.length === 0) return null;

  const classDay = parseClassDate(assignmentName);
  const oneWeekLater = new Date(classDay);
  oneWeekLater.setDate(classDay.getDate() + 7);

  for (let i = 1; i <= 7; i++) {
    const date = new Date(oneWeekLater);
    date.setDate(oneWeekLater.getDate() + i);
    if (clinicWeekdays.includes(date.getDay())) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    }
  }

  return null;
};
