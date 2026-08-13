import { drawNumberedMarkers } from '../../modules/ml-features';
import type { BoundingBox } from '../types';

const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY;

export interface AiTranslatedItem {
  original: string;
  translated: string;
  pronunciation: string;
  price: string | null;
}

function requireApiKey(): string {
  if (!OPENAI_API_KEY) throw new Error('EXPO_PUBLIC_OPENAI_API_KEY is not set');
  return OPENAI_API_KEY;
}

// AI 번역모드: on-device OCR already gives pixel-accurate positions; drawing a
// numbered marker at each detected box (native, see drawNumberedMarkers) and
// sending that ONE annotated photo gives the vision model unambiguous grounding
// for "item N" -- far more reliable than handing it a flat text list and asking
// it to blindly match N items against a busy photo with no coordinates at all.
export async function refineTranslationsWithAI(
  photoUri: string,
  lines: { text: string; boundingBox: BoundingBox }[]
): Promise<AiTranslatedItem[]> {
  const apiKey = requireApiKey();
  if (lines.length === 0) return [];
  const markedBase64 = await drawNumberedMarkers(
    photoUri,
    lines.map((l) => l.boundingBox)
  );
  const imageDataUri = `data:image/jpeg;base64,${markedBase64}`;

  const roughTexts = lines.map((l) => l.text);
  const prompt = `이 사진은 일본어 메뉴판이야. 각 메뉴 항목 위치에 빨간 원 번호 마커(1, 2, 3...)를 표시해뒀어. 온디바이스 OCR로 미리 읽어본 결과도 참고로 같이 줄게(오독 있을 수 있음). 마커가 가리키는 정확한 위치를 사진에서 직접 보고, 각 번호별 실제 일본어 원문을 정확히 읽고, 한국어 발음(한글 표기)과 한국어 번역, 가격(있으면 "800円" 형식, 없으면 null)을 알려줘.

OCR 참고값 (마커 번호와 동일한 순서):
${roughTexts.map((t, i) => `${i + 1}. ${t}`).join('\n')}

정확히 ${roughTexts.length}개 마커 전부에 대해 번호 순서대로 아래 JSON 형식으로만 응답해:
{"items": [{"original": "실제 일본어 원문", "translated": "한국어 번역", "pronunciation": "한글 발음", "price": "800円 또는 null"}]}`;

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: imageDataUri } },
          ],
        },
      ],
    }),
  });
  if (!res.ok) throw new Error(`OpenAI vision request failed: ${res.status}`);
  const data = await res.json();
  const parsed = JSON.parse(data.choices[0].message.content) as { items: AiTranslatedItem[] };
  if (!Array.isArray(parsed.items)) {
    throw new Error('AI translation response was not a valid items array');
  }
  // A dense menu (30-40+ markers) can make the model under/overshoot the exact
  // count despite the prompt's instructions. Return whatever it gave rather than
  // discarding the whole batch -- the caller falls back to the local OCR text for
  // any index past what came back, so a partial response still helps.
  return parsed.items;
}

const MENU_IMAGE_PROMPT = `첨부한 이미지는 일본어 메뉴판이야. 이 메뉴판에 적힌 실제 메뉴 내용을 그대로 읽고 정확하게 번역해서, 새로운 메뉴판 이미지를 만들어줘.

[내용 - 반드시 원본 그대로]
- 원본 사진에 적힌 일본어 메뉴명, 가격을 정확히 그대로 옮겨줘 (창작하지 말고 실제 내용 사용).
- 메뉴를 지어내거나 바꾸지 말고, 사진에 있는 항목만 사용해줘.

[레이아웃 - 원본과 비슷한 위치]
- 각 메뉴 항목을 원본 사진에서 있던 위치와 최대한 비슷하게 배치해줘.
- 각 메뉴 항목마다:
  1. 첫 줄: 일본어 메뉴명 (원문 그대로)
  2. 그 아래 가로로 나란히 두 줄:
     - 왼쪽: 일본어 발음의 한글 표기 (예: からあげ → 가라아게)
     - 오른쪽: 한글 뜻 번역 (예: → 일본식 튀김닭)
  3. 발음과 번역은 메뉴명보다 작은 글씨로, 원본 디자인을 해치지 않게 배치해줘.

[디자인]
- 원본 이미지의 전체적인 배경, 폰트 스타일, 색감, 구획 나눔은 최대한 비슷하게 유지해줘.
- 가격 표기 위치도 원본과 비슷하게 유지해줘.
- 글자가 겹치거나 잘리지 않게 깔끔하게 정리해줘.`;

// AI 창작모드: full image-to-image regeneration. Diffusion-style image models don't
// guarantee crisp rendering of dense small text, unlike refineTranslationsWithAI's
// data-only path -- this trades that reliability for keeping the actual photo's
// background/graphics in the output.
export async function generateTranslatedMenuImage(photoUri: string): Promise<string> {
  const apiKey = requireApiKey();

  // RN's New Architecture FormData bridge doesn't reliably accept the classic
  // {uri, name, type} object-literal file part ("Unsupported FormDataPart
  // implementation") -- fetch the local file into a real Blob instead, which the
  // bridge does support.
  const photoRes = await fetch(photoUri);
  const photoBlob = await photoRes.blob();

  const form = new FormData();
  form.append('model', 'gpt-image-1');
  form.append('prompt', MENU_IMAGE_PROMPT);
  form.append('size', '1024x1536');
  form.append('image[]', photoBlob, 'menu.jpg');

  const res = await fetch('https://api.openai.com/v1/images/edits', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });
  if (!res.ok) {
    const bodyText = await res.text().catch(() => '');
    throw new Error(`OpenAI image generation failed: ${res.status} ${bodyText}`);
  }
  const data = await res.json();
  const b64 = data.data[0].b64_json as string;
  return `data:image/png;base64,${b64}`;
}
