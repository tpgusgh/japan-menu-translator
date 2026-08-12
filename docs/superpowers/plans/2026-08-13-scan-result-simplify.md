# Scan 결과 화면 단순화 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `ScanScreen.tsx`의 촬영 후 결과화면을 사진+캔버스+목록 3중 노출에서 목록(MenuList) 단일 뷰로 단순화하고, 촬영 전 화면의 온라인/오프라인 모드 토글을 눈에 덜 띄는 아이콘+팝업으로 축소한다.

**Architecture:** 순수 UI 재구성. `ScanScreen.tsx` 하나만 구조 변경, 새 state(`showModePicker`) 하나 추가. `PhotoOverlay.tsx`는 삭제(다른 곳에서 미사용), `TranslatedLayout.tsx`는 파일은 남기되 `ScanScreen`에서 import를 제거해 결과화면에서 빠지게 한다. `src/lib/*`, `TranslatedLayout.tsx`, `MenuList.tsx`, `MenuItemCard.tsx`, `types.ts` 로직은 전혀 건드리지 않는다.

**Tech Stack:** React Native (Expo 57), TypeScript, react-native `Modal` (팝업용, 이미 RN 코어에 있음 — 새 의존성 없음).

## Global Constraints

- 스펙 문서 `docs/superpowers/specs/2026-08-13-scan-result-simplify-design.md` 기준.
- 결과화면 기본 뷰는 목록(MenuList) 하나뿐 — 세그먼트 탭 없음.
- "다시 찍기" 버튼은 상단 고정 헤더에 항상 노출.
- 모드 토글 기본값은 오프라인 유지.
- `TranslatedLayout.tsx`는 삭제하지 않음(파일만 남기고 import 제거).
- `PhotoOverlay.tsx`는 삭제.
- `src/lib/*` 및 번역/OCR 로직 변경 없음.
- 새 테스트 파일 불필요 — 기존 jest 스위트(`npx jest`)와 `npx tsc --noEmit` 통과만 확인.

---

### Task 1: 촬영 전 화면 — 모드 토글을 아이콘+팝업으로 교체

**Files:**
- Modify: `src/screens/ScanScreen.tsx:19-25` (state 추가), `:110-130` (모드 토글 JSX), `:165-195` (styles)

**Interfaces:**
- Consumes: 기존 `mode: TranslateMode`, `setMode` (이미 존재, `src/lib/translate.ts`의 `TranslateMode` 타입 그대로 사용).
- Produces: 새 state `showModePicker: boolean` — Task 2에서는 사용하지 않음(이 화면 전용).

- [ ] **Step 1: `showModePicker` state 추가**

`src/screens/ScanScreen.tsx:25` 바로 아래에 추가:

```tsx
const [showModePicker, setShowModePicker] = useState(false);
```

- [ ] **Step 2: 카메라 화면 상단에 톱니 아이콘 버튼 추가, 기존 모드버튼 2개 + hint 텍스트 제거**

`src/screens/ScanScreen.tsx:106-150`의 `if (!photoUri)` 블록을 아래로 교체:

```tsx
  if (!photoUri) {
    return (
      <View style={styles.container}>
        <CameraView ref={cameraRef} style={styles.camera} zoom={zoom} />
        <Pressable style={styles.settingsButton} onPress={() => setShowModePicker(true)}>
          <Text style={styles.settingsButtonText}>⚙</Text>
        </Pressable>
        <Modal visible={showModePicker} transparent animationType="fade" onRequestClose={() => setShowModePicker(false)}>
          <Pressable style={styles.modalBackdrop} onPress={() => setShowModePicker(false)}>
            <View style={styles.modalCard}>
              <Pressable
                style={[styles.modeButton, mode === 'offline' && styles.modeButtonActive]}
                onPress={() => setMode('offline')}
              >
                <Text style={[styles.modeButtonText, mode === 'offline' && styles.modeButtonTextActive]}>
                  오프라인
                </Text>
              </Pressable>
              <Text style={styles.hint}>인터넷 없이 동작, 번역 품질 보통</Text>
              <Pressable
                style={[styles.modeButton, mode === 'online' && styles.modeButtonActive]}
                onPress={() => setMode('online')}
              >
                <Text style={[styles.modeButtonText, mode === 'online' && styles.modeButtonTextActive]}>
                  온라인
                </Text>
              </Pressable>
              <Text style={styles.hint}>인터넷 필요, 번역 품질 더 좋음</Text>
            </View>
          </Pressable>
        </Modal>
        <View style={styles.zoomRow}>
          <Pressable
            style={styles.zoomButton}
            onPress={() => setZoom((z) => Math.max(0, z - 0.15))}
          >
            <Text style={styles.zoomButtonText}>−</Text>
          </Pressable>
          <Text style={styles.zoomLabel}>확대 {Math.round(zoom * 100)}%</Text>
          <Pressable
            style={styles.zoomButton}
            onPress={() => setZoom((z) => Math.min(1, z + 0.15))}
          >
            <Text style={styles.zoomButtonText}>+</Text>
          </Pressable>
        </View>
        <Text style={styles.hint}>글씨가 작게 보이면 확대 후 메뉴 1~2개가 크게 나오도록 가까이서 촬영하세요.</Text>
        <PrimaryButton title="촬영" onPress={capture} />
      </View>
    );
  }
```

