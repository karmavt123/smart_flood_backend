// =====================================================================
// TRANG ADMIN SMARTFLOOD — JavaScript thuần, không thư viện.
// AN TOÀN: mọi dữ liệu từ node/DB đều đưa vào trang bằng textContent (hàm el bên dưới),
// KHÔNG dùng innerHTML với dữ liệu — tránh lỗi XSS mà trang admin cũ từng mắc.
// =====================================================================

const API = '/api/v1/admin';
const KEY_STORAGE = 'smartflood-admin-key';
const LEVEL_TEXT = { normal: 'An toàn', warning: 'Cảnh báo', danger: 'Nguy hiểm', critical: 'Rất nguy hiểm', unknown: 'Chưa có' };
const CONN_TEXT = { online: 'Đang hoạt động', slow: 'Chậm dữ liệu', offline: 'Mất kết nối', nodata: 'Chưa có dữ liệu' };
// Ý nghĩa các biến trong công thức. Bản 3.0: hệ số dùng đúng đơn vị trong gói tin của trạm (mm, mm/phút, mm, m).
const VARIABLE_TEXT = {
  H: 'độ ngập hiện tại (mm)',
  V: 'tốc độ dâng (mm/phút)',
  R: 'lượng mưa (mm)',
  S: 'thủy triều (m)',
  T: 'nhiệt độ (công thức cũ)',
  RH: 'độ ẩm (công thức cũ)',
  L: 'ánh sáng (công thức cũ)',
};
const SOURCE_TEXT = { server: 'Máy chủ học', node: 'Trạm gửi lên' };
const RUN_STATUS_TEXT = { published: '✓ Có công thức mới', skipped: 'Giữ công thức cũ', failed: '✗ Lỗi' };
const TRIGGER_TEXT = { auto: 'Tự động mỗi ngày', manual: 'Bấm "Học lại ngay"' };

let adminKey = readKey();
let nodes = [];
let selectedNodeId = null;

// ---------- tiện ích ----------
function readKey() {
  try { return sessionStorage.getItem(KEY_STORAGE) || ''; } catch { return ''; }
}
function saveKey(value) {
  try { value ? sessionStorage.setItem(KEY_STORAGE, value) : sessionStorage.removeItem(KEY_STORAGE); } catch { /* bỏ qua */ }
}

/** Tạo phần tử HTML: el('td', { className: 'x' }, 'chữ', otherElement). Chữ luôn là textContent. */
function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (key === 'dataset') Object.assign(node.dataset, value);
    else if (key.startsWith('on')) node.addEventListener(key.slice(2).toLowerCase(), value);
    else node[key] = value;
  }
  for (const child of children.flat()) {
    if (child === null || child === undefined || child === false) continue;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey, ...(options.headers || {}) },
  });
  const body = await response.json().catch(() => ({}));
  if (response.status === 401) { logout('Khóa admin không đúng.'); throw new Error('Sai khóa admin'); }
  if (!response.ok && response.status !== 422) throw new Error(body.error || `Lỗi ${response.status}`);
  return body;
}

function timeAgo(iso) {
  if (!iso) return '—';
  const sec = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (sec < 60) return `${Math.max(sec, 0)} giây trước`;
  if (sec < 3600) return `${Math.round(sec / 60)} phút trước`;
  if (sec < 86400) return `${Math.round(sec / 3600)} giờ trước`;
  return `${Math.round(sec / 86400)} ngày trước`;
}
const clock = (iso) => (iso ? new Date(iso).toLocaleString('vi-VN', { hour12: false }) : '—');
const num = (value, unit = '') => (value === null || value === undefined ? '—' : `${Math.round(value * 10) / 10}${unit}`);
const levelBadge = (level) => el('span', { className: `level ${level}` }, LEVEL_TEXT[level] || level);
const has = (value) => value !== null && value !== undefined;
/** Thủy triều: DB lưu cm, hiển thị theo mét giống gói tin bên IoT. */
const riseText = (v) => (has(v) ? `${v > 0 ? '+' : ''}${Math.round(v * 10) / 10} mm/ph` : '—');
const tideText = (cm) => (has(cm) ? `${(cm / 100).toFixed(2)} m` : '—');
/** Mưa: lượng mưa (mm) của gói tin mới; gói tin kiểu cũ thì là tổng mưa 60 phút. */
const rainText = (r) => (has(r.rainMm) ? num(r.rainMm, ' mm') : has(r.rainMm1h) ? `${num(r.rainMm1h, ' mm')} /1h` : '—');
/** Giờ Việt Nam hiện tại dạng "14:05:30" — giống trường time node gửi. */
const vietnamClockNow = () => new Date().toLocaleTimeString('en-GB', { hour12: false, timeZone: 'Asia/Ho_Chi_Minh' });

