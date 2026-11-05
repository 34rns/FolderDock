window.FD = window.FD || {};
FD.ui.gridWindow = (function () {
    var host, items = [], makeCard, top, wrap, bottom, first = -1, last = -1, columns = 1, rowHeight = 1, queued = false;
    function geometry() {
        var style = getComputedStyle(host), size = FD.store.get("settings").thumbSize;
        var width = host.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
        var gap = parseFloat(getComputedStyle(wrap).columnGap) || 10;
        columns = Math.max(1, Math.floor((width + gap) / (size + gap)));
        rowHeight = size * .65 + 34 + gap;
    }
    function paint(force) {
        if (!host || !host.contains(wrap) || document.hidden) return;
        geometry();
        var startRow = Math.max(0, Math.floor(host.scrollTop / rowHeight) - 2);
        var endRow = Math.min(Math.ceil(items.length / columns), Math.ceil((host.scrollTop + host.clientHeight) / rowHeight) + 2);
        var start = startRow * columns, end = Math.min(items.length, endRow * columns);
        if (!force && first === start && last === end) return;
        first = start; last = end; FD.ui.thumbs.reset(); wrap.textContent = "";
        top.style.height = startRow * rowHeight + "px";
        bottom.style.height = Math.max(0, (Math.ceil(items.length / columns) - endRow) * rowHeight) + "px";
        var fragment = document.createDocumentFragment();
        for (var i = start; i < end; i++) fragment.appendChild(makeCard(items[i], i));
        wrap.appendChild(fragment);
        window.dispatchEvent(new CustomEvent("gridRendered"));
        window.dispatchEvent(new CustomEvent("gridUpdated"));
    }
    function schedule() {
        if (queued) return; queued = true;
        requestAnimationFrame(function () { queued = false; paint(false); });
    }
    function mount(container, assets, card, scroll) {
        if (host !== container) container.addEventListener("scroll", schedule, { passive: true });
        host = container; items = assets; makeCard = card; first = last = -1;
        top = FD.ui.el("div"); bottom = FD.ui.el("div"); wrap = FD.ui.el("div", "asset-grid"); wrap.id = "grid-wrap";
        top.setAttribute("aria-hidden", "true"); bottom.setAttribute("aria-hidden", "true");
        host.appendChild(top); host.appendChild(wrap); host.appendChild(bottom);
        geometry(); bottom.style.height = Math.ceil(items.length / columns) * rowHeight + "px";
        host.scrollTop = scroll || 0; paint(true);
    }
    function reveal(index) {
        if (!host || !host.contains(wrap)) return;
        geometry(); var offset = Math.floor(index / columns) * rowHeight;
        if (offset < host.scrollTop) host.scrollTop = offset;
        else if (offset + rowHeight > host.scrollTop + host.clientHeight) host.scrollTop = offset + rowHeight - host.clientHeight;
        paint(false);
    }
    window.addEventListener("resize", function () { paint(true); });
    document.addEventListener("visibilitychange", function () { if (!document.hidden) paint(true); });
    return { mount: mount, reveal: reveal, columns: function () { return columns; } };
})();
