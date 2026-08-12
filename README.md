# 일본 메뉴 번역기

일본 여행 중 메뉴판/간판을 촬영하면 한국어 번역과 한글 발음을 보여주는 안드로이드 전용 Expo 앱.

## 실행 방법

Expo Go 앱으로는 실행 불가 (ML Kit 네이티브 모듈 필요). 아래 순서로 실행:

```bash
npm install
npx expo prebuild -p android
npx expo run:android
```

최초 실행 시 인터넷 연결 상태에서 일본어↔한국어 번역 언어팩을 1회 다운로드해야 이후 오프라인 사용이 가능하다.

### 빌드 문제 해결

`android/` 디렉터리는 `.gitignore`에 포함되어 있고 `expo prebuild`를 실행할 때마다
새로 생성된다. 이 프로젝트를 macOS에서 빌드할 때 아래 두 가지 문제가 재현되므로,
매번 `expo prebuild` 이후 `android/gradle.properties`에 두 줄을 추가해야 한다.

1. **시스템 JDK와의 호환성 문제**: 최신 시스템 Java(예: OpenJDK 25)는 이 프로젝트의
   Gradle/AGP 버전과 호환되지 않는다. JDK 17을 설치하고 Gradle이 그 JDK를 쓰도록 고정한다.

   ```bash
   brew install openjdk@17
   ```

   `android/gradle.properties`에 추가 (경로는 `brew --prefix openjdk@17`로 확인, 보통
   `$(brew --prefix openjdk@17)/libexec/openjdk.jdk/Contents/Home`):

   ```properties
   org.gradle.java.home=/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home
   ```

2. **`kuromoji-ipadic`/`kuromoji-core` 리소스 병합 충돌**: 두 jar가 같은 `META-INF/*.md`
   경로를 가지고 있어 리소스 병합(resource merge) 단계에서 빌드가 실패한다.
   `android/gradle.properties`에 아래 줄을 추가하면 해결된다 (Expo가 생성하는 기본
   `android/app/build.gradle` 템플릿이 이 키를 실제 `packagingOptions` DSL로 그대로
   전달하도록 되어 있음을 확인함):

   ```properties
   android.packagingOptions.excludes=META-INF/*.md
   ```

두 설정 모두 `android/gradle.properties`에 함께 넣으면 된다. 예:

```properties
org.gradle.java.home=/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home
android.packagingOptions.excludes=META-INF/*.md
```

`android/`가 지워지고 재생성될 때마다 (즉 `expo prebuild`를 다시 실행할 때마다) 위
두 줄을 다시 추가해야 한다.

## 테스트

```bash
npm test
```
