import { describe, it, expect } from "vitest";
import {
  getWeekStart,
  getWeekDays,
  timeToMinutes,
  minutesToTime,
  isTimeConflict,
  getConflictingBlocks,
  calcBlockPosition,
  calcTotalMinutes,
  calcByDay,
  calcByCourse,
} from "./time";
import type { StudyBlock } from "../types";

// helper
const makeBlock = (
  id: string,
  dayOfWeek: number,
  startTime: string,
  endTime: string,
  courseId = "c1"
): StudyBlock => ({ id, courseId, dayOfWeek, startTime, endTime });

describe("getWeekStart", () => {
  it("수요일 → 해당 주 월요일 반환", () => {
    const wed = new Date("2025-01-08"); // 수요일
    const result = getWeekStart(wed);
    expect(result.toISOString().slice(0, 10)).toBe("2025-01-06");
  });

  it("월요일 입력 → 동일 날짜 반환", () => {
    const mon = new Date("2025-01-06");
    expect(getWeekStart(mon).toISOString().slice(0, 10)).toBe("2025-01-06");
  });

  it("일요일 → 해당 주 월요일 반환 (전 주 아님)", () => {
    const sun = new Date("2025-01-12"); // 일요일
    expect(getWeekStart(sun).toISOString().slice(0, 10)).toBe("2025-01-06");
  });
});

describe("getWeekDays", () => {
  it("7개 날짜 반환", () => {
    const weekStart = new Date("2025-01-06");
    const days = getWeekDays(weekStart);
    expect(days).toHaveLength(7);
  });

  it("첫 번째 날짜가 weekStart와 동일", () => {
    const weekStart = new Date("2025-01-06");
    const days = getWeekDays(weekStart);
    expect(days[0].toISOString().slice(0, 10)).toBe("2025-01-06");
  });

  it("마지막 날짜가 일요일 (weekStart + 6일)", () => {
    const weekStart = new Date("2025-01-06");
    const days = getWeekDays(weekStart);
    expect(days[6].toISOString().slice(0, 10)).toBe("2025-01-12");
  });
});

describe("timeToMinutes", () => {
  it('"09:30" → 570', () => expect(timeToMinutes("09:30")).toBe(570));
  it('"00:00" → 0', () => expect(timeToMinutes("00:00")).toBe(0));
  it('"08:00" → 480', () => expect(timeToMinutes("08:00")).toBe(480));
  it('"20:00" → 1200', () => expect(timeToMinutes("20:00")).toBe(1200));
});

describe("minutesToTime", () => {
  it("570 → \"09:30\"", () => expect(minutesToTime(570)).toBe("09:30"));
  it("0 → \"00:00\"", () => expect(minutesToTime(0)).toBe("00:00"));
  it("480 → \"08:00\"", () => expect(minutesToTime(480)).toBe("08:00"));
  it("두 자리 패딩 확인", () => expect(minutesToTime(65)).toBe("01:05"));
});

describe("isTimeConflict", () => {
  it("완전히 겹치는 블록 → true", () => {
    const a = makeBlock("1", 0, "09:00", "11:00");
    const b = makeBlock("2", 0, "10:00", "12:00");
    expect(isTimeConflict(a, b)).toBe(true);
  });

  it("완전히 포함되는 블록 → true", () => {
    const a = makeBlock("1", 0, "09:00", "12:00");
    const b = makeBlock("2", 0, "10:00", "11:00");
    expect(isTimeConflict(a, b)).toBe(true);
  });

  it("완전히 겹치는 동일 시간 → true", () => {
    const a = makeBlock("1", 0, "09:00", "10:00");
    const b = makeBlock("2", 0, "09:00", "10:00");
    expect(isTimeConflict(a, b)).toBe(true);
  });

  // 경계값 테스트
  it("[경계값] 10:00-11:00 과 11:00-12:00 → false (충돌 아님)", () => {
    const a = makeBlock("1", 0, "10:00", "11:00");
    const b = makeBlock("2", 0, "11:00", "12:00");
    expect(isTimeConflict(a, b)).toBe(false);
  });

  it("[경계값] 순서 반대도 false", () => {
    const a = makeBlock("1", 0, "11:00", "12:00");
    const b = makeBlock("2", 0, "10:00", "11:00");
    expect(isTimeConflict(a, b)).toBe(false);
  });

  it("완전히 분리된 블록 → false", () => {
    const a = makeBlock("1", 0, "09:00", "10:00");
    const b = makeBlock("2", 0, "11:00", "12:00");
    expect(isTimeConflict(a, b)).toBe(false);
  });

  it("다른 요일 → false", () => {
    const a = makeBlock("1", 0, "09:00", "11:00");
    const b = makeBlock("2", 1, "09:00", "11:00");
    expect(isTimeConflict(a, b)).toBe(false);
  });

  it("동일 id → false (자기 자신과 충돌 없음)", () => {
    const a = makeBlock("1", 0, "09:00", "11:00");
    expect(isTimeConflict(a, a)).toBe(false);
  });
});

