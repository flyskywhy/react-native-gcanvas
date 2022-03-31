import Element from '@flyskywhy/react-native-browser-polyfill/src/DOM/Element';
import {defineEventAttribute} from 'event-target-shim';

let id = 1;

class GImage extends Element {
  static GBridge = null;

  constructor() {
    super('img');
    this._id = id++;
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

    GImage.GBridge.preloadImage([this._src, this._id], (data) => {
      if (typeof data === 'string') {
        data = JSON.parse(data);
      }
      if (data.error) {
        var evt = {type: 'error', target: this, message: data.error};
        this.dispatchEvent(evt);
      } else {
        this.complete = true;
        this.width = typeof data.width === 'number' ? data.width : 0;
        this.height = typeof data.height === 'number' ? data.height : 0;
        var evt = {type: 'load', target: this};
        this.dispatchEvent(evt);
      }
    });
  }
}

defineEventAttribute(GImage.prototype, 'onload');
defineEventAttribute(GImage.prototype, 'error');

export default GImage;
