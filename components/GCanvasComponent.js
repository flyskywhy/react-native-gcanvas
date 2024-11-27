import React, {Component} from 'react';
// import PropTypes from 'prop-types';
import {
  NativeEventEmitter,
  NativeModules,
  PanResponder,
  PixelRatio,
  Platform,
  Text,
  View,
  findNodeHandle,
} from 'react-native';
import '@flyskywhy/react-native-browser-polyfill';
import CanvasView from './CanvasView';
import {enable, disable, ReactNativeBridge} from '../packages/gcanvas';
ReactNativeBridge.GCanvasModule = NativeModules.GCanvasModule;
ReactNativeBridge.Platform = Platform;

export default class GCanvasView extends Component {
  constructor(props) {
    super(props);
    this.refCanvasView = null;
    this.canvas = null;
    this.panScale = 1;
    this.touchBank = [];
    this.canvasViewPageX = 0;
    this.canvasViewPageY = 0;

    let panResponder = PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => false,
      onPanResponderGrant: (event) => {
        // as [PanResponder is not working when there are multiple touches](https://github.com/facebook/react-native/issues/8094)
        // said, maybe it's a bug of react-native, and found (tested on Android) 2nd finger touch will
        // not invoke onPanResponderGrant(), so be the work around this.touchBank

        // even componentWillUnmount() inovked then componentDidMount() again, the
        // event.touchHistory.touchBank still maintain before componentWillUnmount(),
        // maybe it's a bug of react-native, so be the workaround here
        this.touchBank = event.touchHistory.touchBank.filter(touch => !!touch).map(touch => {return {...touch, touchActive: false}});
      },
      onPanResponderMove: (event, gestureState) => {
        // tested multiple touches with babylonjs demo `Drag and drop` in https://github.com/flyskywhy/GCanvasRNExamples
        let touchBank = event.touchHistory.touchBank.filter(touch => !!touch);

        let toDownTouchs = touchBank.filter(cur => {
          let preFound = this.touchBank.find(pre => this.touch2PointerId(pre) === this.touch2PointerId(cur));
          if (preFound) {
            if (!preFound.touchActive && cur.touchActive) {
              // new finger touch can be here because `touchActive: false` workaround in onPanResponderGrant()
              return true;
            } else {
              // componentWillUnmount() then componentDidMount() again cause
              // event.touchHistory.touchBank still maintain before componentWillUnmount() will
              // preFound.touchActive === false and cur.touchActive === false
              // to be here
              return false;
            }
          } else {
            // 2nd finger touch will be here as 2nd finger touch will not invoke onPanResponderGrant() to change this.touchBank
            return true;
          }
        });
        let toUpTouchs = this.touchBank.filter(pre => touchBank.filter(cur => this.touch2PointerId(cur) === this.touch2PointerId(pre) && !cur.touchActive).length && pre.touchActive);
        let toMoveTouchs = touchBank.filter(cur => {
          if (cur.touchActive) {
            if (toDownTouchs.filter(down => this.touch2PointerId(down) === this.touch2PointerId(cur)).length) {
              // let 'down' -> 'up' that without 'move' in middle can be possible, thus present same behavior with Web
              return false;
            } else {
              return true;
            }
          }
        });

        // need ...touch here otherwise this.touchBank will change automatically with touchBank
        this.touchBank = touchBank.map(touch => {return {...touch}});

        toDownTouchs.map(touch => this.dispatch({touch, type: 'mousedown'}));
        toUpTouchs.map(touch => this.dispatch({touch, type: 'mouseup'}));
        toMoveTouchs.map(touch => this.dispatch({touch, type: 'mousemove'}));
      },
      onPanResponderRelease: (event, gestureState) => {
        // found 2nd finger touch release will not invoke onPanResponderRelease(), so be the work around this.touchBank with toUpTouchs above
        this.touchBank.map(touch => {
          if (touch.touchActive) {
            // actually only last finger touch release will touch.touchActive === true
            this.dispatch({touch, type: 'mouseup'});
            touch.touchActive = false;
          }
        });
      },
      onPanResponderTerminationRequest: () => false,
      onPanResponderTerminate: () => false,
    });

    this.state = {
      panResponder: {},
    };

    if (props.isGestureResponsible) {
      this.state.panResponder = panResponder;
    }
  }

  static propTypes = {
    // isOffscreen: PropTypes.bool,
    ...View.propTypes,
  };

  static defaultProps = {
    // Indicate whether response for gesture inside canvas,
    // so that PanResponder outside GCanvasView can be useable
    // when isGestureResponsible is false.
    // Default is true, so that zdog can be "mousemove".
    isGestureResponsible: true,
    // only affect 2d
    // on Web, putImageData looks like will auto clearRect before,
    // but I think it's more convenient to not clearRect before
    // putImageData when imageData has some transparent pixels,
    // so the default value is false, and if you want to be exactly
    // compatible with Web, you can set it to true
    isAutoClearRectBeforePutImageData: false,
    // With canvas 2d, generally be true, so that can resolve issue
    // [Canvas resize](https://github.com/flyskywhy/react-native-gcanvas/issues/32).
    // If canvas 2d also have ctx call loop like usage of 'zdog', also can be true.
    // With webgl 3d, generally be false, so that can
    // [let webgl 3d can continue gl call loop without restart it by drawSome() after rotate screenOrientation]
    // (https://github.com/flyskywhy/GCanvasRNExamples/commit/3cd2f3f).
    isResetGlViewportAfterSetWidthOrHeight: true,
    // devicePixelRatio default is undefined and means default is PixelRatio.get() ,
    // ref to "About devicePixelRatio" in README.md
    devicePixelRatio: undefined,
    // Indicate whether this canvas can be use by document.createElement('canvas') (as offscreen canvas),
    // ref to README.md for more usage attentions like `zIndex: -100` in style
    offscreenCanvas: false,
    // only affect webgl
    // false: use AutoSwap, means gcanvas use a setInterval(render, 16) to exec cached cmds
    //        to generate and display graphics
    // true: not use AutoSwap, means APP use it's own loop to call gl.clear(), thus gcanvas
    //       will exec cached cmds to generate and display graphics, then add gl.clear to
    //       cmds cache to be exec next time, and also offer APP a canvas._swapBuffers() if
    //       APP want exec cached cmds to generate and display graphics manually
    disableAutoSwap: false,
  };

  dispatch = ({touch, type}) => {
    let pointerEvent = this.touch2PointerEvent({touch, type});
    this.canvas.dispatchEvent(pointerEvent);

    // as `node_modules/zdog/js/dragger.js` use window.addEventListener not element.addEventListener on mousemove
    window.dispatchEvent(pointerEvent);

    switch (type) {
      case 'mousemove':
        this.props.onMouseMove && this.props.onMouseMove(pointerEvent);
        break;
      case 'mousedown':
        this.props.onMouseDown && this.props.onMouseDown(pointerEvent);
        break;
      case 'mouseup':
          this.props.onMouseUp && this.props.onMouseUp(pointerEvent);
        break;
      default:
        break;
    }
  };

  touch2PointerEvent = ({touch, type}) => {
    return {
      altKey: false,
      button: type === 'mousemove' ? -1 : 0,
      buttons: type === 'mousemove' ? 0 : 1,
      clientX: (touch.currentPageX - this.canvasViewPageX) * this.panScale,
      clientY: (touch.currentPageY - this.canvasViewPageY) * this.panScale,
      ctrlKey: false,
      isTrusted: true,
      metaKey: false,
      pageX: touch.currentPageX * this.panScale,
      pageY: touch.currentPageY * this.panScale,
      pointerId: this.touch2PointerId(touch),
      pointerType: "touch",
      shiftKey: false,
      target: this.canvas,
      timeStamp: touch.currentTimeStamp,
      type, //  to works with babylonjs, type should not be 'pointerdown', 'pointermove' or 'pointerup'
    };
  };

  touch2PointerId = (touch) => touch.startTimeStamp + touch.startPageX + touch.startPageY;

  _onIsReady = (event) => {
    if (this.props.onIsReady) {
      this.props.onIsReady(
        Platform.OS === 'ios' ? true : event.nativeEvent.value,
      );
    }
  };

  _onLayout = (event) => {
    let width = event.nativeEvent.layout.width | 0; // width is fixed not float just like Web
    let height = event.nativeEvent.layout.height | 0;
    let ref = '' + findNodeHandle(this.refCanvasView);

    this.refCanvasView && this.refCanvasView.measure((x, y, width, height, pageX, pageY) => {
      this.canvasViewPageX = pageX;
      this.canvasViewPageY = pageY;
    });

    // When onLayout is invoked again (e.g. change phone orientation), if assign
    // `this.canvas` again, that also means `this` in dispatchEvent() of
    // `event-target-shim/dist/event-target-shim.js` changed, thus dispatchEvent()
    // can do nothing and cause `node_modules/zdog/js/dragger.js` can't be moved
    // by finger anymore.
    // So let `this.canvas` be assigned here only once.
    if (this.canvas !== null) {
      if (this.canvas.clientWidth !== width || this.canvas.clientHeight !== height) {
        this.canvas.clientWidth = width;
        this.canvas.clientHeight = height;
        if (this.props.onCanvasResize) {
          // APP can `this.canvas.width = width` in onCanvasResize()
          this.props.onCanvasResize({width, height, canvas: this.canvas});
        }
      }
      return;
    }

    if (this.refCanvasView === null) {
      this._onLayout(event);
      return;
    }

    this.canvas = enable(
      {
        ref,
        style: {
          width,
          height,
        },
      },
      {
        isAutoClearRectBeforePutImageData: this.props.isAutoClearRectBeforePutImageData,
        isResetGlViewportAfterSetWidthOrHeight: this.props.isResetGlViewportAfterSetWidthOrHeight,
        devicePixelRatio: this.props.devicePixelRatio,
        disableAutoSwap: this.props.disableAutoSwap,
        bridge: ReactNativeBridge,
      },
    );

    this.panScale = PixelRatio.get() / this.canvas._devicePixelRatio;

    if (this.props.offscreenCanvas && !global.createCanvasElements.includes(this.canvas)) {
      global.createCanvasElements.push(this.canvas);
      if (global.createCanvasElementsObj) {
        // ios release (RN0.71.6 JSC) createCanvasElements.push(canvas) in a class but still
        // get [] means createCanvasElements.length is 0 in another class, so have to
        // use createCanvasElementsObj below, and reserve createCanvasElements for compatible
        global.createCanvasElementsObj[this.canvas.id] = this.canvas;
      }
    }

    if (this.props.onCanvasCreate) {
      this.props.onCanvasCreate(this.canvas);
    }
  };

  componentDidMount() {
    // on iOS, sometimes setLogLevel(0) will cause APP stuck if running in Xcode (because too many logs?), but setLogLevel(0)
    // will not cause APP stuck if not running in damn Xcode, tested in https://github.com/flyskywhy/snakeRN
    // ReactNativeBridge.GCanvasModule.setLogLevel(0); // 0 means DEBUG

    // since https://github.com/flyskywhy/react-native-gcanvas/issues/44 said latest RN
    // will warning `EventEmitter.removeListener ... Method has been deprecated` and
    // only iOS use EventEmitter and on iOS always true in _onIsReady(), so just comment below
    // if (Platform.OS === 'ios') {
    //   // while always true in _onIsReady(), here is just to suppress warning
    //   // on iOS Sending `GCanvasReady` with no listeners registered.
    //   const emitter = new NativeEventEmitter(ReactNativeBridge.GCanvasModule);
    //   emitter.addListener('GCanvasReady', this._onIsReady);
    // }
  }

  componentWillUnmount() {
    if (this.canvas !== null) {
      disable(this.canvas);
    }

    let index = global.createCanvasElements.findIndex(canvas => canvas === this.canvas);
    if (index >= 0) {
      global.createCanvasElements.splice(index, 1);
    }

    if (global.createCanvasElementsObj && global.createCanvasElementsObj[this.canvas.id]) {
      delete global.createCanvasElementsObj[this.canvas.id];
    }

    // if (Platform.OS === 'ios') {
    //   const emitter = new NativeEventEmitter(ReactNativeBridge.GCanvasModule);
    //   emitter.removeListener('GCanvasReady', this._onIsReady);
    // }
  }

  render() {
    if (Platform.OS === 'web') {
      return (
        <View {...this.props}>
          <Text>{'Please use <canvas> not <CanvasView> on Web'}</Text>
        </View>
      );
    } else {
      return (
        <CanvasView
          {...this.props}
          {...this.state.panResponder.panHandlers}
          ref={(view) => (this.refCanvasView = view)}
          onLayout={this._onLayout}
          onChange={this._onIsReady}
        />
      );
    }
  }
}
