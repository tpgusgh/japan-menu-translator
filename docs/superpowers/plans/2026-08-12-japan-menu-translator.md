# 일본 메뉴/간판 번역 앱 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 카메라로 일본어 메뉴/간판을 촬영하면 사진 위에 한국어 번역과 한글 발음을 오버레이하고, 스크롤하면 카드 리스트로 정리해 보여주는 안드로이드 전용 Expo 앱을 만든다. 역방향(한국어→일본어) 텍스트 번역도 지원한다. 핵심 기능(OCR·번역·발음)은 완전 오프라인 동작.

**Architecture:** Expo (Dev Client, prebuild) + React Native. 카메라 촬영은 `expo-camera`. OCR·번역·일본어 읽기(발음) 추출은 커스텀 Expo 로컬 네이티브 모듈(`modules/ml-features`, Kotlin)이 Google ML Kit(Text Recognition Japanese, Translate)과 atilika kuromoji-ipadic 라이브러리를 직접 감싸서 제공한다. 가나→한글 발음 변환은 의존성 없는 순수 함수로 자체 구현. 음식 설명은 온라인일 때만 위키백과 REST API를 항목 탭 시 지연 호출.

**Tech Stack:** Expo SDK (최신, `create-expo-app` 시점 버전) + TypeScript, React Navigation(bottom-tabs), expo-camera, expo-dev-client, Kotlin(Expo Modules API), Google ML Kit Android SDK(`text-recognition-japanese`, `translate`), `com.atilika.kuromoji:kuromoji-ipadic`, Jest(`jest-expo` preset).

## Global Constraints

- 안드로이드 전용, iOS 미지원 (spec: 대상 플랫폼).
- 언어쌍은 일본어↔한국어만 (spec: 범위).
- 로그인/서버/DB 없음. 영구 저장(히스토리 등) 없음 — 세션 상태만 유지 (spec: 범위, 로컬 저장).
- ML Kit 등 네이티브 모듈이 필요해 Expo Go 사용 불가. `expo run:android` 기반 Dev Client로만 실행/테스트 (spec: 기술 스택).
- 온라인 음식 설명은 위키백과 REST API만 사용, 무료·키 불필요, 항목 탭 시 지연 호출 (spec: 기술 스택, 데이터 흐름).
- 가격 라인(숫자/통화기호만) 필터링 외 별도 음식명 분류 AI는 사용하지 않음 — YAGNI (spec: 데이터 흐름 5번).

## 스펙 대비 구현 결정 사항 (계획 작성 중 확정)

spec 작성 시점엔 `@react-native-ml-kit/*` 커뮤니티 패키지와 `kuromoji.js`를 가정했으나, 계획 작성 중 조사한 결과:
- `@react-native-ml-kit/translate-text`는 README에 "프로덕션에 쓰지 말 것"이라는 alpha 경고가 있고 모델 다운로드 진행률 API가 불명확함.
- `kuromoji.js`는 브라우저 fs/zlib 의존이라 RN(Hermes/Metro) 환경 호환이 불확실함.

→ 이미 네이티브 커스텀 빌드(Dev Client)가 필요한 프로젝트이므로, OCR·번역·읽기추출을 **하나의 커스텀 Kotlin 네이티브 모듈**(`modules/ml-features`)로 직접 구현한다. ML Kit Android SDK와 atilika kuromoji-ipadic(Java, Android에서 그대로 동작)을 직접 호출 — 커뮤니티 wrapper의 불안정성을 피하고 우리가 API를 완전히 통제한다. 사용자 경험은 spec과 동일(오프라인 번역팩 다운로드, 오프라인 발음, 온라인 설명), 다만 ML Kit이 바이트 단위 다운로드 진행률(%)을 공개 API로 제공하지 않아 **다운로드 화면은 퍼센트 대신 진행 중 스피너로 표시**한다 (spec의 "진행률 표시" 의도를 스피너+상태 텍스트로 충족).

---

### Task 1: 프로젝트 스캐폴드 + 네비게이션 뼈대

**Files:**
- Create: `package.json`, `app.json`, `tsconfig.json`, `App.tsx` (create-expo-app 생성물을 프로젝트 루트로 이동 후 일부 덮어씀)
- Create: `src/types.ts`
- Create: `src/screens/DownloadScreen.tsx` (스텁, Task 4에서 실제 구현으로 교체)
- Create: `src/screens/ScanScreen.tsx` (스텁, Task 6/7/8/9에서 점진적으로 완성)
- Create: `src/screens/ReverseScreen.tsx` (스텁, Task 11에서 완성)
- Create: `src/navigation/RootNavigator.tsx`

**Interfaces:**
- Produces: `src/types.ts`의 `BoundingBox { x: number; y: number; width: number; height: number }`, `LangCode = 'ja' | 'ko'`, `RecognizedLine { text: string; boundingBox: BoundingBox }`, `MenuItem { id: string; original: string; translated: string; pronunciation: string; boundingBox: BoundingBox; description: string | null; descriptionState: 'idle' | 'loading' | 'loaded' | 'unavailable' }` — 이후 모든 태스크가 이 타입을 그대로 사용.
- Produces: `RootNavigator`가 `DownloadScreen`의 `onReady: () => void` prop 계약을 정의(Task 4가 이 계약을 실제로 채움).

- [ ] **Step 1: Expo 프로젝트 스캐폴드**

```bash
cd /Users/hyunho/Projects/japan
npx create-expo-app@latest ../japan-scaffold-tmp --template blank-typescript
rsync -a --exclude='.git' ../japan-scaffold-tmp/ ./
rm -rf ../japan-scaffold-tmp
```

- [ ] **Step 2: 의존성 설치 (dev client + 네비게이션)**

```bash
npx expo install expo-dev-client
npm install @react-navigation/native @react-navigation/bottom-tabs react-native-screens react-native-safe-area-context
```

- [ ] **Step 3: `app.json` 작성**

```json
{
  "expo": {
    "name": "일본 메뉴 번역기",
    "slug": "japan-menu-translator",
    "version": "1.0.0",
    "orientation": "portrait",
    "platforms": ["android"],
    "android": {
      "package": "com.example.japanmenutranslator",
      "permissions": ["CAMERA"]
    }
  }
}
```

- [ ] **Step 4: 공용 타입 작성**

`src/types.ts`:

