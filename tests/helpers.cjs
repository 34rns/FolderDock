const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..', 'extension');
function read(file) { return fs.readFileSync(path.join(root, file), 'utf8'); }
function panel(files, extras = {}) {
    const context = vm.createContext({ console, Promise, setTimeout, clearTimeout, ...extras });
    context.window = context;
    for (const file of files) vm.runInContext(read(file), context, { filename: file });
    return context;
}
function include(file) {
    return read(file).replace(/^#include "([^"]+)"/gm, (_, name) => include(path.posix.join(path.posix.dirname(file), name)));
}
module.exports = { read, panel, include, root };
