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

export async function isModelDownloaded(lang: 'ja' | 'ko'): Promise<boolean> {
  return MlFeatures.isModelDownloaded(lang);
}

export async function downloadModel(lang: 'ja' | 'ko'): Promise<void> {
  return MlFeatures.downloadModel(lang);
}

export async function translateText(text: string, from: 'ja' | 'ko', to: 'ja' | 'ko'): Promise<string> {
  return MlFeatures.translateText(text, from, to);
}

export interface NativeReadingToken {
  surface: string;
  reading: string;
}

export async function getReadings(text: string): Promise<NativeReadingToken[]> {
  return MlFeatures.getReadings(text);
}