- [ ] **Step 3: `Modal` import 추가**

`src/screens/ScanScreen.tsx:2`를 교체:

```tsx
import { View, StyleSheet, Pressable, Text, ScrollView, Modal } from 'react-native';
```

- [ ] **Step 4: 스타일 추가/정리**

`src/screens/ScanScreen.tsx:173`의 기존 `modeRow` 스타일 블록(`modeRow`, `modeButton`, `modeButtonActive`, `modeButtonText`, `modeButtonTextActive`)을 아래로 교체(모드 버튼 스타일은 유지, `modeRow`만 팝업용 스타일로 대체):

```tsx
  settingsButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  settingsButtonText: { color: '#fff', fontSize: 18 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCard: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: 20,
    gap: 8,
    width: 260,
  },
  modeButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: radius.sm,
    backgroundColor: colors.border,
    alignItems: 'center',
  },
  modeButtonActive: { backgroundColor: colors.primary },
  modeButtonText: { color: colors.ink, fontSize: type.body, fontWeight: '600' },
  modeButtonTextActive: { color: '#fff', fontWeight: '700' },
```

- [ ] **Step 5: 타입체크**

Run: `npx tsc --noEmit`
Expected: 에러 없음.

- [ ] **Step 6: 커밋**

```bash
git add src/screens/ScanScreen.tsx
git commit -m "feat: collapse translate mode toggle into settings popup"
```

---

### Task 2: 결과 화면 — 헤더바 + 목록 단일 뷰로 재구성, PhotoOverlay 삭제

**Files:**
- Modify: `src/screens/ScanScreen.tsx:1-14` (import 정리), `:152-163` (결과 화면 JSX), `:165-172` (styles)
- Delete: `src/components/PhotoOverlay.tsx`

**Interfaces:**
- Consumes: 기존 `photoUri`, `status`, `items`, `reset`, `handleShowDescription`, `MenuList` (props: `items: MenuItem[]`, `onShowDescription: (id: string) => void` — 변경 없음).
- Produces: 없음(최종 화면 구성).

- [ ] **Step 1: `PhotoOverlay`, `TranslatedLayout` import 제거**

`src/screens/ScanScreen.tsx:9-10`을 삭제:

```tsx
import { PhotoOverlay } from '../components/PhotoOverlay';
import { TranslatedLayout } from '../components/TranslatedLayout';
```

- [ ] **Step 2: 결과 화면 JSX를 헤더바 + 목록 단일 뷰로 교체**

`src/screens/ScanScreen.tsx:152-163`을 아래로 교체:

```tsx
  return (
    <View style={styles.container}>
      <View style={styles.resultHeader}>
        <PrimaryButton title="다시 찍기" onPress={reset} variant="secondary" />
      </View>
      {status === 'processing' && <Text style={styles.statusText}>분석 중...</Text>}
      {status === 'noText' && <Text style={styles.statusText}>텍스트를 찾지 못했습니다. 다시 촬영해주세요.</Text>}
      {status === 'error' && <Text style={[styles.statusText, styles.errorText]}>처리 중 오류가 발생했습니다. 다시 촬영해주세요.</Text>}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <MenuList items={items} onShowDescription={handleShowDescription} />
      </ScrollView>
    </View>
  );
```

- [ ] **Step 3: 헤더바 스타일 추가**

`src/screens/ScanScreen.tsx:166` (`container` 스타일) 바로 아래에 추가:

```tsx
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.card,
  },
```

- [ ] **Step 4: `PhotoOverlay.tsx` 삭제**

```bash
git rm src/components/PhotoOverlay.tsx
```

- [ ] **Step 5: 타입체크 + 전체 jest 스위트 실행**

Run: `npx tsc --noEmit && npx jest`
Expected: 둘 다 에러/실패 없음(기존 12개 테스트 그대로 통과).

- [ ] **Step 6: 앱 실행해서 수동 확인**

Run: `npx expo start` (또는 이미 설치된 APK로) → 카메라 화면에서 톱니 아이콘 눌러 모드 팝업 뜨는지, 촬영 후 헤더의 "다시 찍기"가 스크롤 없이 바로 보이는지, 목록만 표시되고 원본사진/캔버스는 안 보이는지 확인.

- [ ] **Step 7: 커밋**

```bash
git add src/screens/ScanScreen.tsx
git commit -m "feat: simplify scan result screen to single list view"
```
