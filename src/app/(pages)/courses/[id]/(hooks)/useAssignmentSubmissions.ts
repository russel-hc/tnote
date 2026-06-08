import { useQuery } from "@tanstack/react-query";
import { fetchWithAuth } from "@/shared/lib/api/fetchWithAuth";
import { QUERY_KEYS } from "@/shared/lib/queryKeys";

interface Submission {
  student: { id: string };
  status: string;
}

export const useAssignmentSubmissions = (assignmentId: string, enabled: boolean) => {
  const { data, isLoading, error } = useQuery({
    queryKey: QUERY_KEYS.assignments.submissions(assignmentId),
    queryFn: async () => {
      const res = await fetchWithAuth(`/api/assignments/${assignmentId}/submissions`);
      const result = await res.json();
      return (result.data || []) as Submission[];
    },
    enabled: enabled && !!assignmentId,
  });

  return { submissions: data ?? [], isLoading, error };
};
