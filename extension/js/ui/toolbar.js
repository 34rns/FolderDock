window.FD = window.FD || {};
FD.ui.toolbar = (function () {
    var state = { query: "", kind: "all", sort: "name" }, timer;
    function emit() { window.dispatchEvent(new CustomEvent("filterChanged", { detail: state })); }
    function init() {
        var input = document.getElementById("search-input");
        input.oninput = function () {
            clearTimeout(timer);
            timer = setTimeout(function () { state.query = input.value.trim().toLowerCase(); emit(); }, 180);
        };
        document.querySelectorAll(".chip").forEach(function (chip) {
            chip.onclick = function () {
                document.querySelectorAll(".chip").forEach(function (other) {
                    var active = other === chip; other.classList.toggle("active", active);
                    other.setAttribute("aria-pressed", String(active));
                });
                state.kind = chip.dataset.kind; emit();
            };
        });
        document.getElementById("sort-select").onchange = function (event) { state.sort = event.target.value; emit(); };
        document.getElementById("btn-size-toggle").onclick = function () {
            var size = FD.store.get("settings").thumbSize;
            FD.store.updateSettings({ thumbSize: size >= 200 ? 100 : size + 20 });
        };
        window.addEventListener("keydown", function (event) {
            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "f" && !document.querySelector(".modal-overlay")) {
                input.focus(); input.select(); event.preventDefault();
            }
        });
    }
    return { init: init, getState: function () { return state; } };
})();
