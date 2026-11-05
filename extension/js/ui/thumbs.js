window.FD = window.FD || {};
FD.ui.thumbs = (function () {
    var cache = Object.create(null), keys = [], queue = [], active = 0, tasks = [], observer;
    function isVisible(el) {
        if (document.hidden || !document.body.contains(el)) return false;
        var bounds = el.getBoundingClientRect(), region = document.getElementById("grid-region").getBoundingClientRect();
        return bounds.bottom >= region.top - 60 && bounds.top <= region.bottom + 60;
    }
    var icons = { video: "▶", image: "▧", audio: "♫", preset: "✦", project: "▤", other: "◇" };
    function key(asset) { return [asset.path, asset.mtime, asset.size, asset.previewMtime || 0].join("|"); }
    function placeholder(el, asset) {
        el.textContent = "";
        var icon = FD.ui.el("span", "kind-icon", getKindIcon(asset.kind)); icon.setAttribute("aria-hidden", "true");
        el.appendChild(icon);
    }
    function getKindIcon(kind) { return icons[kind] || icons.other; }
    function image(el, source, asset, retry) {
        var img = document.createElement("img"); img.alt = ""; img.loading = "lazy";
        img.onerror = function () { placeholder(el, asset); if (retry) convert(el, asset); };
        img.src = source; el.textContent = ""; el.appendChild(img);
    }
    function convert(el, asset) {
        if (!FD.ffmpeg || !document.body.contains(el)) return;
        FD.ffmpeg.ensure(asset, "jpg", function () { return isVisible(el); }).then(function (result) {
            if (result.ok && document.body.contains(el)) image(el, FD.fs.fileURL(result.data), asset, false);
        });
    }
    function pump() {
        if (active >= 1 || !queue.length) return;
        var task = queue.shift();
        if (!isVisible(task.el)) { pump(); return; }
        active++;
        var video = document.createElement("video"), done = false;
        video.muted = true; video.preload = "auto";
        function finish(success, cancelled) {
            if (done) return; done = true; clearTimeout(timer);
            video.onloadeddata = video.onerror = null; video.pause(); video.removeAttribute("src"); video.load();
            tasks.splice(tasks.indexOf(finish), 1);
            active--; if (!success && !cancelled && isVisible(task.el)) convert(task.el, task.asset); pump();
        }
        tasks.push(finish);
        var timer = setTimeout(function () { finish(false); }, 3500);
        video.onloadeddata = function () {
            try {
                var canvas = document.createElement("canvas"); canvas.width = 160; canvas.height = 90;
                canvas.getContext("2d").drawImage(video, 0, 0, 160, 90);
                var url = canvas.toDataURL("image/jpeg", 0.7), id = key(task.asset);
                cache[id] = url; keys.push(id); if (keys.length > 200) delete cache[keys.shift()];
                if (document.body.contains(task.el)) image(task.el, url, task.asset, false);
                finish(true);
            } catch (e) { finish(false); }
        };
        video.onerror = function () { finish(false); };
        video.src = FD.fs.fileURL(task.asset.previewPath || task.asset.path); video.load();
        pump();
    }
    function load(el, asset) {
        var source = asset.thumbPath || asset.previewPath || asset.path, ext = source.split(".").pop().toLowerCase();
        if (asset.missing || !isVisible(el)) return;
        if (asset.kind === "audio") { el.textContent = ""; FD.ui.audio.waveform(el, asset); return; }
        if (/^(png|jpg|jpeg|gif|webp|svg)$/.test(ext)) { image(el, FD.fs.fileURL(source), asset, true); return; }
        if (cache[key(asset)]) { image(el, cache[key(asset)], asset, false); return; }
        if (/^(mp4|webm|mov|m4v|avi|mxf)$/.test(ext)) { queue.push({ el: el, asset: asset }); pump(); }
        else convert(el, asset);
    }
    function applyThumbnail(el, asset) {
        placeholder(el, asset);
        if (typeof IntersectionObserver === "undefined") { setTimeout(function () { load(el, asset); }, 0); return; }
        if (!observer) observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) { observer.unobserve(entry.target); load(entry.target, entry.target._asset); }
            });
        }, { root: document.getElementById("grid-region"), rootMargin: "100px" });
        el._asset = asset; observer.observe(el);
    }
    function reset() {
        if (observer) observer.disconnect(); queue = [];
        tasks.slice().forEach(function (finish) { finish(false, true); });
    }
    document.addEventListener("visibilitychange", function () { if (document.hidden) reset(); });
    return { applyThumbnail: applyThumbnail, getKindIcon: getKindIcon, reset: reset, isVisible: isVisible };
})();
