var colormap = [];
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
        var i = 4 * (e.offsetX + e.offsetY * data.width);
        console.log(i);
        var cid = data.data[i];
        var swatch = document.getElementById("swatch-" + cid);
        swatch.click();
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

function hexToNumber(n) {
    return parseInt(n.slice(1), 16);
}

function hexToString(n) {
    return "#" + n.toString(16).padStart(6, 0);
}

var interrupt = true; // figure this out

function initPalette() {
    var palette = document.getElementById("palette");

    function updateCanvas(canvas) {
        var context = canvas.getContext("2d");
        var data = imageData[canvas.id];
        var newdata = context.createImageData(data.width, data.height);
        for (var i = 0; i < data.data.length; i += 4) {
            var color = data.data[i];
            var line = 255 - data.data[i + 1];
            var shade = 255 - data.data[i + 2];
            var rgb = colormap[color];
            var b = rgb % 0x100;
            var g = ((rgb - b) / 0x100) % 0x100;
            var r = ((rgb - b - 0x100 * g) / 0x10000) % 0x100;
            var strength = 0.5;
            var alpha = 255 * (color > 0) + line;
            newdata.data[i] = r - shade * strength - line;
            newdata.data[i + 1] = g - shade * strength - line;
            newdata.data[i + 2] = b - shade * strength - line;
            newdata.data[i + 3] = alpha;
        }
        context.putImageData(newdata, 0, 0);
    }

    function setSwatch() {
        var n = parseInt(this.id.slice(7));
        colormap[n] = hexToNumber(this.value);
        this.dataset.value = this.value;
        var canvases = document.getElementsByTagName("canvas");
        for (var canvas of canvases) {
            var data = imageData[canvas.id].data;
            for (var i = 0; i < data.length; i += 4) {
                if (data[i] == n) {
                    updateCanvas(canvas);
                    break;
                }
            }
        }
    }

    for (var i = 0; i < 256; i++) {
        var randhex = "#" + Math.floor(Math.random() * 0x1000000).toString(16);
        colormap[i] = hexToNumber(randhex);
        var swatch = document.createElement("input");
            swatch.type = "color";
            swatch.id = "swatch-" + i;
            swatch.value = randhex;
            swatch.dataset.value = randhex;
            swatch.addEventListener("input", setSwatch);
        palette.appendChild(swatch);
    }
}

function init() {
    window.removeEventListener("DOMContentLoaded", init);
    initButtons();
    initSpritesheet();
    initPalette();
}

window.addEventListener("DOMContentLoaded", init);
