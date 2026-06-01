// mobile-app/src/presentation/pages/Home.tsx
// Màn hình Home (Task List) - Tuần 6 - Đức Anh
// Hiển thị danh sách phiếu chờ cất hàng (QC_Checked) và lệnh xuất đang nhặt (Picking)



import React, { useState, useEffect } from 'react';
import React, { useState, useCallback } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { TaskCard } from '../../components';
import receiptService from '../../infrastructure/receiptService';
import issueService from '../../infrastructure/issueService';
import type { ReceiptDto, IssueDto } from '../../infrastructure/wmsTypes';

// ─── Types ───────────────────────────────────────────────────────────────────

type ActiveTab = 'inbound' | 'outbound';

// ─── Component ───────────────────────────────────────────────────────────────

export const HomeScreen = ({ navigation }: any) => {
  const { user, signOut } = useAuth();

  const [activeTab, setActiveTab] = useState<ActiveTab>('inbound');
  const [pendingReceipts, setPendingReceipts] = useState<ReceiptDto[]>([]);
  const [pickingIssues, setPickingIssues] = useState<IssueDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ─── Data Fetching ──────────────────────────────────────────────────────────

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const [allReceipts, allIssues] = await Promise.all([
        receiptService.getAll(),
        issueService.getAll(),
      ]);

      // Lọc phiếu nhập đã duyệt QC → đang chờ thủ kho cất hàng
      setPendingReceipts(allReceipts.filter(r => r.status === 'QC_Checked'));

      // Lọc lệnh xuất đang trong giai đoạn nhặt hàng
      setPickingIssues(allIssues.filter(i => i.status === 'Picking'));
    } catch (e: any) {
      setError(e.message || 'Không thể tải dữ liệu');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Tải lại dữ liệu mỗi lần màn hình được focus (sau khi cất hàng xong → quay về)
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const handleReceiptPress = (receipt: ReceiptDto) => {
    navigation.navigate('PutAway', { receipt });
  };

  const handleIssuePress = (issue: IssueDto) => {
    navigation.navigate('PickingList', { issue });
  };

  const handleSignOut = () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc muốn đăng xuất?', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Đăng xuất', style: 'destructive', onPress: signOut },
    ]);
  };

  // ─── Render Helpers ─────────────────────────────────────────────────────────

  const renderInboundTab = () => {
    if (loading) return <ActivityIndicator size="large" color="#4A90E2" style={styles.loader} />;
    if (error) return <Text style={styles.errorText}>⚠️ {error}</Text>;
    if (pendingReceipts.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📭</Text>
          <Text style={styles.emptyText}>Không có phiếu nhập nào chờ cất hàng</Text>
        </View>
      );
    }

    return pendingReceipts.map(receipt => (
      <TaskCard
        key={receipt.id}
        taskId={receipt.id.substring(0, 8).toUpperCase()}
        taskType="Nhập Kho"
        quantity={receipt.receiptDetails.length}
        onPress={() => handleReceiptPress(receipt)}
      />
    ));
  };

  const renderOutboundTab = () => {
    if (loading) return <ActivityIndicator size="large" color="#E24A4A" style={styles.loader} />;
    if (error) return <Text style={styles.errorText}>⚠️ {error}</Text>;
    if (pickingIssues.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📦</Text>
          <Text style={styles.emptyText}>Không có lệnh xuất nào đang chờ nhặt hàng</Text>
        </View>
      );
    }

    return pickingIssues.map(issue => (
      <TaskCard
        key={issue.id}
        taskId={issue.id.substring(0, 8).toUpperCase()}
        taskType="Xuất Kho"
        quantity={issue.issueDetails.length}
        onPress={() => handleIssuePress(issue)}
      />
    ));
  };

  // ─── UI ─────────────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>WMS</Text>
          <Text style={styles.headerSubtitle}>
            Xin chào, {user?.username || 'Thủ kho'} 👋
          </Text>
        </View>
        <TouchableOpacity onPress={handleSignOut} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Đăng xuất</Text>
        </TouchableOpacity>
      </View>

      {/* SUMMARY BADGES */}
      <View style={styles.summaryRow}>
        <View style={[styles.badge, { backgroundColor: '#EBF4FF' }]}>
          <Text style={[styles.badgeCount, { color: '#4A90E2' }]}>
            {pendingReceipts.length}
          </Text>
          <Text style={styles.badgeLabel}>Chờ cất hàng</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: '#FFF0F0' }]}>
          <Text style={[styles.badgeCount, { color: '#E24A4A' }]}>
            {pickingIssues.length}
          </Text>
          <Text style={styles.badgeLabel}>Đang nhặt hàng</Text>
        </View>
      </View>

      {/* TABS */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'inbound' && styles.tabActive]}
          onPress={() => setActiveTab('inbound')}
        >
          <Text style={[styles.tabText, activeTab === 'inbound' && styles.tabTextActive]}>
            📥 Nhập Kho ({pendingReceipts.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'outbound' && styles.tabActive]}
          onPress={() => setActiveTab('outbound')}
        >
          <Text style={[styles.tabText, activeTab === 'outbound' && styles.tabTextActive]}>
            📤 Xuất Kho ({pickingIssues.length})
          </Text>
        </TouchableOpacity>
      </View>

<<<<<<< HEAD
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
=======
      {/* TASK LIST */}
      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadData(true)}
            colors={['#4A90E2']}
          />
        }
      >
        {activeTab === 'inbound' ? renderInboundTab() : renderOutboundTab()}
      </ScrollView>
    </View>
>>>>>>> 4e2e726 (hoàn thiện Put-Away, picking FIFO)
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
<<<<<<< HEAD
    backgroundColor: '#f5f5f5',
=======
    backgroundColor: '#F4F6F8',
>>>>>>> 4e2e726 (hoàn thiện Put-Away, picking FIFO)
  },
  header: {
    backgroundColor: '#4A90E2',
<<<<<<< HEAD
=======
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },
  logoutBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8,
  },
  logoutText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  summaryRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  badge: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  badgeCount: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  badgeLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 10,
    padding: 4,
    marginBottom: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: '#4A90E2',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#888',
  },
  tabTextActive: {
    color: '#fff',
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  loader: {
    marginTop: 60,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 15,
    color: '#888',
    textAlign: 'center',
  },
  errorText: {
    color: '#E24A4A',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 40,
>>>>>>> 4e2e726 (hoàn thiện Put-Away, picking FIFO)
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
<<<<<<< HEAD

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
=======
>>>>>>> 4e2e726 (hoàn thiện Put-Away, picking FIFO)
});