// =====================================================================
// TRANG ADMIN SMARTFLOOD — JavaScript thuần, không thư viện.
// AN TOÀN: mọi dữ liệu từ node/DB đều đưa vào trang bằng textContent (hàm el bên dưới),
// KHÔNG dùng innerHTML với dữ liệu — tránh lỗi XSS mà trang admin cũ từng mắc.
// =====================================================================

const API = '/api/v1/admin';
const KEY_STORAGE = 'smartflood-admin-key';
const LEVEL_TEXT = { normal: 'An toàn', warning: 'Cảnh báo', danger: 'Nguy hiểm', critical: 'Rất nguy hiểm', unknown: 'Chưa có' };
const CONN_TEXT = { online: 'Đang hoạt động', slow: 'Chậm dữ liệu', offline: 'Mất kết nối', nodata: 'Chưa có dữ liệu' };
const VARIABLE_TEXT = { H: 'mực nước hiện tại', V: 'tốc độ dâng (cm/phút)', T: 'nhiệt độ', RH: 'độ ẩm', L: 'ánh sáng', R: 'mưa', S: 'triều' };

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
  const head = el('tr', {}, ['Mã node', 'Tên', 'Vị trí', 'Kết nối', 'Lần cuối', 'Ngập', 'Mức', 'Dự đoán', 'Mưa 1h', 'Triều', 'Pin', 'Công thức', ''].map((t) => el('th', {}, t)));
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
      el('td', {}, levelBadge(n.floodLevel)),
      el('td', {}, r && r.predictedDepthCm !== null ? `${num(r.predictedDepthCm, ' cm')} (+${r.forecastMinutes}′)` : '—'),
      el('td', {}, r ? num(r.rainMm1h, ' mm') : '—'),
      el('td', {}, r ? num(r.tideCm, ' cm') : '—'),
      el('td', {}, r ? num(r.batteryPct, '%') : '—'),
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

  const [readings, models] = await Promise.all([
    fetch(`/api/v1/stations/${encodeURIComponent(nodeId)}/readings?hours=2160&limit=50`).then((r) => r.json()),
    fetch(`/api/v1/stations/${encodeURIComponent(nodeId)}/models`).then((r) => r.json()),
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

  const modelRows = models.models.map((m) =>
    el('tr', {},
      el('td', {}, `v${m.version}`),
      el('td', { className: 'wrap' }, el('div', { className: 'formula' }, formulaText(m))),
      el('td', {}, m.samples ?? '—'),
      el('td', {}, num(m.maeCm, ' cm')),
      el('td', {}, num(m.r2)),
      el('td', {}, clock(m.trainedAt)),
      el('td', {}, clock(m.firstSeenAt)),
    ),
  );
  const readingRows = readings.readings.slice().reverse().map((r) =>
    el('tr', {},
      el('td', {}, clock(r.measuredAt), r.timeSource === 'server' ? el('span', { className: 'tag' }, 'giờ máy chủ') : null),
      el('td', {}, num(r.floodDepthCm, ' cm')),
      el('td', {}, r.predictedDepthCm === null ? '—' : num(r.predictedDepthCm, ' cm')),
      el('td', {}, num(r.rainMm1h, ' mm')),
      el('td', {}, num(r.tideCm, ' cm')),
      el('td', {}, num(r.temperatureC, '°C')),
      el('td', {}, num(r.humidityPct, '%')),
      el('td', {}, num(r.lightLux, ' lux')),
      el('td', {}, num(r.batteryPct, '%')),
      el('td', {}, num(r.rssiDbm, ' dBm')),
      el('td', {}, r.modelVersion ? `v${r.modelVersion}` : '—'),
      el('td', {}, r.source),
      el('td', { className: 'wrap' }, Object.keys(r.extra || {}).length ? JSON.stringify(r.extra) : ''),
    ),
  );

  box.replaceChildren(
    el('div', { className: 'card' },
      el('div', { className: 'card-head' }, el('h2', { id: 'detail-title' }, `${node.nodeId} · ${node.name}`), el('span', { className: 'muted', id: 'detail-sub' })),
      form,
      el('h3', {}, 'Các phiên bản công thức (node tự học rồi gửi lên)'),
      models.models.length
        ? el('div', { className: 'table-wrap' }, el('table', {}, el('thead', {}, el('tr', {}, ['Phiên bản', 'Công thức', 'Số mẫu', 'MAE', 'R²', 'Node học xong lúc', 'Máy chủ nhận lúc'].map((t) => el('th', {}, t)))), el('tbody', {}, modelRows)))
        : el('p', { className: 'muted' }, 'Node chưa gửi công thức (trường "model").'),
      el('h3', {}, '50 lần đo gần nhất'),
      readings.readings.length
        ? el('div', { className: 'table-wrap' }, el('table', {}, el('thead', {}, el('tr', {}, ['Thời điểm đo', 'Ngập', 'Dự đoán', 'Mưa 1h', 'Triều', 'Nhiệt độ', 'Độ ẩm', 'Ánh sáng', 'Pin', 'Sóng', 'Công thức', 'Nguồn', 'Trường thêm'].map((t) => el('th', {}, t)))), el('tbody', {}, readingRows)))
        : el('p', { className: 'muted' }, 'Chưa có lần đo nào.'),
    ),
  );
  renderDetailHeaderOnly();
}

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

/** Viết công thức thành chữ: Ĥ(t+5) = 0.15 + 0.985·H + 4.8·V + ... */
function formulaText(model) {
  const parts = Object.entries(model.coefficients).map(([name, value]) => `${value >= 0 ? '+' : '−'} ${Math.abs(value)}·${name}`);
  const legend = Object.keys(model.coefficients).map((name) => `${name} = ${VARIABLE_TEXT[name] || name}`).join(', ');
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
const EXAMPLE = {
  node_id: 'ND-THU-01',
  measured_at: new Date().toISOString(),
  flood_depth_cm: 12.5,
  rain_mm_1h: 18.2,
  tide_cm: 135,
  temperature_c: 29.4,
  humidity_pct: 86,
  light_lux: 1200,
  battery_pct: 78,
  rssi_dbm: -97,
  prediction: { depth_cm: 15.1, horizon_min: 5 },
  model: { version: 1, trained_at: '2026-10-01T00:00:00+07:00', samples: 0, horizon_min: 5, intercept: 0.15, coef: { H: 0.985, V: 4.8, T: 0.002, RH: 0.001, L: -0.00001 }, mae_cm: 0.344, rmse_cm: 0.439, r2: 0.995 },
  location: { lat: 10.7726, lng: 106.6579 },
};
const testBox = document.getElementById('test-message');
testBox.value = JSON.stringify(EXAMPLE, null, 2);
document.getElementById('fill-now').addEventListener('click', () => {
  try {
    const obj = JSON.parse(testBox.value);
    obj.measured_at = new Date().toISOString();
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
