# Changelog

All notable changes of this project will be documented in.


## [2.3.25] - 2022-09-18 Chinese do not forget the September 18 Incident that marked the start of Japan's 14-year invasion of China

### Changed

* React Native GCanvas Component
        * README.md: install react-native-unimodules without install expo
        * refactor: Zdog rendering different from the web #46
        * fix: support https://developer.mozilla.org/en-US/docs/Web/API/Element/setAttribute to avoid crash with [Zdog Mario](https://codepen.io/desandro/pen/qxjmKM)


## [2.3.23] - 2022-05-29

### Changed

* React Native GCanvas Component
        * feat: call drawImage() in loop with only one GImage instance #41, just like what Web can do


## [2.3.22] - 2022-05-28

### Changed

* React Native GCanvas Component
        * fix: iOS memory leak when recreate canvas #42


## [2.3.21] - 2022-04-01

### Changed

* React Native GCanvas Component
	* feat: support ImageData to texImage2D and texSubImage2D; fix display blank image when second call of texImage2D() on Android


## [2.3.19] - 2022-03-02

### Changed

* React Native GCanvas Component
	* feat: add prop devicePixelRatio, so that game designer/engine can code with physical pixels not just css pixels


## [2.3.17] - 2022-02-15 Happy Lantern Festival

### Changed

* React Native GCanvas Component
	* feat: add prop isAutoClearRectBeforePutImageData


## [2.3.16] - 2022-02-15 Happy Lantern Festival

### Changed

* React Native GCanvas Component
	* fix: #31 blinking after changing globalCompositeOperation


## [2.3.15] - 2022-02-10

### Changed

* React Native GCanvas Component
	* refactor: let color picker in APP more accurate in PixelsSampler() after GetImageData() when devicePixelRatio > 1
	* fix: flip y boundary value bug in PixelsSampler() which is used by GetImageData()


## [2.3.13] - 2022-02-08

### Changed

* React Native GCanvas Component
	* feat: add `canvas` into onCanvasResize({}) to easily `canvas.width = width;`
	* fix: sometimes gl.viewport() has no effect on iOS


## [2.3.12] - 2022-02-04 Wish the Beijing 2022 Winter Olympics and Winter Paralympics a complete success

### Changed

* React Native GCanvas Component
	* fix: improve `WebGL performance` #26 , increase JS FPS from 1 to 60 test with https://github.com/flyskywhy/snakeRN on iPhone 7 in Xcode debug build configuration


## [2.3.11] - 2022-01-31 Happy Chinese New Year

### Changed

* React Native GCanvas Component
	* feat: let iOS also has the ability to get the log comes from cpp
	* feat: support getImageData() on iOS


## [2.3.10] - 2022-01-13

### Changed

* React Native GCanvas Component
	* fix: context was scaled when `Canvas resize` #32 fixed by `this.canvas.width = width; this.canvas.height = height;` to match the same solution on Web <canvas/> , `onCanvasResize` usage can ref to README.md diff of commit 8225a74


## [2.3.9] - 2022-01-12

### Changed

* React Native GCanvas Component
	* feat: support onMouseDown onMouseMove onMouseUp
	* feat: support getImageData() on Android, support createImageData() putImageData()
	* fix: waitUtilTimeout() sometimes be interrupted by signal thus cause return immediately
	* fix: getImageData() on Android sometimes get '', test by adjusting color use `Lightener` icon tool in https://github.com/flyskywhy/PixelShapeRN


## [2.3.8] - 2021-12-19

### Changed

* React Native GCanvas Component
	* feat: support 9 args in texImage2D() on Android


## [2.3.7] - 2021-08-17

### Changed

* React Native GCanvas Component
	* fix: on iOS #25 "Poor performance on drawing multiple lines" caused by invoking render2d() implicitly per 16ms with empty commands when not drawing


## [2.3.6] - 2021-08-09

### Changed

* React Native GCanvas Component
	* fix: a bug that Android `ctx.clearRect()` with `white`, it should be `transparent` like iOS


## [2.3.5] - 2021-07-14

### Changed

* React Native GCanvas Component
	* fix: `java.lang.ClassCastException: com.facebook.react.views.view.ReactViewGroup cannot be cast to com.taobao.gcanvas.bridges.rn.GReactTextureView`


## [2.3.4] - 2021-07-08

### Changed

* React Native GCanvas Component
	* fix: let PanResponder outside GCanvasView can be useable


## [2.3.0] - 2021-06-17 Congratulations to China on the successful launch of crew to our Tiangong space station

### Changed

