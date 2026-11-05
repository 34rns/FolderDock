window.FD = window.FD || {};
(function () {
    var node = null;
    try { if (typeof require === "function") node = { fs: require("fs"), path: require("path"),
        cp: require("child_process"), crypto: require("crypto"), os: require("os") }; } catch (e) {}
    FD.fs.previewCache = function (asset, format) {
        try {
            if (!node) return { ok: false, error: "FFmpeg previews require Adobe's Node environment" };
            var base = FD.fs.userDataDir(); if (!base.ok) return base;
            var key = node.crypto.createHash("sha256").update([asset.path, asset.mtime, asset.size, "v2"].join("|")).digest("hex");
            var directory = node.path.join(base.data, "FolderDock", "cache");
            var file = node.path.join(directory, key + (format === "mp4" ? ".mp4" : format === "wave" ? ".wave.png" : ".jpg"));
            return { ok: true, data: { path: file.replace(/\\/g, "/"), exists: node.fs.existsSync(file) } };
        } catch (e) { return { ok: false, error: e.message }; }
    };
    FD.fs.convertPreview = function (executable, source, output, format, kind) {
        var child, cancelled = false;
        var pending = new Promise(function (resolve) {
            var temporary;
            try {
                if (!node) throw Error("FFmpeg previews require Adobe's Node environment");
                if (!node.path.isAbsolute(executable) || !node.fs.statSync(executable).isFile()) throw Error("Choose an absolute path to FFmpeg");
                var base = FD.fs.userDataDir(); if (!base.ok) throw Error(base.error);
                var directory = node.path.resolve(base.data, "FolderDock", "cache");
                if (node.path.dirname(node.path.resolve(output)) !== directory) throw Error("Invalid preview cache destination");
                node.fs.mkdirSync(directory, { recursive: true });
                temporary = output.replace(/\.(jpg|mp4|png)$/, ".partial.$1");
                var args = ["-nostdin", "-hide_banner", "-loglevel", "error", "-y", "-threads", "1", "-filter_threads", "1",
                    "-filter_complex_threads", "1", "-protocol_whitelist", "file,pipe", "-i", source];
                if (format === "wave") args = args.concat(["-filter_complex", "aformat=channel_layouts=mono,showwavespic=s=640x120:colors=white", "-frames:v", "1"]);
                else if (format === "mp4" && kind === "audio") args = args.concat(["-vn", "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart"]);
                else if (format === "mp4") args = args.concat(["-t", "8", "-an", "-vf", "scale=640:360:force_original_aspect_ratio=decrease:force_divisible_by=2",
                    "-r", "15", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-movflags", "+faststart"]);
                else args = args.concat(["-frames:v", "1", "-vf", "scale=320:180:force_original_aspect_ratio=decrease", "-q:v", "4"]);
                args = args.concat(["-threads", "1", temporary]);
                child = node.cp.execFile(executable, args, { windowsHide: true, timeout: 45000, maxBuffer: 131072 }, function (error, stdout, stderr) {
                    try {
                        if (cancelled) throw Error("Preview cancelled");
                        if (error) throw Error(String(stderr || error.message).slice(0, 400));
                        if (!node.fs.statSync(temporary).size) throw Error("FFmpeg produced an empty preview");
                        node.fs.renameSync(temporary, output);
                        resolve({ ok: true, data: output });
                    } catch (e) {
                        try { if (node.fs.existsSync(temporary)) node.fs.unlinkSync(temporary); } catch (cleanupError) {}
                        resolve(cancelled ? { ok: false, skipped: true } : { ok: false, error: "FFmpeg preview: " + e.message });
                    }
                });
                try { if (node.os.setPriority && child.pid) node.os.setPriority(child.pid, node.os.constants.priority.PRIORITY_BELOW_NORMAL); } catch (priorityError) {}
            } catch (e) { resolve({ ok: false, error: e.message }); }
        });
        pending.cancel = function () { cancelled = true; if (child) child.kill(); };
        return pending;
    };
})();