```ts
export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type LangCode = 'ja' | 'ko';

export interface RecognizedLine {
  text: string;
  boundingBox: BoundingBox;
}

export interface MenuItem {
  id: string;
  original: string;
  translated: string;
  pronunciation: string;
  boundingBox: BoundingBox;
  description: string | null;
  descriptionState: 'idle' | 'loading' | 'loaded' | 'unavailable';
}
```

- [ ] **Step 5: 스텁 화면 작성**

`src/screens/DownloadScreen.tsx`:

```tsx
import { useEffect } from 'react';
import { View, Text } from 'react-native';

export function DownloadScreen({ onReady }: { onReady: () => void }) {
  useEffect(() => {
    onReady();
  }, [onReady]);

  return (
    <View>
      <Text>준비 중...</Text>
    </View>
  );
}
```

`src/screens/ScanScreen.tsx`:

```tsx
import { View, Text } from 'react-native';

export function ScanScreen() {
  return (
    <View>
      <Text>스캔 화면</Text>
    </View>
  );
}
```

`src/screens/ReverseScreen.tsx`:

```tsx
import { View, Text } from 'react-native';

export function ReverseScreen() {
  return (
    <View>
      <Text>역번역 화면</Text>
    </View>
  );
}
```

- [ ] **Step 6: 루트 네비게이터 + App.tsx**

`src/navigation/RootNavigator.tsx`:

```tsx
import { useState, useCallback } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DownloadScreen } from '../screens/DownloadScreen';
import { ScanScreen } from '../screens/ScanScreen';
import { ReverseScreen } from '../screens/ReverseScreen';

const Tab = createBottomTabNavigator();

export function RootNavigator() {
  const [ready, setReady] = useState(false);
  const handleReady = useCallback(() => setReady(true), []);

  if (!ready) {
    return <DownloadScreen onReady={handleReady} />;
  }

  return (
    <NavigationContainer>
      <Tab.Navigator screenOptions={{ headerShown: false }}>
        <Tab.Screen name="스캔" component={ScanScreen} />
        <Tab.Screen name="역번역" component={ReverseScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
```

`App.tsx`:

```tsx
import { RootNavigator } from './src/navigation/RootNavigator';

export default function App() {
  return <RootNavigator />;
}
```

- [ ] **Step 7: 안드로이드 네이티브 프로젝트 생성 + 실행 확인**

```bash
npx expo prebuild -p android
npx expo run:android
```

Expected: 에뮬레이터/실기기에 앱이 설치되고, 잠시 "준비 중..." 표시 후 하단 탭("스캔"/"역번역")이 보인다.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: scaffold Expo app with navigation shell"
```

---

### Task 2: 가나→한글 발음 변환 모듈 (TDD)

**Files:**
- Create: `src/lib/kana-to-hangul.ts`
- Create: `src/lib/kana-to-hangul.test.ts`
- Modify: `package.json` (jest 설정 추가)

**Interfaces:**
- Produces: `katakanaToHiragana(input: string): string`, `kanaToHangul(input: string): string` — Task 5(`pronounce.ts`)가 `kanaToHangul`을 소비.

- [ ] **Step 1: Jest 설정 추가**

```bash
npx expo install jest-expo jest @types/jest --dev
```

`package.json`에 추가:

```json
{
  "scripts": {
    "test": "jest"
  },
  "jest": {
    "preset": "jest-expo"
  }
}
```

- [ ] **Step 2: 실패하는 테스트 작성**

`src/lib/kana-to-hangul.test.ts`:

```ts
import { kanaToHangul, katakanaToHiragana } from './kana-to-hangul';

describe('katakanaToHiragana', () => {
  it('가타카나를 히라가나로 바꾸되 장음 기호는 그대로 둔다', () => {
    expect(katakanaToHiragana('ラーメン')).toBe('らーめん');
  });
});

describe('kanaToHangul', () => {
  it('ラーメン(장음 생략)을 라멘으로 변환한다', () => {
    expect(kanaToHangul('ラーメン')).toBe('라멘');
  });

  it('ブタニク(돈육)를 부타니쿠로 변환한다', () => {
    expect(kanaToHangul('ブタニク')).toBe('부타니쿠');
  });

  it('促音(っ)을 다음 자음 계열에 맞는 받침으로 근사 변환한다', () => {
    expect(kanaToHangul('がっこう')).toBe('각코우');
  });

  it('요음(きょ)을 하나의 음절로 변환한다', () => {
    expect(kanaToHangul('きょう')).toBe('쿄우');
  });

  it('끝의 ん을 앞 음절 받침(ㄴ)으로 붙인다', () => {
    expect(kanaToHangul('ほん')).toBe('혼');
  });
});
```

- [ ] **Step 3: 테스트 실패 확인**

```bash
npm test -- kana-to-hangul
```

Expected: FAIL — `Cannot find module './kana-to-hangul'`

- [ ] **Step 4: 구현**

`src/lib/kana-to-hangul.ts`:

```ts
const BASE_TABLE: Record<string, string> = {
  あ: '아', い: '이', う: '우', え: '에', お: '오',
  か: '카', き: '키', く: '쿠', け: '케', こ: '코',
  さ: '사', し: '시', す: '스', せ: '세', そ: '소',
  た: '타', ち: '치', つ: '쓰', て: '테', と: '토',
  な: '나', に: '니', ぬ: '누', ね: '네', の: '노',
  は: '하', ひ: '히', ふ: '후', へ: '헤', ほ: '호',
  ま: '마', み: '미', む: '무', め: '메', も: '모',
  や: '야', ゆ: '유', よ: '요',
  ら: '라', り: '리', る: '루', れ: '레', ろ: '로',
  わ: '와', ゐ: '이', ゑ: '에', を: '오',
  が: '가', ぎ: '기', ぐ: '구', げ: '게', ご: '고',
  ざ: '자', じ: '지', ず: '즈', ぜ: '제', ぞ: '조',
  だ: '다', ぢ: '지', づ: '즈', で: '데', ど: '도',
  ば: '바', び: '비', ぶ: '부', べ: '베', ぼ: '보',
  ゔ: '부',
  ぱ: '파', ぴ: '피', ぷ: '푸', ぺ: '페', ぽ: '포',
  きゃ: '캬', きゅ: '큐', きょ: '쿄',
  しゃ: '샤', しゅ: '슈', しょ: '쇼',
  ちゃ: '차', ちゅ: '츄', ちょ: '초',
  にゃ: '냐', にゅ: '뉴', にょ: '뇨',
  ひゃ: '햐', ひゅ: '휴', ひょ: '효',
  みゃ: '먀', みゅ: '뮤', みょ: '묘',
  りゃ: '랴', りゅ: '류', りょ: '료',
  ぎゃ: '갸', ぎゅ: '규', ぎょ: '교',
  じゃ: '자', じゅ: '주', じょ: '조',
  びゃ: '뱌', びゅ: '뷰', びょ: '뵤',
  ぴゃ: '퍄', ぴゅ: '퓨', ぴょ: '표',
};

