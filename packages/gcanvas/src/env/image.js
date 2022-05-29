import Element from '@flyskywhy/react-native-browser-polyfill/src/DOM/Element';
import {defineEventAttribute} from 'event-target-shim';

// use srcs to [Call drawImage() in loop with only one GImage instance](https://github.com/flyskywhy/react-native-gcanvas/issues/41)
// just like what Web can do
let srcs = {};

let id = 0;

class GImage extends Element {
  static GBridge = null;

  constructor() {
    super('img');
    this._id = 0;
    this.width = 0;
    this.height = 0;
    this._src = undefined;
    this.complete = false;
  }

  get src() {
    return this._src;
  }

  set src(value) {
    if (value.startsWith('//')) {
      value = 'http:' + value;
    }

    this._src = value;

    if (srcs[value]) {
      this._id = srcs[value].id;
      this.width = srcs[value].width;
      this.height = srcs[value].height;

      // in case another `new GImage()` set same src, so we also need `this.complete = true` here
      this.complete = true;

      var evt = {type: 'load', target: this};
      this.dispatchEvent(evt);
    } else {
      // TODO: remove useless `0` arg in preloadImage of js and native
      GImage.GBridge.preloadImage([this._src, 0], (data) => {
        if (typeof data === 'string') {
          data = JSON.parse(data);
        }
        if (data.error) {
          var evt = {type: 'error', target: this, message: data.error};
          this.dispatchEvent(evt);
        } else {
          id++;
          this._id = id;
          this.width = typeof data.width === 'number' ? data.width : 0;
          this.height = typeof data.height === 'number' ? data.height : 0;
          srcs[value] = {
            id: this._id,
            width: this.width,
            height: this.height,
          };

          this.complete = true;

          var evt = {type: 'load', target: this};
          this.dispatchEvent(evt);
        }
      });
    }
  }
}

defineEventAttribute(GImage.prototype, 'onload');
defineEventAttribute(GImage.prototype, 'error');

export default GImage;
