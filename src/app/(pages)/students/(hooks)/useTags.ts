import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchWithAuth } from "@/shared/lib/api/fetchWithAuth";
import { QUERY_KEYS } from "@/shared/lib/queryKeys";
import type { StudentTag, TagColor } from "@/shared/types";

export const useTags = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: QUERY_KEYS.tags.all,
    queryFn: async () => {
      const response = await fetchWithAuth("/api/tags");
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      return result.data as StudentTag[];
    },
  });

  return {
    tags: data || [],
    isLoading,
    error,
  };
};

export const useCreateTag = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      name,
      color,
      hiddenByDefault,
    }: {
      name: string;
      color: TagColor;
      hiddenByDefault?: boolean;
    }) => {
      const response = await fetchWithAuth("/api/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, color, hiddenByDefault }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      return result.data as StudentTag;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tags.all });
    },
  });
};

export const useUpdateTag = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      name,
      color,
      hiddenByDefault,
    }: {
      id: string;
      name?: string;
      color?: TagColor;
      hiddenByDefault?: boolean;
    }) => {
      const response = await fetchWithAuth(`/api/tags/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, color, hiddenByDefault }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      return result.data as StudentTag;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tags.all });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.students.all });
    },
  });
};

export const useDeleteTag = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetchWithAuth(`/api/tags/${id}`, {
        method: "DELETE",
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tags.all });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.students.all });
    },
  });
};