const HANGUL_BASE = 0xac00;
const HANGUL_END = 0xd7a3;
const FINAL_COUNT = 28;
const FINAL_GIYEOK = 1;
const FINAL_NIEUN = 4;
const FINAL_BIEUP = 17;
const FINAL_SIOT = 19;

function addBatchim(hangul: string, finalIndex: number): string {
  const code = hangul.charCodeAt(0);
  if (code < HANGUL_BASE || code > HANGUL_END) return hangul;
  const offset = code - HANGUL_BASE;
  if (offset % FINAL_COUNT !== 0) return hangul; // 이미 받침 있음 — 근사치라 덮어쓰지 않음
  return String.fromCharCode(code + finalIndex);
}

function sokuonFinalIndex(nextChar: string | undefined): number {
  if (!nextChar) return FINAL_SIOT;
  if ('かきくけこ'.includes(nextChar)) return FINAL_GIYEOK;
  if ('ぱぴぷぺぽ'.includes(nextChar)) return FINAL_BIEUP;
  return FINAL_SIOT;
}

function katakanaToHiraganaChar(ch: string): string {
  const code = ch.charCodeAt(0);
  if (code >= 0x30a1 && code <= 0x30f6) {
    return String.fromCharCode(code - 0x60);
  }
  return ch;
}

export function katakanaToHiragana(input: string): string {
  return Array.from(input).map(katakanaToHiraganaChar).join('');
}

export function kanaToHangul(input: string): string {
  const hiragana = katakanaToHiragana(input);
  const chars = Array.from(hiragana);
  const result: string[] = [];

  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];

    if (ch === 'ー') continue; // 장음 표기 생략 (근사)

    if (ch === 'っ') {
      if (result.length > 0) {
        result[result.length - 1] = addBatchim(result[result.length - 1], sokuonFinalIndex(chars[i + 1]));
      }
      continue;
    }

    if (ch === 'ん') {
      if (result.length > 0) {
        const withBatchim = addBatchim(result[result.length - 1], FINAL_NIEUN);
        if (withBatchim !== result[result.length - 1]) {
          result[result.length - 1] = withBatchim;
          continue;
        }
      }
      result.push('ㄴ');
      continue;
    }

    const twoChar = chars[i + 1] ? ch + chars[i + 1] : '';
    if (twoChar && BASE_TABLE[twoChar]) {
      result.push(BASE_TABLE[twoChar]);
      i += 1;
      continue;
    }

    result.push(BASE_TABLE[ch] ?? ch);
  }

  return result.join('');
}
```

- [ ] **Step 5: 테스트 통과 확인**

```bash
npm test -- kana-to-hangul
```

Expected: PASS (5개 테스트 모두)

- [ ] **Step 6: Commit**

```bash
git add src/lib/kana-to-hangul.ts src/lib/kana-to-hangul.test.ts package.json
git commit -m "feat: add kana-to-hangul pronunciation transliteration"
```

---

### Task 3: 네이티브 모듈 스캐폴드 + OCR (recognizeText)

**Files:**
- Create: `modules/ml-features/` (로컬 Expo 모듈, `expo.modules.mlfeatures` 패키지)
- Create: `modules/ml-features/android/build.gradle` (ML Kit text-recognition-japanese 의존성 추가)
- Create: `modules/ml-features/android/src/main/java/expo/modules/mlfeatures/MlFeaturesModule.kt`
- Create: `modules/ml-features/index.ts`
- Create: `src/lib/ocr.ts`

**Interfaces:**
- Produces: `modules/ml-features/index.ts`의 `recognizeText(imageUri: string): Promise<{text: string; x: number; y: number; width: number; height: number}[]>` (네이티브 원시 함수, Task 4/5에서 같은 파일에 함수 추가).
- Produces: `src/lib/ocr.ts`의 `recognizeText(imageUri: string): Promise<RecognizedLine[]>` (가격 라인 필터링 포함, 이후 ScanScreen이 소비).

- [ ] **Step 1: 로컬 네이티브 모듈 스캐폴드**

```bash
npx create-expo-module@latest --local
```

프롬프트에서 모듈 이름 `ml-features`, 패키지명 `expo.modules.mlfeatures`, 플랫폼은 `android`만 선택. `modules/ml-features/`가 생성되고 자동 링크된다. (플래그명이 다르면 `npx create-expo-module@latest --help`로 확인 — 목표는 `modules/ml-features/` 로컬 모듈 생성.)

- [ ] **Step 2: ML Kit 의존성 추가**

`modules/ml-features/android/build.gradle`의 `dependencies { ... }` 블록에 추가:

```gradle
dependencies {
  implementation("com.google.mlkit:text-recognition-japanese:16.0.1")
}
```

- [ ] **Step 3: Kotlin 모듈에 recognizeText 구현**

`modules/ml-features/android/src/main/java/expo/modules/mlfeatures/MlFeaturesModule.kt` (생성된 템플릿 내용을 아래로 교체):

```kotlin
package expo.modules.mlfeatures

import android.net.Uri
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.japanese.JapaneseTextRecognizerOptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlinx.coroutines.tasks.await

class MlFeaturesModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("MlFeatures")

    AsyncFunction("recognizeText") { imageUri: String ->
      val context = appContext.reactContext!!
      val image = InputImage.fromFilePath(context, Uri.parse(imageUri))
      val recognizer = TextRecognition.getClient(JapaneseTextRecognizerOptions.Builder().build())
      val result = recognizer.process(image).await()
      result.textBlocks.flatMap { block -> block.lines }.map { line ->
        val box = line.boundingBox
        mapOf(
          "text" to line.text,
          "x" to (box?.left ?: 0),
          "y" to (box?.top ?: 0),
          "width" to (box?.width() ?: 0),
          "height" to (box?.height() ?: 0)
        )
      }
    }
  }
}
```

`modules/ml-features/android/build.gradle`의 `dependencies`에 코루틴 브릿지도 추가:

```gradle
implementation("org.jetbrains.kotlinx:kotlinx-coroutines-play-services:1.7.3")
```

- [ ] **Step 4: JS 래퍼**

`modules/ml-features/index.ts` (생성된 템플릿 내용을 아래로 교체):

```ts
import { requireNativeModule } from 'expo-modules-core';

