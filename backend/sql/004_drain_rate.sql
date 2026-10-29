-- =====================================================================
-- 004 — GÓI TIN BẢN 3.1: THÊM TỐC ĐỘ THOÁT NƯỚC V (29/10/2026)
--
-- Nhóm IoT định nghĩa lại V trong công thức  Ĥ(t+5) = a0 + a1·H + a2·V + a3·R + a4·S :
--   V = tốc độ THOÁT NƯỚC qua cống rãnh, mm/5 phút, ≥ 0 (thoát càng nhiều số càng lớn) — trạm tự tính
--   R = lượng mưa trong 5 phút, mm/5 phút
-- Trạm gửi V ở trường drain_mm_5min. Cột rise_rate_mm_min (tốc độ dâng, bản 3.0) giữ lại cho dữ liệu cũ.
-- =====================================================================

ALTER TABLE readings ADD COLUMN drain_mm_5min DOUBLE PRECISION;