// ---------- đăng nhập ----------
function logout(message) {
  adminKey = '';
  saveKey('');
  document.getElementById('app').hidden = true;
  document.getElementById('logout').hidden = true;
  document.getElementById('login').hidden = false;
  document.getElementById('login-error').textContent = message || '';
}

document.getElementById('login-form').addEventListener('submit', (event) => {
  event.preventDefault();
  adminKey = document.getElementById('key-input').value.trim();
  saveKey(adminKey);
  start();
});
document.getElementById('logout').addEventListener('click', () => logout(''));

// ---------- tab ----------
document.querySelectorAll('.tab').forEach((tab) =>
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t === tab));
    document.querySelectorAll('[data-panel]').forEach((p) => (p.hidden = p.dataset.panel !== tab.dataset.tab));
  }),
);

// ---------- danh sách node ----------
async function loadNodes() {
  const data = await api(`${API}/nodes`);
  nodes = data.nodes;
  const status = document.getElementById('status');
  status.replaceChildren(
    el('span', { className: `pill ${data.mqtt.connected ? 'ok' : 'bad'}` }, data.mqtt.connected ? 'MQTT: đã kết nối' : 'MQTT: mất kết nối'),
    el('span', { className: 'pill' }, `Đã nhận ${data.mqtt.messagesReceived} tin từ lúc bật`),
    el('span', { className: 'pill' }, `Tin cuối: ${timeAgo(data.mqtt.lastMessageAt)}`),
    el('span', { className: 'pill' }, `${nodes.length} node`),
  );
  document.getElementById('nodes-updated').textContent = `Cập nhật lúc ${new Date().toLocaleTimeString('vi-VN', { hour12: false })} · tự cập nhật mỗi 10 giây`;
  renderNodesTable();
  if (selectedNodeId) renderDetailHeaderOnly();
}

function renderNodesTable() {
  const head = el('tr', {}, ['Mã node', 'Tên', 'Vị trí', 'Kết nối', 'Lần cuối', 'Ngập', 'Tốc độ dâng', 'Mức', 'Dự đoán', 'Lượng mưa', 'Cường độ mưa', 'Triều', 'Nhiệt độ', 'Công thức', ''].map((t) => el('th', {}, t)));
  const rows = nodes.map((n) => {
    const r = n.latest;
    const isTest = r && r.extra && r.extra.is_test === true;
    return el(
      'tr',
      { className: n.nodeId === selectedNodeId ? 'selected' : '' },
      el('td', {}, n.nodeId, isTest ? el('span', { className: 'tag' }, 'THỬ') : null, n.isActive ? null : el('span', { className: 'tag' }, 'ẨN')),
      el('td', {}, n.name),
      el('td', {}, n.latitude === null ? el('span', { className: 'error' }, '⚠ chưa có') : `${n.latitude.toFixed(5)}, ${n.longitude.toFixed(5)}`),
      el('td', { className: `conn ${n.connectionState}` }, CONN_TEXT[n.connectionState]),
      el('td', {}, timeAgo(n.lastSeenAt)),
      el('td', {}, r ? num(r.floodDepthCm, ' cm') : '—'),
      el('td', {}, r ? riseText(r.riseRateMmMin) : '—'),
      el('td', {}, levelBadge(n.floodLevel)),
      el('td', {}, r && r.predictedDepthCm !== null ? `${num(r.predictedDepthCm, ' cm')} (+${r.forecastMinutes}′)` : '—'),
      el('td', {}, r ? rainText(r) : '—'),
      el('td', {}, r ? num(r.rainRateMmH, ' mm/h') : '—'),
      el('td', {}, r ? tideText(r.tideCm) : '—'),
      el('td', {}, r ? num(r.temperatureC, '°C') : '—'),
      el('td', {}, n.model ? `v${n.model.version}` : '—'),
      el('td', {}, el('button', { className: 'small', onClick: () => openDetail(n.nodeId) }, 'Xem / Sửa')),
    );
  });
  document.getElementById('nodes-table').replaceChildren(el('thead', {}, head), el('tbody', {}, rows));
}

// ---------- chi tiết 1 node ----------
function field(label, input) {
  return [el('label', {}, label), input];
}