export interface NativeTextLine {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

const MlFeatures = requireNativeModule('MlFeatures');

export async function recognizeText(imageUri: string): Promise<NativeTextLine[]> {
  return MlFeatures.recognizeText(imageUri);
}
```

- [ ] **Step 5: OCR 래퍼 (가격 라인 필터링)**

`src/lib/ocr.ts`:

```ts
import { recognizeText as nativeRecognizeText } from '../../modules/ml-features';
import type { RecognizedLine } from '../types';

const NOISE_LINE = /^[0-9¥$.,\s\-~]+$/;

export async function recognizeText(imageUri: string): Promise<RecognizedLine[]> {
  const lines = await nativeRecognizeText(imageUri);
  return lines
    .filter((line) => !NOISE_LINE.test(line.text.trim()))
    .map((line) => ({
      text: line.text,
      boundingBox: { x: line.x, y: line.y, width: line.width, height: line.height },
    }));
}
```

- [ ] **Step 6: 빌드 및 수동 확인**

```bash
npx expo prebuild -p android --clean
npx expo run:android
```

임시로 `src/screens/ScanScreen.tsx`에 아래 코드를 추가해 기존 사진 파일(에뮬레이터의 `/sdcard/Pictures` 등에 일본어 텍스트가 담긴 테스트 이미지를 미리 push)로 OCR 결과를 콘솔에 출력해 확인한 뒤 되돌린다:

```ts
import { recognizeText } from '../lib/ocr';
// recognizeText('file:///sdcard/Pictures/test.jpg').then((lines) => console.log(lines));
```

Expected: logcat(`npx expo run:android` 콘솔 또는 `adb logcat`)에 인식된 텍스트와 좌표가 출력됨.

- [ ] **Step 7: Commit**

```bash
git add modules/ml-features src/lib/ocr.ts
git commit -m "feat: add native ML Kit OCR module"
```

---

### Task 4: 네이티브 번역 함수 + 오프라인 다운로드 화면

**Files:**
- Modify: `modules/ml-features/android/build.gradle` (ML Kit translate 의존성)
- Modify: `modules/ml-features/android/src/main/java/expo/modules/mlfeatures/MlFeaturesModule.kt` (isModelDownloaded/downloadModel/translateText 추가)
- Modify: `modules/ml-features/index.ts` (JS 함수 3개 추가)
- Create: `src/lib/translate.ts`
- Modify: `src/screens/DownloadScreen.tsx` (실제 구현으로 교체)

**Interfaces:**
- Consumes: Task 1의 `LangCode`.
- Produces: `src/lib/translate.ts`의 `isModelDownloaded(lang: LangCode): Promise<boolean>`, `downloadModel(lang: LangCode): Promise<void>`, `translate(text: string, from: LangCode, to: LangCode): Promise<string>` — Task 7(스캔 파이프라인)과 Task 11(역번역)이 소비.

- [ ] **Step 1: Gradle 의존성 추가**

`modules/ml-features/android/build.gradle`의 `dependencies`에 추가:

```gradle
implementation("com.google.mlkit:translate:17.0.3")
```

- [ ] **Step 2: Kotlin에 번역 함수 추가**

`MlFeaturesModule.kt`의 `ModuleDefinition` 블록 안, `recognizeText` 다음에 추가 (import 문도 파일 상단에 함께 추가):

```kotlin
import com.google.mlkit.common.model.DownloadConditions
import com.google.mlkit.common.model.RemoteModelManager
import com.google.mlkit.nl.translate.TranslateLanguage
import com.google.mlkit.nl.translate.TranslateRemoteModel
import com.google.mlkit.nl.translate.Translation
import com.google.mlkit.nl.translate.TranslatorOptions
```

```kotlin
private fun langTag(lang: String): String =
  when (lang) {
    "ja" -> TranslateLanguage.JAPANESE
    "ko" -> TranslateLanguage.KOREAN
    else -> throw IllegalArgumentException("Unsupported language: $lang")
  }
```
(이 private 함수는 클래스 body, `override fun definition()` 위에 추가)

`ModuleDefinition` 블록 안에 추가:

```kotlin
AsyncFunction("isModelDownloaded") { lang: String ->
  val model = TranslateRemoteModel.Builder(langTag(lang)).build()
  RemoteModelManager.getInstance().isModelDownloaded(model).await()
}

AsyncFunction("downloadModel") { lang: String ->
  val model = TranslateRemoteModel.Builder(langTag(lang)).build()
  val conditions = DownloadConditions.Builder().build()
  RemoteModelManager.getInstance().download(model, conditions).await()
}

AsyncFunction("translateText") { text: String, from: String, to: String ->
  val options = TranslatorOptions.Builder()
    .setSourceLanguage(langTag(from))
    .setTargetLanguage(langTag(to))
    .build()
  val translator = Translation.getClient(options)
  try {
    translator.translate(text).await()
  } finally {
    translator.close()
  }
}
```

- [ ] **Step 3: JS 네이티브 래퍼 확장**

`modules/ml-features/index.ts`에 추가:

```ts
export async function isModelDownloaded(lang: 'ja' | 'ko'): Promise<boolean> {
  return MlFeatures.isModelDownloaded(lang);
}

export async function downloadModel(lang: 'ja' | 'ko'): Promise<void> {
  return MlFeatures.downloadModel(lang);
}

export async function translateText(text: string, from: 'ja' | 'ko', to: 'ja' | 'ko'): Promise<string> {
  return MlFeatures.translateText(text, from, to);
}
```

- [ ] **Step 4: `src/lib/translate.ts` 작성**

```ts
import {
  isModelDownloaded as nativeIsModelDownloaded,
  downloadModel as nativeDownloadModel,
  translateText as nativeTranslateText,
} from '../../modules/ml-features';
import type { LangCode } from '../types';

export async function isModelDownloaded(lang: LangCode): Promise<boolean> {
  return nativeIsModelDownloaded(lang);
}

export async function downloadModel(lang: LangCode): Promise<void> {
  return nativeDownloadModel(lang);
}

export async function translate(text: string, from: LangCode, to: LangCode): Promise<string> {
  if (!text.trim()) return '';
  return nativeTranslateText(text, from, to);
}
```

- [ ] **Step 5: DownloadScreen 실제 구현**

`src/screens/DownloadScreen.tsx`:

```tsx
import { useEffect, useState, useCallback } from 'react';
import { View, Text, ActivityIndicator, Button, StyleSheet } from 'react-native';
import { isModelDownloaded, downloadModel } from '../lib/translate';

type Status = 'checking' | 'downloading' | 'ready' | 'error';

export function DownloadScreen({ onReady }: { onReady: () => void }) {
  const [status, setStatus] = useState<Status>('checking');

  const checkAndDownload = useCallback(async () => {
    setStatus('checking');
    try {
      const [jaReady, koReady] = await Promise.all([isModelDownloaded('ja'), isModelDownloaded('ko')]);
      if (jaReady && koReady) {
        setStatus('ready');
        onReady();
        return;
      }
      setStatus('downloading');
      await Promise.all([downloadModel('ja'), downloadModel('ko')]);
      setStatus('ready');
      onReady();
    } catch {
      setStatus('error');
    }
  }, [onReady]);

  useEffect(() => {
    checkAndDownload();
  }, [checkAndDownload]);

  if (status === 'error') {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>번역 파일 다운로드에 실패했습니다. 최초 1회는 인터넷 연결이 필요합니다.</Text>
        <Button title="다시 시도" onPress={checkAndDownload} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" />
      <Text style={styles.text}>
        {status === 'checking' ? '확인 중...' : '번역 파일 다운로드 중... (최초 1회만 필요)'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 16 },
  text: { fontSize: 16, textAlign: 'center' },
});
```

- [ ] **Step 6: 수동 확인**

```bash
npx expo run:android
```

Expected: 최초 실행 시(인터넷 연결 상태) "번역 파일 다운로드 중..." 표시 후 자동으로 탭 화면 전환. 앱 재시작 시 "확인 중..." 후 바로 탭 화면(이미 다운로드됨). 기내 모드 상태로 최초 실행하면 "다시 시도" 버튼이 있는 에러 화면 표시.

- [ ] **Step 7: Commit**

```bash
git add modules/ml-features src/lib/translate.ts src/screens/DownloadScreen.tsx
git commit -m "feat: add on-device translate model download flow"
```

---

### Task 5: 일본어 읽기(발음) 추출 네이티브 함수 + 발음 파이프라인

**Files:**
- Modify: `modules/ml-features/android/build.gradle` (kuromoji-ipadic 의존성)
- Modify: `modules/ml-features/android/src/main/java/expo/modules/mlfeatures/MlFeaturesModule.kt` (getReadings 추가)
- Modify: `modules/ml-features/index.ts` (getReadings 추가)
- Create: `src/lib/pronounce.ts`
- Create: `src/lib/pronounce.test.ts`

**Interfaces:**
- Consumes: Task 2의 `kanaToHangul`.
- Produces: `src/lib/pronounce.ts`의 `getPronunciation(japaneseText: string): Promise<string>` — Task 7, Task 11이 소비.

- [ ] **Step 1: Gradle 의존성 추가**

`modules/ml-features/android/build.gradle`의 `dependencies`에 추가:

```gradle
implementation("com.atilika.kuromoji:kuromoji-ipadic:0.9.0")
```

- [ ] **Step 2: Kotlin에 getReadings 추가**

`MlFeaturesModule.kt` 상단에 import 추가:

```kotlin
import com.atilika.kuromoji.ipadic.Tokenizer
```

클래스 body에 lazy 필드 추가:

```kotlin
private val kuromojiTokenizer by lazy { Tokenizer() }
```

`ModuleDefinition` 블록 안에 추가:

```kotlin
AsyncFunction("getReadings") { text: String ->
  kuromojiTokenizer.tokenize(text).map { token ->
    mapOf(
      "surface" to token.surface,
      "reading" to (token.reading ?: token.surface)
    )
  }
}
```

- [ ] **Step 3: JS 래퍼 확장**

`modules/ml-features/index.ts`에 추가:

```ts
export interface NativeReadingToken {
  surface: string;
  reading: string;
}

export async function getReadings(text: string): Promise<NativeReadingToken[]> {
  return MlFeatures.getReadings(text);
}
```

- [ ] **Step 4: 실패하는 테스트 작성**

`src/lib/pronounce.test.ts`:

```ts
jest.mock('../../modules/ml-features', () => ({
  getReadings: jest.fn(),
}));

import { getReadings } from '../../modules/ml-features';
import { getPronunciation } from './pronounce';

describe('getPronunciation', () => {
  it('토큰 읽기를 한글 발음으로 이어붙인다', async () => {
    (getReadings as jest.Mock).mockResolvedValue([{ surface: '豚肉', reading: 'ブタニク' }]);
    const result = await getPronunciation('豚肉');
    expect(result).toBe('부타니쿠');
  });

  it('여러 토큰을 순서대로 이어붙인다', async () => {
    (getReadings as jest.Mock).mockResolvedValue([
      { surface: '本', reading: 'ホン' },
      { surface: 'です', reading: 'デス' },
    ]);
    const result = await getPronunciation('本です');
    expect(result).toBe('혼데스');
  });
});
```

- [ ] **Step 5: 테스트 실패 확인**

```bash
npm test -- pronounce
```

Expected: FAIL — `Cannot find module './pronounce'`

- [ ] **Step 6: 구현**

`src/lib/pronounce.ts`:

```ts
import { getReadings } from '../../modules/ml-features';
import { kanaToHangul } from './kana-to-hangul';

export async function getPronunciation(japaneseText: string): Promise<string> {
  if (!japaneseText.trim()) return '';
  const tokens = await getReadings(japaneseText);
  return tokens.map((token) => kanaToHangul(token.reading)).join('');
}
```

- [ ] **Step 7: 테스트 통과 확인**

```bash
npm test -- pronounce
```

Expected: PASS

- [ ] **Step 8: 네이티브 빌드 후 실제 값 수동 확인**

```bash
npx expo prebuild -p android --clean
npx expo run:android
```

`ScanScreen.tsx`에 임시로 `getPronunciation('豚肉').then(console.log)` 추가해 logcat에서 `부타니쿠`(또는 근사값)가 출력되는지 확인 후 되돌린다.

- [ ] **Step 9: Commit**

```bash
git add modules/ml-features src/lib/pronounce.ts src/lib/pronounce.test.ts
git commit -m "feat: add kuromoji-based pronunciation pipeline"
```

---

### Task 6: 카메라 촬영 화면

**Files:**
- Modify: `src/screens/ScanScreen.tsx` (카메라 미리보기 + 촬영, 파이프라인은 Task 7에서 추가)

**Interfaces:**
- Consumes: 없음(expo-camera만 사용).
- Produces: `ScanScreen` 내부 상태 `photoUri: string | null` — Task 7이 촬영 완료 후 이 상태를 기준으로 파이프라인을 이어붙임.

- [ ] **Step 1: expo-camera 설치**

```bash
npx expo install expo-camera
```

- [ ] **Step 2: 카메라 권한 + 미리보기 + 촬영 구현**

`src/screens/ScanScreen.tsx`:

```tsx
import { useState, useRef, useCallback } from 'react';
import { View, StyleSheet, Button, Text } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';

export function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  const capture = useCallback(async () => {
    if (!cameraRef.current) return;
    const photo = await cameraRef.current.takePictureAsync();
    if (photo) setPhotoUri(photo.uri);
  }, []);

