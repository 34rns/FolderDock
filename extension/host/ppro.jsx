function FD_findItemByPath(parent, path) {
    if (!parent || !parent.children) return null;
    var target = new File(path).fsName;
    for (var i = 0; i < parent.children.numItems; i++) {
        var child = parent.children[i];
        if (child && child.type === 1) {
            try { if (child.getMediaPath() && new File(child.getMediaPath()).fsName === target) return child; } catch (e) {}
        } else if (child && child.type === 2) {
            var found = FD_findItemByPath(child, path); if (found) return found;
        }
    }
    return null;
}
function FD_isAudioPath(path) { return /\.(wav|mp3|aac|m4a|aiff|flac)$/i.test(path); }
function FD_emptyTrack(tracks, audioTail) {
    if (!tracks) return -1;
    for (var i = 0; i < tracks.numTracks; i++) {
        // VERIFY: Track.isLocked() and Track.clips.numItems are documented; retest on each target version.
        if (!tracks[i] || typeof tracks[i].isLocked !== "function" || tracks[i].isLocked() ||
            !tracks[i].clips || tracks[i].clips.numItems !== 0) continue;
        // Multichannel sources can occupy subsequent audio tracks too.
        if (audioTail) {
            var safe = true;
            for (var j = i + 1; j < tracks.numTracks; j++) {
                if (!tracks[j] || typeof tracks[j].isLocked !== "function" || tracks[j].isLocked() ||
                    !tracks[j].clips || tracks[j].clips.numItems !== 0) { safe = false; break; }
            }
            if (!safe) continue;
        }
        return i;
    }
    return -1;
}
function FD_pproImportFile(payload) {
    try {
        payload = FD_parsePayload(payload);
        if (typeof app === "undefined" || !app.project) return FD_fail("No project is open in Premiere Pro");
        var path = String(payload.path || "").replace(/\\/g, "/"), mode = payload.mode || "project";
        if (!path) return FD_fail("No file path provided");
        if (mode !== "project" && mode !== "timeline" && mode !== "preset") return FD_fail("Unknown import mode: " + mode);
        var file = new File(path); if (!file.exists) return FD_fail("File does not exist: " + path);
        var ext = path.split(".").pop().toLowerCase(), sequence = app.project.activeSequence;
        if (ext === "prfpset") return FD_fail("Import .prfpset files manually from Premiere's Effects panel > Import Presets");
        if (ext === "ffx" || ext === "aep" || ext === "aepx") return FD_fail("Open this file in After Effects");
        if (mode === "preset" && ext !== "mogrt") return FD_fail("Choose a .mogrt file to insert a Premiere template");
        if ((mode === "timeline" || ext === "mogrt") && !sequence) return FD_fail("Open a sequence before inserting an asset");
        if (ext === "mogrt") {
            var videoIndex = FD_emptyTrack(sequence.videoTracks);
            if (videoIndex < 0) return FD_fail("Add an empty, unlocked video track before inserting");
            var audioIndex = FD_emptyTrack(sequence.audioTracks, true);
            if (audioIndex < 0) return FD_fail("Add an empty, unlocked audio track at the end of the sequence before inserting");
            if (typeof sequence.importMGT !== "function") return FD_fail("This Premiere version does not support MOGRT import");
            var graphic = sequence.importMGT(path, sequence.getPlayerPosition().ticks, videoIndex, Math.max(0, audioIndex));
            if (!graphic) return FD_fail("Premiere could not insert the MOGRT");
            return FD_ok({ imported: true, placed: true, note: "MOGRT inserted at playhead" });
        }
        var tracks, index, linkedAudio = -1;
        var isAudio = FD_isAudioPath(path), isImage = /\.(png|jpg|jpeg|gif|webp|svg|psd|ai|tif|tiff)$/i.test(path);
        if (mode === "timeline") {
            tracks = isAudio ? sequence.audioTracks : sequence.videoTracks;
            index = FD_emptyTrack(tracks, isAudio);
            if (index < 0) return FD_fail("Add an empty, unlocked " + (isAudio ? "audio track at the end of the sequence" : "video track") + " before inserting");
            if (!isAudio && !isImage) {
                linkedAudio = FD_emptyTrack(sequence.audioTracks, true);
                if (linkedAudio < 0) return FD_fail("Add an empty, unlocked audio track at the end of the sequence for linked audio");
                if (typeof sequence.overwriteClip !== "function") return FD_fail("This Premiere version cannot place linked media safely");
            }
        }
        var bin = app.project.getInsertionBin() || app.project.rootItem;
        if (!app.project.importFiles([file.fsName], true, bin, false)) return FD_fail("Premiere could not import this file");
        if (mode === "project") return FD_ok({ imported: true, placed: false, note: "Imported into Premiere project" });
        var item = FD_findItemByPath(app.project.rootItem, path);
        if (!item) return FD_fail("File imported, but the matching project item could not be located");
        var position = sequence.getPlayerPosition();
        // VERIFY: Sequence.overwriteClip(item, seconds, videoIndex, audioIndex), documented in the Premiere scripting guide.
        var result = linkedAudio >= 0 ? sequence.overwriteClip(item, String(position.seconds), index, linkedAudio) :
            tracks[index].overwriteClip(item, position.ticks);
        if (result === false) return FD_fail("File imported, but Premiere rejected timeline insertion");
        return FD_ok({ imported: true, placed: true, note: "Inserted at playhead on " + (FD_isAudioPath(path) ? "audio" : "video") + " track " + (index + 1) });
    } catch (e) { return FD_fail("Premiere Pro: " + e.toString()); }
}
