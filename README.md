# 학습 플래너

온라인 교육 플랫폼에서 한 주간의 학습 스케줄을 편집하고 저장하는 플래너입니다.

## 프로젝트 개요

TanStack Query로 저장된(서버) 상태를, Zustand로 편집 중(클라이언트) 상태를 관리했습니다. 블록 배치는 시간을 픽셀로 변환해 absolute positioning으로 구현했고, 시간 로직은 별도 유틸로 분리했습니다.

## 기술 스택

| 라이브러리 | 선택 이유 |
|---|---|
| TypeScript | 타입 안전성 |
| React | 컴포넌트 기반 UI |
| Vite | 인증, SSR, API Routes 등이 필요 없는 SPA이므로 Vite로 빠른 개발 환경 확보 |
| Tailwind CSS | 별도 CSS 파일 없이 스타일링 |
| TanStack Query | Zustand와 역할을 분리해 서버 상태(fetch, 캐시, 로딩, 에러 관리)를 독립적으로 유지 |
| Zustand | 여러 컴포넌트가 공유하는 편집 상태를 간결하게 관리 |
| date-fns | 직접 구현 시 엣지 케이스가 많은 로직을 검증된 유틸로 처리 |
| MSW | axios 호출 코드 수정 없이 Mock 적용 가능. 프로덕션과 동일한 경로로 동작 |
| Vitest | Vite 설정을 공유해 별도 Jest 설정 불필요 |
| axios | 간결한 에러 처리 |

## 실행 방법

```bash
npm install
npm run dev
```

테스트 실행:

```bash
npm run test
```

저장 실패 시뮬레이션: `src/mocks/handlers.ts` 상단의 `FORCE_ERROR = true`로 변경 후 저장 버튼 클릭.

## 프로젝트 구조 설명

```
src/
  api/          # API 호출 함수
  components/   # UI 컴포넌트
  hooks/        # TanStack Query 훅
  mocks/        # MSW Mock API
  pages/        # 페이지 컴포넌트
  store/        # Zustand 편집 상태
  types/        # TypeScript 타입
  utils/        # 시간 계산 유틸 + 테스트
```

## 요구사항 해석 및 가정

### 시간 충돌 판정 기준

두 블록의 시간 범위가 실제로 겹칠 때만 충돌로 판정했습니다.

```
충돌 조건: aEnd > bStart && bEnd > aStart
```

`09:00–10:00`과 `10:00–11:00`은 충돌이 아닙니다. 종료 시간과 시작 시간이 같은 경우(`aEnd === bStart`)는 인접 블록으로 간주합니다.

모달에서 충돌이 감지되면 경고 메시지를 표시합니다. 충돌이 있으면 저장 버튼은 비활성화됩니다.

### 빈 상태 처리

빈 주차일 때 그리드의 셀에 마우스를 올리면 "클릭하여 블록 추가" 안내 텍스트를 표시합니다. 주간 요약 섹션은 "아직 등록된 학습 블록이 없습니다" 메시지를 표시합니다.

### 시간 단위 제약

모달의 시작/종료 시간을 30분 단위 드롭다운으로 제한해 30분 단위 제약에서 벗어나는 시간의 입력을 차단했습니다.

### 미저장 변경 사항 안내

세 단계로 사용자에게 알립니다.

- 헤더 저장 버튼: 편집 시작과 동시에 표시
- 페이지 이탈 시: `beforeunload` 이벤트로 브라우저 확인 대화상자 표시
- 주간 이동 시: 미저장 상태에서 이전/다음 주 이동 시 확인 요청

### 엣지 케이스 처리

저장 실패 시 `draftBlocks`을 유지하고 하단에 에러 팝업을 표시합니다. 저장 버튼으로 저장 재시도가 가능합니다.

## 설계 결정과 이유

### 서버 상태와 편집 상태의 분리

| 구분 | 관리 위치 | 역할 |
|---|---|---|
| 서버 상태 | TanStack Query | fetch, 캐시, 로딩, 에러 처리 |
| 편집 상태 | Zustand `draftBlocks` | 로컬 수정 반영, 저장 전 임시 데이터 |

`usePlannerQuery` 성공 시 `initDraft(blocks)`로 `draftBlocks`를 초기화했습니다. 이후 모든 편집은 `draftBlocks`에만 반영되고, 저장 성공 시에만 서버 응답으로 재동기화했습니다. 저장 실패 시 `draftBlocks`는 그대로 유지되므로 편집 내용을 잃지 않습니다.

### 주간 요약 클라이언트 집계

`draftBlocks`를 기반으로 `WeeklySummary` 컴포넌트 내에서 집계했습니다. 서버 엔드포인트로 분리할 경우 편집 중 변경을 실시간 반영하려면 매 편집마다 API 호출하거나 debounce가 필요합니다. 현재 데이터 규모에서 클라이언트 집계가 단순하고 실시간성이 보장됩니다.

### 그리드 배치 방식

블록은 absolute positioning으로 배치했습니다. `calcBlockPosition(block, gridStart, slotHeight)`가 `startTime`과 `endTime`을 분 단위로 변환하여 `top`과 `height`를 픽셀로 반환하고, 컴포넌트는 이 값을 inline style로 적용합니다. 시간 계산 로직은 `src/utils/time.ts`에 분리되어 있습니다.

## 저장 전/후 상태 흐름

```
편집 (addBlock / updateBlock / removeBlock)
  → draftBlocks 변경, isDirty = true
  → 충돌 검사 (getConflictingBlocks)
    → 충돌 있음: 저장 버튼 비활성화, 충돌 블록 시각적(빨간색) 표시
    → 충돌 없음: 저장 버튼 활성화

저장 버튼 클릭
  → PUT /api/planner (draftBlocks 전송)
  → 성공: initDraft(serverBlocks), isDirty = false
  → 실패: draftBlocks 유지, 에러 팝업 표시
```

## AI 활용 범위

Claude Code를 사용하여 개발했습니다.

먼저 요구사항을 분석해 구현 순서를 기능 단위로 나누고 각 단계의 프롬프트를 작성한 뒤, 타입 정의 → 유틸 → 스토어 → 훅 → 컴포넌트 순으로 작성했습니다. AI가 생성한 코드는 전부 읽고 의도와 트레이드오프를 검토했으며, 의도와 다른 부분은 직접 수정했습니다.
