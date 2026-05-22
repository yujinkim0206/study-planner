import { http, HttpResponse, delay } from 'msw'
import type { Course, CourseListResponse, StudyBlock, PlannerResponse, SavePlannerRequest, SavePlannerResponse, ErrorResponse } from '../types';

export let FORCE_ERROR = false;
export const setForceError = (value: boolean) => {
  FORCE_ERROR = value;
};

const courses: Course[] = [
  { id: 'c1', title: '운영체제', color: '#f87171' },
  { id: 'c2', title: '자료구조', color: '#60a5fa' },
  { id: 'c3', title: '알고리즘', color: '#34d399' },
  { id: 'c4', title: '데이터베이스', color: '#a78bfa' },
  { id: 'c5', title: '네트워크',   color: '#fbbf24' },
]

const db = new Map<string, StudyBlock[]>();

function seedIfEmpty(weekStart: string): StudyBlock[] {
  if (!db.has(weekStart)) {
    db.set(weekStart, [
      { id: 'b1', courseId: 'c1', dayOfWeek: 0, startTime: '09:00', endTime: '10:30'},
      { id: 'b2', courseId: 'c2', dayOfWeek: 1, startTime: '14:00', endTime: '15:30', memo: '문제 풀기' },
      { id: 'b3', courseId: 'c3', dayOfWeek: 3, startTime: '10:00', endTime: '11:30', memo: '정렬 알고리즘' },
      { id: 'b4', courseId: 'c5', dayOfWeek: 5, startTime: '09:00', endTime: '10:00'},
    ]);
  }
  return db.get(weekStart)!;
}

let idCounter = 100;

export const handlers = [
  // GET /api/courses
  http.get('/api/courses', async () => {
    await delay(500);
    const response: CourseListResponse = { courses: courses };
    return HttpResponse.json(response);
  }),

  // GET /api/planner
  http.get('/api/planner', async ({ request }) => {
    await delay(500);
    const url = new URL(request.url);
    const weekStart = url.searchParams.get('weekStart') ?? '';
    const blocks = seedIfEmpty(weekStart);
    const response: PlannerResponse = { weekStart, blocks };
    return HttpResponse.json(response);
  }),

  // PUT /api/planner
  http.put('/api/planner', async ({ request }) => {
    await delay(500);

    if (FORCE_ERROR) {
      const response: ErrorResponse = { code: 'INVALID_BLOCK', message: '서버 오류가 발생했습니다.' };
      return HttpResponse.json(response, { status: 500 });
    }

    const body = await request.json() as SavePlannerRequest;
    const saved: StudyBlock[] = body.blocks.map((b) => ({
      ...b,
      id: b.id ?? `nb${++idCounter}`,
    }));

    db.set(body.weekStart, saved);

    const response: SavePlannerResponse = { weekStart: body.weekStart, blocks: saved };
    return HttpResponse.json(response);
  }),
];