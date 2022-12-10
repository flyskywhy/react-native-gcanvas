import ImageData from '@canvas/image-data/index';
import base64 from 'base64-js';
import FillStylePattern from './FillStylePattern';
import FillStyleLinearGradient from './FillStyleLinearGradient';
import FillStyleRadialGradient from './FillStyleRadialGradient';

export default class CanvasRenderingContext2D {
  _drawCommands = '';

  _globalAlpha = 1.0;

  _fillStyle = 'rgb(0,0,0)';
  _strokeStyle = 'rgb(0,0,0)';

  _shadowColor = 'rgb(0,0,0)';
  _shadowBlur = 0;
  _shadowOffsetX = 0;
  _shadowOffsetY = 0;
  _imageSmoothingEnabled = 1;
  _lineWidth = 1;
  _lineCap = 'butt';
  _lineJoin = 'miter';
  _lineDash = [];
  _lineDashOffset = 0;

  _miterLimit = 10;

  _globalCompositeOperation = 'source-over';

  _textAlign = 'start';
  _textBaseline = 'alphabetic';

  _font = '10px sans-serif';

  _savedGlobalAlpha = [];

  timer = null;
  componentId = null;

  // _imageMap = new GHashMap();
  // _textureMap = new GHashMap();

  constructor(canvas) {
    this._canvas = canvas;
    this.className = 'CanvasRenderingContext2D';
  }

  get canvas() {
    return this._canvas;
  }

  set fillStyle(value) {
    this._fillStyle = value;

    if (typeof value == 'string') {
      this._drawCommands = this._drawCommands.concat('F' + value + ';');
    } else if (value instanceof FillStylePattern) {
      const image = value._img;
      CanvasRenderingContext2D.GBridge.bindImageTexture(this.componentId, image.src, image._id);
      this._drawCommands = this._drawCommands.concat('G' + image._id + ',' + value._style + ';');
      this.flushJsCommands2CallNative('sync', 'execWithoutDisplay');
    } else if (value instanceof FillStyleLinearGradient) {
      var command = 'D' + value._start_pos._x.toFixed(2) + ',' + value._start_pos._y.toFixed(2) + ','
              + value._end_pos._x.toFixed(2) + ',' + value._end_pos._y.toFixed(2) + ','
              + value._stop_count;
      for (var i = 0; i < value._stop_count; ++i) {
        command += ',' + value._stops[i]._pos + ',' + value._stops[i]._color;
      }
      this._drawCommands = this._drawCommands.concat(command + ';');
    } else if (value instanceof FillStyleRadialGradient) {
      var command = 'H' + value._start_pos._x.toFixed(2) + ',' + value._start_pos._y.toFixed(2) + ',' + value._start_pos._r.toFixed(2) + ','
              + value._end_pos._x.toFixed(2) + ',' + value._end_pos._y.toFixed(2) + ',' + value._end_pos._r.toFixed(2) + ','
              + value._stop_count;
      for (var i = 0; i < value._stop_count; ++i) {
        command += ',' + value._stops[i]._pos + ',' + value._stops[i]._color;
      }
      this._drawCommands = this._drawCommands.concat(command + ';');
    }
  }

  get fillStyle() {
    return this._fillStyle;
  }

  get globalAlpha() {
    return this._globalAlpha;
  }

  set globalAlpha(value) {
    this._globalAlpha = value;
    this._drawCommands = this._drawCommands.concat('a' + value.toFixed(2) + ';');
  }


  get strokeStyle() {
    return this._strokeStyle;
  }

