var activechar; /* active character */
var activecid; /* active color id */
var picker; /* iro color picker element */

var strength = 0.5; /* strength of the detail layer */
var layer = {
    "line": true,
    "detail": true
}; /* active layer flags */
var blend = {
    "none": function (a, b, line) {
        return a - line;
    },
    "matte": function (a, b, line) {
        return a - b * strength - line;
    },
    "pastel": function (a, b, line) {
        return Math.atan(a / b) * 0xff * 2 / Math.PI - line;
    },
    "shiny": function (a, b, line) {
        return Math.min(0x80 * Math.log(a / (b * strength)), 0xff) - line;
    },
    "vivid": function (a, b, line) {
        var d = b - 0x33;
        return Math.min(a - (d < 0 ? d * 0x40 / 0x33 : d * 0x80 / (0xff - 0x33)), 0xff) - line;
    }
}; /* blend mode functions */
var mode = "vivid"; /* active blend mode */

var texture = {"length": 1}; /* array of texture data */
 
var colormap = new Uint8Array(1024); /* map color id to its color value */
var chowderlog = {
    "annie": {49: 1}
}; /* map color id to texture id for each character */
var spectrallog = {
    "annie": new Set([47, 48, 49]),
    "beowulf": new Set([61]),
    "bigband": new Set([53]),
    "blackdahlia": new Set([47, 62, 64]),
    "cerebella": new Set([34]),
    "eliza": new Set([66]),
    "fukua": new Set([27, 28]),
    "marie": new Set([50, 51, 54]),
    "parasoul": new Set([37]),
    "robofortune": new Set([49, 50, 52, 53]),
    "squigly": new Set([43]),
    "umbrella": new Set([35, 36, 47]),
    "valentine": new Set([38])
}; /* list color ids with spectral opacity for each character */
var idmap = new Array(256).fill().map(function () {
    return new Set();
}); /* map color id to canvas ids that use it */
var swatches = new Array(256); /* swatch objects */

var charcolors = {}; /* map char to its used color ids */
var datamap = {}; /* map canvas id to its raw image data */

var alreadyloaded = new Set(); /* chars whose sprites have already been loaded */
var flaggedids = new Set(); /* ids of outdated canvases */
var pickerflagged = true; /* true if picker is outdated */

var activecustom; /* active custom character */
var customids = { /* custom character categories and list of associated terms */
    "annie": ["sagan"],
    "beowulf": ["hurting"],
    "bigband": ["big_band"],
    "blackdahlia": ["dahlia", "bookie", "bonnie", "buttercup", "killer"],
    "cerebella": ["cassandra", "vice-versa", "vice_versa"],
    "double": ["agatha"],
    "eliza": ["sekhmet"],
    "filia": ["fukua", "samson", "shamone"],
    "marie": [],
    "msfortune": ["ms_fortune", "ms-fortune", "ms.fortune"],
    "painwheel": ["carol"],
    "parasoul": ["krieg", "egret"],
    "peacock": ["patricia", "avery", "george", "lenny"],
    "robofortune": ["robo_fortune", "robo-fortune", "robo.fortune"],
    "squigly": ["sienna"],
    "umbrella": ["hungern"],
    "valentine": [],
    "other": [] /* included for the icon; list must be empty */
}

function flagActiveCharacter() {
    for (var id of ids[activechar]) {
        flaggedids.add(id);
    }
}

function flagCustomCharacter() {
    activecustom = this.id.slice(7);
    flagActiveCharacter();
}

function flagPicker() {
    pickerflagged = true;
}

function isCheckedIfCustom(id) {
    if (activechar != "custom") {
        return true;
    }
    var spritename = id.slice(id.lastIndexOf("/") + 1);
    if (activecustom == "other") {
        for (var character in customids) {
            if (spritename.includes(character)) {
                return false;
            }
            for (var associate of customids[character]) {
                if (spritename.includes(associate)) {
                    return false;
                }
            }
        }
        return true;
    }
    if (activecustom in customids) {
        if (spritename.includes(activecustom)) {
            return true;
        }
        for (var associate of customids[activecustom]) {
            if (spritename.includes(associate)) {
                return true;
            }
        }
    }
}

