// mobile-app/src/presentation/pages/PickingList.tsx
// Màn hình Picking List - Tuần 7 - Đức Anh
// Hiển thị lộ trình nhặt hàng FIFO và theo dõi tiến độ từng dòng lệnh xuất

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import issueService from '../../infrastructure/issueService';
import type { IssueDto, PickingPlanDto, PickingPlanItemDto } from '../../infrastructure/wmsTypes';

// ─── Props ────────────────────────────────────────────────────────────────────

interface PickingListScreenProps {
  route: {
    params: {
      issue: IssueDto;
    };
  };
  navigation: any;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const PickingListScreen: React.FC<PickingListScreenProps> = ({ route, navigation }) => {
  const { issue } = route.params;

  const [pickingPlan, setPickingPlan] = useState<PickingPlanDto | null>(null);
  const [currentIssue, setCurrentIssue] = useState<IssueDto>(issue);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ─── Data Fetching ─────────────────────────────────────────────────────────

  const loadPickingPlan = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      // Gọi API sinh lộ trình FIFO — Server tự động chuyển Issue sang Picking
      const [plan, updatedIssue] = await Promise.all([
        issueService.getPickingPlan(issue.id),
        issueService.getById(issue.id),
      ]);
      setPickingPlan(plan);
      setCurrentIssue(updatedIssue);
    } catch (e: any) {
      setError(e.message || 'Không thể tải lộ trình nhặt hàng');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [issue.id]);

  useEffect(() => {
    loadPickingPlan();
  }, [loadPickingPlan]);

  // ─── Computed Values ──────────────────────────────────────────────────────

  const totalLines = currentIssue.issueDetails.length;
  const completedLines = currentIssue.issueDetails.filter(
    d => d.pickedQuantity >= d.quantityToPick
  ).length;
  const overallProgress = totalLines > 0 ? (completedLines / totalLines) * 100 : 0;

  const getDetailProgress = (issueDetailId: string) => {
    const detail = currentIssue.issueDetails.find(d => d.id === issueDetailId);
    if (!detail) return { picked: 0, total: 1, percent: 0, isDone: false };
    const percent = Math.min(100, (detail.pickedQuantity / detail.quantityToPick) * 100);
    return {
      picked: detail.pickedQuantity,
      total: detail.quantityToPick,
      percent,
      isDone: detail.pickedQuantity >= detail.quantityToPick,
    };
  };

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const handleScanItem = (planItem: PickingPlanItemDto) => {
    const progress = getDetailProgress(planItem.issueDetailId);

    if (progress.isDone) {
      Alert.alert('✅ Đã hoàn thành', 'Dòng hàng này đã được nhặt đủ số lượng.');
      return;
    }

    navigation.navigate('PickingDetail', {
      issueId: issue.id,
      planItem,
      currentPicked: progress.picked,
    });
  };

  // ─── Render States ────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={styles.loadingText}>Đang tạo lộ trình FIFO...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => loadPickingPlan()}>
          <Text style={styles.retryText}>Thử lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ─── UI ───────────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Quay lại</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Lộ trình nhặt hàng</Text>
        <Text style={styles.headerSubtitle}>
          Lệnh #{issue.id.substring(0, 8).toUpperCase()} · FIFO
        </Text>
      </View>

      {/* PROGRESS SUMMARY */}
      <View style={styles.progressSummary}>
        <View style={styles.progressRow}>
          <Text style={styles.progressLabel}>Tiến độ tổng:</Text>
          <Text style={styles.progressCount}>
            {completedLines}/{totalLines} dòng
          </Text>
        </View>

        <View style={styles.progressBarContainer}>
          <View style={[styles.progressBarFill, { width: `${overallProgress}%` }]} />
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{pickingPlan?.items.length ?? 0}</Text>
            <Text style={styles.statLabel}>Bước đi</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>
              {new Set(pickingPlan?.items.map(i => i.zoneName)).size}
            </Text>
            <Text style={styles.statLabel}>Zone</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>
              {pickingPlan?.items.reduce((s, i) => s + i.quantityToPick, 0) ?? 0}
            </Text>
            <Text style={styles.statLabel}>Tổng SP</Text>
          </View>
        </View>
      </View>

