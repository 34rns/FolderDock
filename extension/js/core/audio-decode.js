window.FD = window.FD || {};
FD.audioDecode = (function () {
    function duration(asset) {
        return new Promise(function (resolve, reject) {
            var media = document.createElement("audio"), timer = setTimeout(function () { finish(Error("Audio metadata timed out")); }, 8000);
            function finish(error) {
                clearTimeout(timer); var seconds = media.duration;
                media.onloadedmetadata = media.onerror = null; media.removeAttribute("src"); media.load();
                if (error || !isFinite(seconds) || seconds > 300) reject(error || Error("Long audio needs local FFmpeg"));
                else resolve(seconds);
            }
            media.onloadedmetadata = function () { finish(); };
            media.onerror = function () { finish(Error("Unsupported audio")); };
            media.preload = "metadata"; media.src = FD.fs.fileURL(asset.path);
        });
    }
    function summarize(buffer, wanted) {
        return new Promise(function (resolve) {
            var values = new Array(160).fill(0), channel = 0, offset = 0;
            function step() {
                if (!wanted()) { resolve({ skipped: true }); return; }
                var data = buffer.getChannelData(channel), end = Math.min(data.length, offset + 32768);
                for (; offset < end; offset++) {
                    var bin = Math.min(159, Math.floor(offset * 160 / data.length));
                    values[bin] = Math.max(values[bin], Math.abs(data[offset]));
                }
                if (offset === data.length) { channel++; offset = 0; }
                if (channel < buffer.numberOfChannels) setTimeout(step, 4);
                else resolve({ peaks: values, duration: buffer.duration });
            }
            step();
        });
    }
    async function decode(asset, wanted) {
        if (asset.size > 33554432) throw Error("Large audio needs local FFmpeg");
        await duration(asset);
        if (!wanted()) return { skipped: true };
        var bytes = await FD.fs.readBinary(asset.path);
        var Context = window.OfflineAudioContext || window.webkitOfflineAudioContext;
        if (!Context) throw Error("Audio decoding unavailable");
        var buffer = await new Promise(function (resolve, reject) { new Context(1, 1, 8000).decodeAudioData(bytes, resolve, reject); });
        return summarize(buffer, wanted);
    }
    return { decode: decode };
})();
