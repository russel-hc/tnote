export const QUERY_KEYS = {
  auth: {
    me: ["auth", "me"] as const,
  },
  managementStatuses: {
    all: ["management-statuses"] as const,
  },
  home: {
    stats: ["home", "stats"] as const,
  },
  tags: {
    all: ["tags"] as const,
  },
  students: {
    all: ["students"] as const,
    byCourse: (courseId: string) => ["students", "byCourse", courseId] as const,
    detail: (id: string) => ["students", "detail", id] as const,
    forMessages: ["students-for-messages"] as const,
    forAssign: (courseId: string) => ["students-for-assign", courseId] as const,
    enrolledInCourse: (courseId: string) => ["enrolled-students", courseId] as const,
  },
  courses: {
    all: ["courses"] as const,
    forStudentsFilter: ["courses-for-students-filter"] as const,
    forMessages: ["courses-for-messages"] as const,
    forAssign: ["courses-for-assign"] as const,
    detail: (id: string) => ["courses", "detail", id] as const,
  },
  clinics: {
    all: ["clinics"] as const,
    attendance: (clinicId: string, date: string) => ["clinics", "attendance", clinicId, date] as const,
    recentAttendance: ["clinics", "recent-attendance"] as const,
    requiredAbsent: ["clinics", "required-absent"] as const,
  },
  retakes: {
    all: ["retakes"] as const,
    byFilter: (filter: string) => ["retakes", filter] as const,
    history: (retakeId: string) => ["retake-history", retakeId] as const,
    historyAll: ["retake-history-all"] as const,
    forMessages: (status: string, managementStatus: string) =>
      ["retakes-for-messages", status, managementStatus] as const,
  },
  assignments: {
    byCourse: (courseId: string) => ["assignments", "byCourse", courseId] as const,
    submissions: (assignmentId: string) => ["assignments", "submissions", assignmentId] as const,
    forAssign: (courseId: string) => ["assignments-for-assign", courseId] as const,
  },
  assignmentTasks: {
    all: ["assignment-tasks"] as const,
    byFilter: (filter: string) => ["assignment-tasks", filter] as const,
    history: (taskId: string) => ["assignment-task-history", taskId] as const,
    historyAll: ["assignment-task-history-all"] as const,
  },
  exams: {
    byCourse: (courseId: string) => ["exams", courseId] as const,
    forMessages: (courseId: string) => ["exams-for-messages", courseId] as const,
    forAssign: (courseId: string) => ["exams-for-assign", courseId] as const,
    scores: (examId: string) => ["exams", "scores", examId] as const,
    scoresForAssign: (examId: string) => ["exam-scores-for-assign", examId] as const,
    assignments: (examId: string) => ["exams", "assignments", examId] as const,
    export: (examId: string) => ["exam-export", examId] as const,
  },
  consultations: {
    all: ["consultations"] as const,
    byStudent: (studentId: string) => ["consultations", "byStudent", studentId] as const,
    templates: ["consultation-templates"] as const,
  },
  admins: {
    all: ["admins"] as const,
  },
  calendar: {
    all: ["calendarEvents"] as const,
    events: (startDate: string, endDate: string) => ["calendarEvents", startDate, endDate] as const,
  },
  my: {
    retakes: ["my", "retakes"] as const,
    courses: ["my", "courses"] as const,
    assignments: ["my-assignments"] as const,
    calendarEvents: (startDate: string, endDate: string) => ["my", "calendarEvents", startDate, endDate] as const,
  },
  messages: {
    templates: (type: string) => ["message-templates", type] as const,
    senderPhone: ["sender-phone"] as const,
    solapiSettings: ["solapi-settings"] as const,
    history: (type: string, limit: number) => ["message-history", type, limit] as const,
  },
} as const;
