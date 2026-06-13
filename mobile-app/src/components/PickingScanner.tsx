// mobile-app/src/components/PickingScanner.tsx
import React, { useState } from 'react';
import { SafeAreaView, StyleSheet, View, Alert, Animated, Vibration } from 'react-native';
import { Text } from 'react-native-paper';
import { CameraComponent } from './CameraView';
import { ScannerHeader } from './ScannerHeader';
import { ScannerButton } from './ScannerButton';
import { useBarcodeScan } from '../di/hooks/useBarcodeScan';
import { inventoryService } from '../infrastructure/inventoryService';

interface PickingTask {
  issueId: string;       // ID của Issue (Lệnh xuất kho)
  issueDetailId: string; // ID của IssueDetail (từng dòng sản phẩm)
  zoneLocation: string;
  expectedBarcode: string;
  quantity: number;
}

interface PickingScannerProps {
  task?: PickingTask;
  onSuccess?: (data: {
    scannedBarcode: string;
    pickedQuantity: number;
  }) => void;
}

export const PickingScanner: React.FC<PickingScannerProps> = ({
  task = {
    issueId: '',
    issueDetailId: '',
    zoneLocation: 'DÃY A - NHU CẦU 5 SẢN PHẨM',
    expectedBarcode: 'CODE123456',
    quantity: 5,
  },
  onSuccess,
}) => {
  const [pickedQuantity, setPickedQuantity] = useState(0);
  const [scannedBarcode, setScannedBarcode] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [errorAnimation] = useState(new Animated.Value(0));
  // ✅ State chặn gọi API đồng thời (kết hợp với debounce của useBarcodeScan)
  const [isApiCalling, setIsApiCalling] = useState(false);

  const { handleBarcodeScan, isScanning } = useBarcodeScan({
    onScan: (result) => handleProductScan(result.barcode),
    debounceMs: 1500,
  });

  // ✅ handleProductScan: Xử lý barcode quét được từ camera
  // Khi đủ số lượng → gọi API confirmPicking (InventoryTransaction OUTBOUND)
  const handleProductScan = async (barcode: string) => {
    if (barcode !== task.expectedBarcode) {
      // QUÉT SAI MÃ → Vibration mạnh + Nháy đỏ
      if (Vibration.vibrate) {
        Vibration.vibrate([0, 200, 100, 200]); // Rung mạnh
      }

      setIsError(true);
      Animated.sequence([
        Animated.timing(errorAnimation, {
          toValue: 1,
          duration: 100,
          useNativeDriver: false,
        }),
        Animated.timing(errorAnimation, {
          toValue: 0,
          duration: 100,
          useNativeDriver: false,
        }),
      ]).start();

      Alert.alert('❌ SAI MÃ', `Quét sai! Hãy quét lại mã chính xác: ${task.expectedBarcode}`);
      return;
    }

    // QUÉT ĐÚNG
    setIsError(false);
    setScannedBarcode(barcode);
    const newPickedQty = Math.min(pickedQuantity + 1, task.quantity);
    setPickedQuantity(newPickedQty);

    if (newPickedQty >= task.quantity) {
      // Đủ số lượng → Gọi API xác nhận picking
      if (isApiCalling) return;
      setIsApiCalling(true);

      try {
        // ✅ Gọi đúng endpoint: POST /api/Issues/{issueId}/confirm-pick
        // Backend trừ Inventory, ghi InventoryTransaction OUTBOUND (FIFO)
        const res = await inventoryService.confirmPicking(task.issueId, {
          issueDetailId: task.issueDetailId,
          pickedQuantity: task.quantity,
        });

        if (res?.success) {
          Alert.alert('✅ HOÀN TẤT', 'Đã nhặt đủ số lượng', [
            {
              text: 'OK',
              onPress: () => {
                onSuccess?.({
                  scannedBarcode: barcode,
                  pickedQuantity: task.quantity,
                });
                // Reset form
                setPickedQuantity(0);
                setScannedBarcode(null);
              },
            },
          ]);
        } else {
          Alert.alert('❌ Lỗi', res?.message || 'Báo cáo picking thất bại.');
        }
      } catch (error: any) {
        const msg = error?.response?.data?.message || error?.message || 'Không thể kết nối máy chủ.';
        Alert.alert('❌ Lỗi kết nối', msg);
      } finally {
        setIsApiCalling(false);
      }
    }
  };

  const handleManualAdd = () => {
    if (pickedQuantity < task.quantity) {
      setPickedQuantity(pickedQuantity + 1);
    }
  };

  const handleReset = () => {
    setPickedQuantity(0);
    setScannedBarcode(null);
    setIsError(false);
  };

  const progressPercentage = (pickedQuantity / task.quantity) * 100;

  return (
    <SafeAreaView style={styles.container}>
      <ScannerHeader 
        title={task.zoneLocation}
        subtitle={`${pickedQuantity} / ${task.quantity} sản phẩm`}
        isError={isError}
      />

      <CameraComponent 
        onBarcodeScanned={(barcode) => {
          if (!isScanning) {
            handleBarcodeScan(barcode);
          }
        }}
        style={styles.camera}
      />

      <View style={styles.bottomPanel}>
        {/* Progress bar */}
        <View style={styles.progressContainer}>
          <View style={[styles.progressBar, { width: `${progressPercentage}%` }]} />
        </View>

        {/* Scanned info */}
        {scannedBarcode && (
          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>Mã quét: </Text>
            <Text style={styles.infoValue}>{scannedBarcode}</Text>
          </View>
        )}

        {/* Expected barcode */}
        <View style={styles.instructionBox}>
          <Text style={styles.instructionLabel}>Mã cần quét:</Text>
          <Text style={styles.barcodeDisplay}>{task.expectedBarcode}</Text>
        </View>

        {/* Action buttons */}
        <View style={styles.buttonGroup}>
          {pickedQuantity < task.quantity && (
            <ScannerButton 
              onPress={handleManualAdd}
              size="large"
            >
              + Thêm 1 sản phẩm ({pickedQuantity + 1}/{task.quantity})
            </ScannerButton>
          )}

          {pickedQuantity >= task.quantity && (
            <ScannerButton 
              onPress={() => {
                onSuccess?.({
                  scannedBarcode: scannedBarcode || task.expectedBarcode,
                  pickedQuantity: task.quantity,
                });
                handleReset();
              }}
              size="large"
            >
              ✓ HOÀN TẤT - BÀN GIAO
            </ScannerButton>
          )}

          <ScannerButton 
            mode="outlined"
            onPress={handleReset}
            size="large"
          >
            Làm lại
          </ScannerButton>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  camera: {
    flex: 1,
  },
  bottomPanel: {
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  progressContainer: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 4,
  },
  infoBox: {
    backgroundColor: '#e3f2fd',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1976d2',
  },
  instructionBox: {
    backgroundColor: '#fff3cd',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
  },
  instructionLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  barcodeDisplay: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ff6f00',
    fontFamily: 'monospace',
  },
  buttonGroup: {
     gap: 8,
  },
});
