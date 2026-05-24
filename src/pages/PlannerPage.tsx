import { useState, useEffect, useMemo, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, addDays, addWeeks, subWeeks } from 'date-fns';
import { usePlannerStore } from '../store/plannerStore';
import { useCoursesQuery, usePlannerQuery, useSavePlanner } from '../hooks/usePlanner';
import { getWeekDays, getConflictingBlocks } from '../utils/time';
import PlannerGrid from '../components/PlannerGrid';
import BlockModal from '../components/BlockModal';
import WeeklySummary from '../components/WeeklySummary';
import type { StudyBlock } from '../types';

type ModalState =
  | { open: false }
  | { open: true; mode: 'add'; dayOfWeek: number; time: string }
  | { open: true; mode: 'edit'; block: StudyBlock };

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

export default function PlannerPage() {
  const {
    currentWeekStart,
    isDirty,
    draftBlocks,
    addBlock,
    updateBlock,
    removeBlock,
    setWeek,
  } = usePlannerStore();

  const weekStartStr = format(currentWeekStart, 'yyyy-MM-dd');
  const weekDays = useMemo(() => getWeekDays(currentWeekStart), [currentWeekStart]);

  const { data: courses } = useCoursesQuery();
  usePlannerQuery(currentWeekStart);
  const saveMutation = useSavePlanner();

  const [modal, setModal] = useState<ModalState>({ open: false });
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (!saveMutation.isSuccess) return;
    const show = setTimeout(() => setShowSuccess(true), 0);
    const hide = setTimeout(() => setShowSuccess(false), 1000);
    return () => { clearTimeout(show); clearTimeout(hide); };
  }, [saveMutation.isSuccess]);

  const hasConflicts = useMemo(
    () => getConflictingBlocks(draftBlocks).length > 0,
    [draftBlocks]
  );

  // 새로고침/탭 닫기 이탈 방지
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!isDirty) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  // 주 전환 시 뮤테이션 상태 초기화
  const prevWeekRef = useRef(weekStartStr);
  const mutationReset = saveMutation.reset;
  useEffect(() => {
    if (prevWeekRef.current !== weekStartStr) {
      prevWeekRef.current = weekStartStr;
      mutationReset();
    }
  }, [weekStartStr, mutationReset]);

  function navigateWeek(dir: 'prev' | 'next') {
    if (
      isDirty &&
      !window.confirm('저장하지 않은 변경 사항이 있습니다. 이동하시겠습니까?')
    ) {
      return;
    }
    setWeek(dir === 'prev' ? subWeeks(currentWeekStart, 1) : addWeeks(currentWeekStart, 1));
  }

  function handleSlotClick(dayOfWeek: number, time: string) {
    setModal({ open: true, mode: 'add', dayOfWeek, time });
  }

  function handleBlockClick(block: StudyBlock) {
    setModal({ open: true, mode: 'edit', block });
  }

  function handleModalConfirm(data: Omit<StudyBlock, 'id'> & { id?: string }) {
    const { id, ...rest } = data;
    if (id) {
      updateBlock({ id, ...rest });
    } else {
      addBlock({ id: `loc${Date.now()}`, ...rest });
    }
    setModal({ open: false });
  }

  function handleModalDelete() {
    if (modal.open && modal.mode === 'edit') {
      removeBlock(modal.block.id);
    }
    setModal({ open: false });
  }

  function handleSave() {
    if (saveMutation.isPending || hasConflicts) return;
    saveMutation.mutate({ weekStart: weekStartStr, blocks: draftBlocks });
  }

  const monthYearLabel =
    weekDays.length > 0 ? format(weekDays[0], 'yyyy년 M월') : '';

  const showSaveButton = isDirty || saveMutation.isError;
  const saveDisabled = saveMutation.isPending || hasConflicts;

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      {/* 왼쪽: 그리드 영역 */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* 연월 + 주간 네비게이션 */}
        <div className="flex shrink-0 items-center justify-between px-4 pt-10 pb-6">
          <div className="flex items-center gap-3">
            <h2 className="text-3xl font-semibold tracking-tight text-gray-900">
              {monthYearLabel}
            </h2>
            <div className="flex gap-1">
              <button
                onClick={() => navigateWeek('prev')}
                className="rounded-full p-1.5 text-gray-900 transition-colors hover:bg-gray-100"
                aria-label="이전 주"
              >
                <ChevronLeft size={20} strokeWidth={3} />
              </button>
              <button
                onClick={() => navigateWeek('next')}
                className="rounded-full p-1.5 text-gray-900 transition-colors hover:bg-gray-100"
                aria-label="다음 주"
              >
                <ChevronRight size={20} strokeWidth={3} />
              </button>
            </div>
          </div>

          {/* 저장 버튼 — 변경사항 있을 때만 표시 */}
          {showSaveButton && (
            <div className="flex items-center gap-2">
              {hasConflicts && (
                <span className="text-sm font-medium text-red-500 mr-1">시간이 겹치는 블록이 있습니다</span>
              )}
              <button
                onClick={handleSave}
                disabled={saveDisabled}
                className={
                  saveDisabled
                    ? 'cursor-not-allowed rounded-md bg-gray-200 px-4 py-1.5 text-sm font-medium text-gray-400'
                    : saveMutation.isError
                    ? 'rounded-md bg-red-600 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-red-500'
                    : 'rounded-md bg-gray-900 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-gray-700'
                }
              >
                {saveMutation.isError ? '다시 시도' : '저장'}
              </button>
            </div>
          )}
        </div>

        {/* PlannerGrid */}
        <div className="flex-1 overflow-hidden">
          <PlannerGrid
            weekDays={weekDays}
            courses={courses}
            onSlotClick={handleSlotClick}
            onBlockClick={handleBlockClick}
          />
        </div>
      </div>

      {/* 오른쪽: 주간 요약 */}
      <aside className="w-72 shrink-0 overflow-y-auto border-l border-gray-200">
        <WeeklySummary courses={courses} />
      </aside>

      {/* 블록 추가 모달 */}
      {modal.open && modal.mode === 'add' && (
        <BlockModal
          mode="add"
          weekStart={weekStartStr}
          defaultDate={format(addDays(currentWeekStart, modal.dayOfWeek), 'yyyy-MM-dd')}
          defaultTime={modal.time}
          draftBlocks={draftBlocks}
          onConfirm={handleModalConfirm}
          onClose={() => setModal({ open: false })}
        />
      )}

      {/* 블록 편집 모달 */}
      {modal.open && modal.mode === 'edit' && (
        <BlockModal
          mode="edit"
          initialData={modal.block}
          weekStart={weekStartStr}
          draftBlocks={draftBlocks}
          onConfirm={handleModalConfirm}
          onDelete={handleModalDelete}
          onClose={() => setModal({ open: false })}
        />
      )}

      {/* 저장 상태 팝업 (하단 중앙) */}
      {(saveMutation.isPending || showSuccess) && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 flex items-center gap-2 rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-medium text-white shadow-lg">
          {saveMutation.isPending ? (
            <>
              <Spinner />
              <span>저장 중...</span>
            </>
          ) : (
            <span>저장되었습니다</span>
          )}
        </div>
      )}
    </div>
  );
}
