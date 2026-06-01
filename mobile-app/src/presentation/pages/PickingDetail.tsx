// mobile-app/src/presentation/pages/PickingDetail.tsx
// Màn hình Picking Scanner chi tiết - Tuần 7 - Đức Anh
// Bao bọc PickingScanner + gọi API confirm-pick để trừ tồn kho

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { PickingScanner } from '../../components/PickingScanner';
import issueService from '../../infrastructure/issueService';
import type { PickingPlanItemDto } from '../../infrastructure/wmsTypes';

// ─── Props ────────────────────────────────────────────────────────────────────

interface PickingDetailScreenProps {
  route: {
    params: {
      issueId: string;
      planItem: PickingPlanItemDto;
      currentPicked: number;
    };
  };
  navigation: any;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const PickingDetailScreen: React.FC<PickingDetailScreenProps> = ({
  route,
  navigation,
}) => {
  const { issueId, planItem, currentPicked } = route.params;
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Số lượng còn cần nhặt (đã trừ phần đã nhặt trước đó)
  const remainingQty = planItem.quantityToPick - currentPicked;

  // ─── Handlers ─────────────────────────────────────────────────────────────

  /**
   * Được gọi khi PickingScanner xác nhận quét đúng mã + nhập đủ số lượng.
   * Gọi API confirm-pick để:
   *   1. Trừ tồn kho an toàn trong Transaction (bảo vệ Concurrency Token)
   *   2. Tăng IssueDetail.PickedQuantity
   *   3. Auto-check: Nếu TẤT CẢ dòng đã pick đủ → Issue.Status = Handover
   */
  const handlePickSuccess = async (data: {
    scannedBarcode: string;
    pickedQuantity: number;
  }) => {
    setIsSubmitting(true);
    try {
      const updatedIssue = await issueService.confirmPick(issueId, {
        issueDetailId: planItem.issueDetailId,
        pickedQuantity: data.pickedQuantity,
      });

      // Kiểm tra xem toàn bộ lệnh đã hoàn thành chưa
      const allDone = updatedIssue.issueDetails.every(
        d => d.pickedQuantity >= d.quantityToPick
      );

      if (allDone) {
        Alert.alert(
          '🎉 Hoàn tất lệnh xuất!',
          'Tất cả hàng đã được nhặt đủ. Lệnh xuất đã chuyển sang trạng thái Bàn giao.',
          [
            {
              text: 'OK',
              onPress: () => navigation.navigate('Home'),
            },
          ]
        );
      } else {
        Alert.alert(
          '✅ Xác nhận nhặt hàng thành công',
          `Đã nhặt ${data.pickedQuantity} sản phẩm từ ${planItem.zoneName}.`,
          [
            {
              text: 'Tiếp tục',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      }
    } catch (error: any) {
      // Xử lý Concurrency Conflict (409)
      if (error.response?.status === 409) {
        Alert.alert(
          '⚠️ Xung đột dữ liệu',
          'Tồn kho đã bị thay đổi bởi người khác. Vui lòng tải lại lộ trình và thử lại.',
          [
            {
              text: 'Tải lại',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      } else {
        Alert.alert('❌ Lỗi', error.message || 'Không thể xác nhận nhặt hàng.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── UI ───────────────────────────────────────────────────────────────────

  if (isSubmitting) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={styles.loadingText}>Đang trừ tồn kho...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Quay lại</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Quét nhặt hàng</Text>
        <View style={styles.zoneTag}>
          <Text style={styles.zoneTagText}>📍 {planItem.zoneName}</Text>
        </View>
      </View>

      {/* PICKING SCANNER — Truyền đúng task với expectedBarcode từ FIFO plan */}
      <PickingScanner
        task={{
          zoneLocation: `${planItem.zoneName.toUpperCase()} — CẦN ${remainingQty} SẢN PHẨM`,
          expectedBarcode: planItem.productBarcode,
          quantity: remainingQty,
        }}
        onSuccess={handlePickSuccess}
      />
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: { fontSize: 16, color: '#4A90E2' },
  header: {
    backgroundColor: '#4A90E2',
    paddingTop: 50,
    paddingBottom: 14,
    paddingHorizontal: 16,
  },
  backBtn: { marginBottom: 6 },
  backBtnText: { color: 'rgba(255,255,255,0.8)', fontSize: 13 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  zoneTag: {
    marginTop: 6,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  zoneTagText: { color: '#fff', fontWeight: '700', fontSize: 13 },
});
