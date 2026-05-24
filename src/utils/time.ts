import { startOfWeek, addDays } from "date-fns";
import type { StudyBlock } from "../types";

/**
 * 해당 날짜가 속한 주의 월요일 00:00:00 반환
 */
export function getWeekStart(date: Date): Date {
  return startOfWeek(date, { weekStartsOn: 1 });
}

/**
 * 월~일 7개 Date 배열 반환
 */
export function getWeekDays(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

/**
 * "09:30" → 570
 */
export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

/**
 * 570 → "09:30"
 */
export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * 같은 dayOfWeek이고 시간이 겹치면 true
 * 경계값(10:00-11:00 과 11:00-12:00)은 충돌이 아님
 */
export function isTimeConflict(a: StudyBlock, b: StudyBlock): boolean {
  if (a.id === b.id) return false;
  if (a.dayOfWeek !== b.dayOfWeek) return false;

  const aStart = timeToMinutes(a.startTime);
  const aEnd = timeToMinutes(a.endTime);
  const bStart = timeToMinutes(b.startTime);
  const bEnd = timeToMinutes(b.endTime);

  return aEnd > bStart && bEnd > aStart;
}

/**
 * 충돌하는 블록 id 쌍 배열 반환
 */
export function getConflictingBlocks(blocks: StudyBlock[] | undefined | null): string[][] {
  if (!blocks) return [];
  const pairs: string[][] = [];

  for (let i = 0; i < blocks.length; i++) {
    for (let j = i + 1; j < blocks.length; j++) {
      if (isTimeConflict(blocks[i], blocks[j])) {
        pairs.push([blocks[i].id, blocks[j].id]);
      }
    }
  }

  return pairs;
}

/**
 * 블록의 그리드 내 top, height를 픽셀로 반환
 * @param gridStart - 그리드 시작 시간 (분 단위, 기본 480 = 08:00)
 * @param slotHeight - 30분당 픽셀 높이
 */
export function calcBlockPosition(
  block: StudyBlock,
  gridStart: number = 480,
  slotHeight: number
): { top: number; height: number } {
  const start = timeToMinutes(block.startTime);
  const end = timeToMinutes(block.endTime);

  const top = ((start - gridStart) / 30) * slotHeight;
  const height = ((end - start) / 30) * slotHeight;

  return { top, height };
}

/**
 * 전체 블록의 총 학습 시간(분) 반환
 */
export function calcTotalMinutes(blocks: StudyBlock[]): number {
  return blocks.reduce((acc, block) => {
    return acc + timeToMinutes(block.endTime) - timeToMinutes(block.startTime);
  }, 0);
}

/**
 * 요일별 학습 시간(분) 반환
 * dayOfWeek → 분
 */
export function calcByDay(blocks: StudyBlock[]): Record<number, number> {
  return blocks.reduce<Record<number, number>>((acc, block) => {
    const minutes =
      timeToMinutes(block.endTime) - timeToMinutes(block.startTime);
    acc[block.dayOfWeek] = (acc[block.dayOfWeek] ?? 0) + minutes;
    return acc;
  }, {});
}

/**
 * 강의별 학습 시간(분) 반환
 * courseId → 분
 */
export function calcByCourse(blocks: StudyBlock[]): Record<string, number> {
  return blocks.reduce<Record<string, number>>((acc, block) => {
    const minutes =
      timeToMinutes(block.endTime) - timeToMinutes(block.startTime);
    acc[block.courseId] = (acc[block.courseId] ?? 0) + minutes;
    return acc;
  }, {});
}