var knownspectral = [207, 215, 236, 237];
/* 206 applies to squigly but not valentine or big band */
/* 210 applies to robofortune but not big band */
/* 223 applies to robofortune but not parasoul */

var activechar;
var strength = 0.5;
var autopicker = true;
var layer = {
    "line": true,
    "detail": true
};
var blend = {
    "none": function (a, b, line) {
        return a - line;
    },
    "matte": function (a, b, line) {
        return a - b - line;
    },
    "shiny": function (a, b, line) {
        return Math.min(0x80 * Math.log(a / b), 0xff) - line;
    }
};
var mode = "matte";

/* key is color id */
var colormap = new Uint8ClampedArray(1024);
var spectralmap = new Uint8ClampedArray(256);
var idmap = new Array(256).fill().map(function () {
    return new Set();
});
var swatches = new Array(256);

/* key is image name */
var charactercolors = {};
var datamap = {};

/* set of canvas ids */
var outdatedids = new Set();

function flagAllIds() {
    for (var character in ids) {
        for (var id of ids[character]) {
            outdatedids.add(id);
        }
    }
}

function initBasic() {
    var left = document.getElementById("left");
    var selection = document.getElementById("selection");
    var background = document.getElementById("background");

    function toggleBackground() {
        left.className = this.checked ? "section" : "section solid";
    }

    function toggleCharacter() {
        activechar = this.id;
        initSpritesheet();
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
        input.className = "option";
        input.id = character;
        input.addEventListener("input", toggleCharacter);
        selection.appendChild(input);

        label.setAttribute("for", character);
        selection.appendChild(label);

        img.src = "icon/character_symbol_" + character + "01.png";
        label.appendChild(img);
    }

    for (var i in layer) {
        document.getElementById(i).addEventListener("input", toggleLayer);
    }
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
                var detail = 0xff - rawdata.data[i + 2];
                var moo = layer.detail ? mode : "none";
                if (spectralmap[cid] == 0) {
                    newdata.data[i] = blend[moo](colormap[j], detail * strength, line);
                    newdata.data[i + 1] = blend[moo](colormap[j + 1], detail * strength, line);
                    newdata.data[i + 2] = blend[moo](colormap[j + 2], detail * strength, line);
                    newdata.data[i + 3] = Math.max(colormap[j + 3], line);
                }
                else {
                    newdata.data[i] = blend[moo](colormap[j], detail, line);
                    newdata.data[i + 1] = blend[moo](colormap[j + 1], detail, line);
                    newdata.data[i + 2] = blend[moo](colormap[j + 2], detail, line);
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
            swatches[j].children[3].children[0].select();
            if (autopicker) {
                swatches[j].children[2].click();
            }
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

    for (var id of ids[activechar]) {
        var img = new Image();
            img.src = "sprite/" + id + ".png";
            img.dataset.character = activechar;
            img.dataset.id = id;
            img.addEventListener("load", initSprite);
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
    var palette = document.getElementById("palette");
    var swatch = document.createElement("div");
    var spectral = document.createElement("input");
    var spectrallabel = document.createElement("label");
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

    function updateSpectral() {
        spectralmap[n] = spectral.checked ? 1 : 0;
        union(outdatedids, idmap[n]);
    }

    colormap[4 * n] = r;
    colormap[4 * n + 1] = g;
    colormap[4 * n + 2] = b;
    colormap[4 * n + 3] = a;
    spectralmap[n] = 0;

    var rgb = hexToString(0x10000 * r + 0x100 * g + b, 6);

    swatch.className = "swatch hidden";

    spectral.type = "checkbox";
    spectral.id = "b" + n;
    if (knownspectral.includes(n)) {
        spectral.checked = true;
        spectralmap[n] = 1;
    }
    spectral.addEventListener("input", updateSpectral);
    swatch.appendChild(spectral);

    spectrallabel.setAttribute("for", spectral.id);
    swatch.appendChild(spectrallabel);

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

function initPicker() {
    var picker = document.getElementById("picker");

    function onPickerChange() {
        autopicker = this.checked;
    }

    picker.addEventListener("change", onPickerChange);
}

function initBlend() {
    var blendmode = document.getElementById("blendmode");

    function onBlendChange() {
        for (var child of blendmode.children) {
            if (child.tagName == "INPUT") {
                if (child.checked) {
                    mode = child.id;
                    break;
                }
            }
        }
        flagAllIds();
    }

    blendmode.addEventListener("click", onBlendChange);
}

function initSwatches() {
    function rhex() {
        return Math.floor(Math.random() * 0x100);
    }

    initSwatch(0, 0, 0, 0, 0);
    for (var i = 1; i < 256; i++) {
        initSwatch(i, rhex(), rhex(), rhex(), 0xff);
    }
}

function initLoader() {
    var load = document.getElementById("load");
    var save = document.getElementById("save");
    var canvas = document.createElement("canvas");
    var context = canvas.getContext("2d");
    var image = document.createElement("img");

    function saveBlob(blob) {
        saveAs(blob, "palette-" + activechar + "-" + mode + ".png");
    }

    function applyPalette() {
        context.clearRect(0, 0, 16, 16);
        context.drawImage(this, 0, 0, 16, 16);
        colormap = context.getImageData(0, 0, 16, 16).data;
        for (var i = 0; i < 256; i++) {
            var r = hexToString(colormap[4 * i], 2);
            var g = hexToString(colormap[4 * i + 1], 2);
            var b = hexToString(colormap[4 * i + 2], 2);
            var alpha = colormap[4 * i + 3];
            var a = hexToString(alpha, 2);
            swatches[i].children[2].value = "#" + r + g + b;
            swatches[i].children[3].children[0].value = r + g + b + (alpha < 0xff ? a : "");
            swatches[i].children[4].value = alpha;
        }
        flagAllIds();
    }

    function loadPaletteImage() {
        var image = new Image();
        image.addEventListener("load", applyPalette);
        image.src = this.result;
    }

    function loadPalette() {
        var file = this.files[0];
        if (file) {
            var reader = new FileReader();
            reader.addEventListener("load", loadPaletteImage);
            reader.readAsDataURL(file);
        }
    }

    function savePalette() {
        var data = context.createImageData(16, 16);
        for (var i = 0; i < 1024; i++) {
            data.data[i] = colormap[i];
        }
        context.putImageData(data, 0, 0);
        canvas.toBlob(saveBlob);
    }

    canvas.width = 16;
    canvas.height = 16;

    load.addEventListener("change", loadPalette);
    save.addEventListener("click", savePalette);
}

function initPalette() {
    initPicker();
    initBlend();
    initSwatches();
    initLoader();
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
    initPalette();
    initDownload();
}

function holup(e) {
    e.preventDefault();
    e.returnValue = "Changes you made may not be saved.";
    return e.returnValue;
}

window.addEventListener("DOMContentLoaded", init);
window.addEventListener("beforeunload", holup);
