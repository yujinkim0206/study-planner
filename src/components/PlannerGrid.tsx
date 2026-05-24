import { useMemo, useRef, useEffect } from "react";
import { format } from "date-fns";
import type { StudyBlock, Course } from "../types";
import { calcBlockPosition, getConflictingBlocks, minutesToTime } from "../utils/time";
import { usePlannerStore } from "../store/plannerStore";

const GRID_START = 0;
const GRID_END = 1440;
const SLOT_HEIGHT = 20;
const TIME_COL_WIDTH = 56;
const SCROLL_TO_HOUR = 8;

const DAY_LABELS = ["월", "화", "수", "목", "금", "토", "일"];

// 30min slots for click targets
const TIME_SLOTS_30: string[] = (() => {
  const slots: string[] = [];
  for (let m = GRID_START; m <= GRID_END; m += 30) slots.push(minutesToTime(m));
  return slots;
})();

// 1hr slots for grid lines and labels
const TIME_SLOTS_HOUR: string[] = (() => {
  const slots: string[] = [];
  for (let m = GRID_START; m <= GRID_END; m += 60) slots.push(minutesToTime(m));
  return slots;
})();

export interface PlannerGridProps {
  weekDays: Date[];
  courses: Course[];
  onSlotClick: (dayOfWeek: number, time: string) => void;
  onBlockClick: (block: StudyBlock) => void;
}

function getCourse(courses: Course[], courseId: string): Course | undefined {
  return courses.find((c) => c.id === courseId);
}

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export default function PlannerGrid({
  weekDays,
  courses,
  onSlotClick,
  onBlockClick,
}: PlannerGridProps) {
  const draftBlocks = usePlannerStore((s) => s.draftBlocks);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = (SCROLL_TO_HOUR * 60 / 30) * SLOT_HEIGHT;
    }
  }, []);

  const conflictIds = useMemo<Set<string>>(() => {
    const pairs = getConflictingBlocks(draftBlocks);
    return new Set(pairs.flat());
  }, [draftBlocks]);

  const blocksByDay = useMemo(() => {
    const map: Record<number, StudyBlock[]> = {};
    for (let d = 0; d < 7; d++) map[d] = [];
    draftBlocks.forEach((b) => map[b.dayOfWeek]?.push(b));
    return map;
  }, [draftBlocks]);

  const gridHeight = ((GRID_END - GRID_START) / 30) * SLOT_HEIGHT;

  return (
    <div
      className="flex flex-col bg-white"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      {/* 요일 */}
      <div
        className="sticky top-0 z-20 flex bg-white border-b border-gray-200 shrink-0"
        style={{ paddingLeft: TIME_COL_WIDTH }}
      >
        {weekDays.map((date, idx) => {
          const isToday =
            format(date, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");

          const dayColor =
            idx === 5 ? "#3b82f6" : idx === 6 ? "#ef4444" : "#6b7280";

          return (
            <div
              key={idx}
              className="flex flex-1 flex-col items-center py-3"
            >
              <span
                className="text-sm font-bold tracking-wide"
                style={{ color: dayColor }}
              >
                {DAY_LABELS[idx]}
              </span>
              <span
                className="mt-1 flex h-8 w-8 items-center justify-center text-sm font-bold"
                style={{
                  borderRadius: "50%",
                  backgroundColor: isToday ? "#374151" : "transparent",
                  color: isToday ? "#fff" : dayColor,
                }}
              >
                {format(date, "d")}
              </span>
            </div>
          );
        })}
      </div>

      {/* 그리드 */}
      <div
        ref={scrollRef}
        className="overflow-auto"
        style={{ maxHeight: "calc(100vh - 200px)" }}
      >
        <div className="flex">
          {/* 시간축 */}
          <div
            className="relative shrink-0 select-none"
            style={{ width: TIME_COL_WIDTH, height: gridHeight }}
          >
            {TIME_SLOTS_HOUR.map((t, i) => (
              <div
                key={t}
                className="absolute right-3"
                style={{
                  top: i * SLOT_HEIGHT * 2 - 7,
                  fontSize: 10,
                  color: "#9ca3af",
                  lineHeight: "14px",
                }}
              >
                {t}
              </div>
            ))}
          </div>

          {/* 7열 */}
          {Array.from({ length: 7 }, (_, dayIdx) => {
            const dayBlocks = blocksByDay[dayIdx] ?? [];

            return (
              <div
                key={dayIdx}
                className="relative flex-1"
                style={{
                  height: gridHeight,
                  borderLeft: "1px solid #f3f4f6",
                }}
              >
                {TIME_SLOTS_HOUR.map((t, i) => (
                  <div
                    key={t}
                    className="absolute left-0 right-0"
                    style={{
                      top: i * SLOT_HEIGHT * 2,
                      borderTop: "1px solid #e5e7eb",
                    }}
                  />
                ))}

                {/* 30분 단위 선택 */}
                  {TIME_SLOTS_30.slice(0, -1).map((t, i) => (
                    <div
                      key={`slot-${t}`}
                      className="absolute left-0 right-0 cursor-pointer"
                      style={{ top: i * SLOT_HEIGHT, height: SLOT_HEIGHT }}
                      onClick={() => onSlotClick(dayIdx, t)}
                    />
                  ))}

                {/* 1시간 단위 블락 */}
                {dayBlocks.map((block) => {
                  const course = getCourse(courses, block.courseId);
                  const color = course?.color ?? "#94a3b8";
                  const { top, height } = calcBlockPosition(block, GRID_START, SLOT_HEIGHT);
                  const isConflict = conflictIds.has(block.id);

                  const bgColor = isConflict
                    ? "rgba(239,68,68,0.75)"
                    : hexToRgba(color, 0.75);

                  return (
                    <div
                      key={block.id}
                      className="absolute left-0.5 right-0.5 cursor-pointer overflow-hidden group hover:z-20"
                      style={{
                        top,
                        height: Math.max(height, SLOT_HEIGHT),
                        backgroundColor: bgColor,
                        borderRadius: 3,
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onBlockClick(block);
                      }}
                    >
                      <div
                        className="absolute inset-0 group-hover:brightness-75"
                        style={{ backgroundColor: bgColor }}
                      />
                      <div className="relative z-10 p-1 leading-tight">
                        <p className="truncate text-[11px] font-semibold text-white">
                          {course?.title ?? block.courseId}
                        </p>
                        <p className="text-[10px] text-white/80">
                          {block.startTime}–{block.endTime}
                        </p>
                        {isConflict && (
                          <p className="text-[9px] font-bold text-white/90">충돌</p>
                        )}
                        {block.memo && (
                          <p className="mt-1 overflow-hidden break-words text-[10px] text-white/70">{block.memo}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}