var palette;

var layermap = {
    "line": true,
    // "color": true,
    "blend": true
};
// var uniform = {
//     "color": false,
//     "alpha": false,
//     "layer": "shadow",
//     "mode": {
//         "color": "colorburn",
//         "alpha": "multiply"
//     },
//     "strength": 1
// };

var colormap = new Uint8ClampedArray(1024);
var blendmap = new Uint8ClampedArray(256);
// var shadowmap = new Uint8ClampedArray(1024).fill(255);
var canvasmap = new Array(256).fill().map(e => new Set());
var outdatedCanvases = new Set();

var strength = 0.5;
var datamap = {};

function initButtons() {
    var scantron = document.getElementById("scantron");

    for (var character in images) {
        var input = document.createElement("input");
            input.id = character;
            input.type = "checkbox";
        scantron.appendChild(input);
        var label = document.createElement("label");
            label.setAttribute("for", character);
            var img = new Image();
                img.src = "image/character_symbol_" + character + "01.png";
            label.appendChild(img);
        scantron.appendChild(label);
    }
}

function initSpritesheet() {
    var sheet = document.getElementById("sheet");

    function focusPalette(e) {
        var data = datamap[e.target.id];
        var cid = data.data[4 * (e.offsetX + e.offsetY * data.width)];
        var swatch = document.getElementById("s" + cid);
        console.log(swatch);
        // swatch.children[0].click();
        swatch.children[1].focus();
        swatch.children[1].select();
    }

    function initDynamicSprite() {
        var imagename = this.id.slice(4);
        var canvas = document.createElement("canvas");
            canvas.id = imagename;
            canvas.width = this.width;
            canvas.height = this.height;
            canvas.addEventListener("click", focusPalette);
        sheet.appendChild(canvas);
        var context = canvas.getContext("2d");
            context.drawImage(this, 0, 0);
        datamap[imagename] = context.getImageData(0, 0, this.width, this.height);
        for (var i = 0; i < datamap[imagename].data.length; i += 4) {
            canvasmap[datamap[imagename].data[i]].add(canvas);
        }
        outdatedCanvases.add(canvas);
    }

    for (var character in images) {
        for (var image of images[character]) {
            var img = new Image();
                img.id = "Raw_" + image;
                img.src = "image/" + image + ".png";
                img.addEventListener("load", initDynamicSprite);
        }
    }
}





function updateCanvases() {
    requestAnimationFrame(updateCanvases);
    for (var canvas of outdatedCanvases) {
        var context = canvas.getContext("2d");
        var data = datamap[canvas.id];
        var newdata = context.createImageData(data.width, data.height);
        for (var i = 0; i < data.data.length; i += 4) {
            var cid = 4 * data.data[i];
            var line = layermap.line ? 255 - data.data[i + 1] : 0;
            var blend = layermap.blend ? 255 - data.data[i + 2] : 0;
            if (blendmap[data.data[i]] == 0) {
                newdata.data[i] = burn(colormap[cid], blend * strength, line);
                newdata.data[i + 1] = burn(colormap[cid + 1], blend * strength, line);
                newdata.data[i + 2] = burn(colormap[cid + 2], blend * strength, line);
                newdata.data[i + 3] = Math.max(colormap[cid + 3], line);
            }
            else {
                newdata.data[i] = burn(colormap[cid], blend, line);
                newdata.data[i + 1] = burn(colormap[cid + 1], blend, line);
                newdata.data[i + 2] = burn(colormap[cid + 2], blend, line);
                // newdata.data[i + 3] = Math.max(colormap[cid + 3] - (blend * 0xff / 0x9b), line);
                newdata.data[i + 3] = Math.max(colormap[cid + 3] - 255 + blend, line);
            }
        }
        context.putImageData(newdata, 0, 0);
    }
    outdatedCanvases.clear();
}
updateCanvases();

function burn(a, b, line) {
    return a - b - line;
}

function union(a, b) {
    for (var i of b) {
        a.add(i);
    }
}

function initSwatch(n, r, g, b, a) {
    var swatch = document.createElement("div");
    var color = document.createElement("input");
    var text = document.createElement("input");
    var range = document.createElement("input");
    var blend = document.createElement("input");

    function hexToString(hex, pad) {
        return hex.toString(16).padStart(pad, 0);
    }

    function updateColormap() {
        colormap[4 * n] = parseInt(text.value.slice(0, 2), 16);
        colormap[4 * n + 1] = parseInt(text.value.slice(2, 4), 16);
        colormap[4 * n + 2] = parseInt(text.value.slice(4, 6), 16);
        colormap[4 * n + 3] = range.value;
        union(outdatedCanvases, canvasmap[n]);
    }

    function inputColor() {
        text.value = color.value.slice(1) + text.value.slice(6);
        updateColormap();
    }

    function inputText() {
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

    function inputRange() {
        text.value = text.value.slice(0, 6) + (range.value < 255 ? hexToString(parseInt(range.value), 2) : "");
        color.style.opacity = range.value / 255;
        updateColormap();
    }

    function updateBlend() {
        blendmap[n] = blend.checked ? 1 : 0;
        union(outdatedCanvases, canvasmap[n]);
    }

    colormap[4 * n] = r;
    colormap[4 * n + 1] = g;
    colormap[4 * n + 2] = b;
    colormap[4 * n + 3] = a;
    blendmap[n] = 0;

    var rgb = hexToString(0x10000 * r + 0x100 * g + b, 6);

    swatch.className = "swatch";
    swatch.id = "s" + n;

    color.type = "color";
    color.value = "#" + rgb;
    color.addEventListener("input", inputColor);
    swatch.appendChild(color);

    text.type = "text";
    text.value = rgb + (a < 255 ? hexToString(a, 2) : "");
    text.addEventListener("input", inputText);
    swatch.appendChild(text);

    range.type = "range";
    range.min = 0;
    range.max = 255;
    range.step = 1;
    range.value = a;
    range.addEventListener("input", inputRange);
    swatch.appendChild(range);

    blend.type = "checkbox";
    blend.addEventListener("input", updateBlend);
    swatch.appendChild(blend);

    palette.appendChild(swatch);
}

function initPalette() {
    function rhex() {
        return Math.floor(Math.random() * 0x100);
    }

    initSwatch(0, 0, 0, 0, 0);
    for (var i = 1; i < 256; i++) {
        initSwatch(i, rhex(), rhex(), rhex(), 255);
    }
}

function init() {
    window.removeEventListener("DOMContentLoaded", init);

    palette = document.getElementById("palette");

    initButtons();
    initSpritesheet();
    initPalette();
}

window.addEventListener("DOMContentLoaded", init);