  set strokeStyle(value) {
    this._strokeStyle = value;

    if (typeof value == 'string') {
      this._drawCommands = this._drawCommands.concat('S' + value + ';');
    } else if (value instanceof FillStylePattern) {
      const image = value._img;
      CanvasRenderingContext2D.GBridge.bindImageTexture(this.componentId, image.src, image._id);
      this._drawCommands = this._drawCommands.concat('G' + image._id + ',' + value._style + ';');
      this.flushJsCommands2CallNative('sync', 'execWithoutDisplay');
    } else if (value instanceof FillStyleLinearGradient) {
      var command = 'D' + value._start_pos._x.toFixed(2) + ',' + value._start_pos._y.toFixed(2) + ','
              + value._end_pos._x.toFixed(2) + ',' + value._end_pos._y.toFixed(2) + ','
              + value._stop_count;

      for (var i = 0; i < value._stop_count; ++i) {
        command += ',' + value._stops[i]._pos + ',' + value._stops[i]._color;
      }
      this._drawCommands = this._drawCommands.concat(command + ';');
    } else if (value instanceof FillStyleRadialGradient) {
      var command = 'H' + value._start_pos._x.toFixed(2) + ',' + value._start_pos._y.toFixed(2) + ',' + value._start_pos._r.toFixed(2) + ','
              + value._end_pos._x.toFixed(2) + ',' + value._end_pos._y + ','.toFixed(2) + value._end_pos._r.toFixed(2) + ','
              + value._stop_count;

      for (var i = 0; i < value._stop_count; ++i) {
        command += ',' + value._stops[i]._pos + ',' + value._stops[i]._color;
      }
      this._drawCommands = this._drawCommands.concat(command + ';');
    }
  }

  get shadowColor() {
    return this._shadowColor;
  }

  set shadowColor(value) {
    this._shadowColor = value;
    this._drawCommands = this._drawCommands.concat('K' + value + ';');
  }

  get shadowBlur() {
    return this._shadowBlur;
  }

  set shadowBlur(value) {
    this._shadowBlur = value;
    this._drawCommands = this._drawCommands.concat('Z' + value + ';');
  }

  get shadowOffsetX() {
    return this._shadowOffsetX;
  }

  set shadowOffsetX(value) {
    this._shadowOffsetX = value;
    this._drawCommands = this._drawCommands.concat('X' + value + ';');
  }

  get shadowOffsetY() {
    return this._shadowOffsetY;
  }

  set shadowOffsetY(value) {
    this._shadowOffsetY = value;
    this._drawCommands = this._drawCommands.concat('Y' + value + ';');
  }

  get imageSmoothingEnabled() {
    return this._imageSmoothingEnabled;
  }

  set imageSmoothingEnabled(value) {
    // 'if' can be here because needDisableImageSmoothing in ios/BridgeModule/GCanvasPlugin.mm
    // and core/android/3d/view/grenderer.cpp also do the work when resetGlViewport
    if (this._imageSmoothingEnabled !== Number(value)) {
      this._imageSmoothingEnabled = Number(value);
      this._drawCommands = this._drawCommands.concat('O' + this._imageSmoothingEnabled + ';');
      this.flushJsCommands2CallNative('sync', 'execWithoutDisplay');
    }
  }

  get lineDashOffset() {
    return this._lineDashOffset;
  }

  set lineDashOffset(value) {
    this._lineWidth = value;
    this._drawCommands = this._drawCommands.concat('N' + value + ';');
  }

  get lineWidth() {
    return this._lineWidth;
  }

  set lineWidth(value) {
    this._lineWidth = value;
    this._drawCommands = this._drawCommands.concat('W' + value + ';');
  }

  get lineCap() {
    return this._lineCap;
  }

  set lineCap(value) {
    this._lineCap = value;
    this._drawCommands = this._drawCommands.concat('C' + value + ';');
  }

  get lineJoin() {
    return this._lineJoin;
  }

  set lineJoin(value) {
    this._lineJoin = value;
    this._drawCommands = this._drawCommands.concat('J' + value + ';');
  }

  get miterLimit() {
    return this._miterLimit;
  }

  set miterLimit(value) {
    this._miterLimit = value;
    this._drawCommands = this._drawCommands.concat('M' + value + ';');
  }

  get globalCompositeOperation() {
    return this._globalCompositeOperation;
  }

