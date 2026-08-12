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
