var knownspectral = {
    "beowulf": [236],
    "big band": [219],
    "cerebella": [183],
    "eliza": [237],
    "fukua": [133, 139],
    "parasoul": [207],
    "robofortune": [210, 215, 223, 228],
    "squigly": [206]
};

var activechar;
var strength = 0.5;
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

/* set of character names */
var alreadyloaded = new Set();

/* set of canvas ids */
var flaggedids = new Set();
var pickerflagged = true;
var picker, focal;

function flagActiveCharacter() {
    for (var id of ids[activechar]) {
        flaggedids.add(id);
    }
}

function flagPicker() {
    pickerflagged = true;
}

function updateFlags() {
    for (var id of flaggedids) {
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
                swatches[i].radio.classList.remove("hidden");
            }
            else {
                swatches[i].radio.classList.add("hidden");
            }
        }
    }
    flaggedids.clear();

    if (pickerflagged) {
        if (typeof focal != "undefined") {
            picker.setColors([swatches[focal].text.value]);
            picker.base.style.opacity = 1;
        }
        else {
            picker.base.style.opacity = 0.5;
        }
    }
    pickerflagged = false;

    requestAnimationFrame(updateFlags);
}

/* todo: name this section */

function initBasic() {
    var left = document.getElementById("left");
    var selection = document.getElementById("selection");
    var background = document.getElementById("background");

    function toggleBackground() {
        left.className = this.checked ? "section" : "section solid";
    }

    function toggleCharacter() {
        if (activechar) {
            flagActiveCharacter();
        }
        activechar = this.id;
        for (var i = 0; i < 256; i++) {
            var spectral = document.getElementById("b" + i);
            if (knownspectral[activechar] && knownspectral[activechar].includes(i)) {
                spectral.checked = true;
                spectralmap[i] = 1;
            }
            else {
                spectral.checked = false;
                spectralmap[i] = 0;
            }
        }
        if (!alreadyloaded.has(activechar)) {
            alreadyloaded.add(activechar);
            initSpriteSet();
        }
        flagActiveCharacter();
        if (focal) {
            swatches[focal].radio.checked = false;
            focal = undefined;
        }
    }

    function toggleLayer() {
        layer[this.id] = this.checked;
        flagActiveCharacter();
    }

    background.addEventListener("click", toggleBackground);

    for (var character in ids) {
        var input = document.createElement("input");
        var label = document.createElement("label");
        var img = new Image();

        input.type = "radio";
        input.name = "character";
        input.className = "option";
        input.id = character;
        input.addEventListener("click", toggleCharacter);
        selection.appendChild(input);

        label.setAttribute("for", character);
        selection.appendChild(label);

        img.src = "icon/character_symbol_" + character + "01.png";
        label.appendChild(img);
    }

    for (var i in layer) {
        document.getElementById(i).addEventListener("click", toggleLayer);
    }
}

function initSpriteSet() {
    for (var id of ids[activechar]) {
        var img = new Image();
            img.src = "sprite/" + id + ".png";
            img.dataset.character = activechar;
            img.dataset.id = id;
            img.addEventListener("load", initSprite);
    }
}

function initSprite() {
    var sheet = document.getElementById("sheet");
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
    flaggedids.add(id);
}

function initSpriteSheet() {
    var sheet = document.getElementById("sheet");

    function onSheetClick(e) {
        if (e.target.tagName == "CANVAS") {
            var data = datamap[e.target.id];
            var j = data.data[4 * (data.width * e.offsetY + e.offsetX)];
            focal = j;
            swatches[j].radio.checked = true;
            swatches[j].text.select();
            flagPicker();
        }
    }

    sheet.addEventListener("click", onSheetClick);

    updateFlags();
}

function union(a, b) {
    for (var i of b) {
        a.add(i);
    }
}

function hexToString(hex, pad) {
    return hex.toString(16).padStart(pad, 0);
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
        flagActiveCharacter();
    }

    blendmode.addEventListener("click", onBlendChange);
}

var picker, focal;

function initPicker() {
    picker = new iro.ColorPicker("#iro", {
        "width": 192,
        "height": 10,
        "borderWidth": 1,
        "layoutDirection": "horizontal",
        "layout": [
            {
                "component": iro.ui.Slider,
                "options": {
                    "sliderType": "hue"
                }
            },
            {
                "component": iro.ui.Box,
            },
            {
                "component": iro.ui.Slider,
                "options": {
                    "sliderType": "alpha"
                }
            }
        ]
    });

    function onIRO() {
        if (focal) {
            swatches[focal].color.value = this.color.hexString;
            swatches[focal].color.style.opacity = this.color.alpha;
            swatches[focal].text.value = this.color.hex8String.slice(7) == "ff" ? this.color.hexString : this.color.hex8String;
            swatches[focal].update();
        }
    }

    picker.on("color:change", onIRO);
}

