import { LEAFLET_CSS, LEAFLET_JS } from './leafletBundle';

/**
 * TRANG HTML CHẠY TRONG WEBVIEW của bản đồ Android: Leaflet + nền OpenStreetMap (không cần Google Maps key).
 *
 * Nói chuyện với app qua 2 chiều:
 *   App → bản đồ:  gọi window.smartflood.setScene(cảnh) / flyTo(...) / fitBounds(...)  (injectJavaScript)
 *   Bản đồ → app:  window.ReactNativeWebView.postMessage(JSON)  với type = ready | press | longpress | marker
 *
 * Chạm giữ ~0,5 giây (không kéo bản đồ) = "longpress", giống chạm giữ trên bản đồ điện thoại.
 */
export function buildMapHtml(center: [number, number]): string {
  return `<!doctype html>
<html><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<style>${LEAFLET_CSS}
html,body,#map{margin:0;padding:0;width:100%;height:100%;background:#E5E7EB;}
.sf-marker{background:transparent;border:none;}
</style>
</head><body><div id="map"></div>
<script>${LEAFLET_JS}</script>
<script>
(function () {
  function send(msg) { if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(msg)); }
  var map = L.map('map', { zoomControl: false, zoomSnap: 0.25, tap: false }).setView(${JSON.stringify(center)}, 13);
  // NỀN BẢN ĐỒ: thử lần lượt từng nguồn. Nguồn nào tải lỗi liên tục (bị chặn / mạng lỗi) thì tự đổi sang nguồn kế tiếp.
  // Đã thử trên điện thoại thật (30/10/2026): OpenStreetMap chặn (nền xám), CARTO đòi API key (hiện chữ "API KEY REQUIRED").
  // → dùng bản đồ đường phố của Esri (không cần key), OpenStreetMap để dự phòng.
  var TILE_SOURCES = [
    { url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', subdomains: 'abc', attribution: 'Bản đồ &copy; Esri' },
    { url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', subdomains: 'abc', attribution: '&copy; OpenStreetMap' }
  ];
  var tileIndex = 0, tileLayer = null, tileErrors = 0, tileLoads = 0;
  function useTileSource(i) {
    if (tileLayer) map.removeLayer(tileLayer);
    tileIndex = i; tileErrors = 0; tileLoads = 0;
    var src = TILE_SOURCES[i];
    tileLayer = L.tileLayer(src.url, { maxZoom: 19, subdomains: src.subdomains, attribution: src.attribution, crossOrigin: false });
    tileLayer.on('tileload', function () { tileLoads++; });
    tileLayer.on('tileerror', function (e) {
      tileErrors++;
      if (tileErrors === 1) send({ type: 'log', text: 'Lỗi tải nền bản đồ (' + src.url.split('/')[2] + '): ' + (e && e.tile ? e.tile.src : '') });
      // Chưa tải được ô nào mà đã lỗi 6 ô → nguồn này hỏng, đổi nguồn.
      if (tileLoads === 0 && tileErrors >= 6 && tileIndex + 1 < TILE_SOURCES.length) useTileSource(tileIndex + 1);
      else if (tileLoads === 0 && tileErrors >= 6) send({ type: 'log', text: 'Không tải được nền bản đồ từ nguồn nào' });
    });
    tileLayer.addTo(map);
    tileLayer.bringToBack();
  }
  useTileSource(0);
  var layer = L.layerGroup().addTo(map);

  // Chạm nhanh vào chỗ trống → "press". Bấm vào nhãn trạm thì Leaflet không báo click bản đồ (nhãn tự báo "marker").
  // Vừa chạm giữ xong thì lần nhả tay không tính là "press".
  var justLongPressed = false;
  map.on('click', function () {
    if (justLongPressed) { justLongPressed = false; return; }
    send({ type: 'press' });
  });

  // Chạm giữ: tự đo thời gian vì WebView Android không phải lúc nào cũng báo sự kiện chuột phải.
  var holdTimer = null, holdStart = null;
  function cancelHold() { if (holdTimer) { clearTimeout(holdTimer); holdTimer = null; } }
  var box = document.getElementById('map');
  box.addEventListener('touchstart', function (e) {
    if (e.touches.length !== 1) { cancelHold(); return; }
    var t = e.touches[0];
    holdStart = { x: t.clientX, y: t.clientY };
    cancelHold();
    holdTimer = setTimeout(function () {
      holdTimer = null;
      var rect = box.getBoundingClientRect();
      var ll = map.containerPointToLatLng([holdStart.x - rect.left, holdStart.y - rect.top]);
      justLongPressed = true;
      setTimeout(function () { justLongPressed = false; }, 700);
      send({ type: 'longpress', latitude: ll.lat, longitude: ll.lng });
    }, 550);
  }, { passive: true });
  box.addEventListener('touchmove', function (e) {
    if (!holdStart || !holdTimer) return;
    var t = e.touches[0];
    if (Math.abs(t.clientX - holdStart.x) > 10 || Math.abs(t.clientY - holdStart.y) > 10) cancelHold();
  }, { passive: true });
  box.addEventListener('touchend', cancelHold, { passive: true });
  box.addEventListener('touchcancel', cancelHold, { passive: true });

  window.smartflood = {
    setScene: function (scene) {
      layer.clearLayers();
      scene.circles.forEach(function (c) { L.circle(c.center, Object.assign({ radius: c.radiusM }, c.style)).addTo(layer); });
      scene.polylines.forEach(function (p) { L.polyline(p.points, p.style).addTo(layer); });
      scene.markers.forEach(function (m) {
        var icon = L.divIcon({ html: m.html, className: 'sf-marker', iconSize: null });
        var marker = L.marker(m.position, { icon: icon, zIndexOffset: m.zIndex, interactive: !!m.id, keyboard: false }).addTo(layer);
        if (m.id) marker.on('click', function () { send({ type: 'marker', id: m.id }); });
      });
      if (scene.userPosition) {
        L.circleMarker(scene.userPosition, { radius: 8, color: '#ffffff', weight: 3, fillColor: '#2563EB', fillOpacity: 1, interactive: false }).addTo(layer);
      }
    },
    flyTo: function (lat, lng, zoom, seconds) {
      try { map.flyTo([lat, lng], zoom, { duration: seconds }); } catch (e) {}
    },
    fitBounds: function (points, pad, animate) {
      if (!points.length) return;
      try {
        map.fitBounds(L.latLngBounds(points), {
          paddingTopLeft: [pad.left, pad.top], paddingBottomRight: [pad.right, pad.bottom], animate: animate, maxZoom: 16
        });
      } catch (e) {}
    }
  };
  send({ type: 'ready' });
})();
</script>
</body></html>`;
}