async function openDetail(nodeId) {
  selectedNodeId = nodeId;
  renderNodesTable();
  const node = nodes.find((n) => n.nodeId === nodeId);
  if (!node) return;
  const box = document.getElementById('node-detail');
  box.replaceChildren(el('div', { className: 'card' }, el('p', { className: 'muted' }, 'Đang tải...')));

  const [readings, models, training] = await Promise.all([
    fetch(`/api/v1/stations/${encodeURIComponent(nodeId)}/readings?hours=2160&limit=50`).then((r) => r.json()),
    fetch(`/api/v1/stations/${encodeURIComponent(nodeId)}/models`).then((r) => r.json()),
    api(`${API}/nodes/${encodeURIComponent(nodeId)}/training-runs?limit=10`),
  ]);

  const inputs = {
    name: el('input', { value: node.name }),
    address: el('input', { value: node.address }),
    latitude: el('input', { value: node.latitude ?? '', placeholder: 'vd 10.7726' }),
    longitude: el('input', { value: node.longitude ?? '', placeholder: 'vd 106.6579' }),
    warningCm: el('input', { type: 'number', value: node.thresholds.warningCm }),
    dangerCm: el('input', { type: 'number', value: node.thresholds.dangerCm }),
    criticalCm: el('input', { type: 'number', value: node.thresholds.criticalCm }),
    expectedIntervalSec: el('input', { type: 'number', value: node.expectedIntervalSec }),
    isActive: el('select', {}, el('option', { value: 'true', selected: node.isActive }, 'Hiện trên app'), el('option', { value: 'false', selected: !node.isActive }, 'Ẩn khỏi app')),
  };
  const message = el('p', { className: 'muted' });
  const form = el(
    'form',
    {
      className: 'form',
      onSubmit: async (event) => {
        event.preventDefault();
        const toNumberOrNull = (v) => (v.trim() === '' ? null : Number(v));
        const body = {
          name: inputs.name.value,
          address: inputs.address.value,
          latitude: toNumberOrNull(inputs.latitude.value),
          longitude: toNumberOrNull(inputs.longitude.value),
          warningCm: Number(inputs.warningCm.value),
          dangerCm: Number(inputs.dangerCm.value),
          criticalCm: Number(inputs.criticalCm.value),
          expectedIntervalSec: Number(inputs.expectedIntervalSec.value),
          isActive: inputs.isActive.value === 'true',
        };
        try {
          await api(`${API}/nodes/${encodeURIComponent(nodeId)}`, { method: 'PATCH', body: JSON.stringify(body) });
          message.textContent = '✓ Đã lưu.';
          message.className = 'muted';
          await loadNodes();
        } catch (error) {
          message.textContent = error.message;
          message.className = 'error';
        }
      },
    },
    field('Tên hiển thị', inputs.name),
    field('Địa chỉ', inputs.address),
    field('Vĩ độ (latitude)', inputs.latitude),
    field('Kinh độ (longitude)', inputs.longitude),
    field('Ngưỡng Cảnh báo (cm)', inputs.warningCm),
    field('Ngưỡng Nguy hiểm (cm)', inputs.dangerCm),
    field('Ngưỡng Rất nguy hiểm (cm)', inputs.criticalCm),
    field('Chu kỳ gửi (giây)', inputs.expectedIntervalSec),
    field('Hiển thị', inputs.isActive),
    el('div', { className: 'full row' }, el('button', { type: 'submit' }, 'Lưu thay đổi'), el('button', { type: 'button', className: 'ghost', onClick: () => closeDetail() }, 'Đóng')),
    el('div', { className: 'full' }, message),
  );

  // Mới nhất lên đầu.
  const modelRows = models.models.slice().reverse().map((m) =>
    el('tr', {},
      el('td', {}, `v${m.version}`),
      el('td', {}, SOURCE_TEXT[m.source] || m.source),
      el('td', { className: 'wrap' }, el('div', { className: 'formula' }, formulaText(m))),
      el('td', {}, m.samples ?? '—'),
      el('td', {}, num(m.maeCm, ' cm')),
      el('td', {}, num(m.r2)),
      el('td', {}, clock(m.trainedAt ?? m.firstSeenAt)),
      el('td', {}, m.source === 'server' ? (m.publishedAt ? clock(m.publishedAt) : el('span', { className: 'error' }, 'chưa gửi được')) : '—'),
      el('td', {}, m.appliedAt ? clock(m.appliedAt) : m.source === 'server' ? el('span', { className: 'muted' }, 'chờ trạm báo') : '—'),
    ),
  );

  // Nút "Học lại ngay": máy chủ học lại công thức cho trạm này ngay lúc bấm.
  const retrainResult = el('pre', { className: 'result' });
  const retrainButton = el('button', {
    type: 'button',
    onClick: async () => {
      retrainButton.disabled = true;
      retrainResult.textContent = 'Đang học...';
      try {
        const result = await api(`${API}/nodes/${encodeURIComponent(nodeId)}/retrain`, { method: 'POST' });
        retrainResult.textContent = `${RUN_STATUS_TEXT[result.run.status]}: ${result.run.reason}`;
        setTimeout(() => openDetail(nodeId), 1500); // tải lại bảng công thức + nhật ký
      } catch (error) {
        retrainResult.textContent = `✗ ${error.message}`;
      } finally {
        retrainButton.disabled = false;
      }
    },
  }, 'Học lại ngay');

  const runRows = training.runs.map((run) =>
    el('tr', {},
      el('td', {}, clock(run.startedAt)),
      el('td', {}, TRIGGER_TEXT[run.trigger] || run.trigger),
      el('td', { className: run.status === 'failed' ? 'error' : '' }, RUN_STATUS_TEXT[run.status] || run.status, run.newVersion ? ` v${run.newVersion}` : ''),
      el('td', {}, has(run.samplesUsed) ? `${run.samplesUsed} / ${run.pairsTotal}` : '—'),
      el('td', {}, num(run.maeNewCm, ' cm')),
      el('td', {}, has(run.maeOldCm) ? num(run.maeOldCm, ' cm') : has(run.maeBaselineCm) ? `${num(run.maeBaselineCm, ' cm')} (đoán "giữ nguyên")` : '—'),
      el('td', { className: 'wrap' }, run.reason),
    ),
  );
  // Bảng lần đo: chỉ hiện cột có dữ liệu (node A01/A02 không gửi độ ẩm, ánh sáng, pin... thì ẩn cột đó).
  const readingColumns = READING_COLUMNS.filter(
    ([, , valueOf]) => valueOf === null || readings.readings.some((r) => has(valueOf(r))),
  );
  const readingRows = readings.readings.slice().reverse().map((r) =>
    el('tr', {}, readingColumns.map(([, render]) => el('td', render === renderExtra ? { className: 'wrap' } : {}, render(r)))),
  );

  box.replaceChildren(
    el('div', { className: 'card' },
      el('div', { className: 'card-head' }, el('h2', { id: 'detail-title' }, `${node.nodeId} · ${node.name}`), el('span', { className: 'muted', id: 'detail-sub' })),
      form,
      el('h3', {}, 'Công thức dự đoán (máy chủ học lại mỗi ngày, gửi hệ số mới về trạm)'),
      el('p', { className: 'muted' }, 'Ĥ(t+5 phút) = a0 + a1·H + a2·V + a3·R + a4·S. Máy chủ chỉ học lúc đường đang ngập, và chỉ nhận công thức mới khi sai số nhỏ hơn công thức đang dùng.'),
      el('div', { className: 'row' }, retrainButton),
      retrainResult,
      models.models.length
        ? el('div', { className: 'table-wrap' }, el('table', {}, el('thead', {}, el('tr', {}, ['Phiên bản', 'Từ đâu', 'Công thức', 'Số mẫu', 'Sai số (MAE)', 'R²', 'Học xong lúc', 'Gửi về trạm lúc', 'Trạm bắt đầu dùng'].map((t) => el('th', {}, t)))), el('tbody', {}, modelRows)))
        : el('p', { className: 'muted' }, 'Trạm chưa có công thức nào. Bấm "Học lại ngay" khi trạm đã có dữ liệu lúc đường ngập (ít nhất khoảng 2,5 giờ).'),
      el('h3', {}, 'Nhật ký học lại (10 lần gần nhất)'),
      training.runs.length
        ? el('div', { className: 'table-wrap' }, el('table', {}, el('thead', {}, el('tr', {}, ['Lúc', 'Cách chạy', 'Kết quả', 'Mẫu ngập / tổng cặp', 'Sai số mới', 'Sai số để so', 'Giải thích'].map((t) => el('th', {}, t)))), el('tbody', {}, runRows)))
        : el('p', { className: 'muted' }, 'Chưa học lần nào.'),
      el('h3', {}, '50 lần đo gần nhất'),
      readings.readings.length
        ? el('div', { className: 'table-wrap' }, el('table', {}, el('thead', {}, el('tr', {}, readingColumns.map(([title]) => el('th', {}, title)))), el('tbody', {}, readingRows)))
        : el('p', { className: 'muted' }, 'Chưa có lần đo nào.'),
    ),
  );
  renderDetailHeaderOnly();
}

