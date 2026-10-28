-- =====================================================================
-- 002 — NHẬN GÓI TIN KIỂU MỚI CỦA BÊN IOT (26/10/2026)
--
-- Gói tin thật của node A01/A02 gửi:
--   ID, lưu lượng mưa (mm/s), lượng mưa (mm), thủy triều (m), nhiệt độ (°C),
--   giờ (hh:mm:ss), cao độ mực nước ngập (mm).
--
-- Máy chủ đổi về 1 đơn vị chung trước khi lưu (xem src/ingest/parseNodeMessage.ts):
--   water_level_mm ÷ 10   → flood_depth_cm   (cột có sẵn)
--   tide_m × 100          → tide_cm          (cột có sẵn)
--   rain_rate_mm_s × 3600 → rain_rate_mm_h   (cột MỚI)
--   rain_mm               → rain_mm          (cột MỚI, giữ nguyên)
--
-- Kiểu gói tin cũ vẫn nhận, nên rain_mm_1h không còn bắt buộc: chỉ cần có ÍT NHẤT 1 thông tin mưa.
-- =====================================================================

ALTER TABLE readings ALTER COLUMN rain_mm_1h DROP NOT NULL;

-- Lượng mưa node đo được (mm). Cộng dồn từ lúc nào (đầu ngày? lúc bật node?) — CHƯA RÕ, đang hỏi bên IoT.
ALTER TABLE readings ADD COLUMN rain_mm DOUBLE PRECISION;

-- Cường độ mưa (mm/giờ). Node gửi mm/giây thì máy chủ nhân 3600 trước khi lưu.
ALTER TABLE readings ADD COLUMN rain_rate_mm_h DOUBLE PRECISION;

ALTER TABLE readings ADD CONSTRAINT readings_has_rain
  CHECK (rain_mm IS NOT NULL OR rain_rate_mm_h IS NOT NULL OR rain_mm_1h IS NOT NULL);
