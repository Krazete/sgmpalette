// var knownlights = [206, 207, 210, 223, 228, 236, 237];

var activechar;
var strength = 0.5;
var layer = {
    "line": true,
    "detail": true
};

/* key is color id */
var colormap = new Uint8ClampedArray(1024);
var blendmap = new Uint8ClampedArray(256);
var idmap = new Array(256).fill().map(e => new Set());
var swatches = new Array(256);

/* key is image name */
var charactercolors = {};
var datamap = {};

/* set of canvas ids */
var outdatedids = new Set();

function initBasic() {
    var left = document.getElementById("left");
    var selection = document.getElementById("selection");
    var background = document.getElementById("background");

    function flagAllIds() {
        for (var character in ids) {
            for (var id of ids[character]) {
                outdatedids.add(id);
            }
        }
    }

    function toggleBackground() {
        left.className = this.checked ? "section" : "section solid";
    }

    function toggleCharacter() {
        activechar = this.id;
        flagAllIds();
    }

    function toggleLayer() {
        layer[this.id] = this.checked;
        flagAllIds();
    }

    background.addEventListener("input", toggleBackground);

    for (var character in ids) {
        var input = document.createElement("input");
        var label = document.createElement("label");
        var img = new Image();

        input.type = "radio";
        input.name = "character";
        input.id = character;
        input.addEventListener("input", toggleCharacter);
        selection.appendChild(input);

        label.setAttribute("for", character);
        selection.appendChild(label);

        img.src = "image/character_symbol_" + character + "01.png";
        label.appendChild(img);
    }

    for (var i in layer) {
        document.getElementById(i).addEventListener("input", toggleLayer);
    }
}


function burn(a, b, line) {
    return a - b - line;
}

function updateCanvases() {
    for (var id of outdatedids) {
        var canvas = document.getElementById(id);
        if (!canvas) {
            continue;
        }
        else if (canvas.classList.contains(activechar)) {
            var context = canvas.getContext("2d");
            var rawdata = datamap[canvas.id];
            var newdata = context.createImageData(rawdata.width, rawdata.height);

            canvas.classList.remove("hidden");
            for (var i = 0; i < rawdata.data.length; i += 4) {
                var cid = rawdata.data[i];
                var j = 4 * cid;
                var line = layer.line ? 0xff - rawdata.data[i + 1] : 0;
                var detail = layer.detail ? 0xff - rawdata.data[i + 2] : 0;
                if (blendmap[cid] == 0) {
                    newdata.data[i] = burn(colormap[j], detail * strength, line);
                    newdata.data[i + 1] = burn(colormap[j + 1], detail * strength, line);
                    newdata.data[i + 2] = burn(colormap[j + 2], detail * strength, line);
                    newdata.data[i + 3] = Math.max(colormap[j + 3], line);
                }
                else {
                    newdata.data[i] = burn(colormap[j], detail, line);
                    newdata.data[i + 1] = burn(colormap[j + 1], detail, line);
                    newdata.data[i + 2] = burn(colormap[j + 2], detail, line);
                    newdata.data[i + 3] = Math.max(colormap[j + 3] - detail * 0xff / (0xff - 0x64), line);
                }
            }
            context.putImageData(newdata, 0, 0);
        }
        else {
            canvas.classList.add("hidden");
        }

        for (var i = 0; i < 256; i++) {
            if (!charactercolors[activechar]) {
                continue;
            }
            else if (charactercolors[activechar].has(i)) {
                swatches[i].classList.remove("hidden");
            }
            else {
                swatches[i].classList.add("hidden");
            }
        }
    }
    outdatedids.clear();
    requestAnimationFrame(updateCanvases);
}

function initSpritesheet() {
    var sheet = document.getElementById("sheet");

    function onSheetClick(e) {
        if (e.target.tagName == "CANVAS") {
            var data = datamap[e.target.id];
            var j = data.data[4 * (data.width * e.offsetY + e.offsetX)];
            swatches[j].children[2].click();
            swatches[j].children[3].children[0].focus();
        }
    }

    function initSprite() {
        var character = this.dataset.character;
        var id = this.dataset.id;
        var canvas = document.createElement("canvas");
        var context = canvas.getContext("2d");

        canvas.className = character + " hidden";
        canvas.id = id;
        canvas.width = this.width;
        canvas.height = this.height;
        context.drawImage(this, 0, 0);
        sheet.appendChild(canvas);

        datamap[id] = context.getImageData(0, 0, this.width, this.height);
        for (var i = 0; i < datamap[id].data.length; i += 4) {
            var cid = datamap[id].data[i];
            if (!charactercolors[character]) {
                charactercolors[character] = new Set();
            }
            charactercolors[character].add(cid);
            idmap[cid].add(id);
        }
        outdatedids.add(id);
    }

    for (var character in ids) {
        for (var id of ids[character]) {
            var img = new Image();
                img.src = "image/" + id + ".png";
                img.dataset.character = character;
                img.dataset.id = id;
                img.addEventListener("load", initSprite);
        }
    }
    sheet.addEventListener("click", onSheetClick);

    updateCanvases();
}

