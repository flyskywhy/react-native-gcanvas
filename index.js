import {Platform} from 'react-native';
import GCanvasView from './components/GCanvasComponent';
import GImage from './packages/gcanvas/src/env/image';
import {ReactNativeBridge} from './packages/gcanvas';

const createCanvas = (width, height) => {
  const canvas = document.createElement('canvas');

  canvas.width = width;
  canvas.height = height;
  return canvas;
};

const getFontNames = () => {
  return ReactNativeBridge.GCanvasModule ? ReactNativeBridge.GCanvasModule.getFontNames() : [];
}

let extraFontLocation = null;

const setExtraFontLocation = (location) => {
  if (Platform.OS === 'android') {
    const fontLocation = location.endsWith('/') ? location : `${location}/`;
    if ('/system/fonts/' === fontLocation) {
      // SYSTEM_FONT_LOCATION = "/system/fonts/" in
      // android/gcanvas_library/src/main/java/com/taobao/gcanvas/GFontConfigParser.java
      // so just return here if e.g. registerFont('/system/fonts/NotoSansThai-Regular.ttf')
      return;
    }
    if (extraFontLocation !== fontLocation) {
      ReactNativeBridge.GCanvasModule.setExtraFontLocation(fontLocation);
      extraFontLocation = fontLocation;
    }
  }
};

/**
 * Register a custom font on Android, so that can `ctx.font = `, and can be included in the return of getFontNames().
 *
 * Ref to <https://mehrankhandev.medium.com/ultimate-guide-to-use-custom-fonts-in-react-native-77fcdf859cf4>
 * and <https://github.com/callstack/react-native-paper/blob/291d9a90ea2bf2d9a3416170a9a3a1791cf051b0/docs/docs/guides/04-fonts.md?plain=1#L32>
 * to also reuse custom fonts in React `<Text/>`, need rename font file name, maybe
 * <https://gist.github.com/keighl/5434540> can do the rename work.
 *
 * @param src {string} Path to font file, e.g. `${RNFS.ExternalDirectoryPath}/fonts/KaiTi.ttf`
 * @param fontFace {{
 *          family?: string, // fontName that getFontNames() will return, if undefined, fontName will be font file name e.g. `KaiTi`
 *          weight?: string, // useless
 *          style?: string, // useless
 *        }} Object, can be undefined
 */
const registerFont = (src, fontFace) => {
  if (Platform.OS === 'android') {
    const fontFile = src.substring(src.lastIndexOf('/') + 1);
    const fontLocation = src.substring(0, src.lastIndexOf('/') + 1);
    setExtraFontLocation(fontLocation);

    const fontFileName = fontFile.includes('.') ? fontFile.substring(0, fontFile.lastIndexOf('.')) : fontFile;
    const fontName = fontFace && fontFace.family ? fontFace.family : fontFileName;
    ReactNativeBridge.GCanvasModule.addFontFamily([fontName], [fontFile]);
  }
}

export {
  GCanvasView,
  GImage,
  createCanvas,
  getFontNames,
  registerFont,
}
