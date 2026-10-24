/**
 * Lấy mã node từ topic MQTT. Quy ước topic: smartflood/nodes/<mã node>/data
 * Ví dụ "smartflood/nodes/ND-Q1-01/data" → "ND-Q1-01". Topic khác quy ước → null.
 */
export function getNodeIdFromTopic(topic: string): string | null {
  const match = /^smartflood\/nodes\/([^/]+)\/data$/.exec(topic);
  return match ? match[1]! : null;
}
