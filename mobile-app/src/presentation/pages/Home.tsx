// mobile-app/src/presentation/pages/Home.tsx
// Màn hình Home (Task List) - Tuần 6 - Đức Anh
// Hiển thị danh sách phiếu chờ cất hàng (QC_Checked) và lệnh xuất đang nhặt (Picking)

import React, { useState, useCallback } from 'react';
import {
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
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F6F8',
  },
  header: {
    backgroundColor: '#4A90E2',
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
    paddingHorizontal: 20,
  },
});