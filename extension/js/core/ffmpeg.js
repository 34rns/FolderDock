window.FD = window.FD || {};
FD.ffmpeg = (function () {
    var pending = Object.create(null), jobs = Object.create(null), failures = Object.create(null), queue = [], running = false, activeJob, activeConversion;
    function wanted(job) { return !(typeof document !== "undefined" && document.hidden) && job.consumers.some(function (check) { return check(); }); }
    function cancelUnused() {
        queue = queue.filter(function (job) {
            if (wanted(job)) return true;
            delete pending[job.key]; delete jobs[job.key]; job.resolve({ ok: false, skipped: true }); return false;
        });
        if (activeJob && !wanted(activeJob) && activeConversion && activeConversion.cancel) activeConversion.cancel();
    }
    function pump() {
        cancelUnused();
        if (running || !queue.length) return;
        running = true;
        var job = queue.shift();
        if (FD.store.get("settings").ffmpegPath !== job.executable) {
            delete pending[job.key]; delete jobs[job.key]; running = false; job.resolve({ ok: false, skipped: true }); pump(); return;
        }
        activeJob = job; activeConversion = FD.fs.convertPreview(job.executable, job.asset.path, job.output, job.format, job.asset.kind);
        activeConversion.then(function (result) {
            if (!result.ok && !result.skipped) failures[job.key] = result;
            delete pending[job.key]; delete jobs[job.key]; activeJob = activeConversion = null; running = false; job.resolve(result); pump();
        }, function (error) {
            delete pending[job.key]; delete jobs[job.key]; activeJob = activeConversion = null; running = false;
            job.resolve({ ok: false, error: String(error) }); pump();
        });
    }
    function ensure(asset, format, check, priority) {
        var executable = FD.store.get("settings").ffmpegPath;
        if (!executable || (asset.kind !== "video" && asset.kind !== "image" && !(asset.kind === "audio" && (format === "mp4" || format === "wave")))) {
            return Promise.resolve({ ok: false, skipped: true });
        }
        format = format === "mp4" || format === "wave" ? format : "jpg";
        var cache = FD.fs.previewCache(asset, format);
        if (!cache.ok) return Promise.resolve(cache);
        if (cache.data.exists) return Promise.resolve({ ok: true, data: cache.data.path });
        var key = cache.data.path + "|" + executable;
        if (failures[key]) return Promise.resolve(failures[key]);
        check = check || function () { return true; };
        if (pending[key]) { jobs[key].consumers.push(check); return pending[key]; }
        cancelUnused();
        if (!priority && queue.length >= 24) return Promise.resolve({ ok: false, skipped: true });
        pending[key] = new Promise(function (resolve) {
            var job = { asset: asset, executable: executable, output: cache.data.path, format: format, key: key, resolve: resolve, consumers: [check] };
            jobs[key] = job; if (priority) queue.unshift(job); else queue.push(job);
        });
        var promise = pending[key]; pump(); return promise;
    }
    return { ensure: ensure, cancelUnused: cancelUnused };
})();