  const reset = useCallback(() => setPhotoUri(null), []);

  if (!permission) {
    return <View style={styles.center} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.text}>카메라 권한이 필요합니다.</Text>
        <Button title="권한 요청" onPress={requestPermission} />
      </View>
    );
  }

  if (!photoUri) {
    return (
      <View style={styles.container}>
        <CameraView ref={cameraRef} style={styles.camera} />
        <Button title="촬영" onPress={capture} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.text}>촬영됨: {photoUri}</Text>
      <Button title="다시 촬영" onPress={reset} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  camera: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  text: { fontSize: 16, textAlign: 'center', padding: 12 },
});
```

- [ ] **Step 3: 수동 확인**

```bash
npx expo run:android
```

Expected: 카메라 권한 요청 → 허용 시 미리보기 표시 → 촬영 버튼 누르면 사진 URI 텍스트 표시 → "다시 촬영"으로 미리보기 복귀.

- [ ] **Step 4: Commit**

```bash
git add src/screens/ScanScreen.tsx package.json
git commit -m "feat: add camera capture to scan screen"
```

---

### Task 7: 스캔 파이프라인 연결 (OCR → 번역 → 발음)

**Files:**
- Modify: `src/screens/ScanScreen.tsx` (촬영 후 OCR/번역/발음 파이프라인 실행, 텍스트 없음/처리중 상태 표시)

**Interfaces:**
- Consumes: Task 3의 `recognizeText`(from `src/lib/ocr.ts`), Task 4의 `translate`, Task 5의 `getPronunciation`, Task 1의 `MenuItem`.
- Produces: `ScanScreen` 상태 `items: MenuItem[]`, `updateItem(id, patch)` — Task 8(오버레이), Task 9(리스트)가 이 상태와 함수를 props로 받는다.

- [ ] **Step 1: 파이프라인 구현**

`src/screens/ScanScreen.tsx` 전체를 아래로 교체:

```tsx
import { useState, useRef, useCallback } from 'react';
import { View, StyleSheet, Button, Text, ScrollView } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { recognizeText } from '../lib/ocr';
import { translate } from '../lib/translate';
import { getPronunciation } from '../lib/pronounce';
import type { MenuItem } from '../types';

