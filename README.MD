# @flyskywhy/react-native-gcanvas

[![npm version](http://img.shields.io/npm/v/@flyskywhy/react-native-gcanvas.svg?style=flat-square)](https://npmjs.org/package/@flyskywhy/react-native-gcanvas "View this project on npm")
[![npm downloads](http://img.shields.io/npm/dm/@flyskywhy/react-native-gcanvas.svg?style=flat-square)](https://npmjs.org/package/@flyskywhy/react-native-gcanvas "View this project on npm")
[![npm licence](http://img.shields.io/npm/l/@flyskywhy/react-native-gcanvas.svg?style=flat-square)](https://npmjs.org/package/@flyskywhy/react-native-gcanvas "View this project on npm")
[![Platform](https://img.shields.io/badge/platform-ios%20%7C%20android-989898.svg?style=flat-square)](https://npmjs.org/package/@flyskywhy/react-native-gcanvas "View this project on npm")

`@flyskywhy/react-native-gcanvas` is a C++ native canvas 2D/WebGL component based on gpu opengl glsl shader [GCanvas](https://alibaba.github.io/GCanvas/) which is a lightweight cross-platform graphics rendering engine for mobile devices developed by Alibaba. It is written with C++ based on OpenGL ES, so it can provide high performance 2D/WebGL rendering capabilities for JavaScript runtime. It also has browser-like canvas APIs, so it's very convenient and flexiable for use, especially for web developers.

Supported operating systems are Android 4.1+ (API 16) and iOS 9.0+.

Since Alibaba [feat: delete weex bridge & reactive bridge](https://github.com/alibaba/GCanvas/commit/1bbee40a16c0c5da58698e2892ba33f836eedb70), here comes this `@flyskywhy/react-native-gcanvas` package.

- [Performance Test Result](#performance-test-result)
- [Getting Started](#getting-started)
- [Example As Usage](#example-as-usage)
- [Documentation](#documentation)
- [Built With](#built-with)
- [Opening Issues](#opening-issues)
- [Contributing](#contributing)
- [License](#license)


## Performance Test Result

### `setState` vs `canvas` On react-native-web
With 200 circles backgroundColor generate (1 `ms`) and render continually, the render `ms` and final `fps` with Chrome Performance on Windows:

    setState  80 ms        means 12 fps  (stuck for human eyes)
    canvas    1.5 ms       means 400 fps (smooth for human eyes)

### `setNativeProps` vs `expo-2d-context(with expo-gl@8)` vs `react-native-gcanvas` On react-native
With 800 circles backgroundColor generate and render continually, the final UI `fps` and JS `fps` with react-native developer menu Perf Monitor on an old `Huawei Honor 6 Play` smartphone released in 2017 (Mediatek MT6737T 1.4 GHz, 2 GB RAM, Android 6):

    setNativeProps        UI: 20 fps       JS: 1 fps  (stuck for human eyes)
    expo-2d-context       UI: 56 fps       JS: 1 fps  (stuck for human eyes)
    react-native-gcanvas  UI: 56 fps       JS: 20 fps (smooth for human eyes)

On an old iPhone 7:

With 800 circles backgroundColor generate and render continually

    setNativeProps        UI: 60 fps       JS: 15 fps (smooth for human eyes)
    react-native-gcanvas  UI: 20 fps       JS: 59 fps (stuck for human eyes)
    react-native-gcanvas in release mode              (smooth for human eyes)

With 1400 circles backgroundColor generate and render continually

    setNativeProps        UI: 59 fps       JS: 7 fps  (smooth for human eyes)
    react-native-gcanvas  UI: 10 fps       JS: 58 fps (stuck for human eyes)
    react-native-gcanvas in release mode              (smooth for human eyes)


## Convenient With Browser-like canvas APIs
[gl-react](https://gl-react-cookbook.surge.sh/pixeleditor?menu=true) maybe can deal with the performance problem, but it need developer directly code with GLSL (OpenGL Shading Language), and there is no way to let many React components developed by browser-like canvas APIs be easily ported to React Native.

[react-three-fiber](https://github.com/pmndrs/react-three-fiber) maybe can deal with the performance problem, but [memory leak when meshes update](https://github.com/pmndrs/react-three-fiber/issues/263), [Leaking WebGLRenderer and more when unmounting](https://github.com/pmndrs/react-three-fiber/issues/514), [Suggestion: Dispose of renderer context when canvas is destroyed?](https://github.com/pmndrs/react-three-fiber/issues/132), and there is no way to let many React components developed by browser-like canvas APIs be easily ported to React Native.

[expo-2d-context](https://github.com/expo/expo-2d-context) can let many React components developed by browser-like canvas APIs be easily ported to React Native, but it need ctx.flush() that not belongs to canvas 2d APIs, and `expo-2d-context(with expo-gl@8)` performance is too low, maybe `expo-2d-context(with JSI expo-gl@11)` performance is high enough.

Ref to [Experiments with High Performance Animation in React Native](https://engineering.salesforce.com/experiments-with-high-performance-animation-in-react-native-80a0cb7052b0), it use many ways include `setNativeProps` and [React Native NanoVG](https://github.com/robclouth/react-native-art-nanovg). Maybe `nanovg` can deal with the performance problem, but for now (2020.12) there is no React Native canvas component using  `nanovg` to let many React components developed by browser-like canvas APIs be easily ported to React Native.

So for now (2020.12), `@flyskywhy/react-native-gcanvas` is the best choice.

### canvas projects ported from React to React Native
* [react-native-particles-bg](https://github.com/flyskywhy/react-native-particles-bg) just ported one file to [Support react-native](https://github.com/flyskywhy/react-native-particles-bg/commit/637ab13) from [particles-bg](https://github.com/lindelof/particles-bg) which based on [Proton](https://github.com/drawcall/Proton). You can also compare it with [react-native-particles-webgl](https://github.com/flyskywhy/react-native-particles-webgl) which based on memory leaking [react-three-fiber](https://github.com/pmndrs/react-three-fiber). Here is a result in my APP PlayLights.

<img src="https://raw.githubusercontent.com/flyskywhy/react-native-gcanvas/master/assets/PlayLightsAbout.gif" width="480">

* [zdog](https://github.com/metafizzy/zdog) actually no need modify any code of itself as described in [@flyskywhy/react-native-browser-polyfill](https://github.com/flyskywhy/react-native-browser-polyfill), and here is a result.

<img src="https://raw.githubusercontent.com/flyskywhy/react-native-browser-polyfill/master/assets/zdog-and-tests.gif" width="480">

* [Pixi.js](http://www.pixijs.com) game [snakeRN](https://github.com/flyskywhy/snakeRN) base on [react-native-pixi](https://github.com/flyskywhy/react-native-pixi).

<img src="https://raw.githubusercontent.com/flyskywhy/snakeRN/master/assets/snakeRN.gif" width="480">

* Pixel Art Animation Editor [PixelShapeRN](https://github.com/flyskywhy/PixelShapeRN).

<img src="https://raw.githubusercontent.com/flyskywhy/PixelShapeRN/master/assets/PixelShapeRN.gif" width="480">

## Getting Started
### react-native
Only support RN >= `0.62` as described in [android/gcanvas_library/build.gradle](android/gcanvas_library/build.gradle)

    npm install @flyskywhy/react-native-gcanvas --save

#### Android
Add below into `/android/settings.gradle`
```
include ':android:gcanvas_library'
project(':android:gcanvas_library').projectDir = new File(rootProject.projectDir, '../node_modules/@flyskywhy/react-native-gcanvas/android/gcanvas_library')
include ':android:bridge_spec'
project(':android:bridge_spec').projectDir = new File(rootProject.projectDir, '../node_modules/@flyskywhy/react-native-gcanvas/android/bridge_spec')
include ':android:adapters:gcanvas_imageloader_fresco'
project(':android:adapters:gcanvas_imageloader_fresco').projectDir = new File(rootProject.projectDir, '../node_modules/@flyskywhy/react-native-gcanvas/android/adapters/gcanvas_imageloader_fresco')
include ':android:adapters:bridge_adapter'
project(':android:adapters:bridge_adapter').projectDir = new File(rootProject.projectDir, '../node_modules/@flyskywhy/react-native-gcanvas/android/adapters/bridge_adapter')
```

Add below into `/react-native.config.js`
```
const path = require('path');

module.exports = {
  dependencies: {
    '@flyskywhy/react-native-gcanvas': {
      platforms: {
        android: {
          packageImportPath: 'import com.taobao.gcanvas.bridges.rn.GReactPackage;',
        },
      },
    },
  },
};
```

Sometimes will meet compile error `java.io.FileNotFoundException: SOME_PATH/.cxx/cmake/SOME_PATH/android_gradle_build.json (The system cannot find the file specified)` after upgrade this pacakge by `npm install`, can solve it by [add ` --rerun-tasks` to your gradlew command](https://stackoverflow.com/a/68126063/6318705) once like

    ./android/gradlew assembleDebug --rerun-tasks -p ./android/

if get `Could not get resource 'https://maven.google.com/com/facebook/react/react-native/maven-metadata.xml'`, you can remove `'https://maven.google.com/'` in `react-native-gcanvas/build.gradle` .

#### iOS

Add below into `/ios/Podfile`
```
  pod "GCanvas", :path => "../node_modules/@flyskywhy/react-native-gcanvas/GCanvas.podspec"
```
    cd YOUR_PROJECT/ios
    pod install

##### About on iOS warning 'Sending `GCanvasReady` with no listeners registered.'
The root cause is described beside 'GCanvasReady' in `components/GCanvasComponent.js`, to suppress this warning, you can add below into your APP code:
```
  require('react-native').LogBox.ignoreLogs([
    '`GCanvasReady` with no listeners',
  ]);
```

#### Web
When I use react-native-web, I also use react-app-rewired as described in my blog:

* CN [安装 react-native-web 并配以 react-app-rewired](https://github.com/flyskywhy/g/blob/master/i%E4%B8%BB%E8%A7%82%E7%9A%84%E4%BD%93%E9%AA%8C%E6%96%B9%E5%BC%8F/t%E5%BF%AB%E4%B9%90%E7%9A%84%E4%BD%93%E9%AA%8C/%E7%94%B5%E4%BF%A1/Tool/%E7%BC%96%E7%A8%8B%E8%AF%AD%E8%A8%80/JavaScript/React%E4%BD%BF%E7%94%A8%E8%AF%A6%E8%A7%A3.md#rn--060-%E7%9A%84%E5%AE%89%E8%A3%85-react-native-web)

* EN [Install react-native-web with react-app-rewired](https://github.com/reactrondev/react-native-web-swiper/issues/41#issuecomment-685207381)

With react-app-rewired, my react-native-web@0.15.0 and RN 0.63+ without expo project works fine, you can try it.


## Example As Usage
### 3D webgl
3D webgl examples see [webgl_demo](webgl_demo).

`gl.UNPACK_FLIP_Y_WEBGL` is not support in [webgl_demo/texture.js](webgl_demo/texture.js), and will not be supported ref to [y-orientation for texImage2D from HTML elements](https://www.khronos.org/webgl/public-mailing-list/public_webgl/1212/msg00022.php).

Here is the result of [webgl_demo/cube.js](webgl_demo/cube.js).

<img src="https://raw.githubusercontent.com/flyskywhy/react-native-gcanvas/master/assets/webgl_cube.gif" width="480">

### 2D canvas

<img src="https://raw.githubusercontent.com/flyskywhy/react-native-gcanvas/master/assets/canvas.gif" width="480">

```javascript
import React, {Component} from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {GCanvasView} from '@flyskywhy/react-native-gcanvas';
import {Loader} from 'resource-loader';
import {Asset} from 'expo-asset';

function sleepMs(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default class App extends Component {
  constructor(props) {
    super(props);
    this.canvas = null;
    this.state = {
      debugInfo: 'Click me to draw some on canvas',
    };

    // only useful on Android, because it's always true on iOS
    this.isGReactTextureViewReady = true;
  }

  componentDidMount() {
    if (Platform.OS === 'web') {
      const resizeObserver = new ResizeObserver((entries) => {
        for (let entry of entries) {
          if (entry.target.id === 'canvasExample') {
            let {width, height} = entry.contentRect;
            this.onCanvasResize({width, height, canvas: entry.target});
          }
        }
      });
      resizeObserver.observe(document.getElementById('canvasExample'));
    }
  }

  initCanvas = (canvas) => {
    if (this.canvas) {
      return;
    }

    this.canvas = canvas;
    if (Platform.OS === 'web') {
      // canvas.width not equal canvas.clientWidth but "Defaults to 300" ref
      // to https://developer.mozilla.org/en-US/docs/Web/HTML/Element/canvas,
      // so have to assign again, unless <canvas width=SOME_NUMBER/> in render()
      this.canvas.width = this.canvas.clientWidth;
      this.canvas.height = this.canvas.clientHeight;
    }
    // should not name this.context because this.context is already be {} here and will
    // be {} again after componentDidUpdate() on react-native or react-native-web, so
    // name this.ctx
    this.ctx = this.canvas.getContext('2d');
  };

  onCanvasResize = ({width, height, canvas}) => {
    canvas.width = width;
    canvas.height = height;
    this.drawSome();
  };

  drawSome = async () => {
    // On Android, sometimes this.isGReactTextureViewReady is false e.g.
    // navigate from a canvas page into a drawer item page with
    // react-navigation on Android, the canvas page will be maintain
    // mounted by react-navigation, then if you continually call
    // this drawSome() in some loop, it's wasting CPU and GPU,
    // if you don't care about such wasting, you can delete
    // this.isGReactTextureViewReady and related onIsReady.

    if (this.ctx && this.isGReactTextureViewReady) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

      this.ctx.beginPath();

      //rect
      this.ctx.fillStyle = 'red';
      this.ctx.fillRect(0, 0, 50, 50);

      //rect
      this.ctx.fillStyle = 'green';
      this.ctx.fillRect(50, 50, 50, 50);

      this.ctx.fill();

      this.ctx.beginPath();

      //circle
      this.ctx.fillStyle = 'blue';
      this.ctx.moveTo(100, 150);
      this.ctx.arc(125, 125, 25, 0, Math.PI * 2, true);

      this.ctx.fill();

      const imagedata = this.ctx.getImageData(25, 25, 50, 50);
      this.ctx.putImageData(imagedata, 100, 100, 12, 12, 25, 25);

      // const imageHttpSrc =
      //   '//gw.alicdn.com/tfs/TB1KwRTlh6I8KJjy0FgXXXXzVXa-225-75.png';
      // if use `//` above, will be convert to `http:` in `packages/gcanvas/src/env/image.js`,
      // then in Android release mode, will cause error:
      // `CLEARTEXT communication to gw.alicdn.com not permitted by network security policy`,
      // so use `https://` below
      const imageHttpSrc =
        'https://gw.alicdn.com/tfs/TB1KwRTlh6I8KJjy0FgXXXXzVXa-225-75.png';
      // `await Asset.fromModule` needs `expo-file-system`, and `expo-file-system` needs
      // [install react-native-unimodules without install expo](https://github.com/flyskywhy/g/blob/master/i%E4%B8%BB%E8%A7%82%E7%9A%84%E4%BD%93%E9%AA%8C%E6%96%B9%E5%BC%8F/t%E5%BF%AB%E4%B9%90%E7%9A%84%E4%BD%93%E9%AA%8C/%E7%94%B5%E4%BF%A1/Tool/%E7%BC%96%E7%A8%8B%E8%AF%AD%E8%A8%80/JavaScript/React%E4%BD%BF%E7%94%A8%E8%AF%A6%E8%A7%A3.md#install-react-native-unimodules-without-install-expo)
      const imageRequireAsset = await Asset.fromModule(
        require('@flyskywhy/react-native-gcanvas/tools/build_website/assets/logo-gcanvas.png'),
      );
      const imageRequireSrc = imageRequireAsset.uri;

      // const loader = new Loader();
      // const setup = (loader, resources) => {
      //   this.ctx.drawImage(resources[imageHttpSrc].data, 70, 0, 112, 37);
      //   this.ctx.drawImage(resources[imageRequireSrc].data, 0, 100, 120, 120);
      // };
      // loader.add(imageHttpSrc).add(imageRequireAsset.uri).load(setup);

      // you can use Loader() above instead of Image() below, but notice that imageRequireSrc
      // only work with 'resource-loader' in react-native debug/dev mode cause the asset will
      // be served over `http://localhost:8081` , and won't work in release mode. Maybe someone
      // can port 'resource-loader' to 'react-native-resource-loader', before that, Loader()
      // above only support chain `add(different imageHttpSrc)` , if you use imageRequireSrc,
      // please use Image() below.

      // because already `import '@flyskywhy/react-native-browser-polyfill';` in GCanvasView, so can `new Image()`
      // not `Platform.OS === 'web' ? new Image() : new GImage()` here
      const imageHttp = new Image();
      imageHttp.crossOrigin = true; // need this to solve `Uncaught DOMException: Failed to execute 'toDataURL' on 'HTMLCanvasElement': Tainted canvases may not be exported.` on Web in production mode
      imageHttp.onload = () => {
        this.ctx.drawImage(imageHttp, 70, 0, 112, 37);
      };
      imageHttp.onerror = (error) => {
        this.setState({
          debugInfo: error.message,
        });
      };
      imageHttp.src = imageHttpSrc;

      // // to [Call drawImage() in loop with only one GImage instance](https://github.com/flyskywhy/react-native-gcanvas/issues/41)
      // for (let i = 0; i < 10; i++) {
      //   await sleepMs(1000);
      //   if (i % 2) {
      //     imageHttp.src =
      //       'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAADklEQVR4AWP4nwZCUAoAKxYFld+CjjoAAAAASUVORK5CYII=';
      //   } else {
      //     imageHttp.src =
      //       'https://gw.alicdn.com/tfs/TB1KwRTlh6I8KJjy0FgXXXXzVXa-225-75.png';
      //   }
      // }

      const imageRequire = new Image();
      imageRequire.onload = () => {
        this.ctx.drawImage(imageRequire, 0, 100, 120, 120);
      };
      imageRequire.onerror = (error) => {
        this.setState({
          debugInfo: error.message,
        });
      };
      imageRequire.src = imageRequireSrc;
    }
  };

  takePicture = () => {
    if (this.canvas) {
      const data = this.canvas.toDataURL();
      console.warn(data);
    }
  };

  render() {
    return (
      <View style={styles.container}>
        <TouchableOpacity onPress={this.drawSome}>
          <Text style={styles.welcome}>{this.state.debugInfo}</Text>
        </TouchableOpacity>
        {Platform.OS === 'web' ? (
          <canvas
            id={'canvasExample'}
            ref={this.initCanvas}
            style={
              {
                flex: 1,
                width: '100%',
              } /* canvas with react-native-web can't use width and height in styles.gcanvas */
            }
          />
        ) : (
          <GCanvasView
            onCanvasResize={this.onCanvasResize}
            onCanvasCreate={this.initCanvas}
            onIsReady={(value) => (this.isGReactTextureViewReady = value)}
            isGestureResponsible={true /* Here is just for example, you can remove this line because default is true */}
            isAutoClearRectBeforePutImageData={false /* default is false, if you want to be exactly compatible with Web, you can set it to true*/}
            devicePixelRatio={undefined /* Here is just for example, you can remove this line because default is undefined and means default is PixelRatio.get(), ref to "About devicePixelRatio" below */}
            style={styles.gcanvas}
          />
        )}
        <TouchableOpacity onPress={this.takePicture}>
          <Text style={styles.welcome}>Click me toDataURL()</Text>
        </TouchableOpacity>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5FCFF',
  },
  gcanvas: {
    flex: 1,
    width: '100%',
    // backgroundColor: '#FF000030', // TextureView doesn't support displaying a background drawable since Android API 24
  },
  welcome: {
    fontSize: 20,
    textAlign: 'center',
    marginVertical: 20,
  },
});
```

## About devicePixelRatio
Take width as example, in [Window.devicePixelRatio](https://developer.mozilla.org/en-US/docs/Web/API/Window/devicePixelRatio):

* "display size (css pixels)" means `canvas.clientWidth`
* "actual size in memory" of GPU means `canvas._context.drawingBufferWidth`

To avoid "blurry canvas" described in [Window.devicePixelRatio
](https://developer.mozilla.org/en-US/docs/Web/API/Window/devicePixelRatio), `@flyskywhy/react-native-gcanvas` always set "actual size in memory" of GPU with physical pixels (despite of values into `canvas.width =` and `canvas.height =`), so `canvas._context.drawingBufferWidth` (WebGLRenderingContext's property) always equals `canvas.clientWidth * PixelRatio.get()` .

### with no devicePixelRatio prop, or devicePixelRatio={PixelRatio.get()}
To be here if you want to code with css pixels, in other words, to code like the device full view width is `(full physical width)/PixelRatio.get()`, and iOS and Android will have the same x y scale with Web against same JS code. FE designer may prefer it.

Replace code in [Window.devicePixelRatio
](https://developer.mozilla.org/en-US/docs/Web/API/Window/devicePixelRatio) with
```
canvas.width = Math.floor(size * scale);
canvas.height = Math.floor(size * scale);
if (Platform.OS === 'web') {
  ctx.scale(scale, scale);
}
```
and the rest code will works well.

### with devicePixelRatio={1}
To be here if you want to code with physical pixels. Game designer may prefer it.

Without modification, code in [Window.devicePixelRatio
](https://developer.mozilla.org/en-US/docs/Web/API/Window/devicePixelRatio) will works well.

## `document.createElement('canvas')` (as offscreen canvas)
Usage is described in [flyskywhy/react-native-browser-polyfill/src/window.js](https://github.com/flyskywhy/react-native-browser-polyfill/blob/5f1ea23aef92f80fa07f2df0a3c9658d9a7c29a9/src/window.js#L32). On iOS, maybe need layout offscreen canvas then layout normal canvas like what `this.state.hasOc1 && this.state.hasOc2 &&` do in this PixelShapeRN APP commit [can work some to resizeImageData with canvas document.createElement('canvas')](https://github.com/flyskywhy/PixelShapeRN/commit/28b8d6a).

## Features
- Cross-platform, support popular iOS and Android.
- High performance, accelerate graphic draw by OpenGL ES.
- Provide JavaScript runtime, such as [Weex](https://github.com/apache/incubator-weex) and [ReactNative](https://github.com/facebook/react-native/). Convenient to use JavaScript API like HTML canvas.
- Scalable Architecture, easy to implement a GCanvas bridge by yourself following the guide [Custom Native Bridge](https://alibaba.github.io/GCanvas/docs/Custom%20Bridge.html).
- Small size.


## Introduction

See the [Introduction to GCanvas](https://alibaba.github.io/GCanvas/docs/Developer's%20Guide.html) for a detailed introduction to GCanvas.

### Weex
Follow [Weex Setup Guide](https://alibaba.github.io/GCanvas/docs/Integrate%20GCanvas%20on%20Weex.html) to integrate GCanvas on Weex.

### JavaScript
GCanvas has browser-like canvas APIs, so almost all of the APIs are exactly same as HTML5 canvas. At this moment, we have already supported 90% of 2D APIs and 99% of WebGL APIs. You can find out those informations in [2D APIs](https://alibaba.github.io/GCanvas/docs/Graphics%202D.html) and [WebGL APIs](https://alibaba.github.io/GCanvas/docs/WebGL.html).


## Documentation
Check [Documentation](https://alibaba.github.io/GCanvas/docs/Introduction.html) for more information.


## Built With

* [Freetype](https://www.freetype.org/) - Used for font rendering on Android


## Changelog

New Changelog record in [CHANGELOG](./docs/Changelog.md) for details.

## Opening Issues
If you encounter a bug with GCanvas we would like to hear about it. Search the existing issues and try to make sure your problem doesn’t already exist before opening a new issue. It’s helpful if you include the version of GCanvas and OS you’re using. Please include a stack trace and reduced repro case when appropriate, too.

## Contributing

Please read [CONTRIBUTING](./docs/Contributing.md) for details on our code of conduct, and the process for submitting pull requests to us.

## Authors

* GCanvas Open Source Team
* Li Zheng <flyskywhy@gmail.com>

## Donate
To support my work, please consider donate.

- ETH: 0xd02fa2738dcbba988904b5a9ef123f7a957dbb3e

- <img src="https://raw.githubusercontent.com/flyskywhy/flyskywhy/main/assets/alipay_weixin.png" width="500">

## License

This project is licensed under the Apache License - see the [LICENSE](./docs/LICENSE.md) file for details
