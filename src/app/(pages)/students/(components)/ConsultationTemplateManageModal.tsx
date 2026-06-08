"use client";

import { Trash2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { useConfirm } from "@/shared/components/ui/confirmDialog";
import { Modal } from "@/shared/components/ui/modal";
import type { ConsultationTemplate } from "@/shared/types";

interface ConsultationTemplateManageModalProps {
  isOpen: boolean;
  onClose: () => void;
  templates: ConsultationTemplate[];
  onDelete: (id: string) => void;
}

export default function ConsultationTemplateManageModal({
  isOpen,
  onClose,
  templates,
  onDelete,
}: ConsultationTemplateManageModalProps) {
  const confirm = useConfirm();

  const handleDelete = async (id: string, name: string) => {
    const ok = await confirm({
      title: "템플릿 삭제",
      message: `"${name}" 템플릿을 삭제하시겠습니까?`,
      variant: "danger",
      confirmLabel: "삭제",
    });
    if (ok) onDelete(id);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="템플릿 관리"
      subtitle={`총 ${templates.length}개의 템플릿`}
      footer={
        <Button variant="secondary" className="flex-1" onClick={onClose}>
          닫기
        </Button>
      }>
      {templates.length === 0 ? (
        <p className="py-spacing-400 text-center text-body text-content-standard-tertiary">저장된 템플릿이 없습니다.</p>
      ) : (
        <div className="flex flex-col gap-spacing-300">
          {templates.map((template) => (
            <div
              key={template.id}
              className="flex items-start justify-between gap-spacing-300 rounded-radius-300 border border-line-outline bg-components-fill-standard-secondary p-spacing-400">
              <div className="flex min-w-0 flex-1 flex-col gap-spacing-100">
                <span className="font-semibold text-body text-content-standard-primary">{template.name}</span>
                <p className="line-clamp-2 text-content-standard-tertiary text-footnote">{template.content}</p>
              </div>
              <Button
                variant="danger"
                size="sm"
                onClick={() => handleDelete(template.id, template.name)}
                title="템플릿 삭제">
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