type Status = 'idle' | 'processing' | 'noText';

export function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [status, setStatus] = useState<Status>('idle');

  const reset = useCallback(() => {
    setPhotoUri(null);
    setItems([]);
    setStatus('idle');
  }, []);

  const capture = useCallback(async () => {
    if (!cameraRef.current) return;
    const photo = await cameraRef.current.takePictureAsync();
    if (!photo) return;

    setPhotoUri(photo.uri);
    setStatus('processing');

    const lines = await recognizeText(photo.uri);
    if (lines.length === 0) {
      setStatus('noText');
      return;
    }

    const menuItems = await Promise.all(
      lines.map(async (line, index) => {
        const [translated, pronunciation] = await Promise.all([
          translate(line.text, 'ja', 'ko'),
          getPronunciation(line.text),
        ]);
        const item: MenuItem = {
          id: `${index}-${line.text}`,
          original: line.text,
          translated,
          pronunciation,
          boundingBox: line.boundingBox,
          description: null,
          descriptionState: 'idle',
        };
        return item;
      })
    );

    setItems(menuItems);
    setStatus('idle');
  }, []);

  const updateItem = useCallback((id: string, patch: Partial<MenuItem>) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }, []);

  if (!permission) {
    return <View style={styles.center} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.text}>카메라 권한이 필요합니다.</Text>
        <Button title="권한 요청" onPress={requestPermission} />
      </View>
    );
  }

  if (!photoUri) {
    return (
      <View style={styles.container}>
        <CameraView ref={cameraRef} style={styles.camera} />
        <Button title="촬영" onPress={capture} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {status === 'processing' && <Text style={styles.text}>분석 중...</Text>}
      {status === 'noText' && <Text style={styles.text}>텍스트를 찾지 못했습니다. 다시 촬영해주세요.</Text>}
      <Text style={styles.text}>인식된 항목: {items.length}개</Text>
      <Button title="다시 촬영" onPress={reset} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  camera: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  text: { fontSize: 16, textAlign: 'center', padding: 12 },
});
```

(사진 위 오버레이와 카드 리스트 UI는 Task 8, 9에서 이 화면에 이어붙인다. `updateItem`/`items`는 그대로 유지.)

- [ ] **Step 2: 수동 확인**

```bash
npx expo run:android
```

일본어 텍스트(메뉴판 등)를 촬영. Expected: "분석 중..." 표시 후 "인식된 항목: N개"로 바뀜. 텍스트 없는 사진(백지 등) 촬영 시 "텍스트를 찾지 못했습니다" 표시.

- [ ] **Step 3: Commit**

```bash
git add src/screens/ScanScreen.tsx
git commit -m "feat: wire OCR-translate-pronunciation pipeline in scan screen"
```

---

### Task 8: 사진 위 번역 오버레이 컴포넌트

**Files:**
- Create: `src/components/PhotoOverlay.tsx`
- Modify: `src/screens/ScanScreen.tsx` (`PhotoOverlay` 삽입)

**Interfaces:**
- Consumes: Task 1의 `MenuItem`.
- Produces: `PhotoOverlay({ uri: string; items: MenuItem[] })` 컴포넌트.

- [ ] **Step 1: PhotoOverlay 구현**

`src/components/PhotoOverlay.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { View, Image, Text, StyleSheet, LayoutChangeEvent } from 'react-native';
import type { MenuItem } from '../types';