function updateFlags() {
    for (var id of flaggedids) {
        var canvas = document.getElementById(id);
        if (!canvas) {
            continue;
        }
        else if (canvas.classList.contains(activechar) && isCheckedIfCustom(id)) {
            var context = canvas.getContext("2d");
            var rawdata = datamap[canvas.id];
            var newdata = context.createImageData(rawdata.width, rawdata.height);

            for (var i = 0; i < rawdata.data.length; i += 4) {
                var cid = rawdata.data[i];
                var j = 4 * cid;
                var line = layer.line ? 0xff - rawdata.data[i + 1] : 0;
                var detail = 0xff - rawdata.data[i + 2];
                var moed = layer.detail ? mode : "none";
                if (chowderlog[activechar] && chowderlog[activechar][cid]) {
                    var x = i / 4 % canvas.width;
                    var y = Math.ceil(i / 4 / canvas.width);
                    var texturemap = texture[chowderlog[activechar][cid]];
                    var k = 4 * ((x % texturemap.width) + (y % texturemap.height) * texturemap.width);
                    if (chowderlog[activechar][cid] == 6) { /* umbrella_veins */
                        newdata.data[i] = blend[moed](colormap[j] + texturemap.data[k], detail, line);
                        newdata.data[i + 1] = blend[moed](colormap[j + 1] + texturemap.data[k], detail, line);
                        newdata.data[i + 2] = blend[moed](colormap[j + 2] + texturemap.data[k], detail, line);
                    }
                    else if (chowderlog[activechar][cid] == 7) { /* bunny_fishnet */
                        newdata.data[i] = blend[moed](colormap[j] * texturemap.data[k] / 0xff, detail, line);
                        newdata.data[i + 1] = blend[moed](colormap[j + 1] * texturemap.data[k + 1] / 0xff, detail, line);
                        newdata.data[i + 2] = blend[moed](colormap[j + 2] * texturemap.data[k + 2] / 0xff, detail, line);
                    }
                    else {
                        newdata.data[i] = blend[moed](texturemap.data[k], detail, line);
                        newdata.data[i + 1] = blend[moed](texturemap.data[k + 1], detail, line);
                        newdata.data[i + 2] = blend[moed](texturemap.data[k + 2], detail, line);
                    }
                }
                else {
                    newdata.data[i] = blend[moed](colormap[j], detail, line);
                    newdata.data[i + 1] = blend[moed](colormap[j + 1], detail, line);
                    newdata.data[i + 2] = blend[moed](colormap[j + 2], detail, line);

                }
                newdata.data[i] += line * colormap[0] / 0xff;
                newdata.data[i + 1] += line * colormap[1] / 0xff;
                newdata.data[i + 2] += line * colormap[2] / 0xff;
                if (spectrallog[activechar] && spectrallog[activechar].has(cid)) {
                    newdata.data[i + 3] = Math.max(colormap[j + 3] - Math.pow(detail / 0x9b, 2) * 0xff, line);
                }
                else {
                    newdata.data[i + 3] = Math.max(colormap[j + 3], line);
                }
            }
            context.putImageData(newdata, 0, 0);
            canvas.classList.remove("hidden");
        }
        else {
            canvas.classList.add("hidden");
        }

        for (var i = 0; i < 256; i++) {
            if (!charcolors[activechar]) {
                continue;
            }
            else if (charcolors[activechar].has(i)) {
                swatches[i].radio.classList.remove("hidden");
            }
            else {
                swatches[i].radio.classList.add("hidden");
            }
        }
    }
    flaggedids.clear();

    if (pickerflagged) {
        if (typeof activecid == "undefined") {
            picker.setColors(["#804040"]);
            picker.base.classList.add("disabled");
        }
        else {
            picker.setColors([swatches[activecid].text.value]);
            picker.base.classList.remove("disabled");
        }
    }
    pickerflagged = false;

    requestAnimationFrame(updateFlags);
}

