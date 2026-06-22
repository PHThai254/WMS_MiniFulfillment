import AsyncStorage from '@react-native-async-storage/async-storage';
import { inventoryService } from './inventoryService';

export type PendingActionType = 'PUT_AWAY' | 'PICKING';

export interface PendingScanAction {
  id: string;
  type: PendingActionType;
  payload: Record<string, any>;
  createdAt: string;
}

const PENDING_QUEUE_KEY = 'offline_scan_actions';

const readQueue = async (): Promise<PendingScanAction[]> => {
  const raw = await AsyncStorage.getItem(PENDING_QUEUE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as PendingScanAction[];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn('⚠️ Không parse được queue offline:', error);
    return [];
  }
};

const writeQueue = async (actions: PendingScanAction[]) => {
  await AsyncStorage.setItem(PENDING_QUEUE_KEY, JSON.stringify(actions));
};

export const queuePendingScanAction = async (action: PendingScanAction) => {
  const queue = await readQueue();
  const nextQueue = [...queue, action];
  await writeQueue(nextQueue);
  console.log(`🗂️ Đã lưu thao tác offline vào queue: ${action.type}`);
};

export const getPendingScanActions = async () => {
  return readQueue();
};

export const removePendingScanAction = async (id: string) => {
  const queue = await readQueue();
  const nextQueue = queue.filter((item) => item.id !== id);
  await writeQueue(nextQueue);
};

export const clearPendingScanActions = async () => {
  await AsyncStorage.removeItem(PENDING_QUEUE_KEY);
};

export const processPendingScanActions = async () => {
  const queue = await readQueue();
  if (queue.length === 0) return 0;

  const remaining: PendingScanAction[] = [];

  for (const action of queue) {
    try {
      if (action.type === 'PUT_AWAY') {
        const receiptId = action.payload?.receiptId;
        if (receiptId) {
          await inventoryService.completePutAway(receiptId);
          console.log(`✅ Retry put-away thành công: ${receiptId}`);
          continue;
        }
      }

      if (action.type === 'PICKING') {
        const issueId = action.payload?.issueId;
        const issueDetailId = action.payload?.issueDetailId;
        const pickedQuantity = action.payload?.pickedQuantity;

        if (issueId && issueDetailId && typeof pickedQuantity === 'number') {
          await inventoryService.confirmPicking(issueId, {
            issueDetailId,
            pickedQuantity,
          });
          console.log(`✅ Retry picking thành công: ${issueId}`);
          continue;
        }
      }

      // Nếu payload không đủ dữ liệu, vẫn giữ lại để tránh mất thao tác.
      remaining.push(action);
    } catch (error) {
      console.warn(`❌ Retry thất bại cho action ${action.id}:`, error);
      remaining.push(action);
    }
  }

  await writeQueue(remaining);
  return remaining.length;
};
