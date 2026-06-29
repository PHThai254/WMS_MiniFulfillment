// mobile-app/src/presentation/pages/IssuesList.tsx
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
  TextInput,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Card, useTheme } from 'react-native-paper';
import issueService from '../../infrastructure/issueService';
import type { IssueDto, IssueStatus } from '../../infrastructure/wmsTypes';

type FilterStatus = 'All' | IssueStatus;

export const IssuesListScreen = ({ navigation }: any) => {
  const theme = useTheme();
  const [issues, setIssues] = useState<IssueDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<FilterStatus>('All');
  const [error, setError] = useState<string | null>(null);

  const fetchIssues = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const data = await issueService.getAll();
      setIssues(data);
    } catch (e: any) {
      setError(e.message || 'Không thể tải danh sách phiếu xuất');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchIssues();
    }, [fetchIssues])
  );

  const getStatusColor = (status: IssueStatus) => {
    switch (status) {
      case 'Pending':
        return { bg: '#FEF3C7', text: '#D97706', label: 'Chờ nhặt hàng' };
      case 'Picking':
        return { bg: '#DBEAFE', text: '#2563EB', label: 'Đang nhặt hàng' };
      case 'Handover':
        return { bg: '#D1FAE5', text: '#059669', label: 'Đã hoàn tất nhặt' };
      default:
        return { bg: '#F3F4F6', text: '#4B5563', label: status };
    }
  };

  const handleIssuePress = (issue: IssueDto) => {
    if (issue.status === 'Picking' || issue.status === 'Pending') {
      navigation.navigate('PickingList', { issue });
    } else {
      // Hiển thị thông tin chi tiết qua alert
      const itemsList = issue.issueDetails
        .map(
          (d) => `- ${d.productName} (Mã: ${d.productBarcode}): ${d.pickedQuantity}/${d.quantityToPick} SP`
        )
        .join('\n');

      Alert.alert(
        `Phiếu xuất: #${issue.id.substring(0, 8).toUpperCase()}`,
        `Trạng thái: ${getStatusColor(issue.status).label}\nKhách hàng: ${
          issue.customerName || 'N/A'
        }\nNgày tạo: ${new Date(issue.createdAt).toLocaleString('vi-VN')}\n\nChi tiết sản phẩm:\n${itemsList || '(Chưa có sản phẩm)'}`,
        [{ text: 'Đóng' }]
      );
    }
  };

  // Lọc danh sách theo tìm kiếm và trạng thái
  const filteredIssues = issues.filter((issue) => {
    const matchesSearch =
      issue.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (issue.customerName &&
        issue.customerName.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = selectedFilter === 'All' || issue.status === selectedFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <View style={styles.container}>
      {/* SEARCH & FILTER BAR */}
      <View style={styles.filterSection}>
        <TextInput
          style={styles.searchBar}
          placeholder="Tìm theo mã phiếu hoặc khách hàng..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterChips}
        >
          {(['All', 'Pending', 'Picking', 'Handover'] as FilterStatus[]).map((status) => {
            const isSelected = selectedFilter === status;
            let label = 'Tất cả';
            if (status === 'Pending') label = 'Chờ nhặt';
            if (status === 'Picking') label = 'Đang nhặt';
            if (status === 'Handover') label = 'Hoàn tất';

            return (
              <TouchableOpacity
                key={status}
                style={[
                  styles.filterChip,
                  isSelected && { backgroundColor: theme.colors.primary },
                ]}
                onPress={() => setSelectedFilter(status)}
              >
                <Text style={[styles.filterChipText, isSelected && styles.filterChipTextActive]}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ISSUES LIST */}
      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>⚠️ {error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => fetchIssues()}>
            <Text style={styles.retryButtonText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      ) : filteredIssues.length === 0 ? (
        <ScrollView
          contentContainerStyle={styles.centerContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchIssues(true)}
              colors={[theme.colors.primary]}
            />
          }
        >
          <Text style={styles.emptyIcon}>📂</Text>
          <Text style={styles.emptyText}>Không tìm thấy phiếu xuất nào</Text>
        </ScrollView>
      ) : (
        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchIssues(true)}
              colors={[theme.colors.primary]}
            />
          }
        >
          {filteredIssues.map((issue) => {
            const statusConfig = getStatusColor(issue.status);
            return (
              <Card
                key={issue.id}
                style={styles.card}
                onPress={() => handleIssuePress(issue)}
              >
                <Card.Content>
                  <View style={styles.cardRow}>
                    <Text style={styles.issueCode}>
                      #{issue.id.substring(0, 8).toUpperCase()}
                    </Text>
                    <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
                      <Text style={[styles.statusText, { color: statusConfig.text }]}>
                        {statusConfig.label}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.customerText} numberOfLines={1}>
                    👤 {issue.customerName || 'Khách hàng: N/A'}
                  </Text>

                  <View style={styles.divider} />

                  <View style={styles.cardRow}>
                    <Text style={styles.dateText}>
                      📅 {new Date(issue.createdAt).toLocaleDateString('vi-VN')}
                    </Text>
                    <Text style={styles.itemsCount}>
                      {issue.issueDetails.length} dòng hàng
                    </Text>
                  </View>

                  {(issue.status === 'Picking' || issue.status === 'Pending') && (
                    <View style={styles.actionHint}>
                      <Text style={styles.actionHintText}>👉 Bấm để tiến hành Nhặt Hàng</Text>
                    </View>
                  )}
                </Card.Content>
              </Card>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  filterSection: {
    backgroundColor: '#fff',
    paddingTop: 12,
    paddingBottom: 8,
    paddingHorizontal: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  searchBar: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 8,
  },
  filterChips: {
    gap: 8,
    paddingVertical: 4,
  },
  filterChip: {
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
  filterChipText: {
    fontSize: 13,
    color: '#4B5563',
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#fff',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    marginTop: 60,
  },
  errorText: {
    fontSize: 14,
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 6,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    marginBottom: 12,
    elevation: 2,
    borderRadius: 12,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  issueCode: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  customerText: {
    fontSize: 14,
    color: '#4B5563',
    marginTop: 8,
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 10,
  },
  dateText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  itemsCount: {
    fontSize: 12,
    color: '#2563EB',
    fontWeight: '600',
  },
  actionHint: {
    marginTop: 10,
    backgroundColor: '#EFF6FF',
    padding: 6,
    borderRadius: 6,
    alignItems: 'center',
  },
  actionHintText: {
    fontSize: 12,
    color: '#2563EB',
    fontWeight: '600',
  },
});
