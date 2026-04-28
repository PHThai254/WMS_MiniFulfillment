// mobile-app/src/di/hooks/useBarcodeScan.ts
import { useEffect, useState, useRef, useCallback } from 'react';
import { Vibration, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

interface BarcodeScanResult {
  barcode: string;
  type: string;
  timestamp: number;
}

interface UseBarcodeScanOptions {
  onScan: (result: BarcodeScanResult) => void;
  debounceMs?: number;
  enableVibration?: boolean;
  enableHaptic?: boolean;
}

/**
 * Hook để quản lý Barcode scanning với debounce/throttle
 * Chống double-scan bằng cách block scanner trong 2 giây sau khi quét
 */
export const useBarcodeScan = ({
  onScan,
  debounceMs = 2000,
  enableVibration = true,
  enableHaptic = true,
}: UseBarcodeScanOptions) => {
  const [isScanning, setIsScanning] = useState(false);
  const [lastScannedBarcode, setLastScannedBarcode] = useState<string | null>(null);
  const [lastScannedTime, setLastScannedTime] = useState<number>(0);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Xử lý quét barcode với debounce
   */
  const handleBarcodeScan = useCallback(
    async (barcode: string, type: string = 'CODE128') => {
      const now = Date.now();
      const timeSinceLastScan = now - lastScannedTime;

      // Nếu quét quá nhanh (trong debounceMs) → ignore
      if (timeSinceLastScan < debounceMs && lastScannedBarcode === barcode) {
        console.warn(`⏸️ Double scan detected: ${barcode}, skipping...`);
        return;
      }

      setIsScanning(true);
      setLastScannedBarcode(barcode);
      setLastScannedTime(now);

      try {
        // Haptic feedback
        if (enableHaptic) {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }

        // Vibration (Android)
        if (enableVibration && Platform.OS === 'android') {
          Vibration.vibrate([0, 100, 100, 100]); // [delay, vibrate, pause, vibrate]
        }

        // Gọi callback
        onScan({
          barcode,
          type,
          timestamp: now,
        });

        console.log(`✅ Scanned: ${barcode}`);
      } catch (error) {
        console.error('❌ Error handling barcode scan:', error);
      } finally {
        // Auto enable scanning sau debounceMs
        if (debounceTimer.current) {
          clearTimeout(debounceTimer.current);
        }
        debounceTimer.current = setTimeout(() => {
          setIsScanning(false);
          debounceTimer.current = null;
        }, debounceMs);
      }
    },
    [debounceMs, lastScannedBarcode, lastScannedTime, onScan, enableHaptic, enableVibration]
  );

  /**
   * Cleanup timer khi component unmount
   */
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  return {
    isScanning,
    lastScannedBarcode,
    handleBarcodeScan,
  };
};