  set globalCompositeOperation(value) {
    // to avoid blinks, ref to https://github.com/flyskywhy/react-native-gcanvas/issues/31
    this.flushJsCommands2CallNative('sync', 'execWithoutDisplay');

    this._globalCompositeOperation = value;
    let mode = 0;
    switch (value) {
      case 'source-over':
        mode = 0;
        break;
      case 'source-atop':
        mode = 5;
        break;
      case 'source-in':
        mode = 0; // TODO
        break;
      case 'source-out':
        mode = 10;
        break;
      case 'destination-over':
        mode = 4;
        break;
      case 'destination-atop':
        mode = 4; // TODO
        break;
      case 'destination-in':
        mode = 11;
        break;
      case 'destination-out':
        mode = 3;
        break;
      case 'lighter':
        mode = 1;
        break;
      case 'copy':
        mode = 7;
        break;
      case 'xor':
        mode = 6;
        break;
      // TODO: add more mode ref to
      // https://developer.mozilla.org/zh-CN/docs/Web/API/CanvasRenderingContext2D/globalCompositeOperation
      // GCompositeOperation in core/src/gcanvas/GContext2dType.h
      // GBlendOperationFuncs in core/src/gcanvas/GCanvas2dContext.cpp
      default:
        mode = 0;
    }

    this._drawCommands = this._drawCommands.concat('B' + mode + ';');
  }

  get textAlign() {
    return this._textAlign;
  }

  set textAlign(value) {
    this._textAlign = value;
    let Align = 0;
    switch (value) {
      case 'start':
        Align = 0;
        break;
      case 'end':
        Align = 1;
        break;
      case 'left':
        Align = 2;
        break;
      case 'center':
        Align = 3;
        break;
      case 'right':
        Align = 4;
        break;
      default:
        Align = 0;
    }

    this._drawCommands = this._drawCommands.concat('A' + Align + ';');
  }

  get textBaseline() {
    return this._textBaseline;
  }

  set textBaseline(value) {
    this._textBaseline = value;
    let baseline = 0;
    switch (value) {
      case 'alphabetic':
        baseline = 0;
        break;
      case 'middle':
        baseline = 1;
        break;
      case 'top':
        baseline = 2;
        break;
      case 'hanging':
        baseline = 3;
        break;
      case 'bottom':
        baseline = 4;
        break;
      case 'ideographic':
        baseline = 5;
        break;
      default:
        baseline = 0;
        break;
    }

    this._drawCommands = this._drawCommands.concat('E' + baseline + ';');
  }

  get font() {
    return this._font;
  }

  set font(value) {
    this._font = value;
    this._drawCommands = this._drawCommands.concat('j' + value + ';');
  }

    getLineDash() {
        return this._lineDash;
    }

    setLineDash(value) {
        if( Array.isArray(value) ) {
            this._lineDash = value;
            this._drawCommands = this._drawCommands.concat('I'+ value.length +','+ value.join(',') + ';');
        }
    }
  setTransform(a, b, c, d, tx, ty) {
    this._drawCommands = this._drawCommands.concat('t'
          + (a === 1 ? '1' : a.toFixed(2)) + ','
          + (b === 0 ? '0' : b.toFixed(2)) + ','
          + (c === 0 ? '0' : c.toFixed(2)) + ','
          + (d === 1 ? '1' : d.toFixed(2)) + ',' + tx.toFixed(2) + ',' + ty.toFixed(2) + ';');
  }

  transform(a, b, c, d, tx, ty) {
    this._drawCommands = this._drawCommands.concat('f'
          + (a === 1 ? '1' : a.toFixed(2)) + ','
          + (b === 0 ? '0' : b.toFixed(2)) + ','
          + (c === 0 ? '0' : c.toFixed(2)) + ','
          + (d === 1 ? '1' : d.toFixed(2)) + ',' + tx + ',' + ty + ';');
  }

  resetTransform() {
    this._drawCommands = this._drawCommands.concat('m;');
  }

  scale(a, d) {
    this._drawCommands = this._drawCommands.concat('k' + a.toFixed(2) + ','
          + d.toFixed(2) + ';');
  }

  rotate(angle) {
    this._drawCommands = this._drawCommands
          .concat('r' + angle.toFixed(6) + ';');
  }

  translate(tx, ty) {
    this._drawCommands = this._drawCommands.concat('l' + tx.toFixed(2) + ',' + ty.toFixed(2) + ';');
  }

  save() {
    this._savedGlobalAlpha.push(this._globalAlpha);
    this._drawCommands = this._drawCommands.concat('v;');
  }

