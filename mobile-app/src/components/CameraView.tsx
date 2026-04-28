// mobile-app/src/components/CameraView.tsx
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';

interface CameraViewProps {
  onBarcodeScanned: (barcode: string, type: string) => void;
  cameraType?: 'back' | 'front';
  style?: any;
}

export const CameraComponent: React.FC<CameraViewProps> = ({
  onBarcodeScanned,
  cameraType = 'back',
  style,
}) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!permission) {
      return;
    }

    if (!permission.granted) {
      // Request permission on first render
      if (permission.canAskAgain) {
        requestPermission();
      } else {
        Alert.alert(
          'Quyền truy cập Camera',
          'Bạn đã từ chối quyền truy cập camera. Vui lòng vào Cài đặt để cấp quyền.',
          [
            {
              text: 'Hủy',
              onPress: () => console.log('Người dùng từ chối camera'),
              style: 'cancel',
            },
          ]
        );
      }
    } else {
      setIsReady(true);
    }
  }, [permission, requestPermission]);

  if (!permission) {
    return (
      <View style={[styles.container, style]}>
        <ActivityIndicator size="large" color="#4A90E2" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.container, style]}>
        <ActivityIndicator size="large" color="#4A90E2" />
      </View>
    );
  }

  if (!isReady) {
    return (
      <View style={[styles.container, style]}>
        <ActivityIndicator size="large" color="#4A90E2" />
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <CameraView
        facing={cameraType}
        barcodeScannerSettings={{
          barcodeTypes: [
            'code128',
            'code39',
            'code93',
            'codabar',
            'ean13',
            'ean8',
            'qr',
            'upc_e',
            'aztec',
            'datamatrix',
            'pdf417',
          ],
        }}
        onBarcodeScanned={({ data, type }) => {
          onBarcodeScanned(data, type);
        }}
        style={styles.camera}
      />
      {/* Crosshair overlay */}
      <View style={styles.overlay}>
        <View style={styles.crosshair} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  crosshair: {
    width: 200,
    height: 200,
    borderWidth: 2,
    borderColor: '#4A90E2',
    borderRadius: 16,
    backgroundColor: 'transparent',
  },
});