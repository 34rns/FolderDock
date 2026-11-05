#include "lib/json2.js"

if (typeof $.global.FD === "undefined") $.global.FD = {};
function FD_stringify(value) { return JSON.stringify(value); }
function FD_parse(value) { return JSON.parse(value); }
function FD_ok(data) { return JSON.stringify({ ok: true, data: data }); }
function FD_fail(message) { return JSON.stringify({ ok: false, error: String(message || "Unknown host error") }); }
function FD_parsePayload(value) {
    if (!value) return {};
    if (typeof value === "object") return value;
    return JSON.parse(String(value));
}
function FD_getAppType() {
    if (typeof app === "undefined" || !app) throw Error("No supported Adobe host is available");
    // AE does not consistently expose app.name. Use constructors unique to its host.
    if (typeof ImportOptions !== "undefined" && typeof CompItem !== "undefined") return "AEFT";
    if (app.project && typeof app.project.importFiles === "function") return "PPRO";
    var name = String(app.name || "");
    if (name.indexOf("After Effects") !== -1 || name.indexOf("AEFT") !== -1) return "AEFT";
    if (name.indexOf("Premiere") !== -1 || name.indexOf("PPRO") !== -1) return "PPRO";
    throw Error("Unsupported Adobe host: " + name);
}