var pickerflagged = false;

function initSwatch(n, r, g, b, a) {
    var swatch = document.createElement("input");
    var swatchlabel = document.createElement("label");
    var color = document.createElement("input");
    var text = document.createElement("input");
    var spectral = document.createElement("input");
    var spectrallabel = document.createElement("label");

    function updateColormap() {
        colormap[4 * n] = parseInt(text.value.slice(1, 3), 16);
        colormap[4 * n + 1] = parseInt(text.value.slice(3, 5), 16);
        colormap[4 * n + 2] = parseInt(text.value.slice(5, 7), 16);
        colormap[4 * n + 3] = text.value.slice(7, 9) == "" ? 0xff : parseInt(text.value.slice(7, 9), 16);
        union(flaggedids, idmap[n]);
    }

    function checkSwatch() {
        swatch.checked = true;
        focal = n;
        flagPicker();
    }

    function onColorChange() {
        text.value = this.value.slice(0, 7) + text.value.slice(7);
        flagPicker();
        updateColormap();
    }

    function onTextFocus() {
        this.select();
        var paletterect = palette.getBoundingClientRect();
        var labelrect = swatchlabel.getBoundingClientRect();
        if (labelrect.top < paletterect.top || labelrect.bottom > paletterect.bottom) {
            swatchlabel.scrollIntoView({"behavior": "smooth"});
        }
    }

    function onTextChange() {
        var hex = this.value.replace(/[^\dA-Fa-f]/g, "").toLowerCase();
        if (hex.length == 3 || hex.length == 4) {
            hex = hex.replace(/(.)/g, "$1$1");
        }
        if (hex.length == 6 || hex.length == 8) {
            if (hex.slice(6) == "ff") {
                hex = hex.slice(0, 6);
            }
            color.value = "#" + hex.slice(0, 6);
            this.value = "#" + hex;
        }
        else {
            color.value = "#000000";
            this.value = "#000000";
        }
        var a = parseInt(hex.slice(6), 16);
        color.style.opacity = a / 0xff;
        this.style.borderColor = color.value; // todo: put this everywhere
        flagPicker();
        updateColormap();
    }

    function updateSpectral() {
        spectralmap[n] = this.checked ? 1 : 0;
        union(flaggedids, idmap[n]);
    }

    var rgb = hexToString(0x10000 * r + 0x100 * g + b, 6);

    swatch.type = "radio";
    swatch.name = "swatch";
    swatch.id = "s" + n;
    swatch.className = "hidden";
    palette.appendChild(swatch);

    swatchlabel.dataset.n = n;
    swatchlabel.setAttribute("for", swatch.id);
    swatchlabel.addEventListener("click", checkSwatch);

    color.type = "color";
    color.value = "#" + rgb;
    color.style.opacity = a / 0xff;
    color.addEventListener("input", onColorChange);
    swatchlabel.appendChild(color);

    text.type = "text";
    text.value = "#" + rgb + (a < 0xff ? hexToString(a, 2) : ""); // todo: is hex2string used elsewhere?
    text.addEventListener("focus", onTextFocus);
    text.addEventListener("change", onTextChange);
    swatchlabel.appendChild(text);

    spectral.type = "checkbox";
    spectral.id = "b" + n;
    spectral.addEventListener("click", updateSpectral);
    swatchlabel.appendChild(spectral);

    spectrallabel.setAttribute("for", spectral.id);
    swatchlabel.appendChild(spectrallabel);

    palette.appendChild(swatchlabel);

    swatches[n] = {
        "radio": swatch,
        "color": color,
        "text": text,
        "spectral": spectral, // todo: use this
        "update": updateColormap
    }
    colormap[4 * n] = r;
    colormap[4 * n + 1] = g;
    colormap[4 * n + 2] = b;
    colormap[4 * n + 3] = a;
    spectralmap[n] = 0;
}

function initSwatches() {
    var palette = document.getElementById("palette");

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
            swatches[i].color.value = "#" + r + g + b;
            swatches[i].text.value = r + g + b + (alpha < 0xff ? a : "");
        }
        flagActiveCharacter();
        flagPicker();
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
    initBlend();
    initPicker(); // todo
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
    var date = new Date();
    var month = date.getMonth() + 1;
    var day = date.getDate();
    var buffchance = month == 4 && (day == 1 || day == 11); // april fools or bella's bday
    if (Math.random() < (buffchance ? 0.5 : 0.02)) {
        ids.scribble = ["cat"];
    }
    initBasic();
    initSpriteSheet();
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
