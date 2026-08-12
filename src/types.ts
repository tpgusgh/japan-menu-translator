export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type LangCode = 'ja' | 'ko';

export type TextOrientation = 'horizontal' | 'vertical';

export interface RecognizedLine {
  text: string;
  price: string | null;
  orientation: TextOrientation;
  boundingBox: BoundingBox;
}

export interface MenuItem {
  id: string;
  original: string;
  translated: string;
  pronunciation: string;
  price: string | null;
  orientation: TextOrientation;
  boundingBox: BoundingBox;
  description: string | null;
  descriptionState: 'idle' | 'loading' | 'loaded' | 'unavailable';
}
