-- =====================================================================
-- CƠ SỞ DỮ LIỆU SMARTFLOOD — 4 bảng
--
--   nodes          1 dòng = 1 thiết bị đo (node). Vị trí, ngưỡng ngập, chu kỳ gửi.
--   readings       1 dòng = 1 lần đo node gửi lên (ngập, mưa, triều, dự đoán, ...).
--   node_models    1 dòng = 1 PHIÊN BẢN công thức hồi quy của 1 node.
--                  Mỗi node tự học trên thiết bị và gửi hệ số lên; khi node gửi phiên bản mới,
--                  bảng này giữ lại cả bản cũ → xem được công thức mỗi node thay đổi ra sao theo thời gian.
--   ingest_errors  Tin nhắn bị từ chối (sai định dạng, thiếu trường...) kèm lý do, để bên IoT sửa.
--
-- Quan hệ: nodes 1 ── n readings, nodes 1 ── n node_models.
-- File này chạy tự động khi backend khởi động (xem src/db/runMigrations.ts), chỉ chạy 1 lần.
-- =====================================================================

CREATE TABLE nodes (
  id                     TEXT PRIMARY KEY,                    -- mã node, vd "ND-Q1-01" (node tự gửi kèm trong tin nhắn)
  name                   TEXT NOT NULL,                       -- tên hiển thị, vd "Ngã tư Nguyễn Hữu Cảnh"
  address                TEXT NOT NULL DEFAULT '',
  latitude               DOUBLE PRECISION,                    -- NULL = chưa có vị trí → không hiện trên bản đồ
  longitude              DOUBLE PRECISION,
  warning_cm             DOUBLE PRECISION NOT NULL DEFAULT 10, -- từ mức này trở lên: Cảnh báo
  danger_cm              DOUBLE PRECISION NOT NULL DEFAULT 25, -- Nguy hiểm
  critical_cm            DOUBLE PRECISION NOT NULL DEFAULT 40, -- Rất nguy hiểm
  expected_interval_sec  INTEGER NOT NULL DEFAULT 300,         -- node gửi dữ liệu bao lâu 1 lần (giây), dùng để tính mất kết nối
  is_active              BOOLEAN NOT NULL DEFAULT TRUE,        -- FALSE = ẩn khỏi app (node thử, node đã gỡ)
  last_message_at        TIMESTAMPTZ,                          -- lần cuối máy chủ NHẬN được tin nhắn trực tiếp của node
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT nodes_thresholds_order CHECK (0 < warning_cm AND warning_cm < danger_cm AND danger_cm < critical_cm),
  CONSTRAINT nodes_latitude_range CHECK (latitude IS NULL OR latitude BETWEEN -90 AND 90),
  CONSTRAINT nodes_longitude_range CHECK (longitude IS NULL OR longitude BETWEEN -180 AND 180),
  CONSTRAINT nodes_interval_positive CHECK (expected_interval_sec > 0)
);

CREATE TABLE readings (
  id                  BIGSERIAL PRIMARY KEY,
  node_id             TEXT NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
  measured_at         TIMESTAMPTZ NOT NULL,    -- thời điểm đo
  received_at         TIMESTAMPTZ NOT NULL DEFAULT now(), -- thời điểm máy chủ nhận
  time_source         TEXT NOT NULL CHECK (time_source IN ('device', 'server')), -- measured_at lấy từ giờ thiết bị hay giờ máy chủ
  -- 3 trường bắt buộc
  flood_depth_cm      DOUBLE PRECISION NOT NULL, -- độ sâu nước ngập trên mặt đường (cm), 0 = khô
  rain_mm_1h          DOUBLE PRECISION NOT NULL, -- tổng lượng mưa 60 phút gần nhất (mm)
  tide_cm             DOUBLE PRECISION NOT NULL, -- mực triều (cm, hệ cao độ quốc gia)
  -- các trường thêm (NULL = node không gửi, KHÔNG hiểu là 0)
  temperature_c       DOUBLE PRECISION,
  humidity_pct        DOUBLE PRECISION,
  light_lux           DOUBLE PRECISION,
  battery_pct         DOUBLE PRECISION,
  rssi_dbm            DOUBLE PRECISION,          -- cường độ sóng LoRa gateway đo được
  -- kết quả dự đoán do node tự tính
  predicted_depth_cm  DOUBLE PRECISION,
  forecast_minutes    INTEGER,                   -- dự đoán cho bao nhiêu phút tới
  model_version       INTEGER,                   -- dự đoán bằng phiên bản công thức nào
  source              TEXT NOT NULL CHECK (source IN ('mqtt', 'import', 'admin-test')),
  extra               JSONB NOT NULL DEFAULT '{}'::jsonb, -- các trường lạ node gửi thêm, lưu nguyên để sau dùng
  CONSTRAINT readings_unique_time UNIQUE (node_id, measured_at) -- chống lưu trùng khi MQTT gửi lại cùng 1 tin
);

CREATE INDEX readings_node_time_idx ON readings (node_id, measured_at DESC);

CREATE TABLE node_models (
  node_id          TEXT NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
  version          INTEGER NOT NULL CHECK (version >= 1), -- 1 = công thức chung ban đầu, node học lại thì tăng lên
  trained_at       TIMESTAMPTZ,                -- node học xong phiên bản này lúc nào
  samples          INTEGER,                    -- học từ bao nhiêu mẫu
  horizon_minutes  INTEGER,                    -- công thức dự đoán trước bao nhiêu phút
  intercept        DOUBLE PRECISION NOT NULL,  -- hệ số tự do
  coefficients     JSONB NOT NULL,             -- hệ số từng biến, vd {"H": 0.98, "V": 4.6, "T": 0.004, "RH": 0.001, "L": 0}
  mae_cm           DOUBLE PRECISION,           -- sai số tuyệt đối trung bình (cm)
  rmse_cm          DOUBLE PRECISION,
  r2               DOUBLE PRECISION,
  first_seen_at    TIMESTAMPTZ NOT NULL DEFAULT now(), -- máy chủ thấy phiên bản này lần đầu lúc nào
  PRIMARY KEY (node_id, version)
);

CREATE TABLE ingest_errors (
  id           BIGSERIAL PRIMARY KEY,
  received_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  channel      TEXT NOT NULL,   -- mqtt / admin-test
  topic        TEXT,
  payload      TEXT NOT NULL,   -- nội dung tin nhắn (cắt còn tối đa 4000 ký tự)
  reason       TEXT NOT NULL    -- lý do bị từ chối, viết bằng tiếng Việt
);

CREATE INDEX ingest_errors_time_idx ON ingest_errors (received_at DESC);
