window.FD = window.FD || {};

FD.bridge = (function () {
    var hasCEP = typeof window.__adobe_cep__ !== "undefined";
    var csInterface = null;

    function getCSInterface() {
        if (!csInterface && typeof CSInterface !== "undefined") {
            try {
                csInterface = new CSInterface();
            } catch (e) {
                csInterface = null;
            }
        }
        return csInterface;
    }

    function call(fn, payload) {
        return new Promise(function (resolve) {
            if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(fn)) { resolve({ ok: false, error: "Invalid host function" }); return; }
            var csi = getCSInterface();
            if (!hasCEP || !csi || typeof csi.evalScript !== "function") {
                if (hasCEP) { resolve({ ok: false, error: "Adobe bridge unavailable. Reinstall the complete extension." }); return; }
                if (window.FD && window.FD.mockHost && typeof window.FD.mockHost.call === "function") {
                    window.FD.mockHost.call(fn, payload).then(resolve).catch(function (err) {
                        var errMsg = err ? (err.message || String(err)) : "mock error";
                        resolve({ ok: false, error: errMsg });
                    });
                    return;
                }
                resolve({ ok: false, error: "No CEP host or mock host available" });
                return;
            }

            var timer = null;
            var completed = false;

            timer = setTimeout(function () {
                if (!completed) {
                    completed = true;
                    resolve({ ok: false, error: "timeout" });
                }
            }, 15000);

            var escapedPayload = "";
            try {
                escapedPayload = JSON.stringify(JSON.stringify(payload || {})).replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
            } catch (e2) {
                escapedPayload = JSON.stringify("{}");
            }
            var script = "FD." + fn + "(" + escapedPayload + ")";

            try {
                csi.evalScript(script, function (result) {
                    if (completed) {
                        return;
                    }
                    completed = true;
                    if (timer) {
                        clearTimeout(timer);
                    }
                    if (!result || result === "EvalScript error.") {
                        resolve({ ok: false, error: result || "EvalScript error." });
                        return;
                    }
                    try {
                        var parsed = JSON.parse(result);
                        resolve(parsed);
                    } catch (e3) {
                        resolve({ ok: false, error: "JSON parse error: " + e3.message, raw: result });
                    }
                });
            } catch (e4) {
                if (!completed) {
                    completed = true;
                    if (timer) clearTimeout(timer);
                    resolve({ ok: false, error: "evalScript exception: " + e4.message });
                }
            }
        });
    }

    return {
        call: call
    };
})();
