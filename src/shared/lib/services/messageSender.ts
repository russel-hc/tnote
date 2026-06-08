import type { SupabaseClient } from "@supabase/supabase-js";
import { removePhoneHyphens } from "@/shared/lib/utils/phone";
import type { RecipientType } from "@/shared/types";
import { type SendSMSResult, type SolapiCredentials, sendSMS } from "./sms";

export interface MessageRecipient {
  phone: string;
  name: string;
  studentId: string;
  targetType: "student" | "parent";
  text: string;
}

export interface MessageHistoryRecord {
  workspace: string;
  batch_id: string;
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
}

export interface SendMessagesParams {
  supabase: SupabaseClient;
  workspace: string;
  userId: string;
  messageType: "general" | "exam" | "retake";
  recipients: MessageRecipient[];
  senderPhoneNumber: string;
  credentials: SolapiCredentials;
}

export interface SendMessagesResult {
  success: boolean;
  total: number;
  successCount: number;
  failCount: number;
  batchId: string;
}

export interface WorkspaceSMSConfig {
  senderPhoneNumber: string;
  credentials: SolapiCredentials;
}

export const getWorkspaceSMSConfig = async (
  supabase: SupabaseClient,
  workspace: string,
): Promise<{ config: WorkspaceSMSConfig | null; error: string | null }> => {
  const { data, error } = await supabase
    .from("Workspaces")
    .select("sender_phone_number, solapi_api_key, solapi_api_secret")
    .eq("id", workspace)
    .single();

  if (error) {
    return { config: null, error: "워크스페이스 정보를 조회할 수 없습니다." };
  }

  if (!data?.solapi_api_key || !data?.solapi_api_secret) {
    return {
      config: null,
      error: "SOLAPI API 키가 설정되지 않았습니다. 문자 관리에서 API 키를 먼저 설정해주세요.",
    };
  }

  if (!data?.sender_phone_number) {
    return {
      config: null,
      error: "발신번호가 설정되지 않았습니다. 문자 관리에서 발신번호를 먼저 설정해주세요.",
    };
  }

  return {
    config: {
      senderPhoneNumber: data.sender_phone_number,
      credentials: {
        apiKey: data.solapi_api_key,
        apiSecret: data.solapi_api_secret,
      },
    },
    error: null,
  };
};

export interface StudentWithPhone {
  id: string;
  name: string;
  phone_number: string;
  parent_phone_number: string | null;
}

export const validateRecipientType = (recipientType: string | undefined): recipientType is RecipientType => {
  return !!recipientType && ["student", "parent", "both"].includes(recipientType);
};

export const buildRecipientList = (
  students: StudentWithPhone[],
  recipientType: RecipientType,
  getMessageText: (student: StudentWithPhone) => string,
): MessageRecipient[] => {
  const recipients: MessageRecipient[] = [];

  for (const student of students) {
    const text = getMessageText(student);

    if (recipientType === "student" || recipientType === "both") {
      const phone = removePhoneHyphens(student.phone_number);
      if (phone) {
        recipients.push({
          phone,
          name: student.name,
          studentId: student.id,
          targetType: "student",
          text,
        });
      }
    }

    if ((recipientType === "parent" || recipientType === "both") && student.parent_phone_number) {
      const parentPhone = removePhoneHyphens(student.parent_phone_number);
      if (parentPhone && !recipients.some((r) => r.phone === parentPhone && r.text === text)) {
        recipients.push({
          phone: parentPhone,
          name: `${student.name} 학부모`,
          studentId: student.id,
          targetType: "parent",
          text,
        });
      }
    }
  }

  return recipients;
};

export const sendMessagesWithHistory = async ({
  supabase,
  workspace,
  userId,
  messageType,
  recipients,
  senderPhoneNumber,
  credentials,
}: SendMessagesParams): Promise<SendMessagesResult> => {
  const batchId = crypto.randomUUID();
  const historyRecords: MessageHistoryRecord[] = [];

  const BATCH_SIZE = 5;
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const batch = recipients.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map((recipient) =>
        sendSMS({
          to: recipient.phone,
          text: recipient.text,
          from: senderPhoneNumber,
          credentials,
        }),
      ),
    );

    for (let j = 0; j < batch.length; j++) {
      const recipient = batch[j];
      const settled = results[j];
      const result: SendSMSResult =
        settled.status === "fulfilled"
          ? settled.value
          : { success: false, error: settled.reason?.message || "발송 실패" };

      historyRecords.push({
        workspace,
        batch_id: batchId,
        group_id: result.groupId || null,
        message_type: messageType,
        recipient_type: recipient.targetType,
        recipient_phone: recipient.phone,
        recipient_name: recipient.name,
        student_id: recipient.studentId,
        message_content: recipient.text,
        status_code: result.statusCode || null,
        status_message: result.statusMessage || null,
        is_success: result.success,
        error_message: result.error || null,
        sent_by: userId,
      });

      if (result.success) {
        successCount++;
      } else {
        failCount++;
      }
    }
  }

  if (historyRecords.length > 0) {
    // Best-effort audit log: the SMS were already dispatched above, so a failed history
    // insert must not fail the send result (it would misreport delivered messages as failed).
    await supabase.from("MessageHistory").insert(historyRecords);
  }

  return {
    success: failCount === 0,
    total: recipients.length,
    successCount,
    failCount,
    batchId,
  };
};
