/** Runs before React hydrates so a click during compile still shows feedback. */
export const ROUTE_PENDING_BOOT = `
(function () {
  var root = document.getElementById("app-route-pending");
  var label = document.getElementById("app-route-pending-label");
  var timer = 0;
  if (!root || !label) return;

  function show(text) {
    label.textContent = text;
    root.hidden = false;
    window.__routePending = true;
    window.clearTimeout(timer);
    timer = window.setTimeout(function () {
      window.__hideRoutePending();
    }, 20000);
  }

  window.__hideRoutePending = function () {
    window.clearTimeout(timer);
    root.hidden = true;
    window.__routePending = false;
  };

  document.addEventListener("click", function (event) {
    var target = event.target;
    if (!target || !target.closest) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    var link = target.closest("a[href]");
    if (link) {
      if (link.target === "_blank" || link.hasAttribute("download")) return;
      var href = link.getAttribute("href") || "";
      if (!href || href.charAt(0) === "#") return;
      var url;
      try { url = new URL(href, location.origin); } catch (e) { return; }
      if (url.origin !== location.origin) return;
      if (url.pathname === location.pathname && url.search === location.search) return;
      show(document.documentElement.dataset.appReady === "1" ? "Loading…" : "Still loading…");
      return;
    }

    if (document.documentElement.dataset.appReady === "1") return;
    if (target.closest("button, input[type='submit']")) {
      show("Still loading…");
    }
  }, true);
})();
`;
