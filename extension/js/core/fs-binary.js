window.FD = window.FD || {};
(function () {
    if (!FD.fs.isNative()) return;
    var node = null;
    try { if (FD.fs.isNative() && typeof require === "function") node = require("fs"); } catch (e) {}
    FD.fs.readBinary = function (path) {
        return new Promise(function (resolve, reject) {
            if (node) {
                node.stat(path, function (error, stat) {
                    if (error) { reject(error); return; }
                    if (stat.size > 33554432) { reject(Error("Audio is too large for browser decoding")); return; }
                    node.readFile(path, function (error, data) {
                        if (error) reject(error);
                        else resolve(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength));
                    });
                });
                return;
            }
            reject(Error("Audio decoding requires Adobe's Node environment"));
        });
    };
})();