/* Left Section */

function initLeft() {
    var left = document.getElementById("left");
    var selection = document.getElementById("selection");
    var background = document.getElementById("background");
    var forum = document.getElementById("forum");
    var customselection = document.getElementById("custom-selection");
    var sheet = document.getElementById("sheet");
    var tapdownload = document.getElementById("tap-download");
    var touched = false; /* to relegate post-touchstart click events */

    function initSprite() {
        var character = this.dataset.character;
        var id = this.dataset.id;
        var canvas = document.createElement("canvas");
        var context = canvas.getContext("2d");

        canvas.className = character;
        canvas.id = id;
        canvas.width = this.width;
        canvas.height = this.height;
        context.drawImage(this, 0, 0);

        var last = true;
        for (var child of sheet.children) { /* keep canvases in alphanumeric order */
            if (id <= child.id) {
                last = false;
                break;
            }
        }
        if (last) {
            sheet.appendChild(canvas);
        }
        else {
            sheet.insertBefore(canvas, child);
        }

        datamap[id] = context.getImageData(0, 0, this.width, this.height);
        for (var i = 0; i < datamap[id].data.length; i += 4) {
            var cid = datamap[id].data[i];
            if (!charcolors[character]) {
                charcolors[character] = new Set();
            }
            charcolors[character].add(cid);
            idmap[cid].add(id);
        }
        flaggedids.add(id);
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

    function uncheckSwatch() {
        if (typeof activecid != "undefined") {
            swatches[activecid].radio.checked = false;
            activecid = undefined;
            flagPicker();
        }
    }

    function toggleCustomMenu() {
        if (activechar == "custom") {
            forum.classList.remove("hidden");
            customselection.classList.remove("hidden");
        }
        else {
            forum.classList.add("hidden");
            customselection.classList.add("hidden");
        }
    }

    function toggleCharacter() {
        if (activechar) {
            flagActiveCharacter();
        }
        activechar = this.id;
        for (var i = 0; i < 256; i++) {
            swatches[i].chowder.dataset.value = chowderlog[activechar] && chowderlog[activechar][i] ? chowderlog[activechar][i] : 0;
            swatches[i].updateChowder();
            swatches[i].spectral.checked = spectrallog[activechar] && spectrallog[activechar].has(i);
        }
        if (!alreadyloaded.has(activechar)) {
            alreadyloaded.add(activechar);
            initSpriteSet();
        }
        flagActiveCharacter();
        uncheckSwatch();
        toggleCustomMenu();
    }

    function toggleBackground() {
        left.className = this.checked ? "section" : "section solid";
    }

    function toggleLayer() {
        layer[this.id] = this.checked;
        flagActiveCharacter();
    }

    function onSheetClick(e) {
        if (e.target.tagName == "CANVAS") {
            if (e.type == "click") {
                var data = datamap[e.target.id];
                var cid = data.data[4 * (data.width * Math.round(e.offsetY) + Math.round(e.offsetX))];
                if (typeof activecid != "undefined") {
                    swatches[activecid].text.blur();
                }
                activecid = cid;
                swatches[cid].check();
                if (touched) {
                    touched = false;
                }
                else {
                    swatches[cid].text.select();
                }
                if (tapdownload.checked) {
                    var a = document.createElement("a");
                    a.href = e.target.toDataURL();
                    a.setAttribute("download", e.target.id);
                    a.click();
                }
            }
            else {
                touched = true;
            }
        }
    }

    function onSheetTouchMove() { /* cancel on zoom or scroll */
        sheet.removeEventListener("touchend", onSheetClick);
    }

    function onSheetTouchStart() {
        sheet.addEventListener("touchend", onSheetClick);
    }

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

        img.src = "icon/character_symbol_" + character + "01.png";
        label.appendChild(img);

        label.setAttribute("for", character);
        selection.appendChild(label);
    }

    background.addEventListener("click", toggleBackground);

    for (var i in layer) {
        document.getElementById(i).addEventListener("click", toggleLayer);
    }

    for (var character in customids) {
        var input = document.createElement("input");
        var label = document.createElement("label");
        var img = new Image();

        input.type = "radio";
        input.name = "custom-character";
        input.className = "option";
        input.id = "custom-" + character;
        input.addEventListener("click", flagCustomCharacter);
        customselection.appendChild(input);

        img.src = "icon/character_symbol_" + character + "01.png";
        label.appendChild(img);

        label.setAttribute("for", "custom-" + character);
        customselection.appendChild(label);
    }

    sheet.addEventListener("click", onSheetClick);
    sheet.addEventListener("touchstart", onSheetTouchStart);
    sheet.addEventListener("touchmove", onSheetTouchMove);
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

function initTextures() {
    function loadTexture(tid, src) {
        var image = new Image();
        image.addEventListener("load", function () {
            var canvas = document.createElement("canvas");
            var context = canvas.getContext("2d");
            canvas.width = this.width;
            canvas.height = this.height;
            context.drawImage(this, 0, 0);
            texture[tid] = context.getImageData(0, 0, this.width, this.height);
        });
        image.src = src;
        texture.length++;
    }

    loadTexture(1, "texture/Space.png");
    loadTexture(2, "texture/fire.png");
    loadTexture(3, "texture/water.png");
    loadTexture(4, "texture/killarainbow.png");
    loadTexture(5, "texture/yixtu_qu.png");
    loadTexture(6, "texture/umbrella_veins.png");
    loadTexture(7, "texture/bunny_fishnet.png");
}

/* Right Section */

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

function initPicker() {
    picker = new iro.ColorPicker("#iro", {
        "width": 192,
        "borderWidth": 1,
        "sliderMargin": 6,
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

    function updateSwatch() {
        if (typeof activecid != "undefined") {
            swatches[activecid].color.value = this.color.hexString;
            swatches[activecid].color.style.opacity = this.color.alpha;
            swatches[activecid].text.value = this.color.alpha < 1 ? this.color.hex8String : this.color.hexString;
            swatches[activecid].text.style.borderColor = this.color.hexString;
            swatches[activecid].update();
        }
    }

    picker.on("input:change", updateSwatch);
}

function initSwatch(n, r, g, b, a) {
    var palette = document.getElementById("palette");
    var radio = document.createElement("input");
    var label = document.createElement("label");
    var color = document.createElement("input");
    var text = document.createElement("input");
    var chowder = document.createElement("div");
    var spectral = document.createElement("input");
    var spectrallabel = document.createElement("label");
    var rgb = hexToString(0x10000 * r + 0x100 * g + b, 6);

    function getAlpha() {
        return text.value.slice(7) == "" ? 0xff : parseInt(text.value.slice(7), 16);
    }

    function updateColormap() {
        colormap[4 * n] = parseInt(text.value.slice(1, 3), 16);
        colormap[4 * n + 1] = parseInt(text.value.slice(3, 5), 16);
        colormap[4 * n + 2] = parseInt(text.value.slice(5, 7), 16);
        colormap[4 * n + 3] = getAlpha();
        union(flaggedids, idmap[n]);
    }

    function checkSwatch() {
        var paletterect = palette.getBoundingClientRect();
        var labelrect = label.getBoundingClientRect();
        if (labelrect.top < paletterect.top || labelrect.bottom > paletterect.bottom) {
            label.scrollIntoView({"behavior": "smooth"});
        }
        radio.checked = true;
        activecid = n;
        flagPicker();
    }

    function onColorChange() { /* color inputs are strictly #rrggbb */
        if (activecid == n) {
            text.value = this.value + text.value.slice(7);
            text.style.borderColor = this.value;
            updateColormap();
            flagPicker();
        }
        else { /* update native picker's focus */
            swatches[activecid].color.click();
            swatches[activecid].color.value = this.value;
            swatches[activecid].text.value = this.value + swatches[activecid].text.value.slice(7);
            swatches[activecid].text.style.borderColor = this.value;
            swatches[activecid].update();
            this.value = text.value.slice(0, 7);
        }
    }

    function onTextFocus() {
        this.select();
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
        color.style.opacity = getAlpha() / 0xff;
        this.style.borderColor = color.value;
        updateColormap();
        flagPicker();
    }

    function updateChowder() {
        if (chowderlog[activechar] && chowderlog[activechar][n] && [1, 2, 3, 4, 5].includes(chowderlog[activechar][n])) {
            color.disabled = true;
            text.disabled = true;
        }
        else {
            color.disabled = false;
            text.disabled = false;
        }
    }

    function toggleChowder() {
        if (!chowderlog[activechar]) {
            chowderlog[activechar] = {};
        }
        chowderlog[activechar][n] = chowderlog[activechar][n] ? (chowderlog[activechar][n] + 1) % texture.length : 1;
        chowder.dataset.value = chowderlog[activechar][n];
        updateChowder();
        union(flaggedids, idmap[n]);
    }

    function toggleSpectral() {
        if (!spectrallog[activechar]) {
            spectrallog[activechar] = new Set();
        }
        if (this.checked) {
            spectrallog[activechar].add(n);
        }
        else {
            spectrallog[activechar].delete(n);
        }
        union(flaggedids, idmap[n]);
    }

    colormap[4 * n] = r;
    colormap[4 * n + 1] = g;
    colormap[4 * n + 2] = b;
    colormap[4 * n + 3] = a;

    radio.type = "radio";
    radio.name = "swatch";
    radio.className = "hidden";
    radio.id = "s" + n;
    palette.appendChild(radio);

    label.dataset.n = n;
    label.setAttribute("for", radio.id);
    label.addEventListener("click", checkSwatch);

    color.type = "color";
    color.value = "#" + rgb;
    color.style.opacity = a / 0xff;
    color.addEventListener("input", onColorChange);
    label.appendChild(color);

    text.type = "text";
    text.value = "#" + rgb + (a < 0xff ? hexToString(a, 2) : "");
    text.style.borderColor = "#" + rgb;
    text.addEventListener("focus", onTextFocus);
    text.addEventListener("change", onTextChange);
    label.appendChild(text);

    chowder.className = "chowder";
    chowder.addEventListener("click", toggleChowder);
    label.appendChild(chowder);

    spectral.type = "checkbox";
    spectral.id = "b" + n;
    spectral.addEventListener("click", toggleSpectral);
    label.appendChild(spectral);

    spectrallabel.setAttribute("for", spectral.id);
    label.appendChild(spectrallabel);

    palette.appendChild(label);

    swatches[n] = {
        "radio": radio,
        "color": color,
        "text": text,
        "chowder": chowder,
        "spectral": spectral,
        "check": checkSwatch,
        "update": updateColormap,
        "updateChowder": updateChowder
    };
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
            swatches[i].color.value = "#" + r + g + b;
            swatches[i].color.style.opacity = alpha / 0xff;
            swatches[i].text.value = "#" + r + g + b + (alpha < 0xff ? a : "");
            swatches[i].text.style.borderColor = "#" + r + g + b;
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
    initPicker();
    initSwatches();
    initLoader();
}

function init() {
    var date = new Date();
    var month = date.getMonth() + 1;
    var day = date.getDate();
    var buffchance = month == 4 && (day == 1 || day == 11); // april fools or bella's bday
    if (Math.random() < (buffchance ? 0.5 : 0.02)) {
        ids.scribble = ["cat"];
    }
    initLeft();
    initDownload();
    initTextures();
    initPalette();
    updateFlags();
    window.addEventListener("load", function () { /* because bfcache */
        for (var i = 0; i < 256; i++) {
            swatches[i].update();
        }
    });
}

function holup(e) {
    e.preventDefault();
    e.returnValue = "Changes you made may not be saved.";
    return e.returnValue;
}

window.addEventListener("DOMContentLoaded", init);
window.addEventListener("beforeunload", holup);
