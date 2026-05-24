import { useState, useEffect } from "react";
import { usePlannerStore } from "../store/plannerStore";
import { calcTotalMinutes, calcByDay, calcByCourse } from "../utils/time";
import type { Course } from "../types";

interface WeeklySummaryProps {
  courses: Course[];
}

const DAY_LABELS = ["월", "화", "수", "목", "금", "토", "일"];
const BAR_MAX_HEIGHT = 40;

function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}분`;
  if (m === 0) return `${h}시간`;
  return `${h}시간 ${m}분`;
}

function computeBarHeights(byDay: Record<number, number>): number[] {
  const max = Math.max(...DAY_LABELS.map((_, idx) => byDay[idx] ?? 0), 1);
  return DAY_LABELS.map((_, idx) => {
    const m = byDay[idx] ?? 0;
    return m > 0 ? Math.round((m / max) * BAR_MAX_HEIGHT) : 0;
  });
}

export default function WeeklySummary({ courses }: WeeklySummaryProps) {
  const draftBlocks = usePlannerStore((s) => s.draftBlocks);

  const totalMinutes = calcTotalMinutes(draftBlocks);
  const byDay = calcByDay(draftBlocks);
  const byCourse = calcByCourse(draftBlocks);

  const courseMap = new Map(courses.map((c) => [c.id, c]));

  const courseRows = Object.entries(byCourse)
    .map(([courseId, minutes]) => ({
      course: courseMap.get(courseId),
      minutes,
      pct: totalMinutes > 0 ? Math.round((minutes / totalMinutes) * 100) : 0,
    }))
    .sort((a, b) => b.minutes - a.minutes);

  const [barHeights, setBarHeights] = useState<number[]>(() => computeBarHeights(byDay));

  useEffect(() => {
    setBarHeights(computeBarHeights(calcByDay(draftBlocks)));
  }, [draftBlocks]);

  return (
    <div className="bg-white px-6 py-10 space-y-8">
      {/* 총 학습시간 */}
      <div className="min-h-[72px]">
        <p className="text-xs font-medium text-gray-700 uppercase tracking-wide mb-1">
          총 학습시간
        </p>
        <p className="text-3xl font-bold text-gray-900">
          {totalMinutes > 0 ? formatMinutes(totalMinutes) : "0분"}
        </p>
      </div>

      {/* 강의별 학습시간 */}
      <div className="min-h-[160px]">
        <ul className="space-y-2">
          {courseRows.length > 0 ? (
            courseRows.map(({ course, minutes, pct }) => (
              <li key={course?.id ?? "unknown"} className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: course?.color ?? "#9CA3AF" }}
                />
                <span className="flex-1 text-sm text-gray-700 truncate">
                  {course?.title ?? "알 수 없는 강의"}
                </span>
                <span className="text-sm text-gray-500 whitespace-nowrap">
                  {formatMinutes(minutes)}{" "}
                  <span className="text-gray-400">({pct}%)</span>
                </span>
              </li>
            ))
          ) : (
            <li className="text-sm text-gray-400">아직 등록된 학습 블록이 없습니다</li>
          )}
        </ul>
      </div>

      {/* 요일별 bar chart */}
      <div>
        <div className="grid grid-cols-7 gap-1 text-center">
          {DAY_LABELS.map((label, idx) => (
            <div key={label} className="flex flex-col items-center gap-1">
              <div className="h-10 flex items-end w-full justify-center">
                <div
                  className="w-4 rounded-t-sm bg-blue-500"
                  style={{
                    height: `${barHeights[idx]}px`,
                    transition: "height 0.4s ease",
                    borderRadius: barHeights[idx] === 0 ? 0 : undefined,
                  }}
                />
              </div>
              <span className="text-xs text-gray-500">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
