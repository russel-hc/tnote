"use client";

import { useEffect, useState } from "react";
import { Badge, Button, Modal, SearchInput } from "@/shared/components/ui";
import {
  StudentListContainer,
  StudentListEmpty,
  StudentListItem,
  StudentListSkeleton,
  type StudentListStudent,
} from "@/shared/components/ui/studentList";
import { useToast } from "@/shared/hooks/useToast";
import { getErrorMessage } from "@/shared/lib/utils/error";
import { useAssignmentTaskAssign } from "../(hooks)/useAssignmentTaskAssign";

interface ExistingSubmission {
  student: { id: string };
  status: string;
}

interface SubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  assignment: { id: string; name: string } | null;
  students: StudentListStudent[];
  isLoading: boolean;
  existingSubmissions: ExistingSubmission[];
}

const SUBMISSION_STATUS_META = {
  완료: { variant: "success", label: "완료" },
  미흡: { variant: "danger", label: "미흡" },
  미제출: { variant: "danger", label: "미제출" },
  결석: { variant: "danger", label: "결석" },
  검사예정: { variant: "warning", label: "검사예정" },
  미배정: { variant: "neutral", label: "미배정" },
} as const;

export function SubmissionModal({
  isOpen,
  onClose,
  assignment,
  students,
  isLoading,
  existingSubmissions,
}: SubmissionModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [submissionStatuses, setSubmissionStatuses] = useState<Record<string, string>>({});
  const toast = useToast();
  const { assignTasks, isPending: isAssigning } = useAssignmentTaskAssign();

  useEffect(() => {
    if (isOpen && students.length > 0) {
      const initialSubmissions: Record<string, string> = {};
      for (const student of students) {
        initialSubmissions[student.id] = "미배정";
      }
      for (const submission of existingSubmissions) {
        initialSubmissions[submission.student.id] = submission.status;
      }
      setSubmissionStatuses(initialSubmissions);
    } else if (isOpen) {
      setSubmissionStatuses({});
    }
  }, [isOpen, existingSubmissions, students]);

  const handleClose = () => {
    setSearchQuery("");
    setSubmissionStatuses({});
    onClose();
  };

  const handleAssign = async () => {
    if (!assignment) return;

    const assignedStudentIds = new Set(existingSubmissions.map((submission) => submission.student.id));
    const unassignedStudentIds = students
      .filter((student) => !assignedStudentIds.has(student.id))
      .map((student) => student.id);

    if (unassignedStudentIds.length === 0) {
      toast.info("미배정 학생이 없습니다.");
      return;
    }

    try {
      await assignTasks({ assignmentId: assignment.id, studentIds: unassignedStudentIds });
      toast.success(`${unassignedStudentIds.length}명의 학생을 추가 배정했습니다.`);
    } catch (error) {
      if (error instanceof Error && error.message === "CONFLICT") {
        toast.error("이미 배정된 학생이 포함되어 있습니다.");
      } else {
        toast.error(getErrorMessage(error, "과제 할당에 실패했습니다."));
      }
    }
  };

  if (!assignment) return null;

  const filteredStudents = students
    .filter((student) => student.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name, "ko"));

  const submissionCount = Object.values(submissionStatuses).filter((v) => v !== "").length;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="제출 현황 확인"
      subtitle={assignment.name}
      footer={
        <div className="flex w-full flex-col gap-spacing-300">
          <div className="flex flex-col gap-spacing-100 text-body">
            <span className="text-content-standard-secondary">입력: {submissionCount}명</span>
            <span className="text-content-standard-tertiary text-footnote">
              상태 변경은 과제 관리 페이지에서만 가능합니다.
            </span>
          </div>
          <div className="flex gap-spacing-300">
            <Button variant="secondary" onClick={handleClose} className="flex-1">
              취소
            </Button>
            <Button
              variant="secondary"
              onClick={handleAssign}
              disabled={isAssigning}
              isLoading={isAssigning}
              loadingText="할당 중..."
              className="flex-1">
              미배정 학생 배정
            </Button>
          </div>
        </div>
      }>
      {isLoading ? (
        <div className="flex flex-col gap-spacing-400">
          <div className="h-12 animate-pulse rounded-radius-300 bg-components-fill-standard-secondary" />
          <StudentListContainer>
            <StudentListSkeleton count={6} showCheckbox={false} showRightContent />
          </StudentListContainer>
        </div>
      ) : students.length === 0 ? (
        <StudentListContainer>
          <StudentListEmpty message="수강생이 없습니다." />
        </StudentListContainer>
      ) : (
        <div className="flex flex-col gap-spacing-400">
          <SearchInput
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="학생 검색..."
          />

          <StudentListContainer>
            {filteredStudents.length === 0 ? (
              <StudentListEmpty message="검색 결과가 없습니다." />
            ) : (
              filteredStudents.map((student) => {
                const currentStatus = submissionStatuses[student.id] || "미배정";
                const statusMeta =
                  SUBMISSION_STATUS_META[currentStatus as keyof typeof SUBMISSION_STATUS_META] ??
                  SUBMISSION_STATUS_META["미배정"];

                return (
                  <StudentListItem
                    key={student.id}
                    student={student}
                    rightContent={
                      <Badge variant={statusMeta.variant} size="sm">
                        {statusMeta.label}
                      </Badge>
                    }
                  />
                );
              })
            )}
          </StudentListContainer>
        </div>
      )}
    </Modal>
  );
}
