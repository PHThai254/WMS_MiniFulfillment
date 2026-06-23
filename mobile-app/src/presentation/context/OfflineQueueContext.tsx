/**
 * Offline Queue Context
 * Quản lý queue hành động offline và tự động retry khi có kết nối
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { AppState, AppStateStatus, Alert } from 'react-native';
import { useNetInfo } from '@react-native-community/netinfo';
import {
  queuePendingScanAction,
  processPendingScanActions,
  getPendingScanActions,
  type PendingScanAction,
  clearPendingScanActions,
} from '../../infrastructure/offlineQueue';

interface OfflineQueueContextType {
  isOnline: boolean;
  pendingActions: PendingScanAction[];
  queueAction: (action: PendingScanAction) => Promise<void>;
  processPending: () => Promise<number>;
  clearPending: () => Promise<void>;
}

const OfflineQueueContext = createContext<OfflineQueueContextType | undefined>(
  undefined
);

interface OfflineQueueProviderProps {
  children: React.ReactNode;
}

export const OfflineQueueProvider: React.FC<OfflineQueueProviderProps> = ({
  children,
}) => {
  const netInfo = useNetInfo();
  const [isOnline, setIsOnline] = useState(
    netInfo.isConnected === true && netInfo.isInternetReachable !== false
  );
  const [pendingActions, setPendingActions] = useState<PendingScanAction[]>([]);
  const [appState, setAppState] = useState<AppStateStatus>('active');

  // ──────────────────────────────────────────────────────────────────────
  // 🌐 MONITOR NETWORK STATE
  // ──────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const isConnected =
      netInfo.isConnected === true && netInfo.isInternetReachable !== false;
    setIsOnline(isConnected);

    // Nếu vừa có kết nối lại → xử lý queue pending
    if (isConnected && pendingActions.length > 0) {
      handleProcessPending();
    }
  }, [netInfo.isConnected, netInfo.isInternetReachable]);

  // ──────────────────────────────────────────────────────────────────────
  // 📱 MONITOR APP LIFECYCLE
  // ──────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, []);

  const handleAppStateChange = async (nextAppState: AppStateStatus) => {
    setAppState(nextAppState);

    // Khi app quay lại foreground (thoát khỏi background)
    if (nextAppState === 'active' && isOnline && pendingActions.length > 0) {
      console.log('📱 App quay lại foreground → Xử lý queue offline');
      await handleProcessPending();
    }
  };

  // ──────────────────────────────────────────────────────────────────────
  // 🎯 LOAD PENDING ACTIONS FROM STORAGE
  // ──────────────────────────────────────────────────────────────────────
  useEffect(() => {
    loadPendingActions();
  }, []);

  const loadPendingActions = async () => {
    try {
      const actions = await getPendingScanActions();
      setPendingActions(actions);

      if (actions.length > 0 && isOnline) {
        console.log(`🔄 Tìm thấy ${actions.length} hành động offline → Xử lý ngay`);
        await handleProcessPending();
      }
    } catch (error) {
      console.error('❌ Lỗi tải pending actions:', error);
    }
  };

  // ──────────────────────────────────────────────────────────────────────
  // 💾 QUEUE ACTION
  // ──────────────────────────────────────────────────────────────────────
  const queueAction = async (action: PendingScanAction) => {
    try {
      await queuePendingScanAction(action);
      setPendingActions([...pendingActions, action]);

      // Nếu có kết nối, thử gửi ngay
      if (isOnline) {
        await handleProcessPending();
      } else {
        Alert.alert(
          '📵 Offline',
          'Hành động đã lưu. Sẽ gửi khi có kết nối lại.'
        );
      }
    } catch (error) {
      console.error('❌ Lỗi queue action:', error);
      throw error;
    }
  };

  // ──────────────────────────────────────────────────────────────────────
  // 🔄 PROCESS PENDING ACTIONS
  // ──────────────────────────────────────────────────────────────────────
  const handleProcessPending = async () => {
    try {
      console.log('🔄 Bắt đầu xử lý queue offline...');
      const remaining = await processPendingScanActions();

      // Reload pending actions từ storage
      const actions = await getPendingScanActions();
      setPendingActions(actions);

      const processed = pendingActions.length - remaining;
      if (processed > 0) {
        Alert.alert(
          '✅ Đồng bộ Thành Công',
          `Đã xử lý ${processed} hành động. Còn ${remaining} đang chờ.`
        );
      }

      return remaining;
    } catch (error) {
      console.error('❌ Lỗi xử lý pending:', error);
      throw error;
    }
  };

  const processPending = async () => {
    if (!isOnline) {
      Alert.alert('⚠️ Không Có Kết Nối', 'Vui lòng kết nối internet trước.');
      return pendingActions.length;
    }
    return handleProcessPending();
  };

  // ──────────────────────────────────────────────────────────────────────
  // 🗑️ CLEAR PENDING ACTIONS
  // ──────────────────────────────────────────────────────────────────────
  const clearPending = async () => {
    try {

      await clearPendingScanActions();
      setPendingActions([]);
      Alert.alert('✅ Đã Xóa', 'Queue offline đã được xóa.');
    } catch (error) {
      console.error('❌ Lỗi xóa pending:', error);
      throw error;
    }
  };

  const value: OfflineQueueContextType = {
    isOnline,
    pendingActions,
    queueAction,
    processPending,
    clearPending,
  };

  return (
    <OfflineQueueContext.Provider value={value}>
      {children}
    </OfflineQueueContext.Provider>
  );
};

/**
 * Hook để sử dụng Offline Queue Context
 */
export const useOfflineQueue = () => {
  const context = useContext(OfflineQueueContext);
  if (!context) {
    throw new Error('useOfflineQueue phải được dùng trong OfflineQueueProvider');
  }
  return context;
};
