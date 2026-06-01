// mobile-app/src/presentation/pages/PutAway.tsx
// Màn hình Put-away - Tuần 6 - Đức Anh
// Bao bọc PutAwayScanner + gọi API complete-putaway để cộng tồn kho

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { PutAwayScanner } from '../../components/PutAwayScanner';
import receiptService from '../../infrastructure/receiptService';
import type { ReceiptDto } from '../../infrastructure/wmsTypes';

// ─── Props ────────────────────────────────────────────────────────────────────

interface PutAwayScreenProps {
  route: {
    params: {
      receipt: ReceiptDto;
    };
  };
  navigation: any;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const PutAwayScreen: React.FC<PutAwayScreenProps> = ({ route, navigation }) => {
  const { receipt } = route.params;
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ─── Handlers ────────────────────────────────────────────────────────────────

  /**
   * Được gọi sau khi thủ kho quét xong: Sản phẩm → Zone → Số lượng
   * Gọi API complete-putaway để:
   *   1. Cộng tồn kho vào đúng Zone (được bảo vệ bằng Concurrency Token)
   *   2. Ghi InventoryTransaction với type = INBOUND
   *   3. Auto-check: Nếu tất cả detail đã cất xong → Receipt.Status = Completed
   */
  const handlePutAwaySubmit = async (data: {
    productBarcode: string;
    zoneBarcode: string;
    quantity: number;
  }) => {
    // Validate: Kiểm tra sản phẩm có trong phiếu không
    const matchedDetail = receipt.receiptDetails.find(
      d => d.productBarcode === data.productBarcode
    );

    if (!matchedDetail) {
      Alert.alert(
        '❌ Mã sản phẩm không hợp lệ',
        `Mã "${data.productBarcode}" không có trong phiếu nhập này.\nVui lòng quét lại đúng sản phẩm.`,
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert(
      '✅ Xác nhận cất hàng',
      `Sản phẩm: ${matchedDetail.productName}\nKhu vực: ${data.zoneBarcode}\nSố lượng: ${data.quantity}`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xác nhận',
          onPress: () => submitPutAway(data),
        },
      ]
    );
  };

  const submitPutAway = async (data: {
    productBarcode: string;
    zoneBarcode: string;
    quantity: number;
  }) => {
    setIsSubmitting(true);
    try {
      await receiptService.completePutAway(receipt.id);

      Alert.alert(
        '🎉 Cất hàng thành công!',
        'Tồn kho đã được cập nhật. Phiếu nhập sẽ tự động chuyển sang Completed khi tất cả hàng được cất xong.',
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('Home'),
          },
        ]
      );
    } catch (error: any) {
      // Xử lý Concurrency Conflict (409) khi hai người cùng cất cùng kho
      if (error.response?.status === 409) {
        Alert.alert(
          '⚠️ Xung đột dữ liệu',
          'Tồn kho đã được thay đổi bởi người khác. Vui lòng tải lại và thử lại.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('❌ Lỗi', error.message || 'Không thể cất hàng. Vui lòng thử lại.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── UI ───────────────────────────────────────────────────────────────────────

  if (isSubmitting) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={styles.loadingText}>Đang cập nhật tồn kho...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* HEADER INFO */}
      <View style={styles.receiptInfo}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Quay lại</Text>
        </TouchableOpacity>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Phiếu nhập:</Text>
          <Text style={styles.infoValue}>#{receipt.id.substring(0, 8).toUpperCase()}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Nhà cung cấp:</Text>
          <Text style={styles.infoValue}>{receipt.supplierName || 'Không xác định'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Số mặt hàng:</Text>
          <Text style={styles.infoValue}>{receipt.receiptDetails.length} sản phẩm</Text>
        </View>
      </View>

      {/* PRODUCT LIST PREVIEW */}
      <View style={styles.productPreview}>
        <Text style={styles.previewTitle}>📋 Danh sách cần cất hàng:</Text>
        {receipt.receiptDetails.map(detail => (
          <View key={detail.id} style={styles.productRow}>
            <Text style={styles.productName} numberOfLines={1}>
              {detail.productName}
            </Text>
            <Text style={styles.productBarcode}>{detail.productBarcode}</Text>
            <Text style={styles.productQty}>SL: {detail.actualQuantity}</Text>
          </View>
        ))}
      </View>

      {/* SCANNER */}
      <View style={styles.scannerContainer}>
        <PutAwayScanner onSubmit={handlePutAwaySubmit} />
      </View>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#4A90E2',
  },
  receiptInfo: {
    backgroundColor: '#4A90E2',
    paddingTop: 50,
    paddingBottom: 12,
    paddingHorizontal: 16,
  },
  backBtn: {
    marginBottom: 8,
  },
  backBtnText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 2,
  },
  infoLabel: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 13,
  },
  infoValue: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  productPreview: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    maxHeight: 140,
  },
  previewTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#333',
    marginBottom: 6,
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  productName: {
    flex: 1,
    fontSize: 12,
    color: '#333',
  },
  productBarcode: {
    fontSize: 11,
    color: '#888',
    fontFamily: 'monospace',
  },
  productQty: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4A90E2',
    minWidth: 50,
    textAlign: 'right',
  },
  scannerContainer: {
    flex: 1,
  },
});
