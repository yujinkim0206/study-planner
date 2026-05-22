import axios from 'axios';
import type {
  CourseListResponse,
  PlannerResponse,
  SavePlannerRequest,
  SavePlannerResponse,
} from '../types';

const api = axios.create({ baseURL: '' });

export const fetchCourses = async (): Promise<CourseListResponse> => {
  const { data } = await api.get<CourseListResponse>('/api/courses');
  return data;
};

export const fetchPlanner = async (weekStart: string): Promise<PlannerResponse> => {
  const { data } = await api.get<PlannerResponse>('/api/planner', {
    params: { weekStart },
  });
  return data;
};

export const savePlanner = async (
  payload: SavePlannerRequest
): Promise<SavePlannerResponse> => {
  const { data } = await api.put<SavePlannerResponse>('/api/planner', payload);
  return data;
};