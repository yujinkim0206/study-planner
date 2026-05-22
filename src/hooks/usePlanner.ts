import { useQuery, useMutation } from '@tanstack/react-query';
import { useEffect } from 'react';
import { fetchCourses, fetchPlanner, savePlanner } from '../api/planner';
import { usePlannerStore } from '../store/plannerStore';
import type { Course, PlannerResponse, SavePlannerRequest } from '../types';
import { format } from 'date-fns';

export function useCoursesQuery(): {
  data: Course[];
  isLoading: boolean;
  isError: boolean;
} {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['courses'],
    queryFn: fetchCourses,
    staleTime: Infinity, // 캐시 유지
  });

  return {
    data: data?.courses ?? [],
    isLoading,
    isError,
  };
}

export function usePlannerQuery(weekStart: Date): {
  data: PlannerResponse | undefined;
  isLoading: boolean;
  isError: boolean;
} {
  const initDraft = usePlannerStore((s) => s.initDraft);
  const weekStartStr = format(weekStart, 'yyyy-MM-dd');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['planner', weekStartStr],
    queryFn: () => fetchPlanner(weekStartStr),
  });

  useEffect(() => {
    if (data) initDraft(data.blocks);
  }, [data, initDraft]);

  return { data, isLoading, isError };
}

export function useSavePlanner() {
  const initDraft = usePlannerStore((s) => s.initDraft);

  const mutation = useMutation({
    mutationFn: (payload: SavePlannerRequest) => savePlanner(payload),
    onSuccess: (res) => {
      initDraft(res.blocks);
    },
  });

  return mutation;
}