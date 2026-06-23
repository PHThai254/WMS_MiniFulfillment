/**
 * Picking Detail Screen
 * Hiển thị chi tiết phiếu xuất, lộ trình FIFO, và gọi scanner để nhặt hàng
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
  TouchableOpacity,
} from 'react-native';
import { Button, Card, Divider, DataTable, Chip } from 'react-native-paper';
import { PickingScanner } from '../../components/PickingScanner';
import { inventoryService } from '../../infrastructure/inventoryService';
import { PickingTask, PickingPlan, PickingPlanItem } from '../../types';

interface PickingDetailScreenProps {
  navigation: any;
  route: any;
}

type ScreenState = 'details' | 'fifo-plan' | 'scanning';

export const PickingDetailScreen: React.FC<PickingDetailScreenProps> = ({
  navigation,
  route,
}) => {
  const { issueId, task: initialTask } = route.params;
  const [screenState, setScreenState] = useState<ScreenState>('details');
  const [task, setTask] = useState<PickingTask | null>(initialTask || null);
  const [pickingPlan, setPickingPlan] = useState<PickingPlan | null>(null);
  const [isLoading, setIsLoading] = useState(!initialTask);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ──────────────────────────────────────────────────────────────────────
  // 📤 LẤY CHI TIẾT PHIẾU XUẤT
  // ──────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!initialTask) {
      fetchIssueDetail();
    }
  }, []);

  const fetchIssueDetail = async () => {
    try {
      setIsLoading(true);
      const response = await inventoryService.getIssueById(issueId);

      if (response?.success && response.data) {
        const issue = response.data;
        const newTask: PickingTask = {
          taskId: issue.id,
          taskType: 'picking',
          issueId: issue.id,
          details: issue.details,
          totalItems: issue.details.reduce((sum, d) => sum + d.quantityToPick, 0),
          status: issue.status,
        };
        setTask(newTask);
      } else {
        Alert.alert('Lỗi', 'Không thể tải chi tiết phiếu xuất');
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
  // 🎯 LẤY LỘ TRÌNH FIFO
  // ──────────────────────────────────────────────────────────────────────
  const fetchPickingPlan = async () => {
    try {
      setIsLoading(true);
      const response = await inventoryService.getPickingPlan(issueId);

      if (response?.success && response.data) {
        setPickingPlan(response.data);
      } else {
        Alert.alert('Lỗi', 'Không thể lấy lộ trình FIFO');
      }
    } catch (error: any) {
      console.error('❌ Lỗi tải lộ trình:', error);
      Alert.alert('Lỗi', 'Không thể kết nối đến server');
    } finally {
      setIsLoading(false);
    }
  };

  // ──────────────────────────────────────────────────────────────────────
  // ✅ XỬ LÝ HOÀN TẤT BÀNG GIAO
  // ──────────────────────────────────────────────────────────────────────
  const handleHandover = async () => {
    // Kiểm tra xem đã nhặt đủ chưa
    const totalPicked = task?.details.reduce((sum, d) => sum + d.pickedQuantity, 0) || 0;
    const totalNeeded = task?.totalItems || 0;

    if (totalPicked < totalNeeded) {
      Alert.alert(
        'Chưa Đủ',
        `Bạn mới nhặt ${totalPicked}/${totalNeeded}. Hãy nhặt đủ số lượng trước.`
      );
      return;
    }

    Alert.alert('Xác Nhận', 'Bạn đã nhặt đủ hàng và sẵn sàng bàn giao?', [
      { text: 'Hủy', onPress: () => {} },
      {
        text: 'Đồng Ý',
        onPress: async () => {
          if (isSubmitting) return;
          setIsSubmitting(true);

          try {
            const response = await inventoryService.handoverIssue(issueId);

            if (response?.success) {
              Alert.alert('✅ Thành Công', 'Bàn giao đã hoàn thành', [
                {
                  text: 'OK',
                  onPress: () => {
                    navigation.goBack();
                  },
                },
              ]);
            } else {
              Alert.alert('❌ Lỗi', response?.message || 'Bàn giao thất bại. Thử lại.');
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

    const totalPicked = task.details.reduce((sum, d) => sum + d.pickedQuantity, 0);
    const progressPercent = (totalPicked / task.totalItems) * 100;

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
                  { color: task.status === 'Pending' ? '#FF9800' : '#4CAF50' },
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

            {/* PROGRESS */}
            <Divider style={styles.divider} />
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View
                  style={[styles.progressFill, { width: `${progressPercent}%` }]}
                />
              </View>
              <Text style={styles.progressText}>
                Tiến độ: {totalPicked}/{task.totalItems} ({Math.round(progressPercent)}%)
              </Text>
            </View>
          </View>
        </Card>

        {/* DETAILS TABLE */}
        <Text style={styles.sectionTitle}>Chi Tiết Cần Nhặt</Text>

        <DataTable style={styles.dataTable}>
          <DataTable.Header style={styles.tableHeader}>
            <DataTable.Title style={styles.colSku}>SKU</DataTable.Title>
            <DataTable.Title style={styles.colName}>Tên</DataTable.Title>
            <DataTable.Title style={styles.colQty} numeric>
              Cần
            </DataTable.Title>
            <DataTable.Title style={styles.colQty} numeric>
              Đã
            </DataTable.Title>
          </DataTable.Header>

          {task.details.map((detail) => (
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
                <Text style={styles.cellText}>{detail.quantityToPick}</Text>
              </DataTable.Cell>
              <DataTable.Cell style={styles.colQty} numeric>
                <Chip
                  label={String(detail.pickedQuantity)}
                  style={{
                    backgroundColor:
                      detail.pickedQuantity >= detail.quantityToPick
                        ? '#4CAF50'
                        : '#FFC107',
                  }}
                  textStyle={{
                    color: '#fff',
                    fontSize: 11,
                    fontWeight: '600',
                  }}
                />
              </DataTable.Cell>
            </DataTable.Row>
          ))}
        </DataTable>

        {/* ACTION BUTTONS */}
        <View style={styles.actionContainer}>
          <Button
            mode="outlined"
            style={styles.actionButton}
            onPress={() => {
              setScreenState('fifo-plan');
              fetchPickingPlan();
            }}
          >
            Xem Lộ Trình FIFO
          </Button>

          <Button
            mode="contained"
            loading={isSubmitting}
            disabled={
              isSubmitting ||
              task.details.reduce((sum, d) => sum + d.pickedQuantity, 0) <
                task.totalItems
            }
            onPress={handleHandover}
            style={styles.submitButton}
            labelStyle={styles.submitButtonLabel}
          >
            {isSubmitting ? 'Đang Xử Lý...' : '✅ Bàn Giao'}
          </Button>
        </View>
      </ScrollView>
    );
  };

  // ──────────────────────────────────────────────────────────────────────
  // 🎯 RENDER FIFO PLAN TAB
  // ──────────────────────────────────────────────────────────────────────
  const renderFifoPlanTab = () => {
    if (!pickingPlan) {
      return (
        <View style={[styles.tabContent, styles.centeredContent]}>
          {isLoading ? (
            <>
              <ActivityIndicator size="large" color="#4A90E2" />
              <Text style={styles.loadingText}>Đang tải lộ trình...</Text>
            </>
          ) : (
            <Button mode="contained" onPress={fetchPickingPlan}>
              Tải Lộ Trình FIFO
            </Button>
          )}
        </View>
      );
    }

    return (
      <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
        <Card style={styles.infoCard}>
          <View style={styles.infoContent}>
            <Text style={styles.infoText}>
              📋 Lộ trình FIFO sắp xếp hàng từ cũ nhất (có trong kho lâu nhất) lên đầu.
              Hãy theo thứ tự để tối ưu hóa vị trí tồn kho.
            </Text>
          </View>
        </Card>

        {pickingPlan.items.map((item, index) => (
          <Card key={item.issueDetailId} style={styles.fifoCard}>
            <View style={styles.fifoContent}>
              <View style={styles.stepBadge}>
                <Text style={styles.stepNumber}>{index + 1}</Text>
              </View>

              <View style={styles.fifoDetails}>
                <Text style={styles.fifoTitle}>
                  {item.productName} ({item.productBarcode})
                </Text>

                <View style={styles.fifoRow}>
                  <Text style={styles.fifoLabel}>📍 Vị trí:</Text>
                  <Text style={styles.fifoValue}>{item.zoneName}</Text>
                </View>

                <View style={styles.fifoRow}>
                  <Text style={styles.fifoLabel}>📦 Số lượng:</Text>
                  <Text style={styles.fifoValue}>{item.quantityToPick} cái</Text>
                </View>

                <View style={styles.fifoRow}>
                  <Text style={styles.fifoLabel}>📅 Ngày nhập:</Text>
                  <Text style={styles.fifoValue}>
                    {new Date(item.restockedDate).toLocaleDateString('vi-VN')}
                  </Text>
                </View>
              </View>
            </View>
          </Card>
        ))}

        <Button
          mode="contained"
          style={styles.readyButton}
          onPress={() => setScreenState('scanning')}
        >
          Sẵn Sàng Quét Barcode
        </Button>
      </ScrollView>
    );
  };

  // ──────────────────────────────────────────────────────────────────────
  // 🎨 RENDER SCANNER TAB
  // ──────────────────────────────────────────────────────────────────────
  const renderScannerTab = () => (
    <View style={styles.tabContent}>
      <PickingScanner
        task={
          task
            ? {
                issueId: task.issueId,
                issueDetailId: task.details[0]?.id || '',
                zoneLocation: task.details[0]?.zoneName || '',
                expectedBarcode: task.details[0]?.productBarcode || '',
                quantity: task.details[0]?.quantityToPick || 0,
              }
            : undefined
        }
        onSuccess={() => {
          // Sau khi quét xong, quay lại tab Details
          setScreenState('details');
          // Refresh dữ liệu
          fetchIssueDetail();
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
          <Button onPress={fetchIssueDetail}>Thử Lại</Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Nhặt Hàng (FIFO)</Text>
        <Text style={styles.headerSubtitle}>
          Phiếu Xuất #{task.taskId.slice(0, 8)}
        </Text>
      </View>

      {/* TABS */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[
            styles.tabButton,
            screenState === 'details' && styles.activeTabButton,
          ]}
          onPress={() => setScreenState('details')}
        >
          <Text
            style={[
              styles.tabButtonText,
              screenState === 'details' && styles.activeTabButtonText,
            ]}
          >
            Chi Tiết
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabButton,
            screenState === 'fifo-plan' && styles.activeTabButton,
          ]}
          onPress={() => {
            setScreenState('fifo-plan');
            if (!pickingPlan) fetchPickingPlan();
          }}
        >
          <Text
            style={[
              styles.tabButtonText,
              screenState === 'fifo-plan' && styles.activeTabButtonText,
            ]}
          >
            Lộ Trình FIFO
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabButton,
            screenState === 'scanning' && styles.activeTabButton,
          ]}
          onPress={() => setScreenState('scanning')}
        >
          <Text
            style={[
              styles.tabButtonText,
              screenState === 'scanning' && styles.activeTabButtonText,
            ]}
          >
            Quét
          </Text>
        </TouchableOpacity>
      </View>

      <Divider />

      {/* TAB CONTENT */}
      {screenState === 'details' && renderDetailsTab()}
      {screenState === 'fifo-plan' && renderFifoPlanTab()}
      {screenState === 'scanning' && renderScannerTab()}
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
    paddingHorizontal: 8,
    paddingVertical: 8,
    backgroundColor: '#fff',
    gap: 4,
  },

  tabButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 2,
    borderBottomColor: '#e0e0e0',
    alignItems: 'center',
  },

  activeTabButton: {
    borderBottomColor: '#4A90E2',
  },

  tabButtonText: {
    fontSize: 12,
    color: '#999',
    fontWeight: '500',
  },

  activeTabButtonText: {
    color: '#4A90E2',
    fontWeight: '600',
  },

  tabContent: {
    flex: 1,
    padding: 12,
  },

  centeredContent: {
    justifyContent: 'center',
    alignItems: 'center',
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

  divider: {
    marginVertical: 8,
  },

  progressContainer: {
    marginTop: 8,
  },

  progressBar: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 6,
  },

  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
  },

  progressText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
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
    gap: 8,
    paddingBottom: 20,
  },

  actionButton: {
    borderColor: '#4A90E2',
  },

  submitButton: {
    backgroundColor: '#4CAF50',
  },

  submitButtonLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },

  infoCard: {
    marginBottom: 16,
    backgroundColor: '#E3F2FD',
  },

  infoContent: {
    padding: 12,
  },

  infoText: {
    fontSize: 13,
    color: '#1976D2',
    lineHeight: 20,
  },

  fifoCard: {
    marginBottom: 12,
    backgroundColor: '#fff',
  },

  fifoContent: {
    padding: 12,
    flexDirection: 'row',
    gap: 12,
  },

  stepBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4A90E2',
    justifyContent: 'center',
    alignItems: 'center',
  },

  stepNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },

  fifoDetails: {
    flex: 1,
  },

  fifoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },

  fifoRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },

  fifoLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
    minWidth: 80,
  },

  fifoValue: {
    fontSize: 12,
    color: '#4A90E2',
    fontWeight: '600',
    flex: 1,
  },

  readyButton: {
    backgroundColor: '#4CAF50',
    marginTop: 12,
    marginBottom: 20,
  },
});
