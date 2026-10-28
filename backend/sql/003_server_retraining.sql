-- =====================================================================
-- 003 — GÓI TIN BẢN 3.0 + MÁY CHỦ HỌC LẠI CÔNG THỨC (28/10/2026)
--
-- Thay đổi từ phía bên IoT:
--   - Bỏ LoRa, trạm ESP32 tự lên Wi-Fi và gửi MQTT thẳng lên máy chủ, 5 phút 1 lần.
--   - Gói tin có thêm TỐC ĐỘ DÂNG (rise_rate_mm_min) và ĐỘ NGẬP DỰ BÁO sau 5 phút.
--   - Công thức mới:  Ĥ(t+5) = a0 + a1·H + a2·V + a3·R + a4·S
--       H = độ ngập (mm), V = tốc độ dâng (mm/phút), R = lượng mưa (mm), S = thủy triều (m)
--     (bỏ nhiệt độ, độ ẩm, ánh sáng của công thức trong báo cáo cũ).
--
-- Vòng học lại:
--   trạm gửi số đo → máy chủ ghép cặp (lúc t, lúc t+5 phút), CHỈ lấy mẫu đang ngập
--   → học hệ số mới, kéo về gần hệ số cũ → chỉ nhận khi sai số giảm
--   → lưu phiên bản mới (source = 'server') → gửi về trạm qua MQTT topic smartflood/nodes/<id>/model.
-- =====================================================================

-- Tốc độ dâng do trạm tự tính: (mực nước bây giờ − mực nước 5 phút trước) ÷ 5, đơn vị mm/phút.
ALTER TABLE readings ADD COLUMN rise_rate_mm_min DOUBLE PRECISION;

-- Phiên bản công thức này từ đâu ra: 'node' = trạm gửi lên, 'server' = máy chủ học.
ALTER TABLE node_models ADD COLUMN source TEXT NOT NULL DEFAULT 'node';
ALTER TABLE node_models ADD CONSTRAINT node_models_source_check CHECK (source IN ('node', 'server'));
-- Máy chủ gửi phiên bản này xuống trạm lúc nào (chỉ có với source = 'server').
ALTER TABLE node_models ADD COLUMN published_at TIMESTAMPTZ;
-- Lần đầu trạm gửi số đo có ghi đang dùng phiên bản này (= trạm đã nhận và áp dụng).
ALTER TABLE node_models ADD COLUMN applied_at TIMESTAMPTZ;

-- NHẬT KÝ MỖI LẦN HỌC — kể cả lần KHÔNG ra công thức mới (ít mẫu, sai số không giảm...),
-- để admin biết vì sao trạm vẫn dùng công thức cũ.
CREATE TABLE model_training_runs (
  id                BIGSERIAL PRIMARY KEY,
  node_id           TEXT NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
  started_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  trigger           TEXT NOT NULL CHECK (trigger IN ('auto', 'manual')),  -- tự chạy mỗi ngày / admin bấm "Học lại ngay"
  status            TEXT NOT NULL CHECK (status IN ('published', 'skipped', 'failed')),
  reason            TEXT NOT NULL,          -- giải thích bằng tiếng Việt
  pairs_total       INTEGER,                -- số cặp (t, t+5 phút) tìm được
  samples_used      INTEGER,                -- số cặp đang ngập được dùng để học
  base_version      INTEGER,                -- học tiếp từ phiên bản nào (NULL = học từ đầu)
  new_version       INTEGER,                -- phiên bản mới (chỉ khi status = 'published')
  mae_new_cm        DOUBLE PRECISION,       -- sai số công thức mới trên phần dữ liệu để kiểm tra
  mae_old_cm        DOUBLE PRECISION,       -- sai số công thức cũ trên cùng phần dữ liệu đó
  mae_baseline_cm   DOUBLE PRECISION        -- sai số nếu đoán "5 phút nữa nước vẫn y như bây giờ"
);

CREATE INDEX model_training_runs_node_idx ON model_training_runs (node_id, started_at DESC);