/** Các cột bảng lần đo: [tiêu đề, cách hiển thị, lấy giá trị để biết cột có dữ liệu không (null = luôn hiện)]. */
const renderExtra = (r) => (Object.keys(r.extra || {}).length ? JSON.stringify(r.extra) : '');
const READING_COLUMNS = [
  ['Thời điểm đo', (r) => [clock(r.measuredAt), r.timeSource === 'server' ? el('span', { className: 'tag' }, 'giờ máy chủ') : null], null],
  ['Ngập', (r) => num(r.floodDepthCm, ' cm'), null],
  ['Tốc độ dâng', (r) => riseText(r.riseRateMmMin), (r) => r.riseRateMmMin],
  ['Dự đoán', (r) => num(r.predictedDepthCm, ' cm'), (r) => r.predictedDepthCm],
  ['Lượng mưa', (r) => num(r.rainMm, ' mm'), (r) => r.rainMm],
  ['Cường độ mưa', (r) => num(r.rainRateMmH, ' mm/h'), (r) => r.rainRateMmH],
  ['Mưa 1h (kiểu cũ)', (r) => num(r.rainMm1h, ' mm'), (r) => r.rainMm1h],
  ['Triều', (r) => tideText(r.tideCm), null],
  ['Nhiệt độ', (r) => num(r.temperatureC, '°C'), (r) => r.temperatureC],
  ['Độ ẩm', (r) => num(r.humidityPct, '%'), (r) => r.humidityPct],
  ['Ánh sáng', (r) => num(r.lightLux, ' lux'), (r) => r.lightLux],
  ['Pin', (r) => num(r.batteryPct, '%'), (r) => r.batteryPct],
  ['Sóng', (r) => num(r.rssiDbm, ' dBm'), (r) => r.rssiDbm],
  ['Công thức', (r) => (r.modelVersion ? `v${r.modelVersion}` : '—'), (r) => r.modelVersion],
  ['Nguồn', (r) => r.source, null],
  ['Trường thêm', renderExtra, null],
];

