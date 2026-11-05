window.FD = window.FD || {};
FD.ui.audio = (function () {
    function waveform(host, asset, priority) {
        var status = FD.ui.el("span", "wave-status", "Loading waveform…"); host.appendChild(status);
        return FD.waveforms.load(asset, function () { return document.body.contains(host) && !document.hidden &&
            (priority || FD.ui.thumbs.isVisible(host)); }, priority).then(function (result) {
            if (!document.body.contains(host)) return;
            host.textContent = "";
            if (result.skipped || result.deferred) { host.appendChild(FD.ui.el("span", "wave-status", "Select to load waveform")); return; }
            if (result.error) { host.appendChild(FD.ui.el("span", "wave-status", result.error)); return; }
            var wave = FD.ui.el(result.image ? "img" : "canvas", "waveform");
            wave.dataset.ready = "true"; wave.setAttribute("aria-label", "Waveform of " + asset.name);
            if (result.image) { wave.alt = "Waveform of " + asset.name; wave.src = FD.fs.fileURL(result.image); }
            else {
                wave.width = Math.max(80, host.clientWidth); wave.height = 120; wave.setAttribute("role", "img");
                var ctx = wave.getContext("2d"), max = Math.max.apply(Math, result.peaks) || 1;
                ctx.fillStyle = getComputedStyle(host).getPropertyValue("--accent").trim();
                var bars = Math.floor(wave.width / 4);
                for (var i = 0; i < bars; i++) {
                    var start = Math.floor(i * result.peaks.length / bars), end = Math.max(start + 1, Math.floor((i + 1) * result.peaks.length / bars));
                    var peak = Math.max.apply(Math, result.peaks.slice(start, end));
                    var height = Math.max(1, peak / max * 112); ctx.fillRect(i * 4, (120 - height) / 2, 2, height);
                }
            }
            host.appendChild(wave); return result;
        });
    }
    function time(value) { value = Math.max(0, Math.floor(value || 0)); return Math.floor(value / 60) + ":" + ("0" + value % 60).slice(-2); }
    function create(asset) {
        var frame = FD.ui.el("div", "media-frame audio-preview"), wave = FD.ui.el("div", "wave-host");
        var media = document.createElement("audio"), controls = FD.ui.el("div", "audio-controls");
        var play = FD.ui.el("button", "audio-play", "Play"), clock = FD.ui.el("span", "audio-time", "0:00 / 0:00");
        var seek = document.createElement("input"), converted = false;
        seek.type = "range"; seek.min = 0; seek.max = 1000; seek.value = 0; seek.className = "audio-seek";
        seek.setAttribute("aria-label", "Seek audio"); seek.disabled = true;
        play.setAttribute("aria-label", "Play audio"); media.preload = "metadata";
        function update() {
            var duration = Number.isFinite(media.duration) ? media.duration : 0;
            clock.textContent = time(media.currentTime) + " / " + time(duration);
            seek.disabled = !duration; seek.value = duration ? media.currentTime / duration * 1000 : 0;
            seek.setAttribute("aria-valuetext", time(media.currentTime) + " of " + time(duration));
            play.textContent = media.paused ? "Play" : "Pause";
            play.setAttribute("aria-label", media.paused ? "Play audio" : "Pause audio");
        }
        play.onclick = function () {
            if (!media.paused) { media.pause(); return; }
            document.querySelectorAll("audio").forEach(function (other) { if (other !== media) other.pause(); });
            var result = media.play(); if (result && result.catch) result.catch(function () { FD.ui.toast("Audio cannot play yet. Try again after the preview loads.", "warning"); });
        };
        seek.oninput = function () { if (Number.isFinite(media.duration)) media.currentTime = Number(seek.value) / 1000 * media.duration; };
        ["loadedmetadata", "durationchange", "timeupdate", "play", "pause", "ended"].forEach(function (event) { media.addEventListener(event, update); });
        media.onerror = function () {
            if (converted) { play.disabled = true; clock.textContent = "Audio preview unavailable"; return; }
            converted = true; play.disabled = true; clock.textContent = "Preparing audio…";
            FD.ffmpeg.ensure(asset, "mp4", function () { return document.body.contains(frame) && !document.hidden; }, true).then(function (result) {
                if (!document.body.contains(frame)) return;
                if (!result.ok) { clock.textContent = "Audio preview unavailable"; return; }
                media.src = FD.fs.fileURL(result.data); play.disabled = false;
            });
        };
        controls.appendChild(play); controls.appendChild(clock);
        frame.appendChild(wave); frame.appendChild(seek); frame.appendChild(controls); frame.appendChild(media);
        media.src = FD.fs.fileURL(asset.path);
        waveform(wave, asset, true); return frame;
    }
    return { create: create, waveform: waveform };
})();
