window.FD = window.FD || {};
FD.ui.media = (function () {
    var hovered = null, hoverNode = null, hoverTimer = null;
    function release(node) {
        if (!node) return;
        node.querySelectorAll("video,audio").forEach(function (media) {
            media.onerror = null; media.pause(); media.removeAttribute("src"); media.load();
        });
    }
    function convert(frame, asset) {
        if (!FD.ffmpeg) return;
        setTimeout(function () {
        if (!document.body.contains(frame)) return;
        FD.ffmpeg.ensure(asset, asset.kind === "video" || asset.kind === "audio" ? "mp4" : "jpg",
            function () { return document.body.contains(frame) && !document.hidden; }, true).then(function (result) {
            if (!document.body.contains(frame)) return;
            if (!result.ok) { if (result.error) FD.ui.toast(result.error, "warning"); return; }
            var cached = document.createElement(asset.kind === "video" ? "video" : asset.kind === "audio" ? "audio" : "img");
            if (asset.kind === "video") { cached.controls = true; cached.muted = true; }
            else if (asset.kind === "audio") cached.controls = true;
            else cached.alt = asset.name;
            cached.onerror = function () { frame.textContent = "The converted preview could not be played."; };
            cached.src = FD.fs.fileURL(result.data); frame.textContent = ""; frame.appendChild(cached);
        });
        }, 0);
    }
    function create(asset, controls) {
        if (asset.kind === "audio") return controls ? FD.ui.audio.create(asset) : FD.ui.el("div");
        var frame = FD.ui.el("div", "media-frame");
        var source = asset.previewPath || asset.path, ext = source.split(".").pop().toLowerCase();
        var tag = /^(png|jpg|jpeg|gif|webp|svg)$/.test(ext) ? "img" :
            /^(mp4|webm|mov|m4v|avi|mxf)$/.test(ext) ? "video" :
            /^(wav|mp3|aac|m4a|aiff|flac)$/.test(ext) ? "audio" : "";
        if (!tag || asset.missing) {
            frame.appendChild(FD.ui.el("span", "empty-note", asset.missing ? "File is missing" : "No browser preview. Import to view in Adobe."));
            if (controls && !asset.missing) convert(frame, asset);
            return frame;
        }
        var media = document.createElement(tag);
        if (tag === "img") media.alt = asset.name;
        else { media.controls = controls; media.muted = tag === "video"; media.loop = !controls; media.preload = "metadata"; }
        media.onerror = function () {
            media.onerror = null; release(frame);
            frame.textContent = "Preview unavailable for this format. You can still import the file.";
            if (asset.thumbPath && asset.thumbPath !== source) {
                var fallback = document.createElement("img"); fallback.alt = asset.name;
                fallback.src = FD.fs.fileURL(asset.thumbPath); frame.textContent = ""; frame.appendChild(fallback);
            }
            if (controls) convert(frame, asset);
        };
        media.src = FD.fs.fileURL(source);
        frame.appendChild(media);
        if (!controls && tag !== "img") {
            var play = media.play(); if (play && play.catch) play.catch(function () {});
        }
        return frame;
    }
    function stopHover() {
        if (hoverTimer) clearTimeout(hoverTimer); hoverTimer = null;
        release(hoverNode);
        if (hoverNode && hoverNode.parentNode) hoverNode.parentNode.removeChild(hoverNode);
        hovered = null; hoverNode = null;
    }
    function init() {
        document.addEventListener("mouseover", function (event) {
            var card = event.target.closest(".asset-card");
            if (!card || hovered === card || !FD.store.get("settings").previewOnHover) return;
            stopHover();
            if (card._asset.kind === "audio") return;
            hovered = card;
            hoverTimer = setTimeout(function () {
                if (!document.body.contains(card)) { stopHover(); return; }
                hoverNode = create(card._asset, false); hoverNode.classList.add("hover-preview");
                card.querySelector(".asset-thumb").appendChild(hoverNode);
            }, 180);
        });
        document.addEventListener("mouseout", function (event) {
            if (hovered && (!event.relatedTarget || !hovered.contains(event.relatedTarget))) stopHover();
        });
        window.addEventListener("blur", stopHover);
        window.addEventListener("gridUpdated", stopHover);
        window.addEventListener("folderSelected", stopHover);
        document.addEventListener("visibilitychange", function () { if (document.hidden) stopHover(); });
        FD.store.on(function (state, key) { if (key === "settings" && !state.settings.previewOnHover) stopHover(); });
        function cancelUnused() { FD.waveforms.cancelUnused(); FD.ffmpeg.cancelUnused(); }
        window.addEventListener("gridUpdated", cancelUnused);
        document.addEventListener("visibilitychange", cancelUnused);
    }
    return { init: init, create: create, release: release, stopHover: stopHover };
})();