function renderDetailHeaderOnly() {
  const node = nodes.find((n) => n.nodeId === selectedNodeId);
  const sub = document.getElementById('detail-sub');
  if (node && sub) sub.textContent = `${CONN_TEXT[node.connectionState]} · lần cuối ${timeAgo(node.lastSeenAt)}`;
}

function closeDetail() {
  selectedNodeId = null;
  document.getElementById('node-detail').replaceChildren();
  renderNodesTable();
}

/** Viết công thức thành chữ: Ĥ(t+5 phút) = 1.2 + 0.97·H + 4.9·V + 0.03·R + 2.1·S */
const VARIABLE_ORDER = ['H', 'V', 'R', 'S', 'T', 'RH', 'L'];
function formulaText(model) {
  const rank = (name) => (VARIABLE_ORDER.includes(name) ? VARIABLE_ORDER.indexOf(name) : 99);
  const names = Object.keys(model.coefficients).sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
  const parts = names.map((name) => { const value = model.coefficients[name]; return `${value >= 0 ? '+' : '−'} ${Math.abs(value)}·${name}`; });
  const legend = names.map((name) => `${name} = ${VARIABLE_TEXT[name] || name}`).join(', ');
  return `Ĥ(t+${model.horizonMinutes ?? '?'} phút) = ${model.intercept} ${parts.join(' ')}   (${legend})`;
}

// ---------- tin nhắn lỗi ----------
async function loadErrors() {
  const data = await api(`${API}/ingest-errors?limit=100`);
  const recent = data.errors.filter((e) => Date.now() - new Date(e.receivedAt).getTime() < 3600 * 1000).length;
  document.getElementById('error-count').textContent = recent ? String(recent) : '';
  const head = el('tr', {}, ['Lúc nhận', 'Kênh', 'Topic', 'Lý do', 'Nội dung tin nhắn'].map((t) => el('th', {}, t)));
  const rows = data.errors.length
    ? data.errors.map((e) =>
        el('tr', {},
          el('td', {}, clock(e.receivedAt)),
          el('td', {}, e.channel),
          el('td', {}, e.topic || '—'),
          el('td', { className: 'wrap error' }, e.reason),
          el('td', { className: 'wrap' }, el('code', {}, e.payload.length > 600 ? `${e.payload.slice(0, 600)}…` : e.payload)),
        ),
      )
    : [el('tr', {}, el('td', { colSpan: 5, className: 'muted' }, 'Chưa có tin nhắn nào bị từ chối.'))];
  document.getElementById('errors-table').replaceChildren(el('thead', {}, head), el('tbody', {}, rows));
}