* React Native GCanvas Component
	* feat: use @flyskywhy/react-native-browser-polyfill to support window.Element to directly render `zdog` and support mousemove in `zdog`
	* fix: a bug can't drawImage when the image.src.startsWith('data:')


## [2.2.0] - 2021-05-29

### Changed

* React Native GCanvas Component
	* feat: add toDataURL() on Android and iOS


## [2.1.2] - 2021-05-16

### Changed

* React Native GCanvas Component
	* fix: a bug will more and more outer-sync between drawing on JS and displaying on iOS


## [2.1.0] - 2021-05-08

### Changed

* React Native GCanvas Component
	* feat: can render 3d webgl on Android and iOS now
	* fix: resolve the bug in refreshPlugin(), then iOS has the same x y scale with Android and Web against same JS code
	* fix: `A/libc(6413): Fatal signal 6 (SIGABRT), code -1 (SI_QUEUE) in tid 6684 (JNISurfaceTextu)` by

        /c/programs/android-sdk/ndk/20.0.5594570/toolchains/aarch64-linux-android-4.9/prebuilt/windows-x86_64/bin/aarch64-linux-android-addr2line.exe -e react-native-gcanvas/android/gcanvas_library/build/intermediates/cmake/debug/obj/arm64-v8a/libgcanvas.so 0000000000087abc

    ref to the related log:

        A/DEBUG(10049):       #03 pc 0000000000087abc  /data/app/com.sunlay.light-pqSaddcROPi9EDeUpEbxWw==/lib/arm64/libgcanvas.so (BuildId: 916bb745ddfe7df39f27c57400b0196947e866dc)



## [2.0.1] - 2021-05-04

### Changed

* React Native GCanvas Component
	* fix: #12 `Blank screen Android`
	* fix: #13 `why "0" shown?`


## [2.0.0] - 2020-12-22

### Changed

* React Native GCanvas Component
	* Small break! No need this.scale as described in example of previous README.md, more elegant now:D and thus [react-native-particles-bg](https://github.com/flyskywhy/react-native-particles-bg) present same behavior on Andrid, iOS and Web.
	* fix: resolve the bug in mImpl.setDevicePixelRatio, then Android has the same x y scale with iOS and Web, so can simplify the example too
	* refactor: add onCanvasCreate prop and hide enable() into GCanvasView, let initCanvas() simple in example


## [1.2.7] - 2020-12-21

### Changed

* React Native GCanvas Component
	* feat: support drawImage() from require('some.png') on Android, iOS and Web


## [1.2.5] - 2020-12-18

### Changed

* React Native GCanvas Component
	* iOS worked again
	* fix: a bug that will no display while quit from a drawer item page to current canvas page which is still maintain mounted by react-navigation on Android
	* fix: a bug that will still no display after close a pop-up activity like permission request dialog
	* feat: can render2d canvas on iOS now


## [1.2.0] - 2020-12-13

### Changed

* React Native GCanvas Component
	* Android worked again
	* fix: `A/libc(13515): Fatal signal 11 (SIGSEGV), code 1 (SEGV_MAPERR), fault addr 0x7af4c00ed8 in tid 13656 (mqt_native_modu)`
	* fix: can render2d canvas on Android now
	* fix: avoid sometimes `java.lang.NullPointerException: Attempt to invoke virtual method 'boolean com.taobao.gcanvas.bridges.rn.GReactTextureView.isReady()' on a null object reference`


## [1.1.0] - 2019-10-31

### Changed

* Core Engine
	* Refacotor `GCanvas` and `GCanvasContext` class, make it more lower coupling. `GCanvas` response for initialize, create `GCanvasContext` and drawFrame, all 2d `property` and `API` move to `GCanvasContext`
	* Add `GCanvasWeex` only for `Weex` UI framework
	* Add `GCanvasHooks` and `GCanvasLog`, support for custom exception log.
	* `GCanvasContext` Support set canvas dimension
	* New `2d` property `lineDash` and `lineDashOffset`
	* New `2d` property support `shadowColor`,`shadowBlur`, `shadowOffsetX`,`shadowOffstY`
	* Font support `measureText` and `Italic` style
	* `Fill()`、`Clip()` , support winding-rule and promote performance
	* Out of Android platform- implementation :`GCanvas2DContextAndroid`,`GCanvasAndroid`,`GFontManagerAndroid`,
	* Refactor Android-Weex `GcanvasWeexAndroid`
	* Fix some compatibility issue



* Weex GCanvas Component
	* Update New `WeexSDK` (>=0.26.0)
	* [iOS] `iOS` deployment_target update to iOS 9.0
	* [Android]`Android`:moudle bridge_spec source code depend on the module gcanvas_library
