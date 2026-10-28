export interface ClockTime {
  hour: number;
  minute: number;
  second: number;
}

/**
 * ĐỌC GIỜ KHÔNG CÓ NGÀY mà node gửi: "14:05:30", "14/05/30", "14.05.30", "7:5:3" hoặc "14:05" (không giây).
 * Trả về null nếu không phải dạng giờ hoặc số giờ/phút/giây sai (vd "25:00:00").
 */
export function parseClockTime(text: string): ClockTime | null {
  const match = /^\s*(\d{1,2})[:/.](\d{1,2})(?:[:/.](\d{1,2}))?\s*$/.exec(text);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  const second = match[3] === undefined ? 0 : Number(match[3]);
  if (hour > 23 || minute > 59 || second > 59) return null;
  return { hour, minute, second };
}
