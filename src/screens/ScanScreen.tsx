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
