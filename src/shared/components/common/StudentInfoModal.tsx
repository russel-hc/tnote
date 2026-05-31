"use client";

import Link from "next/link";

import type { AssignmentTaskHistoryInfo, StudentDetail } from "@/app/(pages)/students/(hooks)/useStudentDetail";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Modal } from "@/shared/components/ui/modal";
import { formatClinicWeekdays, formatCourseDaysOfWeek, formatLocaleDateKorean } from "@/shared/lib/utils/date";
import { formatPhoneNumber } from "@/shared/lib/utils/phone";
import { getGrade } from "@/shared/lib/utils/student";
import { isTagActive } from "@/shared/lib/utils/tags";
import { StudentInfoSkeleton } from "./StudentInfoSkeleton";

const RETAKE_STATUS_LABELS: Record<string, string> = {
  pending: "대기",
  completed: "완료",
  absent: "결석",
};

interface StudentInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentId: string;
  studentDetail: StudentDetail | null | undefined;
  isLoading: boolean;
}

export default function StudentInfoModal({
  isOpen,
  onClose,
  studentId,
  studentDetail,
  isLoading,
}: StudentInfoModalProps) {
  const examScores = studentDetail?.examScores || [];
  const assignmentHistory = studentDetail?.assignmentHistory || [];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={studentDetail?.student.name || "학생 정보"}
      subtitle="학생 상세 정보"
      footer={
        <div className="flex w-full gap-spacing-300">
          <Button variant="secondary" onClick={onClose} className="flex-1">
            닫기
          </Button>
          <Link href={`/students/${studentId}`} className="flex-1" onClick={onClose}>
            <Button className="w-full">상세 페이지</Button>
          </Link>
        </div>
      }>
      {isLoading ? (
        <StudentInfoSkeleton />
      ) : !studentDetail ? (
        <div className="py-spacing-900 text-center text-content-standard-tertiary">학생 정보를 불러올 수 없습니다.</div>
      ) : (
        <div className="flex flex-col gap-spacing-600">
          <section className="flex flex-col gap-spacing-300">
            <h3 className="font-semibold text-body text-content-standard-primary">기본 정보</h3>
            <div className="grid grid-cols-2 gap-spacing-300 rounded-radius-400 border border-line-outline bg-components-fill-standard-secondary p-spacing-500">
              <div className="flex flex-col gap-spacing-50">
                <span className="text-content-standard-tertiary text-footnote">이름</span>
                <span className="font-medium text-body text-content-standard-primary">
                  {studentDetail.student.name}
                </span>
              </div>
              <div className="flex flex-col gap-spacing-50">
                <span className="text-content-standard-tertiary text-footnote">전화번호</span>
                <span className="font-medium text-body text-content-standard-primary">
                  {formatPhoneNumber(studentDetail.student.phoneNumber)}
                </span>
              </div>
              <div className="flex flex-col gap-spacing-50">
                <span className="text-content-standard-tertiary text-footnote">학부모 번호</span>
                <span className="font-medium text-body text-content-standard-primary">
                  {studentDetail.student.parentPhoneNumber
                    ? formatPhoneNumber(studentDetail.student.parentPhoneNumber)
                    : "-"}
                </span>
              </div>
              <div className="flex flex-col gap-spacing-50">
                <span className="text-content-standard-tertiary text-footnote">학교</span>
                <span className="font-medium text-body text-content-standard-primary">
                  {studentDetail.student.school || "-"}
                </span>
              </div>
              <div className="flex flex-col gap-spacing-50">
                <span className="text-content-standard-tertiary text-footnote">학년</span>
                <span className="font-medium text-body text-content-standard-primary">
                  {getGrade(studentDetail.student.birthYear) || "-"}
                </span>
              </div>
              <div className="flex flex-col gap-spacing-50">
                <span className="text-content-standard-tertiary text-footnote">등록일</span>
                <span className="font-medium text-body text-content-standard-primary">
                  {formatLocaleDateKorean(studentDetail.student.createdAt)}
                </span>
              </div>
              {studentDetail.student.requiredClinicWeekdays &&
                studentDetail.student.requiredClinicWeekdays.length > 0 && (
                  <div className="col-span-2 flex flex-col gap-spacing-50">
                    <span className="text-content-standard-tertiary text-footnote">클리닉 필참요일</span>
                    <span className="font-medium text-body text-content-standard-primary">
                      {formatClinicWeekdays(studentDetail.student.requiredClinicWeekdays)}
                    </span>
                  </div>
                )}
              {(() => {
                const activeTags = (studentDetail.student.tags || []).filter((assignment) =>
                  isTagActive(assignment.start_date, assignment.end_date),
                );
                if (activeTags.length === 0) return null;
                return (
                  <div className="col-span-2 flex flex-col gap-spacing-50">
                    <span className="text-content-standard-tertiary text-footnote">태그</span>
                    <div className="flex flex-wrap items-center gap-spacing-100">
                      {activeTags.map((assignment) => (
                        <Badge key={assignment.id} variant={assignment.tag?.color} size="xs">
                          {assignment.tag?.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          </section>

          <section className="flex flex-col gap-spacing-300">
            <h3 className="font-semibold text-body text-content-standard-primary">수강 중인 수업</h3>
            {studentDetail.courses.length === 0 ? (
              <div className="rounded-radius-400 border border-line-outline bg-components-fill-standard-secondary p-spacing-500 text-center text-content-standard-tertiary text-footnote">
                수강 중인 수업이 없습니다.
              </div>
            ) : (
              <div className="divide-y divide-line-divider rounded-radius-400 border border-line-outline">
                {studentDetail.courses.map((course) => (
                  <div
                    key={course.id}
                    className="flex items-center justify-between gap-spacing-300 bg-components-fill-standard-secondary px-spacing-500 py-spacing-400">
                    <div className="flex min-w-0 flex-1 flex-col gap-spacing-50">
                      <span className="truncate font-medium text-body text-content-standard-primary">
                        {course.name}
                      </span>
                      <span className="text-content-standard-tertiary text-footnote">
                        등록: {formatLocaleDateKorean(course.enrolled_at)}
                      </span>
                    </div>
                    <Badge variant="blue" size="xs">
                      {formatCourseDaysOfWeek(course.days_of_week)}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="flex flex-col gap-spacing-300">
            <h3 className="font-semibold text-body text-content-standard-primary">
              시험 성적
              {examScores.length > 0 && (
                <span className="ml-spacing-100 font-normal text-content-standard-tertiary">
                  ({Math.min(5, examScores.length)}/{examScores.length}개)
                </span>
              )}
            </h3>
            {examScores.length === 0 ? (
              <div className="rounded-radius-400 border border-line-outline bg-components-fill-standard-secondary p-spacing-500 text-center text-content-standard-tertiary text-footnote">
                시험 기록이 없습니다.
              </div>
            ) : (
              <div className="divide-y divide-line-divider rounded-radius-400 border border-line-outline">
                {examScores.slice(0, 5).map((score) => {
                  const isPassed = score.cutline !== null && score.score >= score.cutline;
                  const isFailed = score.cutline !== null && score.score < score.cutline;
                  return (
                    <div
                      key={score.id}
                      className="flex items-center justify-between gap-spacing-300 bg-components-fill-standard-secondary px-spacing-500 py-spacing-300">
                      <div className="flex min-w-0 flex-1 flex-col gap-spacing-50">
                        <span className="truncate font-medium text-body text-content-standard-primary">
                          {score.exam.course.name} - {score.exam.name}
                        </span>
                        <span className="text-content-standard-tertiary text-footnote">
                          {score.score}
                          {score.maxScore !== null && `/${score.maxScore}`}점 · {score.rank}/{score.totalStudents}등
                        </span>
                      </div>
                      <div className="flex shrink-0 items-center gap-spacing-200">
                        <Badge variant="blue" size="xs">
                          {score.exam.examNumber}회차
                        </Badge>
                        {isPassed && (
                          <Badge variant="success" size="xs">
                            통과
                          </Badge>
                        )}
                        {isFailed && (
                          <Badge variant="danger" size="xs">
                            재시험
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="flex flex-col gap-spacing-300">
            <h3 className="font-semibold text-body text-content-standard-primary">
              과제 현황
              {assignmentHistory.length > 0 && (
                <span className="ml-spacing-100 font-normal text-content-standard-tertiary">
                  ({Math.min(5, assignmentHistory.length)}/{assignmentHistory.length}개)
                </span>
              )}
            </h3>
            {assignmentHistory.length === 0 ? (
              <div className="rounded-radius-400 border border-line-outline bg-components-fill-standard-secondary p-spacing-500 text-center text-content-standard-tertiary text-footnote">
                과제 기록이 없습니다.
              </div>
            ) : (
              <div className="divide-y divide-line-divider rounded-radius-400 border border-line-outline">
                {assignmentHistory.slice(0, 5).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-spacing-300 bg-components-fill-standard-secondary px-spacing-500 py-spacing-300">
                    <div className="flex min-w-0 flex-1 flex-col gap-spacing-50">
                      <span className="truncate font-medium text-body text-content-standard-primary">
                        {item.assignment.course.name} - {item.assignment.name}
                      </span>
                    </div>
                    <Badge
                      variant={item.status === "완료" ? "success" : item.status === "검사예정" ? "warning" : "danger"}
                      size="xs">
                      {item.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="flex flex-col gap-spacing-300">
            <h3 className="font-semibold text-body text-content-standard-primary">
              최근 클리닉 출석
              {studentDetail.clinicHistory.length > 0 && (
                <span className="ml-spacing-100 font-normal text-content-standard-tertiary">
                  ({Math.min(5, studentDetail.clinicHistory.length)}/{studentDetail.clinicHistory.length}개)
                </span>
              )}
            </h3>
            {studentDetail.clinicHistory.length === 0 ? (
              <div className="rounded-radius-400 border border-line-outline bg-components-fill-standard-secondary p-spacing-500 text-center text-content-standard-tertiary text-footnote">
                클리닉 출석 기록이 없습니다.
              </div>
            ) : (
              <div className="divide-y divide-line-divider rounded-radius-400 border border-line-outline">
                {studentDetail.clinicHistory.slice(0, 5).map((history) => {
                  const activities = [
                    history.didRetakeExam && "재시험",
                    history.didHomeworkCheck && "숙제검사",
                    history.didQa && "질의응답",
                  ].filter(Boolean);
                  return (
                    <div
                      key={history.id}
                      className="flex items-center justify-between gap-spacing-300 bg-components-fill-standard-secondary px-spacing-500 py-spacing-300">
                      <div className="flex min-w-0 flex-1 items-center gap-spacing-300">
                        <span className="shrink-0 text-content-standard-tertiary text-footnote">
                          {new Date(history.attendanceDate).toLocaleDateString("ko-KR", {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                        <span className="truncate text-body text-content-standard-primary">{history.clinic.name}</span>
                        {history.isRequired && <span className="shrink-0 text-core-accent text-footnote">필참</span>}
                      </div>
                      <div className="flex shrink-0 items-center gap-spacing-200">
                        <Badge variant={history.status === "absent" ? "danger" : "success"} size="xs">
                          {history.status === "absent" ? "결석" : "출석"}
                        </Badge>
                        {activities.length > 0 && (
                          <span className="text-content-standard-tertiary text-footnote">{activities.join(", ")}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="flex flex-col gap-spacing-300">
            <h3 className="font-semibold text-body text-content-standard-primary">
              최근 재시험
              {studentDetail.retakeHistory.length > 0 && (
                <span className="ml-spacing-100 font-normal text-content-standard-tertiary">
                  ({Math.min(5, studentDetail.retakeHistory.length)}/{studentDetail.retakeHistory.length}개)
                </span>
              )}
            </h3>
            {studentDetail.retakeHistory.length === 0 ? (
              <div className="rounded-radius-400 border border-line-outline bg-components-fill-standard-secondary p-spacing-500 text-center text-content-standard-tertiary text-footnote">
                재시험 기록이 없습니다.
              </div>
            ) : (
              <div className="divide-y divide-line-divider rounded-radius-400 border border-line-outline">
                {studentDetail.retakeHistory.slice(0, 5).map((retake) => (
                  <div
                    key={retake.id}
                    className="flex items-center justify-between gap-spacing-300 bg-components-fill-standard-secondary px-spacing-500 py-spacing-400">
                    <div className="flex min-w-0 flex-1 flex-col gap-spacing-50">
                      <span className="truncate font-medium text-body text-content-standard-primary">
                        {retake.exam.course.name} - {retake.exam.name}
                      </span>
                      <div className="flex items-center gap-spacing-200 text-content-standard-tertiary text-footnote">
                        <span>
                          {retake.scheduledDate
                            ? new Date(retake.scheduledDate).toLocaleDateString("ko-KR", {
                                month: "long",
                                day: "numeric",
                              })
                            : "날짜 미정"}
                        </span>
                        {(retake.postponeCount > 0 || retake.absentCount > 0) && (
                          <span className="text-content-standard-quaternary">
                            {retake.postponeCount > 0 && `연기 ${retake.postponeCount}회`}
                            {retake.postponeCount > 0 && retake.absentCount > 0 && " / "}
                            {retake.absentCount > 0 && `결석 ${retake.absentCount}회`}
                          </span>
                        )}
                      </div>
                    </div>
                    <Badge
                      variant={
                        retake.status === "completed" ? "success" : retake.status === "absent" ? "danger" : "warning"
                      }
                      size="xs">
                      {RETAKE_STATUS_LABELS[retake.status]}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </section>

          {studentDetail.assignmentTaskHistory && studentDetail.assignmentTaskHistory.length > 0 && (
            <section className="flex flex-col gap-spacing-300">
              <h3 className="font-semibold text-body text-content-standard-primary">
                과제 관리
                <span className="ml-spacing-100 font-normal text-content-standard-tertiary">
                  ({Math.min(5, studentDetail.assignmentTaskHistory.length)}/
                  {studentDetail.assignmentTaskHistory.length}개)
                </span>
              </h3>
              <div className="divide-y divide-line-divider rounded-radius-400 border border-line-outline">
                {(studentDetail.assignmentTaskHistory as AssignmentTaskHistoryInfo[]).slice(0, 5).map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between gap-spacing-300 bg-components-fill-standard-secondary px-spacing-500 py-spacing-400">
                    <div className="flex min-w-0 flex-1 flex-col gap-spacing-50">
                      <span className="truncate font-medium text-body text-content-standard-primary">
                        {task.assignment.course.name} - {task.assignment.name}
                      </span>
                      <div className="flex items-center gap-spacing-200 text-content-standard-tertiary text-footnote">
                        <span>
                          {task.scheduledDate
                            ? new Date(task.scheduledDate).toLocaleDateString("ko-KR", {
                                month: "long",
                                day: "numeric",
                              })
                            : "날짜 미정"}
                        </span>
                        {(task.postponeCount > 0 || task.absentCount > 0) && (
                          <span className="text-content-standard-quaternary">
                            {task.postponeCount > 0 && `연기 ${task.postponeCount}회`}
                            {task.postponeCount > 0 && task.absentCount > 0 && " / "}
                            {task.absentCount > 0 && `결석 ${task.absentCount}회`}
                          </span>
                        )}
                      </div>
                    </div>
                    <Badge
                      variant={
                        task.status === "completed" ? "success" : task.status === "pending" ? "warning" : "danger"
                      }
                      size="xs">
                      {(
                        {
                          completed: "완료",
                          pending: "검사예정",
                          insufficient: "미흡",
                          not_submitted: "미제출",
                          absent: "결석",
                        } as Record<string, string>
                      )[task.status] ?? task.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </Modal>
  );
}
