import Element from '@flyskywhy/react-native-browser-polyfill/src/DOM/Element';
import GContext2D from '../context/2d/RenderingContext';
import GContextWebGL from '../context/webgl/RenderingContext';
import {PixelRatio} from 'react-native';

function sleepMs(ms) {
  for (var start = new Date(); new Date() - start <= ms; ) {}
}

export default class GCanvas extends Element {
  static GBridge = null;

  id = null;
  _renderLoopId = null;
  _context = null;
  _clientWidth = 100;
  _clientHeight = 150;
  _width = 100;
  _height = 150;

  _needRender = true;

  constructor(id, {isAutoClearRectBeforePutImageData, devicePixelRatio, disableAutoSwap, style}) {
    super('canvas');
    this.id = id;
    this.disabled = false;
    this.webglInterval = null;

    this._isAutoClearRectBeforePutImageData = isAutoClearRectBeforePutImageData;
    this._devicePixelRatio = devicePixelRatio || PixelRatio.get();
    this._disableAutoSwap = disableAutoSwap;
    this._swapBuffers = () => {
      this._context && this._context.flushJsCommands2CallNative();
    };

    this._clientWidth = style.width | 0; // width is fixed not float just like Web
    this._clientHeight = style.height | 0;
    this._width = style.width | 0; // width is fixed not float just like Web
    this._height = style.height | 0;
  }

  get clientWidth() {
    return this._clientWidth;
  }

  get clientHeight() {
    return this._clientHeight;
  }

  set clientWidth(value) {
    this._clientWidth = value | 0; // width is fixed not float just like Web
  }

  set clientHeight(value) {
    this._clientHeight = value | 0;
  }

  get width() {
    return this._width;
  }

  set width(value) {
    if (this._context) {
      if (this._context.className === 'CanvasRenderingContext2D') {
        this._context.clearRect(0, 0, this._clientWidth, this._clientHeight);
      } else {
        this._context.drawingBufferWidth = this._clientWidth * PixelRatio.get() | 0;
      }

      this. _conditionallyResetGlViewport();
    }
    this._width = value | 0; // width is fixed not float just like Web
  }

  get height() {
    return this._height;
  }

  set height(value) {
    if (this._context) {
      if (this._context.className === 'CanvasRenderingContext2D') {
        this._context.clearRect(0, 0, this._clientWidth, this._clientHeight);
      } else {
        this._context.drawingBufferHeight = this._clientHeight * PixelRatio.get() | 0;
      }

      this. _conditionallyResetGlViewport();
    }
    this._height = value | 0;
  }

  _conditionallyResetGlViewport() {
    let isNormalCanvas = true;
    if (global.createCanvasElements) {
      if (global.createCanvasElements.findIndex(canvas => canvas === this) > -1) {
        isNormalCanvas = false;
      }
    }

    if (isNormalCanvas) {
      GCanvas.GBridge.callResetGlViewport(this.id);
    } else {
      // resetGlViewport to global.createCanvasElements which comes from
      // document.createElement('canvas') (as offscreen canvas) when replace
      // require('resize-image-data') in https://github.com/flyskywhy/PixelShapeRN/blob/master/src/utils/canvasUtils.js
      // is invoked too frequently, and since such canvas style is {position: 'absolute'}
      // so no need of resetGlViewport, so no GCanvas.GBridge.callResetGlViewport() here
    }
  }

  getContext(type) {
    if (this._context) {
      return this._context;
    }

    if (type.match(/webgl/i)) {
      this._context = new GContextWebGL(this);
      this._context.drawingBufferWidth = this._clientWidth * PixelRatio.get() | 0;
      this._context.drawingBufferHeight = this._clientHeight * PixelRatio.get() | 0;
      this._context.componentId = this.id;

      GCanvas.GBridge.callSetContextType(this.id, 1); // 0 for 2d; 1 for webgl

      if (!this._disableAutoSwap) {
        const render = () => {
          if (this._needRender) {
            this._context.flushJsCommands2CallNative();
            this._needRender = false;
          }
        };

        this.webglInterval = setInterval(render, 16);
      }

      // On Android, need `sleepMs()` by `for(;;)` to wait enough (or wait until m_requestInitialize be true?) to
      // let `mProxy->SetClearColor` be invoked in renderLoop() of core/android/3d/view/grenderer.cpp
      // at the very first, otherwise can't `gl.clearColor` right away on canvas.getContext('webgl')
      // like https://github.com/flyskywhy/react-native-gcanvas/issues/24
      sleepMs(100);

      if (__DEV__) {
        // TODO: need test again to see if can remove sleepMs(130).
        // https://github.com/flyskywhy/snakeRN/tree/v3.0.0 sometimes (1st load js on new installed debug apk)
        // will cause `Error: Invalid value of `0` passed to `checkMaxIfStatementsInShader` in
        // `node_modules/pixi.js/lib/core/renderers/webgl/utils/checkMaxIfStatmentsInShader.js` ,
        // `sleepMs()` by `for(;;)` wait enough can fix it, don't know why maybe also
        // `setContextType can not find canvas with id` as described below.
        sleepMs(130);
      }
      if (this._devicePixelRatio > 0) {
        GCanvas.GBridge.callSetDevicePixelRatio(this.id, this._devicePixelRatio);
      }
    } else if (type.match(/2d/i)) {
      this._context = new GContext2D(this);
      this._context.componentId = this.id;
      GCanvas.GBridge.callSetContextType(this.id, 0);

      // TODO: need test again to see if can remove sleepMs(130).
      // iOS need at least sleepMs(130), otherwise will crash with https://github.com/flyskywhy/PixelShapeRN
      // modified to resizeImageData with canvas and GCanvas.GBridge.callResetGlViewport(this.id) despite isNormalCanvas
      sleepMs(130);

      if (this._devicePixelRatio > 0) {
        GCanvas.GBridge.callSetDevicePixelRatio(this.id, this._devicePixelRatio);
      }

      this._renderLoopId = requestAnimationFrame(this._renderLoop.bind(this));
    } else {
      throw new Error('not supported context ' + type);
    }

    return this._context;
  }

  _renderLoop() {
    if (this.disabled) {
      return;
    }
    this._context.flushJsCommands2CallNative();
    this._renderLoopId = requestAnimationFrame(this._renderLoop.bind(this));
  }

  // default 0.92 comes from https://developer.mozilla.org/zh-CN/docs/Web/API/HTMLCanvasElement/toDataURL
  toDataURL(type = 'image/png', encoderOptions = 0.92) {
    let quality = encoderOptions < 0.0 ? 0.0 : encoderOptions;
    quality = quality > 1.0 ? 1.0 : quality;

    return GCanvas.GBridge.callToDataURL(this.id, type, quality);
  }

  reset() {
    GCanvas.GBridge.callReset(this.id);
  }
}
