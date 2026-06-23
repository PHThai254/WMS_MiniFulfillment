/**
 * Handover Screen
 * Màn hình trượt để xác nhận bàn giao hàng (chống bấm nhầm)
 */

import React, { useState } from 'react';
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
import { Button, Card, Divider, Chip } from 'react-native-paper';
import { GestureHandlerRootView, Swipeable } from 'react-native-gesture-handler';
import { inventoryService } from '../../infrastructure/inventoryService';
import { Issue } from '../../types';

interface HandoverScreenProps {
  navigation: any;
}

export const HandoverScreen: React.FC<HandoverScreenProps> = ({ navigation }) => {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // ──────────────────────────────────────────────────────────────────────
  // 📋 LẤY DANH SÁCH PHIẾU CHƯA BÀNG GIAO
  // ──────────────────────────────────────────────────────────────────────
  const fetchHandoverList = async () => {
    try {
      setIsLoading(true);
      const response = await inventoryService.getIssueList();

      if (response?.success && response.data) {
        // Lọc các phiếu có status = 'Picking' (đã nhặt xong, chờ bàn giao)
        const pickingIssues = response.data.filter(i => i.status === 'Picking');
        setIssues(pickingIssues);
      } else {
        Alert.alert('Lỗi', response?.message || 'Không thể tải danh sách');
      }
    } catch (error: any) {
      console.error('❌ Lỗi tải danh sách:', error);
      Alert.alert('Lỗi', 'Không thể kết nối đến server');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  // Tải lần đầu
  React.useEffect(() => {
    fetchHandoverList();
  }, []);

  // ──────────────────────────────────────────────────────────────────────
  // ✅ XỬ LÝ BÀNG GIAO
  // ──────────────────────────────────────────────────────────────────────
  const handleHandover = async (issueId: string) => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const response = await inventoryService.handoverIssue(issueId);

      if (response?.success) {
        Alert.alert('✅ Thành Công', 'Bàn giao đã hoàn thành', [
          {
            text: 'OK',
            onPress: () => {
              // Xóa khỏi danh sách
              setIssues(issues.filter(i => i.id !== issueId));
            },
          },
        ]);
      } else {
        Alert.alert('❌ Lỗi', response?.message || 'Bàn giao thất bại');
      }
    } catch (error: any) {
      console.error('❌ Lỗi bàn giao:', error);
      Alert.alert('❌ Lỗi', 'Không thể cập nhật. Kiểm tra kết nối.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ──────────────────────────────────────────────────────────────────────
  // 🎨 RENDER SWIPE BUTTON
  // ──────────────────────────────────────────────────────────────────────
  const renderSwipeAction = (issueId: string) => (
    <View style={styles.swipeAction}>
      <Button
        mode="contained"
        style={styles.swipeButton}
        onPress={() => handleHandover(issueId)}
      >
        Bàn Giao
      </Button>
    </View>
  );

  // ──────────────────────────────────────────────────────────────────────
  // 🎨 RENDER ISSUE CARD
  // ──────────────────────────────────────────────────────────────────────
  const renderIssueCard = ({ item }: { item: Issue }) => {
    const totalItems = item.details.reduce((sum: number, d) => sum + d.quantityToPick, 0);
    const totalPicked = item.details.reduce((sum: number, d) => sum + d.pickedQuantity, 0);

    return (
      <Swipeable
        renderRightActions={() => renderSwipeAction(item.id)}
        rightThreshold={80}
      >
        <Card style={styles.card}>
          <View style={styles.cardContent}>
            {/* HEADER */}
            <View style={styles.cardHeader}>
              <Text style={styles.cardIcon}>📦</Text>
              <View style={styles.headerInfo}>
                <Text style={styles.issueId}>
                  Phiếu Xuất #{item.id.slice(0, 8)}
                </Text>
                <Text style={styles.issueStatus}>{item.status}</Text>
              </View>
            </View>

            {/* DETAILS */}
            <View style={styles.detailsRow}>
              <Text style={styles.detailLabel}>Số mục:</Text>
              <Text style={styles.detailValue}>{item.details.length} sản phẩm</Text>
            </View>

            <View style={styles.detailsRow}>
              <Text style={styles.detailLabel}>Tiến độ:</Text>
              <Text style={styles.detailValue}>
                {totalPicked}/{totalItems} cái ({Math.round((totalPicked / totalItems) * 100)}%)
              </Text>
            </View>

            {/* PROGRESS BAR */}
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${(totalPicked / totalItems) * 100}%` },
                  ]}
                />
              </View>
            </View>

            {/* HINT TEXT */}
            <Text style={styles.hintText}>
              👉 Trượt phải để bàn giao hàng
            </Text>
          </View>
        </Card>
      </Swipeable>
    );
  };

  // ──────────────────────────────────────────────────────────────────────
  // 📊 RENDER EMPTY STATE
  // ──────────────────────────────────────────────────────────────────────
  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>✅</Text>
      <Text style={styles.emptyText}>Không có phiếu chờ bàn giao</Text>
      <Button
        mode="contained"
        style={styles.refreshButton}
        onPress={() => {
          setRefreshing(true);
          fetchHandoverList();
        }}
      >
        Tải Lại
      </Button>
    </View>
  );

  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaView style={styles.container}>
        {/* HEADER */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Bàn Giao Hàng</Text>
          <Text style={styles.headerSubtitle}>Trượt phải để bàn giao</Text>
        </View>

        <Divider />

        {/* LIST */}
        {isLoading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4A90E2" />
            <Text style={styles.loadingText}>Đang tải dữ liệu...</Text>
          </View>
        ) : (
          <FlatList
            data={issues}
            renderItem={renderIssueCard}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContainer}
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchHandoverList();
            }}
            ListEmptyComponent={renderEmptyState}
            showsVerticalScrollIndicator={false}
          />
        )}
      </SafeAreaView>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },

  header: {
    backgroundColor: '#FF9800',
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

  listContainer: {
    padding: 12,
    paddingBottom: 20,
  },

  card: {
    marginBottom: 12,
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
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 12,
  },

  cardIcon: {
    fontSize: 28,
  },

  headerInfo: {
    flex: 1,
  },

  issueId: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },

  issueStatus: {
    fontSize: 12,
    color: '#FF9800',
    fontWeight: '600',
    marginTop: 2,
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
    marginBottom: 8,
  },

  progressBar: {
    height: 6,
    backgroundColor: '#e0e0e0',
    borderRadius: 3,
    overflow: 'hidden',
  },

  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
  },

  hintText: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
    marginTop: 8,
  },

  swipeAction: {
    justifyContent: 'center',
    paddingRight: 16,
    marginBottom: 12,
  },

  swipeButton: {
    backgroundColor: '#FF9800',
    minHeight: 120,
    justifyContent: 'center',
    borderRadius: 8,
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
    minWidth: 150,
  },
});
