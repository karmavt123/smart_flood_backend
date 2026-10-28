import * as Notifications from 'expo-notifications';

import { floodLevelStyles } from '@/constants/floodLevelStyles';
import type { RealtimeFloodEvent } from '@/types/RealtimeFloodEvent';
import { formatClockTime } from '@/utils/formatClockTime';

import { FLOOD_ALERT_CHANNEL_ID } from './configureNotifications';

/**
 * HIỆN THÔNG BÁO CẢNH BÁO NGẬP trên điện thoại (FR-10).
 * Nội dung gồm: trạm, mức ngập mới, độ ngập, thời điểm. Chạm vào thông báo sẽ mở đúng trạm
 * (mã trạm được gửi kèm trong `data`).
 *
 * Giới hạn: đây là thông báo do APP tạo khi nhận dữ liệu realtime, nên chỉ có khi app đang mở
 * hoặc vừa chạy nền. Muốn nhận cả khi tắt app cần máy chủ hỗ trợ Push (chưa có).
 */
export async function showFloodAlertNotification(event: RealtimeFloodEvent): Promise<void> {
  const level = floodLevelStyles[event.level].label.toUpperCase();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `${level}: ${event.stationName}`,
      body: `Ngập ${event.waterLevelCm.toFixed(1)} cm (ngưỡng nguy hiểm ${event.thresholdCm} cm) lúc ${formatClockTime(event.timestamp)}.`,
      data: { nodeId: event.nodeId },
    },
    trigger: { channelId: FLOOD_ALERT_CHANNEL_ID },
  });
}
