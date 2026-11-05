window.FD = window.FD || {};
FD.ui = FD.ui || {};
FD.ui.el = function (tag, className, text) {
    var el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined) el.textContent = text;
    if (tag === "button") el.type = "button";
    return el;
};
