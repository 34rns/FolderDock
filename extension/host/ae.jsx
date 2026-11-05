function FD_aeImportFile(payload) {
    var undoOpen = false, presetLayer = null, selected = null, presetDone = false;
    try {
        payload = FD_parsePayload(payload);
        if (typeof app === "undefined" || !app.project) {
            return FD_fail("No project is open in After Effects");
        }
        var path = String(payload.path || "").replace(/\\/g, "/");
        var mode = payload.mode || "project";
        if (!path) return FD_fail("No file path provided");
        if (mode !== "project" && mode !== "timeline" && mode !== "preset") {
            return FD_fail("Unknown import mode: " + mode);
        }
        var file = new File(path);
        if (!file.exists) return FD_fail("File does not exist on disk: " + path);
        var ext = path.split(".").pop().toLowerCase();
        if (ext === "mogrt" || ext === "prfpset" || ext === "prproj") {
            return FD_fail("This Premiere Pro file cannot be imported here. Use Premiere Pro.");
        }
        var preset = ext === "ffx";
        if (mode === "preset" && !preset) return FD_fail("Choose an .ffx animation preset in After Effects");
        // Capture the composition before importing: importing can change activeItem.
        var comp = app.project.activeItem;
        if ((preset || mode === "timeline") && !(comp && comp instanceof CompItem)) {
            return FD_fail("Open a composition before inserting a file or applying a preset");
        }
        selected = preset ? comp.selectedLayers : null;
        app.beginUndoGroup("FolderDock Import");
        undoOpen = true;
        if (preset) {
            // VERIFY: LayerCollection.addSolid and Layer.selected; documented in the AE scripting guide.
            presetLayer = comp.layers.addSolid([1, 1, 1], path.split("/").pop().replace(/\.ffx$/i, ""),
                comp.width, comp.height, comp.pixelAspect, comp.duration);
            if (!presetLayer) return FD_fail("After Effects could not create the preset layer");
            presetLayer.startTime = comp.time;
            for (var i = 0; i < selected.length; i++) selected[i].selected = false;
            presetLayer.selected = true;
            presetLayer.applyPreset(file); presetDone = true;
            return FD_ok({ imported: false, placed: true, note: "Preset applied to a new solid at the composition playhead" });
        }
        var item = app.project.importFile(new ImportOptions(file));
        if (!item) return FD_fail("After Effects could not import this file");
        if (mode === "timeline") {
            var layer = comp.layers.add(item);
            if (!layer) return FD_fail("File imported, but After Effects could not add a layer");
            layer.startTime = comp.time;
            return FD_ok({ imported: true, placed: true, note: "Layer added at the composition playhead" });
        }
        return FD_ok({ imported: true, placed: false, note: "Imported into After Effects project" });
    } catch (e) {
        return FD_fail("After Effects: " + e.toString());
    } finally {
        if (presetLayer) {
            try {
                if (presetDone) presetLayer.selected = false;
                else { var source = presetLayer.source; presetLayer.remove(); if (source) source.remove(); }
            } catch (cleanupError) {}
            for (var s = 0; selected && s < selected.length; s++) {
                try { selected[s].selected = true; } catch (selectionError) {}
            }
        }
        if (undoOpen) {
            try { app.endUndoGroup(); } catch (undoError) {}
        }
    }
}