// ---------- gửi thử ----------
// Đúng kiểu gói tin bản 3.0 trạm gửi (xem IOT_DATA_FORMAT.md). Mã ND-THU-01 để khỏi lẫn dữ liệu thử vào trạm thật.
const EXAMPLE = {
  id: 'ND-THU-01',
  time: vietnamClockNow(),
  water_level_mm: 125,
  rise_rate_mm_min: 2.4,
  rain_mm: 12.5,
  tide_m: 1.35,
};
const testBox = document.getElementById('test-message');
testBox.value = JSON.stringify(EXAMPLE, null, 2);
document.getElementById('fill-now').addEventListener('click', () => {
  try {
    const obj = JSON.parse(testBox.value);
    if ('measured_at' in obj) obj.measured_at = new Date().toISOString();
    else obj.time = vietnamClockNow();
    testBox.value = JSON.stringify(obj, null, 2);
  } catch {
    document.getElementById('test-result').textContent = 'Nội dung đang không phải JSON hợp lệ.';
  }
});
document.getElementById('send-test').addEventListener('click', async () => {
  const out = document.getElementById('test-result');
  let message;
  try {
    message = JSON.parse(testBox.value);
  } catch (error) {
    out.textContent = `Không phải JSON hợp lệ: ${error.message}`;
    return;
  }
  try {
    const result = await api(`${API}/messages`, { method: 'POST', body: JSON.stringify({ message }) });
    out.textContent = result.ok
      ? `✓ ${result.status === 'saved' ? 'Đã lưu' : 'Trùng thời điểm đo, bỏ qua'} cho node ${result.nodeId}${result.newModelVersion ? ` (công thức mới v${result.newModelVersion})` : ''}`
      : `✗ Bị từ chối: ${result.reason}`;
    loadNodes();
  } catch (error) {
    out.textContent = `✗ ${error.message}`;
  }
});

// ---------- thêm node ----------
(function buildCreateForm() {
  const inputs = {
    nodeId: el('input', { placeholder: 'vd ND-Q1-01', required: true }),
    name: el('input', { placeholder: 'vd Ngã tư Nguyễn Hữu Cảnh' }),
    latitude: el('input', { placeholder: 'vd 10.7726' }),
    longitude: el('input', { placeholder: 'vd 106.6579' }),
  };
  const form = document.getElementById('create-form');
  form.append(
    ...field('Mã node *', inputs.nodeId),
    ...field('Tên hiển thị', inputs.name),
    ...field('Vĩ độ', inputs.latitude),
    ...field('Kinh độ', inputs.longitude),
    el('div', { className: 'full row' }, el('button', { type: 'submit' }, 'Tạo node')),
  );
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const out = document.getElementById('create-result');
    const body = { nodeId: inputs.nodeId.value.trim() };
    if (inputs.name.value.trim()) body.name = inputs.name.value.trim();
    if (inputs.latitude.value.trim()) body.latitude = Number(inputs.latitude.value);
    if (inputs.longitude.value.trim()) body.longitude = Number(inputs.longitude.value);
    try {
      await api(`${API}/nodes`, { method: 'POST', body: JSON.stringify(body) });
      out.textContent = `✓ Đã tạo node ${body.nodeId}`;
      form.reset();
      loadNodes();
    } catch (error) {
      out.textContent = `✗ ${error.message}`;
    }
  });
})();

// ---------- khởi động ----------
let timer = null;
async function start() {
  if (!adminKey) { logout(''); return; }
  try {
    await loadNodes();
  } catch {
    return; // sai khóa → logout() đã hiện ô nhập khóa
  }
  document.getElementById('login').hidden = true;
  document.getElementById('app').hidden = false;
  document.getElementById('logout').hidden = false;
  loadErrors().catch(() => {});
  clearInterval(timer);
  timer = setInterval(() => {
    loadNodes().catch(() => {});
    loadErrors().catch(() => {});
  }, 10000);
}
start();
