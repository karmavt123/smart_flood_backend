/** Tâm vòng "Quanh bạn" lấy từ đâu. */
export type NearbyCenterSource = 'me' | 'picked' | 'demo' | 'default';

/** Câu mô tả tâm vòng "Quanh bạn" để người dùng biết đang xem quanh đâu. */
export function describeNearbyCenter(source: NearbyCenterSource): string {
  switch (source) {
    case 'me':
      return 'quanh vị trí của bạn';
    case 'picked':
      return 'quanh điểm bạn chọn';
    case 'demo':
      return 'quanh vị trí giả lập (chế độ demo)';
    default:
      return 'quanh trung tâm TP.HCM (chưa có vị trí của bạn)';
  }
}
