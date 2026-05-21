export interface Course {
  id: string;
  title: string;
  color: string;          // 블록 표시 색상 (예: "#4A90D9")
}

export interface CourseListResponse {
  courses: Course[];
}

export interface StudyBlock {
  id: string;
  courseId: string;
  dayOfWeek: number;      // 0(월) ~ 6(일) — 주의: JavaScript Date.getDay()는 0(일) 기준이므로 변환 필요
  startTime: string;      // "09:00" (HH:mm)
  endTime: string;        // "10:00" (HH:mm, 30분 단위는 가산점 사양)
  memo?: string;
}

export interface PlannerResponse {
  weekStart: string;      // 요청한 주의 월요일
  blocks: StudyBlock[];   // 저장된 블록 (없으면 빈 배열)
}

export interface SavePlannerRequest {
  weekStart: string;
  blocks: Array<{
    id?: string;          // 기존 블록은 id 포함, 신규는 생략 (서버가 생성)
    courseId: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    memo?: string;
  }>;
}

export interface SavePlannerResponse {
  weekStart: string;
  blocks: StudyBlock[];   // 저장 후 확정된 블록 (id 포함)
}

export interface ErrorResponse {
  code: string;
  message: string;
}

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ErrorResponse };