export function PhotoOverlay({ uri, items }: { uri: string; items: MenuItem[] }) {
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(null);
  const [displayWidth, setDisplayWidth] = useState<number | null>(null);

  useEffect(() => {
    Image.getSize(uri, (width, height) => setNaturalSize({ width, height }));
  }, [uri]);

  const handleLayout = (event: LayoutChangeEvent) => {
    setDisplayWidth(event.nativeEvent.layout.width);
  };

  const scale = naturalSize && displayWidth ? displayWidth / naturalSize.width : 1;

  return (
    <View style={styles.wrapper} onLayout={handleLayout}>
      <Image
        source={{ uri }}
        style={[styles.image, naturalSize ? { aspectRatio: naturalSize.width / naturalSize.height } : null]}
        resizeMode="contain"
      />
      {naturalSize &&
        displayWidth &&
        items.map((item) => (
          <View
            key={item.id}
            style={[
              styles.bubble,
              {
                left: item.boundingBox.x * scale,
                top: item.boundingBox.y * scale,
                maxWidth: item.boundingBox.width * scale + 40,
              },
            ]}
          >
            <Text style={styles.original}>{item.original}</Text>
            <Text style={styles.translated}>{item.translated}</Text>
            <Text style={styles.pronunciation}>{item.pronunciation}</Text>
          </View>
        ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { width: '100%' },
  image: { width: '100%' },
  bubble: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 4,
    padding: 2,
  },
  original: { fontSize: 10, textDecorationLine: 'line-through', color: '#888' },
  translated: { fontSize: 13, fontWeight: '700', color: '#111' },
  pronunciation: { fontSize: 10, color: '#c00' },
});
```

- [ ] **Step 2: ScanScreen에 삽입**

`src/screens/ScanScreen.tsx`의 결과 화면(`return` 마지막 블록) 안, `status` 텍스트들 위에 `<PhotoOverlay uri={photoUri} items={items} />`를 추가하고 파일 상단에 `import { PhotoOverlay } from '../components/PhotoOverlay';`를 추가한다.

- [ ] **Step 3: 수동 확인**

```bash
npx expo run:android
```

Expected: 촬영한 사진 위, 인식된 텍스트 위치에 흰 배경 말풍선으로 원문(취소선)+번역+발음이 겹쳐 표시됨.

- [ ] **Step 4: Commit**

```bash
git add src/components/PhotoOverlay.tsx src/screens/ScanScreen.tsx
git commit -m "feat: add photo overlay for translated text"
```

---

### Task 9: 메뉴 카드 리스트 컴포넌트

**Files:**
- Create: `src/components/MenuItemCard.tsx`
- Create: `src/components/MenuList.tsx`
- Modify: `src/screens/ScanScreen.tsx` (`MenuList` 삽입)

**Interfaces:**
- Consumes: Task 1의 `MenuItem`, Task 7의 `updateItem`.
- Produces: `MenuList({ items: MenuItem[]; onUpdateItem: (id: string, patch: Partial<MenuItem>) => void })` — Task 10이 `MenuItemCard`의 설명보기 버튼에 실제 fetch를 연결.

- [ ] **Step 1: MenuItemCard (설명 기능은 Task 10에서 연결, 지금은 자리만)**

`src/components/MenuItemCard.tsx`:

```tsx
import { View, Text, Pressable, StyleSheet } from 'react-native';
import type { MenuItem } from '../types';

export function MenuItemCard({
  item,
  onShowDescription,
}: {
  item: MenuItem;
  onShowDescription: (id: string) => void;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.original}>{item.original}</Text>
      <Text style={styles.pronunciation}>{item.pronunciation}</Text>
      <Text style={styles.translated}>{item.translated}</Text>

      {item.descriptionState === 'idle' && (
        <Pressable onPress={() => onShowDescription(item.id)}>
          <Text style={styles.link}>설명 보기</Text>
        </Pressable>
      )}
      {item.descriptionState === 'loading' && <Text style={styles.desc}>불러오는 중...</Text>}
      {item.descriptionState === 'loaded' && <Text style={styles.desc}>{item.description}</Text>}
      {item.descriptionState === 'unavailable' && (
        <Text style={styles.desc}>오프라인 상태이거나 설명을 찾을 수 없습니다.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 12, borderBottomWidth: 1, borderColor: '#eee', gap: 4 },
  original: { fontSize: 13, textDecorationLine: 'line-through', color: '#888' },
  pronunciation: { fontSize: 13, color: '#c00' },
  translated: { fontSize: 18, fontWeight: '700' },
  link: { fontSize: 13, color: '#06c' },
  desc: { fontSize: 13, color: '#333', marginTop: 4 },
});
```

- [ ] **Step 2: MenuList**

`src/components/MenuList.tsx`:

```tsx
import { View } from 'react-native';
import { MenuItemCard } from './MenuItemCard';
import type { MenuItem } from '../types';

export function MenuList({
  items,
  onShowDescription,
}: {
  items: MenuItem[];
  onShowDescription: (id: string) => void;
}) {
  return (
    <View>
      {items.map((item) => (
        <MenuItemCard key={item.id} item={item} onShowDescription={onShowDescription} />
      ))}
    </View>
  );
}
```

- [ ] **Step 3: ScanScreen에 삽입**

`src/screens/ScanScreen.tsx`: `"인식된 항목: N개"` 텍스트를 지우고 그 자리에 `<MenuList items={items} onShowDescription={() => {}} />`를 추가(Task 10에서 실제 핸들러로 교체), 상단에 `import { MenuList } from '../components/MenuList';` 추가.

- [ ] **Step 4: 수동 확인**

```bash
npx expo run:android
```

Expected: 사진 오버레이 아래로 스크롤하면 같은 항목이 카드 리스트로 나열됨.

- [ ] **Step 5: Commit**

```bash
git add src/components/MenuItemCard.tsx src/components/MenuList.tsx src/screens/ScanScreen.tsx
git commit -m "feat: add menu card list below photo overlay"
```

---

### Task 10: 위키백과 설명 지연 로딩

**Files:**
- Create: `src/lib/wikipedia.ts`
- Modify: `src/screens/ScanScreen.tsx` (`onShowDescription` 실제 구현 연결)

**Interfaces:**
- Consumes: Task 7의 `updateItem`.
- Produces: `fetchSummary(term: string): Promise<string | null>`.

- [ ] **Step 1: 위키백과 요약 fetch**

`src/lib/wikipedia.ts`:

```ts
export async function fetchSummary(term: string): Promise<string | null> {
  try {
    const response = await fetch(`https://ko.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(term)}`);
    if (!response.ok) return null;
    const data = await response.json();
    return typeof data.extract === 'string' && data.extract.length > 0 ? data.extract : null;
  } catch {
    return null;
  }
}
```

- [ ] **Step 2: ScanScreen에 핸들러 연결**

`src/screens/ScanScreen.tsx`에 추가:

```ts
import { fetchSummary } from '../lib/wikipedia';
```

```ts
const handleShowDescription = useCallback(
  async (id: string) => {
    updateItem(id, { descriptionState: 'loading' });
    const item = items.find((i) => i.id === id);
    if (!item) return;
    const summary = await fetchSummary(item.translated);
    updateItem(id, { description: summary, descriptionState: summary ? 'loaded' : 'unavailable' });
  },
  [items, updateItem]
);
```

`<MenuList items={items} onShowDescription={() => {}} />`를 `<MenuList items={items} onShowDescription={handleShowDescription} />`로 교체.

- [ ] **Step 3: 수동 확인**

인터넷 연결 상태로 앱 실행 후 카드의 "설명 보기" 탭. Expected: "불러오는 중..." 후 위키백과 요약 또는 "오프라인 상태이거나 설명을 찾을 수 없습니다" 표시. 기내 모드로 동일 동작 시 항상 "찾을 수 없습니다" 표시, 앱 크래시 없음.

- [ ] **Step 4: Commit**

```bash
git add src/lib/wikipedia.ts src/screens/ScanScreen.tsx
git commit -m "feat: add lazy Wikipedia description lookup"
```

---

### Task 11: 역방향(한국어→일본어) 번역 화면

**Files:**
- Modify: `src/screens/ReverseScreen.tsx` (실제 구현으로 교체)

**Interfaces:**
- Consumes: Task 4의 `translate`, Task 5의 `getPronunciation`.

- [ ] **Step 1: 구현**

`src/screens/ReverseScreen.tsx`:

```tsx
import { useState, useCallback } from 'react';
import { View, TextInput, Text, Button, StyleSheet } from 'react-native';
import { translate } from '../lib/translate';
import { getPronunciation } from '../lib/pronounce';

export function ReverseScreen() {
  const [input, setInput] = useState('');
  const [result, setResult] = useState<{ translated: string; pronunciation: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const handleTranslate = useCallback(async () => {
    if (!input.trim()) return;
    setLoading(true);
    const translated = await translate(input, 'ko', 'ja');
    const pronunciation = await getPronunciation(translated);
    setResult({ translated, pronunciation });
    setLoading(false);
  }, [input]);

  return (
    <View style={styles.container}>
      <TextInput style={styles.input} value={input} onChangeText={setInput} placeholder="한국어를 입력하세요" />
      <Button title="번역" onPress={handleTranslate} disabled={loading} />
      {result && (
        <View style={styles.result}>
          <Text style={styles.japanese}>{result.translated}</Text>
          <Text style={styles.pronunciation}>{result.pronunciation}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 6, padding: 10, fontSize: 16 },
  result: { marginTop: 16, gap: 4 },
  japanese: { fontSize: 22, fontWeight: '700' },
  pronunciation: { fontSize: 16, color: '#c00' },
});
```

- [ ] **Step 2: 수동 확인**

```bash
npx expo run:android
```

"역번역" 탭에서 "돼지고기" 입력 후 번역 버튼. Expected: 일본어 번역과 한글 발음이 표시됨.

- [ ] **Step 3: Commit**

```bash
git add src/screens/ReverseScreen.tsx
git commit -m "feat: implement reverse Korean-to-Japanese translation screen"
```

---

### Task 12: 골든 패스 수동 스모크 테스트 + README

**Files:**
- Create: `README.md`

**Interfaces:**
- 없음 (문서화 + 검증 전용 태스크).

- [ ] **Step 1: README 작성**

`README.md`:

```markdown
# 일본 메뉴 번역기

일본 여행 중 메뉴판/간판을 촬영하면 한국어 번역과 한글 발음을 보여주는 안드로이드 전용 Expo 앱.

## 실행 방법

Expo Go 앱으로는 실행 불가 (ML Kit 네이티브 모듈 필요). 아래 순서로 실행:

\`\`\`bash
npm install
npx expo prebuild -p android
npx expo run:android
\`\`\`

최초 실행 시 인터넷 연결 상태에서 일본어↔한국어 번역 언어팩을 1회 다운로드해야 이후 오프라인 사용이 가능하다.

## 테스트

\`\`\`bash
npm test
\`\`\`
```

- [ ] **Step 2: 골든 패스 수동 스모크 테스트**

`npx expo run:android`로 실행 후 아래 항목을 모두 확인:

- [ ] 최초 실행: 언어팩 다운로드 화면 → 자동으로 탭 화면 전환
- [ ] "스캔" 탭: 카메라 권한 요청 → 허용 → 미리보기 표시
- [ ] 일본어 메뉴/간판 촬영 → 사진 위 번역 오버레이 표시 → 스크롤 시 카드 리스트 표시
- [ ] 카드에서 "설명 보기" 탭(온라인) → 위키백과 요약 또는 "찾을 수 없음" 표시
- [ ] 기내 모드로 전환 후 재촬영 → 오프라인 상태에서도 번역/발음 정상 표시, 설명만 "오프라인" 문구
- [ ] 텍스트 없는 사진 촬영 → "텍스트를 찾지 못했습니다" 안내, 크래시 없음
- [ ] "역번역" 탭: 한국어 입력("돼지고기") → 번역 → 일본어+한글 발음 표시

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: add README and smoke test checklist"
```
