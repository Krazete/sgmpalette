var layer = {
    "lines": true,
    "blend": true
};

var blendmode = [
    function (color, blend, line) { // full burn
        return color - blend - line;
    },
    function (color, blend, line) { // partial burn
        return color - strength * blend - line;
    }
];

/* key is color id */
var colormap = new Uint8ClampedArray(1024);
var blendmap = new Uint8ClampedArray(256);
var textmap = new Array(256);
var idmap = new Array(256).fill().map(e => new Set());

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

    function onInputClick() {
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
        input.addEventListener("input", onInputClick);
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
            var data = datamap[canvas.id];
            var newdata = context.createImageData(data.width, data.height);

            canvas.classList.remove("hidden");
            for (var i = 0; i < data.data.length; i += 4) {
                var j = 4 * data.data[i];
                var line = layer.lines ? 255 - data.data[i + 1] : 0;
                var blend = layer.blend ? 255 - data.data[i + 2] : 0;
                // var mode = blendmap[data.data[i]];
                // newdata.data[i] = blendmode[mode](colormap[j], blend, line);
                // newdata.data[i + 1] = blendmode[mode](colormap[j + 1], blend, line);
                // newdata.data[i + 2] = blendmode[mode](colormap[j + 2], blend, line);
                // newdata.data[i + 3] = blendmode[mode](colormap[j + 3], blend, line);
                if (blendmap[data.data[i]] == 0) {
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
            textmap[j].focus();
        }
    }

    function initSprite() {
        var id = this.dataset.name;
        var canvas = document.createElement("canvas");
        var context = canvas.getContext("2d");

        canvas.className = this.dataset.character + " hidden";
        canvas.id = id;
        canvas.width = this.width;
        canvas.height = this.height;
        context.drawImage(this, 0, 0);
        sheet.appendChild(canvas);

        datamap[id] = context.getImageData(0, 0, this.width, this.height);
        for (var i = 0; i < datamap[id].data.length; i += 4) {
            idmap[datamap[id].data[i]].add(id);
        }
        outdatedids.add(id);
    }

    for (var character in ids) {
        for (var id of ids[character]) {
            var img = new Image();
                img.src = "image/" + id + ".png";
                img.dataset.character = character;
                img.dataset.name = id;
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
            range.value = 255;
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
            range.value = 255;
        }
        color.style.opacity = range.value / 255;
        updateColormap();
    }

    function onRangeChange() {
        text.value = text.value.slice(0, 6) + (range.value < 255 ? hexToString(parseInt(range.value), 2) : "");
        color.style.opacity = range.value / 255;
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
    textmap[n] = text;

    var rgb = hexToString(0x10000 * r + 0x100 * g + b, 6);

    swatch.className = "swatch";

    color.type = "color";
    color.value = "#" + rgb;
    color.addEventListener("input", onColorChange);
    swatch.appendChild(color);

    text.type = "text";
    text.value = rgb + (a < 255 ? hexToString(a, 2) : "");
    text.addEventListener("focus", onTextFocus);
    text.addEventListener("change", onTextChange);
    swatch.appendChild(text);

    range.type = "range";
    range.min = 0;
    range.max = 255;
    range.step = 1;
    range.value = a;
    range.addEventListener("input", onRangeChange);
    swatch.appendChild(range);

    blend.type = "checkbox";
    blend.addEventListener("input", updateBlend);
    swatch.appendChild(blend);

    palette.appendChild(swatch);
}

function initPalette() {
    var palette = document.getElementById("palette");

    function rhex() {
        return Math.floor(Math.random() * 0x100);
    }

    initSwatch(0, 0, 0, 0, 0);
    for (var i = 1; i < 256; i++) {
        initSwatch(i, rhex(), rhex(), rhex(), 255);
    }
}

function init() {
    initButtons();
    initSpritesheet();
    initPalette();
}

window.addEventListener("DOMContentLoaded", init);
