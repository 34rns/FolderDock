window.FD = window.FD || {};
FD.ui.toast = (function () {
    var container;
    return function (message, type, duration) {
        if (!container) {
            container = FD.ui.el("div", "toast-container"); container.id = "toast-container";
            container.setAttribute("aria-live", "polite"); document.body.appendChild(container);
        }
        while (container.childNodes.length >= 4) container.removeChild(container.firstChild);
        var toast = FD.ui.el("button", "toast toast-" + (type || "info"), String(message));
        toast.title = "Dismiss notification";
        if (type === "error") toast.setAttribute("role", "alert");
        container.appendChild(toast);
        var timer = setTimeout(dismiss, duration || (type === "error" ? 7000 : 3500));
        function dismiss() { clearTimeout(timer); if (toast.parentNode) toast.parentNode.removeChild(toast); }
        toast.onclick = dismiss;
    };
})();
