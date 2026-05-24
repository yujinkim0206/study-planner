import { useState, useMemo } from 'react';
import { parseISO } from 'date-fns';
import type { StudyBlock } from '../types';
import { useCoursesQuery } from '../hooks/usePlanner';
import { timeToMinutes, minutesToTime, isTimeConflict } from '../utils/time';

const TIME_OPTIONS: string[] = (() => {
  const opts: string[] = [];
  for (let m = 0; m <= 24 * 60; m += 30) opts.push(minutesToTime(m));
  return opts;
})();

export interface BlockModalProps {
  mode: 'add' | 'edit';
  initialData?: StudyBlock;
  weekStart?: string;
  defaultDate?: string;
  defaultTime?: string;
  draftBlocks: StudyBlock[];
  onConfirm: (block: Omit<StudyBlock, 'id'> & { id?: string }) => void;
  onDelete?: () => void;
  onClose: () => void;
}

const DAY_LABELS = ['월', '화', '수', '목', '금', '토', '일'];

export default function BlockModal({
  mode,
  initialData,
  weekStart = '',
  defaultDate,
  defaultTime = '00:00',
  draftBlocks,
  onConfirm,
  onDelete,
  onClose,
}: BlockModalProps) {
  const { data: courses, isLoading: coursesLoading } = useCoursesQuery();

  const initialDay =
    initialData?.dayOfWeek ??
    (defaultDate
      ? Math.round((parseISO(defaultDate).getTime() - parseISO(weekStart).getTime()) / 86400000)
      : 0);

  const [courseId, setCourseId] = useState<string>(initialData?.courseId ?? '');
  const [day, setDay] = useState<number>(initialDay);
  const [startTime, setStartTime] = useState<string>(initialData?.startTime ?? defaultTime);
  const [endTime, setEndTime] = useState<string>(() => {
    if (initialData?.endTime) return initialData.endTime;
    const startMin = timeToMinutes(defaultTime);
    const endMin = startMin + 30;
    return endMin <= 24 * 60 ? minutesToTime(endMin) : defaultTime;
  });
  const [memo, setMemo] = useState<string>(initialData?.memo ?? '');
  const [error, setError] = useState<string | null>(null);

  const effectiveCourseId = courseId || courses[0]?.id || '';

  const conflictWarning = useMemo(() => {
    if (timeToMinutes(endTime) <= timeToMinutes(startTime)) return null;
    const tempBlock: StudyBlock = {
      id: initialData?.id ?? '__temp__',
      courseId: effectiveCourseId,
      dayOfWeek: day,
      startTime,
      endTime,
    };
    const conflicting = draftBlocks.find((b) => isTimeConflict(tempBlock, b));
    if (!conflicting) return null;
    const courseName = courses.find((c) => c.id === conflicting.courseId)?.title ?? '다른';
    return `${courseName} 강의와 시간이 겹칩니다`;
  }, [draftBlocks, courses, day, startTime, endTime, effectiveCourseId, initialData?.id]);

  function handleConfirm() {
    // 1. 종료 시간 <= 시작 시간
    if (timeToMinutes(endTime) <= timeToMinutes(startTime)) {
      setError('올바른 시간 범위를 선택해주세요');
      return;
    }

    setError(null);
    onConfirm({
      id: initialData?.id,
      courseId: effectiveCourseId,
      dayOfWeek: day,
      startTime,
      endTime,
      memo: memo.trim() || undefined,
    });
  }

  function handleDelete() {
    if (window.confirm('정말 삭제하시겠습니까?')) {
      onDelete?.();
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            {mode === 'add' ? '블록 추가' : '블록 편집'}
          </h2>
          <button
            className="text-xl text-gray-700 transition duration-300 hover:text-gray-400"
            onClick={onClose}
            aria-label="닫기"
            type="button"
          >
            ✕
          </button>
        </div>

        {/* 강의 선택 */}
        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium text-gray-700">강의</label>
          {coursesLoading ? (
            <div className="text-sm text-gray-400">로딩 중...</div>
          ) : (
            <select
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none"
              value={effectiveCourseId}
              onChange={(e) => setCourseId(e.target.value)}
            >
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* 요일 선택 */}
        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium text-gray-700">요일</label>
          <div className="flex gap-1">
            {DAY_LABELS.map((label, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setDay(idx)}
                className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
                  day === idx
                    ? 'bg-gray-800 text-white'
                    : 'border border-gray-300 text-gray-600 hover:bg-gray-100'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* 시작/종료 시간 */}
        <div className="mb-4 flex gap-3">
          <div className="flex-1">
            <label className="mb-1 block text-sm font-medium text-gray-700">시작 시간</label>
            <select
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            >
              {TIME_OPTIONS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-sm font-medium text-gray-700">종료 시간</label>
            <select
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            >
              {TIME_OPTIONS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>

        {/* 충돌 경고 */}
        {conflictWarning && (
          <div className="mb-4 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-700">
            {conflictWarning}
          </div>
        )}

        {/* 메모 */}
        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium text-gray-700">메모</label>
          <textarea
            className="w-full resize-none rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none"
            rows={3}
            maxLength={200}
            placeholder="메모를 입력하세요"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
          />
          <div className="mt-0.5 text-right text-xs text-gray-400">{memo.length}/200</div>
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* 액션 버튼 */}
        <div className="flex items-center gap-2">
          {mode === 'edit' && onDelete && (
            <button
              type="button"
              className="rounded-md border bg-red-600 px-4 py-2 text-sm font-medium text-white transition duration-300 hover:bg-red-500"
              onClick={handleDelete}
            >
              삭제
            </button>
          )}
          <div className="flex flex-1 justify-end gap-2">
            <button
              type="button"
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition duration-300 hover:bg-gray-100"
              onClick={onClose}
            >
              취소
            </button>
            <button
              type="button"
              className="rounded-md bg-gray-800 px-4 py-2 text-sm font-medium text-white transition duration-300 hover:bg-gray-700"
              onClick={handleConfirm}
            >
              확인
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
