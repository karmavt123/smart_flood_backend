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
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap'
  }).addTo(map);
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
