/* ================================================================
 *  google.script.run -> Supabase bridge
 *  ---------------------------------------------------------------
 *  পুরনো অ্যাপগুলো Apps Script-এর google.script.run দিয়ে সার্ভারের
 *  ফাংশন কল করত। এই ফাইল একই নামে একটা "নকল" google.script.run বানায়,
 *  যা কলটি window.SCS_BACKEND[functionName] (Supabase কোড) এ পাঠায়।
 *  ফলে অ্যাপের UI একদম আগের মতো থাকে, শুধু ডাটাবেস বদলে যায়।
 * ================================================================ */
(function () {
  'use strict';

  function clone(v) {
    if (v === undefined || v === null || typeof v !== 'object') return v;
    try { return JSON.parse(JSON.stringify(v)); } catch (e) { return v; }
  }

  function makeRunner(onOk, onFail) {
    return new Proxy({}, {
      get: function (_t, name) {
        if (name === 'withSuccessHandler') return function (fn) { return makeRunner(fn, onFail); };
        if (name === 'withFailureHandler') return function (fn) { return makeRunner(onOk, fn); };
        if (name === 'withUserObject') return function () { return makeRunner(onOk, onFail); };
        if (typeof name !== 'string') return undefined;
        var B = window.SCS_BACKEND || {};
        if (typeof B[name] !== 'function') return undefined;
        return function () {
          var args = Array.prototype.slice.call(arguments).map(clone);
          var ready = (window.SCS && window.SCS.ready) ? window.SCS.ready : Promise.resolve();
          ready.then(function () { return B[name].apply(B, args); })
            .then(function (res) {
              if (onOk) { try { onOk(clone(res)); } catch (e) { console.error(e); } }
            }, function (err) {
              var msg = (window.SCS && window.SCS.err) ? window.SCS.err(err) : (err && err.message) || String(err);
              console.warn('[SCS backend] ' + name + ' failed:', err);
              var e = new Error(msg);
              if (onFail) { try { onFail(e); } catch (x) { console.error(x); } }
            });
        };
      }
    });
  }

  window.google = window.google || {};
  window.google.script = window.google.script || {};
  Object.defineProperty(window.google.script, 'run', {
    configurable: true,
    get: function () { return makeRunner(null, null); }
  });
})();
