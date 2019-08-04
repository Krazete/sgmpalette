var colormap = new Uint8ClampedArray(1024).fill(255);
var canvasmap = new Array(256).fill().map(e => new Set());
var strength = 0.5;
var imageData = {};

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
    function focusPalette(e) {
        var data = imageData[e.target.id];
        var cid = data.data[4 * (e.offsetX + e.offsetY * data.width)];
        var swatch = document.getElementById("s" + cid);
        console.log(swatch);
        swatch.children[0].click();
        swatch.children[1].select();
    }

    function initDynamicSprite() {
        var imagename = this.id.slice(4);
        var canvas = document.createElement("canvas");
            canvas.id = imagename;
            canvas.width = this.width;
            canvas.height = this.height;
            canvas.addEventListener("click", focusPalette);
        document.body.appendChild(canvas);
        var context = canvas.getContext("2d");
            context.drawImage(this, 0, 0);
        imageData[imagename] = context.getImageData(0, 0, this.width, this.height);
        for (var i = 0; i < imageData[imagename].data.length; i += 4) {
            canvasmap[imageData[imagename].data[i]].add(canvas);
        }
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

function hexToNumber(n) { // currently unused
    return parseInt(n.slice(1), 16);
}

function hexToString(n) { // currently unused
    return "#" + n.toString(16).padStart(6, 0);
}

var interrupt = true; // figure this out

function updateCanvas(canvas) {
    var context = canvas.getContext("2d");
    var data = imageData[canvas.id];
    var newdata = context.createImageData(data.width, data.height);
    for (var i = 0; i < data.data.length; i += 4) {
        var c = data.data[i];
        var line = 255 - data.data[i + 1];
        var shade = 255 - data.data[i + 2];
        newdata.data[i] = colormap[4 * c] - shade * strength - line;
        newdata.data[i + 1] = colormap[4 * c + 1] - shade * strength - line;
        newdata.data[i + 2] = colormap[4 * c + 2] - shade * strength - line;
        newdata.data[i + 3] = Math.max(colormap[4 * c + 3], line);
    }
    context.putImageData(newdata, 0, 0);
}

function initSwatch(n) {
    var palette = document.getElementById("palette");
    var swatch = document.createElement("div");
    var color = document.createElement("input");
    var text = document.createElement("input");
    var range = document.createElement("input");

    function updateCanvases() {
        for (var canvas of canvasmap[n]) {
            updateCanvas(canvas);
        }
    }

    function updateColormap() {
        colormap[4 * n] = parseInt(text.value.slice(0, 2), 16);
        colormap[4 * n + 1] = parseInt(text.value.slice(2, 4), 16);
        colormap[4 * n + 2] = parseInt(text.value.slice(4, 6), 16);
        colormap[4 * n + 3] = text.value.length == 8 ? parseInt(text.value.slice(6), 16) : 255;
        updateCanvases();
    }

    function changeColor() {
        text.value = color.value.slice(1) + text.value.slice(6);
        updateColormap();
    }

    function changeText() {
        text.value = text.value.replace(/[^\dA-Fa-f]/g, "");
        if (text.value.length == 3 || text.value.length == 4) {
            var value = "";
            for (var s of text.value) {
                value += s + s;
            }
            text.value = value;
        }
        if (text.value.length == 6) {
            color.value = "#" + text.value;
            range.value = 255;
            color.style.opacity = "";
        }
        else if (text.value.length == 8) {
            color.value = "#" + text.value.slice(0, 6);
            range.value = parseInt(text.value.slice(6), 16);
            color.style.opacity = range.value / 255;
        }
        else {
            text.value = "000000";
            color.value = "#000000";
            range.value = 255;
            color.style.opacity = "";
        }
        updateColormap();
    }

    function changeRange() {
        text.value = color.value.slice(1);
        if (range.value < 255) {
            text.value += parseInt(range.value).toString(16).padStart(2, 0);
            color.style.opacity = range.value / 255;
        }
        else {
            color.style.opacity = "";
        }
        updateColormap();
    }

    swatch.className = "swatch";
    swatch.id = "s" + n;

    color.type = "color";
    color.addEventListener("change", changeColor);
    swatch.appendChild(color);

    text.type = "text";
    text.value = "000000";
    text.addEventListener("change", changeText);
    swatch.appendChild(text);

    range.type = "range";
    range.min = 0;
    range.max = 255;
    range.step = 1;
    range.value = 255;
    range.addEventListener("change", changeRange);
    swatch.appendChild(range);

    palette.appendChild(swatch);
}

function initPalette() {
    for (var i = 0; i < 256; i++) {
        var hex = Math.floor(Math.random() * 0x1000000);
        var hexString = hexToString(hex);
        colormap[i] = hex;
        initSwatch(i);
    }
}

function init() {
    window.removeEventListener("DOMContentLoaded", init);
    initButtons();
    initSpritesheet();
    initPalette();
}

window.addEventListener("DOMContentLoaded", init);
