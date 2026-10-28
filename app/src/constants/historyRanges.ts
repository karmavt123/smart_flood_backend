/** Các khoảng thời gian xem lịch sử (FR-07): 1 giờ, 24 giờ, 7 ngày. */
export const historyRanges = [
  { key: '1h', label: '1 giờ', hours: 1 },
  { key: '24h', label: '24 giờ', hours: 24 },
  { key: '7d', label: '7 ngày', hours: 168 },
] as const;

export type HistoryRangeKey = (typeof historyRanges)[number]['key'];