  restore() {
    this._drawCommands = this._drawCommands.concat('e;');
    this._globalAlpha = this._savedGlobalAlpha.pop();
  }

  createPattern(img, pattern) {
    return new FillStylePattern(img, pattern);
  }

  createLinearGradient(x0, y0, x1, y1) {
    return new FillStyleLinearGradient(x0, y0, x1, y1);
  }

  createRadialGradient = function(x0, y0, r0, x1, y1, r1) {
    return new FillStyleRadialGradient(x0, y0, r0, x1, y1, r1);
  };

  strokeRect(x, y, w, h) {
    this._drawCommands = this._drawCommands.concat('s' + x + ',' + y + ',' + w + ',' + h + ';');
  }


  clearRect(x, y, w, h) {
    this._drawCommands = this._drawCommands.concat('c' + x + ',' + y + ',' + w
          + ',' + h + ';');
  }

  clip() {
    this._drawCommands = this._drawCommands.concat('p;');
  }

  resetClip() {
    this._drawCommands = this._drawCommands.concat('q;');
  }

  closePath() {
    this._drawCommands = this._drawCommands.concat('o;');
  }

  moveTo(x, y) {
    this._drawCommands = this._drawCommands.concat('g' + x.toFixed(2) + ',' + y.toFixed(2) + ';');
  }

  lineTo(x, y) {
    this._drawCommands = this._drawCommands.concat('i' + x.toFixed(2) + ',' + y.toFixed(2) + ';');
  }

  quadraticCurveTo = function(cpx, cpy, x, y) {
    this._drawCommands = this._drawCommands.concat('u' + cpx + ',' + cpy + ',' + x + ',' + y + ';');
  }

  bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y, ) {
    this._drawCommands = this._drawCommands.concat(
      'z' + cp1x.toFixed(2) + ',' + cp1y.toFixed(2) + ',' + cp2x.toFixed(2) + ',' + cp2y.toFixed(2) + ',' +
          x.toFixed(2) + ',' + y.toFixed(2) + ';');
  }

  arcTo(x1, y1, x2, y2, radius) {
    this._drawCommands = this._drawCommands.concat('h' + x1 + ',' + y1 + ',' + x2 + ',' + y2 + ',' + radius + ';');
  }

  beginPath() {
    this._drawCommands = this._drawCommands.concat('b;');
  }


  fillRect(x, y, w, h) {
    this._drawCommands = this._drawCommands.concat('n' + x + ',' + y + ',' + w
          + ',' + h + ';');
  }

  rect(x, y, w, h) {
    this._drawCommands = this._drawCommands.concat('w' + x + ',' + y + ',' + w + ',' + h + ';');
  }

  fill() {
    this._drawCommands = this._drawCommands.concat('L;');
  }

  stroke(path) {
    this._drawCommands = this._drawCommands.concat('x;');
  }

  arc(x, y, radius, startAngle, endAngle, anticlockwise) {
    let ianticlockwise = 0;
    if (anticlockwise) {
      ianticlockwise = 1;
    }

    this._drawCommands = this._drawCommands.concat(
      'y' + x.toFixed(2) + ',' + y.toFixed(2) + ','
          + radius.toFixed(2) + ',' + startAngle + ',' + endAngle + ',' + ianticlockwise
          + ';'
    );
  }

  fillText(text, x, y) {
    let tmptext = text.replace(/!/g, '!!');
    tmptext = tmptext.replace(/,/g, '!,');
    tmptext = tmptext.replace(/;/g, '!;');
    this._drawCommands = this._drawCommands.concat('T' + tmptext + ',' + x + ',' + y + ',0.0;');
  }

  strokeText = function(text, x, y) {
    let tmptext = text.replace(/!/g, '!!');
    tmptext = tmptext.replace(/,/g, '!,');
    tmptext = tmptext.replace(/;/g, '!;');
    this._drawCommands = this._drawCommands.concat('U' + tmptext + ',' + x + ',' + y + ',0.0;');
  }

  measureText = function(text) {
    cancelAnimationFrame(this._canvas._renderLoopId);
    this.flushJsCommands2CallNative('sync', 'execWithoutDisplay');
    let width = CanvasRenderingContext2D.GBridge.callNative(
      this.componentId,
      'V' + text + ';',
      false,
      '2d',
      'sync',
      'execWithoutDisplay',
    );
    this._canvas._renderLoopId = requestAnimationFrame(this._canvas._renderLoop.bind(this._canvas));

    return {width: parseFloat(width)};
  }

  isPointInPath = function(x, y) {
    throw new Error('GCanvas not supported yet');
  }

  drawImage(image, sx, sy, sw, sh, dx, dy, dw, dh) {
    const numArgs = arguments.length;
    let srcX, srcY, srcW, srcH, dstX, dstY, dstW, dstH;

    if (numArgs === 3) {
      srcX = 0;
      srcY = 0;
      srcW = image.width;
      srcH = image.height;
      dstX = parseFloat(sx) || 0.0;
      dstY = parseFloat(sy) || 0.0;
      dstW = image.width;
      dstH = image.height;
    } else if (numArgs === 5) {
      srcX = 0;
      srcY = 0;
      srcW = image.width;
      srcH = image.height;
      dstX = parseFloat(sx) || 0.0;
      dstY = parseFloat(sy) || 0.0;
      dstW = parseInt(sw) || image.width;
      dstH = parseInt(sh) || image.height;
    } else if (numArgs === 9) {
      srcX = parseFloat(sx) || 0.0;
      srcY = parseFloat(sy) || 0.0;
      srcW = parseInt(sw) || image.width;
      srcH = parseInt(sh) || image.height;
      dstX = parseFloat(dx) || 0.0;
      dstY = parseFloat(dy) || 0.0;
      dstW = parseInt(dw) || image.width;
      dstH = parseInt(dh) || image.height;
    }

    const imageIsCanvas = image.hasOwnProperty('nodeName') && image.nodeName.toLowerCase() === 'canvas';
    if (imageIsCanvas) {
      if (!image._context) {
        return;
      }

      this.flushJsCommands2CallNative('sync', 'execWithDisplay');

      image._context.flushJsCommands2CallNative('sync');

      let sCanvasId = image.id;
      // even README.md said "despite of values into `canvas.width =` and `canvas.height =`",
      // because canvas of sCanvasId is mostly comes from document.createElement('canvas')
      // that just like offscreen canvas, so it will use style {position: 'absolute'} and
      // that means it's clientWidth will not change (to avoid re-render as offscreen), so
      // it's meaningful to use canvas.width usually be changed after document.createElement('canvas')
      let sCanvasWidth = image.width;
      let sCanvasHeight = image.height;
      CanvasRenderingContext2D.GBridge.drawCanvas2Canvas({
        srcComponentId: sCanvasId,
        dstComponentId: this.componentId,
        tw: sCanvasWidth,
        th: sCanvasHeight,
        sx: srcX,
        sy: srcY,
        sw: srcW,
        sh: srcH,
        dx: dstX,
        dy: dstY,
        dw: dstW,
        dh: dstH,
      });
    } else {
      CanvasRenderingContext2D.GBridge.bindImageTexture(this.componentId, image.src, image._id);
      this._drawCommands += 'd' + image._id + ','
                  + srcX + ',' + srcY + ',' + srcW + ',' + srcH + ','
                  + dstX + ',' + dstY + ',' + dstW + ',' + dstH + ';';
      this.flushJsCommands2CallNative('sync', 'execWithDisplay');
    }
  }

  createImageData(widthOrImagedata, height) {
    if (arguments.length === 2) {
      return new ImageData(widthOrImagedata, height);
    } else {
      return new ImageData(widthOrImagedata.width, widthOrImagedata.height);
    }
  }

  // not a Web canvas API, used by @flyskywhy/react-native-gcanvas
  flushJsCommands2CallNative(
    methodType = 'async',
    optionType = 'execWithDisplay',
  ) {
    const commands = this._drawCommands;
    this._drawCommands = ''; // let cmds cache be empty

    if (commands !== '') {
      CanvasRenderingContext2D.GBridge.callNative(
        this.componentId,
        commands,
        false,
        '2d',
        methodType,
        optionType,
      );
    }
  }

  // no need ctx.getImageData(x * PixelRatio.get(), y * PixelRatio.get(), w * PixelRatio.get(), h * PixelRatio.get())
  // e.g. ctx.getImageData(0, 0, 2, 2) will return a `w === 2, h === 2` ImageData
  // since PixelsSampler() in GetImageData() of core/src/gcanvas/GCanvas2dContext.cpp
  // will scale the image automatically
  getImageData(sx, sy, sw, sh) {
    // if not stop _renderLoop(), sometimes will cause display issue with 'lightener' tool of https://github.com/flyskywhy/PixelShapeRN
    cancelAnimationFrame(this._canvas._renderLoopId);
    // Use 'sync' + 'execWithoutDisplay' here to make sure last graphics be generated before execute getImageData's 'R'.
    // If use 'async' here, will cause last commands be executed after getImageData's 'sync'.
    // If use 'execWithDisplay' here, will cause low JS FPS on iOS with 'lightener' tool of https://github.com/flyskywhy/PixelShapeRN ,
    // because 'lightener' will call getImageData frequently while moving finger, will cause setNeedsDisplay() then
    // drawInRect() be invoked more than 1 times in 16ms e.g. 1times/1ms thus cause low JS FPS!
    this.flushJsCommands2CallNative('sync', 'execWithoutDisplay');
    // now can getImageData from last generated (even not displayed) graphics, otherwise will `return new ImageData(w, h)`
    // thus `this.ctx.putImageData()` has no effect with the first 'Click me to draw some on canvas' in README.md

    let x = sx;
    let y = sy;
    let w = sw;
    let h = sh;
    if (sx + sw > this.canvas.clientWidth) {
      x = 0;
      w = this.canvas.clientWidth;
    }
    if (sy + sh > this.canvas.clientHeight) {
      y = 0;
      h = this.canvas.clientHeight;
    }

    let base64Data = CanvasRenderingContext2D.GBridge.callNative(
      this.componentId,
      'R' + x + ',' + y + ',' + w + ',' + h + ';',
      false,
      '2d',
      'sync',
      'execWithoutDisplay',
    );

    // start _renderLoop() again, and thus display last generated graphics on screen
    // TODO: allow empty commands invoke callNative() once in flushJsCommands2CallNative()
    //       while start _renderLoop() just in case no commands after getImageData's 'R'
    //       thus no display
    // TODO: this.flushJsCommands2CallNative('sync', 'execWithDisplay') on Android
    //       test with 'lightener' tool of https://github.com/flyskywhy/PixelShapeRN
    //       to see if low JS FPS
    this._canvas._renderLoopId = requestAnimationFrame(this._canvas._renderLoop.bind(this._canvas));

    if (base64Data === '') {
      console.warn('getImageData: not good to be here, should refactor source code somewhere');
      return new ImageData(w, h);
    }

    return new ImageData(new Uint8ClampedArray(base64.toByteArray(base64Data)), w, h);
  }

  // no need ctx.getImageData(imageData, x * PixelRatio.get(), y * PixelRatio.get())
  // and the imageData is also not `w * PixelRatio.get(), h * PixelRatio.get()`
  putImageData(imageData, x, y, dirtyX, dirtyY, dirtyWidth, dirtyHeight) {
    const base64Data = base64.fromByteArray(imageData.data);
    let tw = imageData.width; // textureWidth
    let th = imageData.height;

    let sx, sy, sw, sh;

    if (arguments.length === 3) {
      sx = 0;
      sy = 0;
      sw = tw;
      sh = th;
    } else {
      sx = dirtyX;
      sy = dirtyY;
      // dirtyWidth in https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/putImageData
      // means the width of the (src) image data
      sw = dirtyWidth;
      sh = dirtyHeight;
    }

    if (this._canvas._isAutoClearRectBeforePutImageData) {
      this.clearRect(x + sx, y + sy, sw, sh);
    }

    this._drawCommands = this._drawCommands.concat('P' + base64Data + ',' + tw + ',' + th + ','
          + x + ',' + y + ',' + sx + ',' + sy + ',' + sw + ',' + sh + ';');
  }
}
