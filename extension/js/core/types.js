window.FD = window.FD || {};

FD.types = (function () {
    var exts = {
        video: ["mp4", "mov", "m4v", "webm", "avi", "mxf"],
        image: ["png", "jpg", "jpeg", "gif", "webp", "svg", "psd", "ai", "tif", "tiff"],
        audio: ["wav", "mp3", "aac", "m4a", "aiff", "flac"],
        preset: ["mogrt", "ffx", "prfpset"],
        project: ["aep", "aepx", "prproj"]
    };

    function getKind(filename) {
        if (!filename) return "other";
        var parts = filename.toLowerCase().split(".");
        if (parts.length < 2) return "other";
        var ext = parts.pop();
        for (var k in exts) {
            if (Object.prototype.hasOwnProperty.call(exts, k)) {
                var list = exts[k];
                for (var i = 0; i < list.length; i++) {
                    if (list[i] === ext) return k;
                }
            }
        }
        return "other";
    }

    function isPreviewableImageOrVideo(ext) {
        var e = (ext || "").toLowerCase();
        return ["png", "jpg", "jpeg", "gif", "webp", "mp4", "webm"].indexOf(e) !== -1;
    }

    return {
        getKind: getKind,
        isPreviewableImageOrVideo: isPreviewableImageOrVideo
    };
})();
