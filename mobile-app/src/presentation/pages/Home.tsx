
/**
 * Home Screen - Task List
 * Hiển thị danh sách lệnh Cất Hàng (Put-Away) và Nhặt Hàng (Picking)
 */

import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Button, Card, Divider } from 'react-native-paper';
import { inventoryService } from '../../infrastructure/inventoryService';
import { Receipt, Issue, Task, PutAwayTask, PickingTask } from '../../types';

type TabType = 'putaway' | 'picking';

interface HomeScreenProps {
  navigation: any;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState<TabType>('putaway');
  const [putAwayTasks, setPutAwayTasks] = useState<PutAwayTask[]>([]);
  const [pickingTasks, setPickingTasks] = useState<PickingTask[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // ──────────────────────────────────────────────────────────────────────
  // 📥 LẤY DANH SÁCH PHIẾU NHẬP (PUT-AWAY)
  // ──────────────────────────────────────────────────────────────────────
  const fetchReceiptList = async () => {
    try {
      setIsLoading(true);
      const response = await inventoryService.getReceiptList();
      
      if (response?.success && response.data) {
        // Lọc các phiếu có status = 'QC_Checked' (chưa cất hàng)
        const qcCheckedReceipts = response.data.filter(r => r.status === 'QC_Checked');
        
        // Map thành PutAwayTask
        const tasks: PutAwayTask[] = qcCheckedReceipts.map(receipt => ({
          taskId: receipt.id,
          taskType: 'putaway',
          receiptId: receipt.id,
          details: receipt.details,
          totalItems: receipt.details.reduce((sum, d) => sum + d.actualQuantity, 0),
          status: receipt.status,
        }));
        
        setPutAwayTasks(tasks);
      } else {
        Alert.alert('Lỗi', response?.message || 'Không thể tải danh sách phiếu nhập');
      }
    } catch (error: any) {
      console.error('❌ Lỗi tải danh sách phiếu nhập:', error);
      Alert.alert('Lỗi', 'Không thể kết nối đến server');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  // ──────────────────────────────────────────────────────────────────────
  // 📤 LẤY DANH SÁCH PHIẾU XUẤT (PICKING)
  // ──────────────────────────────────────────────────────────────────────
  const fetchIssueList = async () => {
    try {
      setIsLoading(true);
      const response = await inventoryService.getIssueList();
      
      if (response?.success && response.data) {
        // Lọc các phiếu có status = 'Pending' (chưa nhặt hàng)
        const pendingIssues = response.data.filter(i => 
          i.status === 'Pending' || i.status === 'Picking'
        );
        
        // Map thành PickingTask
        const tasks: PickingTask[] = pendingIssues.map(issue => ({
          taskId: issue.id,
          taskType: 'picking',
          issueId: issue.id,
          details: issue.details,
          totalItems: issue.details.reduce((sum, d) => sum + d.quantityToPick, 0),
          status: issue.status,
        }));
        
        setPickingTasks(tasks);
      } else {
        Alert.alert('Lỗi', response?.message || 'Không thể tải danh sách phiếu xuất');
      }
    } catch (error: any) {
      console.error('❌ Lỗi tải danh sách phiếu xuất:', error);
      Alert.alert('Lỗi', 'Không thể kết nối đến server');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  // Tải dữ liệu khi component focus
  useFocusEffect(
    React.useCallback(() => {
      if (activeTab === 'putaway') {
        fetchReceiptList();
      } else {
        fetchIssueList();
      }
    }, [activeTab])
  );

  // ──────────────────────────────────────────────────────────────────────
  // 🔄 REFRESH DATA
  // ──────────────────────────────────────────────────────────────────────
  const handleRefresh = () => {
    setRefreshing(true);
    if (activeTab === 'putaway') {
      fetchReceiptList();
    } else {
      fetchIssueList();
    }
  };

  // ──────────────────────────────────────────────────────────────────────
  // 📍 NAVIGATE TO DETAIL SCREEN
  // ──────────────────────────────────────────────────────────────────────
  const handleTaskPress = (task: Task) => {
    if (task.taskType === 'putaway') {
      navigation.navigate('PutAwayDetail', { receiptId: task.taskId, task });
    } else {
      navigation.navigate('PickingDetail', { issueId: task.taskId, task });
    }
  };

  // ──────────────────────────────────────────────────────────────────────
  // 🎨 RENDER TASK CARD
  // ──────────────────────────────────────────────────────────────────────
  const renderTaskCard = ({ item }: { item: Task }) => {
    const isPickingTask = item.taskType === 'picking';
    const statusColor = item.status === 'QC_Checked' ? '#FF9800' : '#4CAF50';
    
    return (
      <TouchableOpacity
        style={styles.cardContainer}
        onPress={() => handleTaskPress(item)}
        activeOpacity={0.7}
      >
        <Card style={styles.card}>
          <View style={styles.cardContent}>
            {/* ICON + STATUS */}
            <View style={styles.cardHeader}>
              <Text style={styles.cardIcon}>
                {isPickingTask ? '📤' : '📥'}
              </Text>
              <View style={{ backgroundColor: statusColor, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 }}>
                <Text style={{ color: '#fff', fontWeight: '600', fontSize: 12 }}>
                  {item.status}
                </Text>
              </View>
            </View>

            {/* TITLE */}
            <Text style={styles.taskId}>
              {isPickingTask ? 'Phiếu Xuất' : 'Phiếu Nhập'} #{item.taskId.slice(0, 8)}
            </Text>

            {/* DETAILS */}
            <View style={styles.detailsRow}>
              <Text style={styles.detailLabel}>Số mục:</Text>
              <Text style={styles.detailValue}>{item.details.length} sản phẩm</Text>
            </View>

            <View style={styles.detailsRow}>
              <Text style={styles.detailLabel}>Tổng số lượng:</Text>
              <Text style={styles.detailValue}>{item.totalItems} cái</Text>
            </View>

            {/* PROGRESS BAR */}
            {isPickingTask && (
              <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${
                          (item.details.reduce((sum, d) => sum + d.pickedQuantity, 0) /
                            item.totalItems) *
                          100
                        }%`,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.progressText}>
                  {item.details.reduce((sum, d) => sum + d.pickedQuantity, 0)}/
                  {item.totalItems}
                </Text>
              </View>
            )}

            {/* BUTTON */}
            <Button
              mode="contained"
              style={styles.actionButton}
              labelStyle={{ color: '#fff', fontWeight: '600' }}
              onPress={() => handleTaskPress(item)}
            >
              {isPickingTask ? 'Bắt Đầu Nhặt' : 'Bắt Đầu Cất'}
            </Button>
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  // ──────────────────────────────────────────────────────────────────────
  // 📊 RENDER EMPTY STATE
  // ──────────────────────────────────────────────────────────────────────
  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>
        {activeTab === 'putaway' ? '📥' : '📤'}
      </Text>
      <Text style={styles.emptyText}>
        {activeTab === 'putaway'
          ? 'Không có phiếu nhập nào chờ cất hàng'
          : 'Không có phiếu xuất nào chờ nhặt hàng'}
      </Text>
      <Button
        mode="contained"
        style={styles.refreshButton}
        onPress={handleRefresh}
      >
        Tải Lại
      </Button>
    </View>
  );

  const currentTasks = activeTab === 'putaway' ? putAwayTasks : pickingTasks;

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Danh Sách Công Việc</Text>
        <Text style={styles.headerSubtitle}>
          {activeTab === 'putaway' ? 'Cất Hàng' : 'Nhặt Hàng'}
        </Text>
      </View>

      {/* TABS */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'putaway' && styles.activeTab]}
          onPress={() => setActiveTab('putaway')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'putaway' && styles.activeTabText,
            ]}
          >
            📥 Cất Hàng ({putAwayTasks.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'picking' && styles.activeTab]}
          onPress={() => setActiveTab('picking')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'picking' && styles.activeTabText,
            ]}
          >
            📤 Nhặt Hàng ({pickingTasks.length})
          </Text>
        </TouchableOpacity>
      </View>

      <Divider />

      {/* TASK LIST */}
      {isLoading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A90E2" />
          <Text style={styles.loadingText}>Đang tải dữ liệu...</Text>
        </View>
      ) : (
        <FlatList
          data={currentTasks}
          renderItem={renderTaskCard}
          keyExtractor={(item) => item.taskId}
          contentContainerStyle={styles.listContainer}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          ListEmptyComponent={renderEmptyState}
          showsVerticalScrollIndicator={false}
        />
      )}
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
    paddingVertical: 16,
  },

  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },

  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },

  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 8,
  },

  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginHorizontal: 4,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },

  activeTab: {
    borderBottomColor: '#4A90E2',
  },

  tabText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#999',
    textAlign: 'center',
  },

  activeTabText: {
    color: '#4A90E2',
    fontWeight: '600',
  },

  listContainer: {
    padding: 12,
    paddingBottom: 20,
  },

  cardContainer: {
    marginBottom: 12,
  },

  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    overflow: 'hidden',
    elevation: 2,
  },

  cardContent: {
    padding: 16,
  },

  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },

  cardIcon: {
    fontSize: 28,
  },

  taskId: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
  },

  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },

  detailLabel: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },

  detailValue: {
    fontSize: 13,
    color: '#4A90E2',
    fontWeight: '600',
  },

  progressContainer: {
    marginTop: 12,
    marginBottom: 12,
  },

  progressBar: {
    height: 6,
    backgroundColor: '#e0e0e0',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },

  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
  },

  progressText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
  },

  actionButton: {
    backgroundColor: '#4A90E2',
    marginTop: 8,
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

  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },

  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },

  emptyText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginBottom: 24,
  },

  refreshButton: {
    marginTop: 16,
    minWidth: 150,
  },
});