describe("getConflictingBlocks", () => {
  it("충돌 없으면 빈 배열", () => {
    const blocks = [
      makeBlock("1", 0, "09:00", "10:00"),
      makeBlock("2", 0, "10:00", "11:00"),
    ];
    expect(getConflictingBlocks(blocks)).toEqual([]);
  });

  it("충돌 1쌍 반환", () => {
    const blocks = [
      makeBlock("1", 0, "09:00", "11:00"),
      makeBlock("2", 0, "10:00", "12:00"),
    ];
    expect(getConflictingBlocks(blocks)).toEqual([["1", "2"]]);
  });

  it("3개 블록 중 2쌍 충돌", () => {
    const blocks = [
      makeBlock("1", 0, "09:00", "12:00"),
      makeBlock("2", 0, "10:00", "11:00"),
      makeBlock("3", 0, "11:30", "13:00"),
    ];
    const result = getConflictingBlocks(blocks);
    expect(result).toHaveLength(2);
    expect(result).toContainEqual(["1", "2"]);
    expect(result).toContainEqual(["1", "3"]);
  });
});

describe("calcBlockPosition", () => {
  const slotHeight = 40; // 30분 = 40px

  it("08:00~09:00 블록, gridStart=480 → top=0, height=80", () => {
    const block = makeBlock("1", 0, "08:00", "09:00");
    expect(calcBlockPosition(block, 480, slotHeight)).toEqual({
      top: 0,
      height: 80,
    });
  });

  it("09:00~10:30 블록 → top=80, height=120", () => {
    const block = makeBlock("1", 0, "09:00", "10:30");
    expect(calcBlockPosition(block, 480, slotHeight)).toEqual({
      top: 80,
      height: 120,
    });
  });

  it("30분 블록 → height=slotHeight", () => {
    const block = makeBlock("1", 0, "10:00", "10:30");
    expect(calcBlockPosition(block, 480, slotHeight).height).toBe(slotHeight);
  });
});

describe("calcTotalMinutes", () => {
  it("빈 배열 → 0", () => expect(calcTotalMinutes([])).toBe(0));

  it("블록 2개 합산", () => {
    const blocks = [
      makeBlock("1", 0, "09:00", "10:00"), // 60분
      makeBlock("2", 1, "14:00", "16:30"), // 150분
    ];
    expect(calcTotalMinutes(blocks)).toBe(210);
  });
});

describe("calcByDay", () => {
  it("요일별 합산", () => {
    const blocks = [
      makeBlock("1", 0, "09:00", "10:00"), // 60분
      makeBlock("2", 0, "11:00", "12:30"), // 90분
      makeBlock("3", 2, "13:00", "14:00"), // 60분
    ];
    const result = calcByDay(blocks);
    expect(result[0]).toBe(150);
    expect(result[2]).toBe(60);
    expect(result[1]).toBeUndefined();
  });
});

describe("calcByCourse", () => {
  it("강의별 합산", () => {
    const blocks = [
      makeBlock("1", 0, "09:00", "10:00", "course-a"), // 60분
      makeBlock("2", 1, "11:00", "12:00", "course-a"), // 60분
      makeBlock("3", 2, "13:00", "14:30", "course-b"), // 90분
    ];
    const result = calcByCourse(blocks);
    expect(result["course-a"]).toBe(120);
    expect(result["course-b"]).toBe(90);
  });
});