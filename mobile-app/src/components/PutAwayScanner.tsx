// mobile-app/src/components/PutAwayScanner.tsx
import React, { useState } from 'react';
import { SafeAreaView, StyleSheet, View, Alert } from 'react-native';
import { Text } from 'react-native-paper';
import { CameraComponent } from './CameraView';
import { ScannerHeader } from './ScannerHeader';
import { ScannerButton } from './ScannerButton';
import { useBarcodeScan } from '../di/hooks/useBarcodeScan';
import { inventoryService } from '../infrastructure/inventoryService';

type PutAwayStep = 'product' | 'zone' | 'quantity';

interface PutAwayState {
  step: PutAwayStep;
  productBarcode: string | null;
  zoneBarcode: string | null;
  quantity: number;
}

interface PutAwayScannerProps {
  receiptId?: string; // ID của Receipt đã được QA_QC duyệt - cần để gọi API put-away
  onSubmit?: (data: {
    productBarcode: string;
    zoneBarcode: string;
    quantity: number;
  }) => void;
}

export const PutAwayScanner: React.FC<PutAwayScannerProps> = ({ receiptId, onSubmit }) => {
  const [state, setState] = useState<PutAwayState>({
    step: 'product',
    productBarcode: null,
    zoneBarcode: null,
    quantity: 1,
  });
  // ✅ State kiểm soát trạng thái đang gửi API (tránh double-submit)
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { handleBarcodeScan, isScanning } = useBarcodeScan({
    onScan: (result) => handleScan(result.barcode),
  });

  const handleScan = (barcode: string) => {
    if (state.step === 'product') {
      setState(s => ({ ...s, productBarcode: barcode, step: 'zone' }));
    } else if (state.step === 'zone') {
      setState(s => ({ ...s, zoneBarcode: barcode, step: 'quantity' }));
    }
  };

  const incrementQuantity = () => {
    setState(s => ({ ...s, quantity: Math.min(s.quantity + 1, 999) }));
  };

  const decrementQuantity = () => {
    setState(s => ({ ...s, quantity: Math.max(s.quantity - 1, 1) }));
  };

  // ✅ handleConfirm: Gọi API hoàn tất cất hàng
  // Route: POST /api/Receipts/{receiptId}/complete-putaway
  // Backend cộng Inventory cho từng ReceiptDetail, ghi INBOUND transaction, chuyển Receipt → Completed
  const handleConfirm = async () => {
    if (!state.productBarcode || !state.zoneBarcode) {
      Alert.alert('Lỗi', 'Vui lòng hoàn thành tất cả bước quét');
      return;
    }

    if (isSubmitting) return; // Chặn double-submit
    setIsSubmitting(true);

    try {
      if (receiptId) {
        // Có receiptId: gọi API đúng để backend xử lý tồn kho
        const res = await inventoryService.completePutAway(receiptId);
        if (res?.success) {
          Alert.alert(
            '✅ Cất hàng thành công',
            `Đã cất ${state.quantity} sản phẩm vào zone ${state.zoneBarcode}.`,
            [{ text: 'OK' }]
          );
          onSubmit?.({
            productBarcode: state.productBarcode!,
            zoneBarcode: state.zoneBarcode!,
            quantity: state.quantity,
          });
          setState({ step: 'product', productBarcode: null, zoneBarcode: null, quantity: 1 });
        } else {
          Alert.alert('❌ Lỗi', res?.message || 'Cất hàng thất bại. Thử lại.');
        }
      } else {
        // Không có receiptId: chỉ gọi callback UI (demo mode, chưa có phiếu nhập)
        Alert.alert(
          '✅ Đã ghi nhận',
          `${state.quantity} sản phẩm được xác nhận. Liên hệ Admin để gán phiếu nhập.`,
          [{ text: 'OK' }]
        );
        onSubmit?.({
          productBarcode: state.productBarcode!,
          zoneBarcode: state.zoneBarcode!,
          quantity: state.quantity,
        });
        setState({ step: 'product', productBarcode: null, zoneBarcode: null, quantity: 1 });
      }
    } catch (error: any) {
      const msg = error?.response?.data?.message || error?.message || 'Không thể kết nối máy chủ.';
      Alert.alert('❌ Lỗi kết nối', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setState({
      step: 'product',
      productBarcode: null,
      zoneBarcode: null,
      quantity: 1,
    });
  };

  const getStepInstruction = () => {
    switch (state.step) {
      case 'product':
        return 'QUÉT MÃ SẢN PHẨM';
      case 'zone':
        return 'QUÉT VỊ TRÍ CẤT (ZONE)';
      case 'quantity':
        return 'NHẬP SỐ LƯỢNG';
      default:
        return '';
    }
  };

  if (state.step !== 'quantity') {
    return (
      <SafeAreaView style={styles.container}>
        <ScannerHeader 
          title={getStepInstruction()}
          subtitle={`Bước ${state.step === 'product' ? 1 : 2} / 3`}
        />
        <CameraComponent 
          onBarcodeScanned={(barcode) => {
            if (!isScanning) {
              handleBarcodeScan(barcode);
            }
          }}
          style={styles.camera}
        />
        {(state.productBarcode || state.zoneBarcode) && (
          <View style={styles.infoBox}>
            {state.productBarcode && (
              <Text style={styles.infoText}>
                Sản phẩm: {state.productBarcode}
              </Text>
            )}
            {state.zoneBarcode && (
              <Text style={styles.infoText}>
                Zone: {state.zoneBarcode}
              </Text>
            )}
          </View>
        )}
      </SafeAreaView>
    );
  }

  // Quantity step - không dùng camera
  return (
    <SafeAreaView style={styles.container}>
      <ScannerHeader 
        title={getStepInstruction()}
        subtitle="Bước 3 / 3"
      />
      <View style={styles.quantityContainer}>
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            Sản phẩm: {state.productBarcode}
          </Text>
          <Text style={styles.infoText}>
            Zone: {state.zoneBarcode}
          </Text>
        </View>

        <View style={styles.quantityInputBox}>
          <Text style={styles.quantityLabel}>Số lượng:</Text>
          <View style={styles.quantityControls}>
            <ScannerButton 
              size="medium"
              onPress={decrementQuantity}
              style={styles.quantityBtn}
            >
              −
            </ScannerButton>
            <Text style={styles.quantityDisplay}>{state.quantity}</Text>
            <ScannerButton 
              size="medium"
              onPress={incrementQuantity}
              style={styles.quantityBtn}
            >
              +
            </ScannerButton>
          </View>
        </View>

        <View style={styles.buttonGroup}>
          <ScannerButton 
            onPress={handleConfirm}
            disabled={isSubmitting}
            style={styles.confirmBtn}
          >
            ✓ Xác nhận
          </ScannerButton>
          <ScannerButton 
            mode="outlined"
            onPress={handleReset}
            style={styles.resetBtn}
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
  infoBox: {
    padding: 12,
    backgroundColor: '#f5f5f5',
    marginHorizontal: 16,
    borderRadius: 8,
    marginVertical: 8,
  },
  infoText: {
    fontSize: 14,
    fontWeight: '600',
    marginVertical: 4,
  },
  quantityContainer: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
  },
  quantityInputBox: {
    backgroundColor: '#f5f5f5',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginVertical: 16,
  },
  quantityLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  quantityBtn: {
    minWidth: 50,
  },
  quantityDisplay: {
    fontSize: 36,
    fontWeight: 'bold',
    minWidth: 80,
    textAlign: 'center',
  },
  buttonGroup: {
    gap: 12,
    marginBottom: 20,
  },
  confirmBtn: {
    marginVertical: 0,
  },
  resetBtn: {
    marginVertical: 0,
  },
});
