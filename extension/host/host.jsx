#include "common.jsx"
#include "ppro.jsx"
#include "ae.jsx"

if (typeof $.global.FD === "undefined") {
    $.global.FD = {};
}

$.global.FD.hostInfo = function (payloadStr) {
    try {
        var payload = FD_parsePayload(payloadStr);
        var appType = FD_getAppType();
        var appVer = (typeof app !== "undefined" && app && app.version) ? app.version : "24.0";
        return FD_ok({ app: appType, version: appVer });
    } catch (e) {
        return FD_fail(e.toString());
    }
};

function FD_hostInfo(payloadStr) {
    return $.global.FD.hostInfo(payloadStr);
}

$.global.FD.importFile = function (payloadStr) {
    try {
        var payload = FD_parsePayload(payloadStr);
        var appType = FD_getAppType();
        if (appType === "AEFT" && typeof FD_aeImportFile === "function") {
            return FD_aeImportFile(payload);
        }
        if (appType === "PPRO" && typeof FD_pproImportFile === "function") {
            return FD_pproImportFile(payload);
        }
        return FD_fail("Import not implemented for " + appType);
    } catch (e) {
        return FD_fail(e.toString());
    }
};

function FD_importFile(payloadStr) {
    return $.global.FD.importFile(payloadStr);
}
