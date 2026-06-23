/**
 * Put-Away Detail Screen
 * Hiển thị chi tiết phiếu nhập và gọi scanner để cất hàng
 */

import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  FlatList,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Button, Card, Divider, DataTable } from 'react-native-paper';
import { PutAwayScanner } from '../../components/PutAwayScanner';
import { inventoryService } from '../../infrastructure/inventoryService';
import { PutAwayTask, ReceiptDetail } from '../../types';

interface PutAwayDetailScreenProps {
  navigation: any;
  route: any;
}

type ScreenState = 'details' | 'scanning';

export const PutAwayDetailScreen: React.FC<PutAwayDetailScreenProps> = ({
  navigation,
  route,
}) => {
  const { receiptId, task: initialTask } = route.params;
  const [screenState, setScreenState] = useState<ScreenState>('details');
  const [task, setTask] = useState<PutAwayTask | null>(initialTask || null);
  const [isLoading, setIsLoading] = useState(!initialTask);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ──────────────────────────────────────────────────────────────────────
  // 📥 LẤY CHI TIẾT PHIẾU NHẬP
  // ──────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!initialTask) {
      fetchReceiptDetail();
    }
  }, []);

  const fetchReceiptDetail = async () => {
    try {
      setIsLoading(true);
      const response = await inventoryService.getReceiptById(receiptId);

      if (response?.success && response.data) {
        const receipt = response.data;
        const newTask: PutAwayTask = {
          taskId: receipt.id,
          taskType: 'putaway',
          receiptId: receipt.id,
          details: receipt.details,
          totalItems: receipt.details.reduce((sum, d) => sum + d.actualQuantity, 0),
          status: receipt.status,
        };
        setTask(newTask);
      } else {
        Alert.alert('Lỗi', 'Không thể tải chi tiết phiếu nhập');
        navigation.goBack();
      }
    } catch (error: any) {
      console.error('❌ Lỗi tải chi tiết:', error);
      Alert.alert('Lỗi', 'Không thể kết nối đến server');
      navigation.goBack();
    } finally {
      setIsLoading(false);
    }
  };

  // ──────────────────────────────────────────────────────────────────────
  // ✅ XỬ LÝ HOÀN TẤT CẤT HÀNG
  // ──────────────────────────────────────────────────────────────────────
  const handlePutAwayComplete = async () => {
    Alert.alert('Xác Nhận', 'Bạn đã cất xong toàn bộ hàng?', [
      { text: 'Hủy', onPress: () => {} },
      {
        text: 'Đồng Ý',
        onPress: async () => {
          if (isSubmitting) return;
          setIsSubmitting(true);

          try {
            const response = await inventoryService.completePutAway(receiptId);

            if (response?.success) {
              Alert.alert('✅ Thành Công', 'Cất hàng đã hoàn thành', [
                {
                  text: 'OK',
                  onPress: () => {
                    navigation.goBack();
                  },
                },
              ]);
            } else {
              Alert.alert('❌ Lỗi', response?.message || 'Cất hàng thất bại. Thử lại.');
            }
          } catch (error: any) {
            console.error('❌ Lỗi submit:', error);
            Alert.alert('❌ Lỗi', 'Không thể cập nhật. Kiểm tra kết nối.');
          } finally {
            setIsSubmitting(false);
          }
        },
      },
    ]);
  };

  // ──────────────────────────────────────────────────────────────────────
  // 🎨 RENDER DETAIL TAB
  // ──────────────────────────────────────────────────────────────────────
  const renderDetailsTab = () => {
    if (!task) return null;

    return (
      <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
        {/* SUMMARY CARD */}
        <Card style={styles.summaryCard}>
          <View style={styles.summaryContent}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Phiếu ID:</Text>
              <Text style={styles.summaryValue}>{task.taskId.slice(0, 12)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Trạng Thái:</Text>
              <Text
                style={[
                  styles.summaryValue,
                  { color: task.status === 'QC_Checked' ? '#FF9800' : '#4CAF50' },
                ]}
              >
                {task.status}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Tổng Số Mục:</Text>
              <Text style={styles.summaryValue}>{task.details.length}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Tổng Số Lượng:</Text>
              <Text style={styles.summaryValue}>{task.totalItems}</Text>
            </View>
          </View>
        </Card>

        {/* DETAILS TABLE */}
        <Text style={styles.sectionTitle}>Chi Tiết Sản Phẩm</Text>

        <DataTable style={styles.dataTable}>
          <DataTable.Header style={styles.tableHeader}>
            <DataTable.Title style={styles.colSku}>SKU</DataTable.Title>
            <DataTable.Title style={styles.colName}>Tên</DataTable.Title>
            <DataTable.Title style={styles.colQty} numeric>
              Số Lượng
            </DataTable.Title>
          </DataTable.Header>

          {task.details.map((detail, idx) => (
            <DataTable.Row key={detail.id} style={styles.tableRow}>
              <DataTable.Cell style={styles.colSku}>
                <Text style={styles.cellText} numberOfLines={1}>
                  {detail.productBarcode || 'N/A'}
                </Text>
              </DataTable.Cell>
              <DataTable.Cell style={styles.colName}>
                <Text style={styles.cellText} numberOfLines={2}>
                  {detail.productName}
                </Text>
              </DataTable.Cell>
              <DataTable.Cell style={styles.colQty} numeric>
                <Text style={styles.cellText}>{detail.actualQuantity}</Text>
              </DataTable.Cell>
            </DataTable.Row>
          ))}
        </DataTable>

        {/* ACTION BUTTON */}
        <View style={styles.actionContainer}>
          <Button
            mode="contained"
            loading={isSubmitting}
            disabled={isSubmitting}
            onPress={handlePutAwayComplete}
            style={styles.submitButton}
            labelStyle={styles.submitButtonLabel}
          >
            {isSubmitting ? 'Đang Xử Lý...' : '✅ Hoàn Thành Cất Hàng'}
          </Button>
        </View>
      </ScrollView>
    );
  };

  // ──────────────────────────────────────────────────────────────────────
  // 🎨 RENDER SCANNER TAB
  // ──────────────────────────────────────────────────────────────────────
  const renderScannerTab = () => (
    <View style={styles.tabContent}>
      <PutAwayScanner
        receiptId={receiptId}
        onSubmit={(data) => {
          // Sau khi quét xong, quay lại tab Details
          setScreenState('details');
          // Có thể refresh dữ liệu nếu cần
          fetchReceiptDetail();
        }}
      />
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A90E2" />
          <Text style={styles.loadingText}>Đang tải dữ liệu...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!task) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Không thể tải dữ liệu phiếu</Text>
          <Button onPress={fetchReceiptDetail}>Thử Lại</Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Cất Hàng</Text>
        <Text style={styles.headerSubtitle}>
          Phiếu Nhập #{task.taskId.slice(0, 8)}
        </Text>
      </View>

      {/* TABS */}
      <View style={styles.tabBar}>
        <Button
          mode={screenState === 'details' ? 'contained' : 'outlined'}
          style={styles.tabButton}
          onPress={() => setScreenState('details')}
        >
          Chi Tiết
        </Button>
        <Button
          mode={screenState === 'scanning' ? 'contained' : 'outlined'}
          style={styles.tabButton}
          onPress={() => setScreenState('scanning')}
        >
          Quét Barcode
        </Button>
      </View>

      <Divider />

      {/* TAB CONTENT */}
      {screenState === 'details' ? renderDetailsTab() : renderScannerTab()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },

  header: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },

  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
  },

  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },

  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#fff',
    gap: 8,
  },

  tabButton: {
    flex: 1,
  },

  tabContent: {
    flex: 1,
    padding: 12,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },

  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  errorText: {
    fontSize: 16,
    color: '#d32f2f',
    marginBottom: 16,
  },

  summaryCard: {
    marginBottom: 16,
    backgroundColor: '#fff',
  },

  summaryContent: {
    padding: 16,
  },

  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },

  summaryLabel: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },

  summaryValue: {
    fontSize: 13,
    color: '#4A90E2',
    fontWeight: '600',
  },

  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },

  dataTable: {
    backgroundColor: '#fff',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 16,
  },

  tableHeader: {
    backgroundColor: '#f0f0f0',
  },

  tableRow: {
    borderBottomColor: '#e0e0e0',
    borderBottomWidth: 0.5,
  },

  colSku: {
    flex: 0.8,
  },

  colName: {
    flex: 1.2,
  },

  colQty: {
    flex: 0.6,
  },

  cellText: {
    fontSize: 12,
    color: '#333',
  },

  actionContainer: {
    paddingBottom: 20,
  },

  submitButton: {
    backgroundColor: '#4CAF50',
    marginTop: 8,
  },

  submitButtonLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});