      {/* FIFO ROUTE — Danh sách các bước */}
      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadPickingPlan(true)}
            colors={['#4A90E2']}
          />
        }
      >
        <Text style={styles.sectionTitle}>📍 Đường đi đề xuất (FIFO)</Text>

        {(pickingPlan?.items ?? []).map((item, index) => {
          const progress = getDetailProgress(item.issueDetailId);
          return (
            <TouchableOpacity
              key={`${item.issueDetailId}-${index}`}
              style={[
                styles.routeCard,
                progress.isDone && styles.routeCardDone,
              ]}
              onPress={() => handleScanItem(item)}
              activeOpacity={0.85}
            >
              {/* Step Number */}
              <View style={[styles.stepBadge, progress.isDone && styles.stepBadgeDone]}>
                <Text style={styles.stepNumber}>
                  {progress.isDone ? '✓' : `${index + 1}`}
                </Text>
              </View>

              {/* Route Info */}
              <View style={styles.routeInfo}>
                <Text style={styles.zoneName}>
                  📦 {item.zoneName.toUpperCase()}
                </Text>
                <Text style={styles.productName} numberOfLines={1}>
                  {item.productName}
                </Text>
                <Text style={styles.barcode}>{item.productBarcode}</Text>
                <Text style={styles.restockDate}>
                  Nhập từ: {new Date(item.restockedDate).toLocaleDateString('vi-VN')}
                </Text>
              </View>

              {/* Qty & Progress */}
              <View style={styles.qtyBlock}>
                <Text style={[styles.qtyText, progress.isDone && styles.qtyDone]}>
                  {progress.picked}/{progress.total}
                </Text>
                <Text style={styles.qtyLabel}>Đã nhặt</Text>
                <View style={styles.miniProgress}>
                  <View
                    style={[
                      styles.miniProgressFill,
                      {
                        width: `${progress.percent}%`,
                        backgroundColor: progress.isDone ? '#27AE60' : '#4A90E2',
                      },
                    ]}
                  />
                </View>
                {!progress.isDone && (
                  <Text style={styles.scanHint}>Nhấn để quét →</Text>
                )}
              </View>
            </TouchableOpacity>
          );
        })}

        {overallProgress === 100 && (
          <View style={styles.completedBanner}>
            <Text style={styles.completedText}>
              🎉 Tất cả hàng đã nhặt xong! Phiếu sẽ tự động chuyển sang Bàn giao.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F6F8' },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    gap: 12,
  },
  loadingText: { fontSize: 14, color: '#666' },
  errorIcon: { fontSize: 36 },
  errorText: { fontSize: 14, color: '#E24A4A', textAlign: 'center' },
  retryBtn: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  retryText: { color: '#fff', fontWeight: '700' },
  header: {
    backgroundColor: '#4A90E2',
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  backBtn: { marginBottom: 6 },
  backBtnText: { color: 'rgba(255,255,255,0.8)', fontSize: 13 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  headerSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  progressSummary: {
    backgroundColor: '#fff',
    margin: 12,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressLabel: { fontSize: 14, color: '#555', fontWeight: '600' },
  progressCount: { fontSize: 14, color: '#4A90E2', fontWeight: '700' },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#EEF2F7',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#4A90E2',
    borderRadius: 4,
  },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  statItem: { alignItems: 'center' },
  statNumber: { fontSize: 22, fontWeight: 'bold', color: '#333' },
  statLabel: { fontSize: 11, color: '#888', marginTop: 2 },
  list: { flex: 1 },
  listContent: { paddingHorizontal: 12, paddingBottom: 32 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#666',
    marginBottom: 8,
    marginTop: 4,
  },
  routeCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    borderLeftWidth: 4,
    borderLeftColor: '#4A90E2',
  },
  routeCardDone: {
    opacity: 0.65,
    borderLeftColor: '#27AE60',
  },
  stepBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#4A90E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepBadgeDone: { backgroundColor: '#27AE60' },
  stepNumber: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  routeInfo: { flex: 1 },
  zoneName: { fontSize: 14, fontWeight: '700', color: '#333' },
  productName: { fontSize: 13, color: '#555', marginTop: 2 },
  barcode: { fontSize: 11, color: '#999', fontFamily: 'monospace', marginTop: 2 },
  restockDate: { fontSize: 10, color: '#bbb', marginTop: 2 },
  qtyBlock: { alignItems: 'center', minWidth: 64 },
  qtyText: { fontSize: 18, fontWeight: 'bold', color: '#4A90E2' },
  qtyDone: { color: '#27AE60' },
  qtyLabel: { fontSize: 10, color: '#aaa' },
  miniProgress: {
    width: 56,
    height: 4,
    backgroundColor: '#EEF2F7',
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 4,
  },
  miniProgressFill: { height: '100%', borderRadius: 2 },
  scanHint: { fontSize: 9, color: '#4A90E2', marginTop: 4 },
  completedBanner: {
    backgroundColor: '#E8F8F1',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#27AE60',
  },
  completedText: {
    color: '#27AE60',
    fontWeight: '700',
    fontSize: 14,
    textAlign: 'center',
  },
});
