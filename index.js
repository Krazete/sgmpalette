// var knownlight = [206, 207, 210, 223, 228, 236, 237];

var layer = {
    "lines": true,
    "blend": true
};

/* key is color id */
var colormap = new Uint8ClampedArray(1024);
var blendmap = new Uint8ClampedArray(256);
var idmap = new Array(256).fill().map(e => new Set());

var swatches = new Array(256);
var charactercolors = {};

/* key is image name */
var datamap = {};

/* set of canvas ids */
var visibleids = new Set();
var outdatedids = new Set();

var strength = 0.5;
var activechar;

function initButtons() {
    var scantron = document.getElementById("scantron");

    function flagAllIds() {
        for (var character in ids) {
            for (var id of ids[character]) {
                outdatedids.add(id);
            }
        }
    }

    function toggleLayer() {
        layer[this.id] = this.checked;
        flagAllIds();
    }

    function toggleCharacter() {
        activechar = this.id;
        flagAllIds();
    }

    for (var i in layer) {
        document.getElementById(i).addEventListener("input", toggleLayer);
    }

    for (var character in ids) {
        var input = document.createElement("input");
        var label = document.createElement("label");
        var img = new Image();

        input.type = "radio";
        input.name = "character";
        input.id = character;
        input.addEventListener("input", toggleCharacter);
        scantron.appendChild(input);

        label.setAttribute("for", character);
        scantron.appendChild(label);

        img.src = "image/character_symbol_" + character + "01.png";
        label.appendChild(img);
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
                var line = layer.lines ? 0xff - rawdata.data[i + 1] : 0;
                var blend = layer.blend ? 0xff - rawdata.data[i + 2] : 0;
                if (blendmap[cid] == 0) {
                    newdata.data[i] = burn(colormap[j], blend * strength, line);
                    newdata.data[i + 1] = burn(colormap[j + 1], blend * strength, line);
                    newdata.data[i + 2] = burn(colormap[j + 2], blend * strength, line);
                    newdata.data[i + 3] = Math.max(colormap[j + 3], line);
                }
                else {
                    newdata.data[i] = burn(colormap[j], blend, line);
                    newdata.data[i + 1] = burn(colormap[j + 1], blend, line);
                    newdata.data[i + 2] = burn(colormap[j + 2], blend, line);
                    newdata.data[i + 3] = Math.max(colormap[j + 3] - blend * 0xff / (0xff - 0x64), line);
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
            swatches[j].children[1].focus();
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
    var color = document.createElement("input");
    var text = document.createElement("input");
    var range = document.createElement("input");
    var blend = document.createElement("input");

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

    color.type = "color";
    color.value = "#" + rgb;
    color.style.opacity = a / 0xff;
    color.addEventListener("input", onColorChange);
    swatch.appendChild(color);

    text.type = "text";
    text.value = rgb + (a < 0xff ? hexToString(a, 2) : "");
    text.addEventListener("focus", onTextFocus);
    text.addEventListener("change", onTextChange);
    swatch.appendChild(text);

    range.type = "range";
    range.min = 0x00;
    range.max = 0xff;
    range.step = 1;
    range.value = a;
    range.addEventListener("input", onRangeChange);
    swatch.appendChild(range);

    blend.type = "checkbox";
    blend.addEventListener("input", updateBlend);
    swatch.appendChild(blend);

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

function init() {
    initButtons();
    initSpritesheet();
    initPalette();
}

window.addEventListener("DOMContentLoaded", init);
