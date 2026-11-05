window.FD = window.FD || {};
FD.waveforms = (function () {
    var cache = Object.create(null), pending = Object.create(null), keys = [], queue = [], running = false;
    function wanted(job) {
        return !(typeof document !== "undefined" && document.hidden) && job.consumers.some(function (check) { return check(); });
    }
    function prune() {
        queue = queue.filter(function (job) {
            if (wanted(job)) return true;
            delete pending[job.key]; delete cache[job.key]; job.resolve({ skipped: true }); return false;
        });
    }
    function pump() {
        prune();
        if (running || !queue.length) return;
        var job = queue.shift(); running = true;
        FD.audioDecode.decode(job.asset, function () { return wanted(job); }).catch(function () {
            if (!wanted(job)) return { skipped: true };
            return FD.ffmpeg.ensure(job.asset, "wave", function () { return wanted(job); }, job.priority).then(function (result) {
                return result.ok ? { image: result.data } : result.skipped ? { skipped: true } : { error: "Use local FFmpeg for this waveform" };
            });
        }).then(function (result) {
            delete pending[job.key]; if (result.skipped || keys.indexOf(job.key) < 0) delete cache[job.key];
            job.resolve(result); running = false; setTimeout(pump, 12);
        }, function () { delete pending[job.key]; delete cache[job.key]; job.resolve({ error: "Waveform unavailable" }); running = false; setTimeout(pump, 12); });
    }
    function load(asset, check, priority) {
        check = check || function () { return true; };
        var key = [asset.path, asset.size, asset.mtime, FD.store.get("settings").ffmpegPath].join("|");
        if (pending[key]) {
            var existing = pending[key]; existing.consumers.push(check);
            if (priority) { existing.priority = true; var index = queue.indexOf(existing); if (index >= 0) { queue.splice(index, 1); queue.unshift(existing); } }
            return existing.promise;
        }
        if (!cache[key]) {
            prune();
            if (!priority && (asset.size > 8388608 || queue.length >= 64)) return Promise.resolve({ deferred: true });
            cache[key] = new Promise(function (resolve) {
                var job = { asset: asset, resolve: resolve, key: key, consumers: [check], priority: priority };
                pending[key] = job; if (priority) queue.unshift(job); else queue.push(job);
            });
            pending[key].promise = cache[key];
            keys.push(key); if (keys.length > 120) { var oldest = keys.shift(); if (!pending[oldest]) delete cache[oldest]; }
            setTimeout(pump, 12);
        }
        return cache[key];
    }
    return { load: load, cancelUnused: prune };
})();
