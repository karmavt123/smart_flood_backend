-- =====================================================================
-- XÓA DỮ LIỆU CŨ TRƯỚC KHI DÙNG GÓI TIN 3.1 (29/10/2026) — CHẠY TAY, 1 LẦN, KHÔNG phải migration.
--
-- Vì sao: dữ liệu cũ đo theo định nghĩa cũ (water_level_mm có lúc là khoảng cách, V = tốc độ dâng),
-- trộn với dữ liệu 3.1 thì biểu đồ và việc học công thức sai.
--
-- XÓA: mọi lần đo, mọi phiên bản công thức, nhật ký học lại, tin nhắn lỗi.
-- GIỮ:  danh sách trạm (bảng nodes: mã, tên, địa chỉ, tọa độ, ngưỡng cảnh báo).
--
-- Cách chạy trên VPS (sau khi đã deploy bản mới và log khởi động có "[db] Đã chạy 004_drain_rate.sql"):
--   docker compose exec -T postgres psql -U <user> -d <database> < scripts/sql/xoa_du_lieu_cu_v3_1.sql
-- Nên sao lưu trước:
--   docker compose exec -T postgres pg_dump -U <user> <database> > backup_truoc_v3_1.sql
-- =====================================================================
BEGIN;

DELETE FROM model_training_runs;
DELETE FROM node_models;
DELETE FROM readings;
DELETE FROM ingest_errors;
-- Trạm về trạng thái "chưa có dữ liệu" cho tới khi gửi gói tin 3.1 đầu tiên.
UPDATE nodes SET last_message_at = NULL;

COMMIT;

-- Kiểm tra lại: 3 số đầu phải là 0, số trạm giữ nguyên.
SELECT
  (SELECT count(*) FROM readings)    AS so_lan_do,
  (SELECT count(*) FROM node_models) AS so_cong_thuc,
  (SELECT count(*) FROM ingest_errors) AS so_tin_loi,
  (SELECT count(*) FROM nodes)       AS so_tram;

-- ⚠ CÒN 1 VIỆC NGOÀI DB: broker vẫn GIỮ (retained) tin hệ số cũ ở smartflood/nodes/<mã>/model.
-- Trạm khởi động lại sẽ nhận lại hệ số cũ đó. Xóa bằng cách gửi tin RỖNG có cờ retained cho từng trạm, vd:
--   docker compose exec mosquitto mosquitto_pub -h localhost -u <tài khoản admin> -P <mật khẩu> -r -n -t smartflood/nodes/A01/model
--   (lặp lại với A02, ... và các trạm TEST-...)
