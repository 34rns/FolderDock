window.FD = window.FD || {};

FD.mockHost = (function () {
    var appType = "PPRO";
    var appVersion = "24.0.0";

    function setApp(type, version) {
        appType = type || "PPRO";
        if (version) {
            appVersion = version;
        }
    }

    function hostInfo() {
        return Promise.resolve({
            ok: true,
            data: {
                app: appType,
                version: appVersion
            }
        });
    }

    function importFile(payload) {
        var filePath = (payload && payload.path) ? payload.path : "";
        var mode = (payload && payload.mode) ? payload.mode : "project";
        return Promise.resolve({
            ok: true,
            data: {
                imported: true,
                placed: mode === "timeline" || mode === "preset",
                note: "Mock import successful: " + filePath + " (" + mode + ")"
            }
        });
    }

    function call(fn, payload) {
        if (fn === "hostInfo") {
            return hostInfo(payload);
        }
        if (fn === "importFile") {
            return importFile(payload);
        }
        return Promise.resolve({
            ok: false,
            error: "Unknown mock host function: " + fn
        });
    }

    return {
        call: call,
        setApp: setApp
    };
})();
