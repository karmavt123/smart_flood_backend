import { VIETNAM_UTC_OFFSET_MS } from '../config/floodRules.js';

/** Còn bao nhiêu mili-giây nữa tới HH:MM (giờ Việt Nam) lần kế tiếp. Đúng HH:MM rồi thì tính sang ngày mai. */
export function msUntilNextVietnamTime(hour: number, minute: number, now: Date): number {
  const vietnamNow = new Date(now.getTime() + VIETNAM_UTC_OFFSET_MS);
  let target =
    Date.UTC(vietnamNow.getUTCFullYear(), vietnamNow.getUTCMonth(), vietnamNow.getUTCDate(), hour, minute) -
    VIETNAM_UTC_OFFSET_MS;
  if (target <= now.getTime()) target += 86_400_000;
  return target - now.getTime();
}
