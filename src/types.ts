export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type LangCode = 'ja' | 'ko';

export interface RecognizedLine {
  text: string;
  price: string | null;
  boundingBox: BoundingBox;
}

export interface MenuItem {
  id: string;
  original: string;
  translated: string;
  pronunciation: string;
  price: string | null;
  boundingBox: BoundingBox;
  description: string | null;
  descriptionState: 'idle' | 'loading' | 'loaded' | 'unavailable';
}