function union(a, b) {
    for (var i of b) {
        a.add(i);
    }
}

function hexToString(hex, pad) {
    return hex.toString(16).padStart(pad, 0);
}

function initSwatch(n, r, g, b, a) {
    var swatch = document.createElement("div");
    var blend = document.createElement("input");
    var blendlabel = document.createElement("label");
    var color = document.createElement("input");
    var hashwrapper = document.createElement("div");
    var text = document.createElement("input");
    var range = document.createElement("input");

    function updateColormap() {
        colormap[4 * n] = parseInt(text.value.slice(0, 2), 16);
        colormap[4 * n + 1] = parseInt(text.value.slice(2, 4), 16);
        colormap[4 * n + 2] = parseInt(text.value.slice(4, 6), 16);
        colormap[4 * n + 3] = range.value;
        union(outdatedids, idmap[n]);
    }

    function onColorChange() {
        text.value = color.value.slice(1) + text.value.slice(6);
        updateColormap();
    }

    function onTextFocus() {
        text.select();
    }

    function onTextChange() {
        text.value = text.value.replace(/[^\dA-Fa-f]/g, "");
        if (text.value.length == 3 || text.value.length == 4) {
            text.value = text.value.replace(/(.)/g, "$1$1");
        }
        if (text.value.length == 6) {
            color.value = "#" + text.value;
            range.value = 0xff;
        }
        else if (text.value.length == 8) {
            color.value = "#" + text.value.slice(0, 6);
            range.value = parseInt(text.value.slice(6), 16);
            if (text.value.slice(6) == "ff") {
                text.value = text.value.slice(0, 6);
            }
        }
        else {
            color.value = "#000000";
            text.value = "000000";
            range.value = 0xff;
        }
        color.style.opacity = range.value / 0xff;
        updateColormap();
    }

    function onRangeChange() {
        text.value = text.value.slice(0, 6) + (range.value < 0xff ? hexToString(parseInt(range.value), 2) : "");
        color.style.opacity = range.value / 0xff;
        updateColormap();
    }

    function updateBlend() {
        blendmap[n] = blend.checked ? 1 : 0;
        union(outdatedids, idmap[n]);
    }

    colormap[4 * n] = r;
    colormap[4 * n + 1] = g;
    colormap[4 * n + 2] = b;
    colormap[4 * n + 3] = a;
    blendmap[n] = 0;

    var rgb = hexToString(0x10000 * r + 0x100 * g + b, 6);

    swatch.className = "swatch hidden";

    blend.type = "checkbox";
    blend.id = "b" + n;
    blend.addEventListener("input", updateBlend);
    swatch.appendChild(blend);

    blendlabel.setAttribute("for", blend.id);
    swatch.appendChild(blendlabel);

    color.type = "color";
    color.value = "#" + rgb;
    color.style.opacity = a / 0xff;
    color.addEventListener("input", onColorChange);
    swatch.appendChild(color);

    text.type = "text";
    text.value = rgb + (a < 0xff ? hexToString(a, 2) : "");
    text.addEventListener("focus", onTextFocus);
    text.addEventListener("change", onTextChange);
    hashwrapper.appendChild(text);

    hashwrapper.className = "hashwrapper";
    swatch.appendChild(hashwrapper);

    range.type = "range";
    range.min = 0x00;
    range.max = 0xff;
    range.step = 1;
    range.value = a;
    range.addEventListener("input", onRangeChange);
    swatch.appendChild(range);

    palette.appendChild(swatch);

    swatches[n] = swatch;
}

function initPalette() {
    var palette = document.getElementById("palette");

    function rhex() {
        return Math.floor(Math.random() * 0x100);
    }

    initSwatch(0, 0, 0, 0, 0);
    for (var i = 1; i < 256; i++) {
        initSwatch(i, rhex(), rhex(), rhex(), 0xff);
    }
}

function initDownload() {
    var download = document.getElementById("download");

    function completeDownload(blob) {
        saveAs(blob, activechar + (layer.line ? "" : "-noline") + (layer.detail ? "" : "-nodetail") + ".zip");
    }

    function beginDownload() {
        if (activechar) {
            var zip = new JSZip();
            for (var id of ids[activechar]) {
                var canvas = document.getElementById(id);
                if (canvas) {
                    var dataURL = canvas.toDataURL();
                    zip.file(id + ".png", dataURL.slice(22), {"base64": true});
                }
            }

            zip.generateAsync({"type": "blob"}).then(completeDownload);
        }
    }

    download.addEventListener("click", beginDownload);
}

function init() {
    initBasic();
    initSpritesheet();
    initPalette();
    initDownload();
}

window.addEventListener("DOMContentLoaded", init);
