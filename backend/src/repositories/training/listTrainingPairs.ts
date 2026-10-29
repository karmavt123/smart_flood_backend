import { db } from '../../db/sharedDatabase.js';

/** 1 cặp mẫu để học: số đo lúc t (đã đổi về đơn vị trạm dùng) + độ ngập thật lúc t+5 phút. */
export interface TrainingPairRow {
  measured_at: Date | string;
  /** Độ ngập lúc t (mm). */
  h_mm: number;
  /** V lúc t = tốc độ thoát nước trạm gửi (drain_mm_5min, mm/5 phút). Gói tin cũ không có V → null → cặp bị bỏ. */
  v_drain: number | null;
  /** R lúc t = lượng mưa trong 5 phút (mm). */
  rain_mm: number | null;
  /** Thủy triều lúc t (m). */
  s_m: number;
  /** Độ ngập THẬT lúc t+5 phút (mm) — đáp án công thức phải đoán ra. */
  target_mm: number;
}

/**
 * GHÉP CẶP (lúc t → lúc t+5 phút) từ lịch sử đo của 1 node, lúc t nằm trong [since, until].
 * `until` phải sớm hơn hiện tại ít nhất (5 phút + độ lệch cho phép), để lần đo "5 phút sau" chắc chắn đã tới,
 * không thì cặp gần đây nhất sẽ bị ghép nhầm với lần đo mới hơn có 3-4 phút.
 * Lần đo "5 phút sau" chọn lần gần đúng 5 phút nhất, lệch tối đa ±toleranceSec.
 * Bỏ tin "gửi thử" ở trang admin (admin-test) vì đó là số người gõ tay, không phải nước thật.
 * Cặp nào không tìm được lần đo 5 phút sau thì không có trong kết quả.
 */
export async function listTrainingPairs(
  nodeId: string,
  since: Date,
  until: Date,
  horizonSec: number,
  toleranceSec: number,
): Promise<TrainingPairRow[]> {
  return db().query<TrainingPairRow>(
    `SELECT a.measured_at,
            a.flood_depth_cm * 10 AS h_mm,
            a.drain_mm_5min AS v_drain,
            a.rain_mm,
            a.tide_cm / 100.0 AS s_m,
            f.flood_depth_cm * 10 AS target_mm
     FROM readings a
     JOIN LATERAL (
       SELECT b.flood_depth_cm FROM readings b
       WHERE b.node_id = a.node_id AND b.source <> 'admin-test'
         AND b.measured_at BETWEEN a.measured_at + make_interval(secs => $4::double precision - $5::double precision)
                               AND a.measured_at + make_interval(secs => $4::double precision + $5::double precision)
       ORDER BY ABS(EXTRACT(EPOCH FROM (b.measured_at - a.measured_at)) - $4::double precision)
       LIMIT 1
     ) f ON TRUE
     WHERE a.node_id = $1 AND a.measured_at >= $2 AND a.measured_at <= $3 AND a.source <> 'admin-test'
     ORDER BY a.measured_at ASC`,
    [nodeId, since, until, horizonSec, toleranceSec],
  );
}
