/**
 * MaestroTouch
 *
 * Adds touch-based navigation to the diagram-js canvas:
 *   - Single-finger drag  → canvas.scroll()   (pan)
 *   - Two-finger pinch    → canvas.zoom()     (zoom in/out)
 *   - Short tap (< 250 ms, < 10 px travel) → synthetic click event (opens hamburger task menu)
 */
function MaestroTouch(canvas) {
  var container = canvas._container;

  // Disable browser-native pan/zoom so our handlers take full control.
  container.style.touchAction = 'none';

  var lastSinglePos = null;   // {x, y} of the previous single-finger position
  var lastPinchDist = null;   // distance between two fingers on last touchmove
  var gestureStart  = null;   // {x, y, time} captured on touchstart (tap detection)

  // ── helpers ─────────────────────────────────────────────────────────────

  function fingerDist(t1, t2) {
    var dx = t1.clientX - t2.clientX;
    var dy = t1.clientY - t2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function fingerMidpoint(t1, t2) {
    var rect = container.getBoundingClientRect();
    return {
      x: (t1.clientX + t2.clientX) / 2 - rect.left,
      y: (t1.clientY + t2.clientY) / 2 - rect.top
    };
  }

  // ── event handlers ───────────────────────────────────────────────────────

  function onTouchStart(e) {
    e.preventDefault();

    if (e.touches.length === 1) {
      var t = e.touches[0];
      lastSinglePos = { x: t.clientX, y: t.clientY };
      lastPinchDist = null;
      gestureStart  = { x: t.clientX, y: t.clientY, time: Date.now() };
    } else if (e.touches.length === 2) {
      lastPinchDist = fingerDist(e.touches[0], e.touches[1]);
      lastSinglePos = null;
      gestureStart  = null;  // two-finger gesture is never a tap
    }
  }

  function onTouchMove(e) {
    e.preventDefault();

    if (e.touches.length === 1 && lastSinglePos) {
      var t  = e.touches[0];
      var dx = t.clientX - lastSinglePos.x;
      var dy = t.clientY - lastSinglePos.y;
      canvas.scroll({ dx: dx, dy: dy });
      lastSinglePos = { x: t.clientX, y: t.clientY };

    } else if (e.touches.length === 2 && lastPinchDist !== null) {
      var newDist     = fingerDist(e.touches[0], e.touches[1]);
      var ratio       = newDist / lastPinchDist;
      var currentZoom = canvas.zoom();
      var newZoom     = Math.min(Math.max(currentZoom * ratio, 0.2), 4);
      var mp          = fingerMidpoint(e.touches[0], e.touches[1]);
      canvas.zoom(newZoom, mp);
      lastPinchDist   = newDist;
    }
  }

  function onTouchEnd(e) {
    e.preventDefault();

    // Tap: single finger lifted, short elapsed time, minimal travel distance.
    if (gestureStart && e.changedTouches.length === 1 && e.touches.length === 0) {
      var touch   = e.changedTouches[0];
      var elapsed = Date.now() - gestureStart.time;
      var travel  = Math.sqrt(
        Math.pow(touch.clientX - gestureStart.x, 2) +
        Math.pow(touch.clientY - gestureStart.y, 2)
      );

      if (elapsed < 250 && travel < 10) {
        // Fire a synthetic click so the hamburger overlay's click listener fires.
        var target = document.elementFromPoint(touch.clientX, touch.clientY);
        if (target) {
          target.dispatchEvent(new MouseEvent('click', {
            bubbles:    true,
            cancelable: true,
            clientX:    touch.clientX,
            clientY:    touch.clientY,
            pageX:      touch.pageX,
            pageY:      touch.pageY,
            view:       window
          }));
        }
      }
    }

    // Reset state when all fingers have lifted.
    if (e.touches.length === 0) {
      lastSinglePos = null;
      lastPinchDist = null;
      gestureStart  = null;
    } else if (e.touches.length === 1) {
      // User lifted one finger during a two-finger gesture — resume single-finger pan.
      var t = e.touches[0];
      lastSinglePos = { x: t.clientX, y: t.clientY };
      lastPinchDist = null;
    }
  }

  // ── bind ─────────────────────────────────────────────────────────────────

  container.addEventListener('touchstart',  onTouchStart, { passive: false });
  container.addEventListener('touchmove',   onTouchMove,  { passive: false });
  container.addEventListener('touchend',    onTouchEnd,   { passive: false });
  container.addEventListener('touchcancel', onTouchEnd,   { passive: false });
}

MaestroTouch.$inject = ['canvas'];

export default {
  __init__: ['maestroTouch'],
  maestroTouch: ['type', MaestroTouch]
};
