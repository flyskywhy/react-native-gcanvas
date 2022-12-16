import React, {Component} from 'react';
// import PropTypes from 'prop-types';
import {
  NativeEventEmitter,
  NativeModules,
  PanResponder,
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

    let panResponder = PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => false,
      onPanResponderGrant: (event) => {
        let eventShim = {...event.nativeEvent, type: 'mousedown'};
        this.canvas.dispatchEvent(eventShim);
        window.dispatchEvent(eventShim);

        let mouseEvent = this.eventTouch2Mouse(event.nativeEvent);
        mouseEvent.type = 'mousedown';
        props.onMouseDown && props.onMouseDown(mouseEvent);
      },
      onPanResponderMove: (event, gestureState) => {
        let eventShim = {...event.nativeEvent, type: 'mousemove'};
        this.canvas.dispatchEvent(eventShim);

        // as `node_modules/zdog/js/dragger.js` use window.addEventListener not element.addEventListener on mousemove
        window.dispatchEvent(eventShim);

        let mouseEvent = this.eventTouch2Mouse(event.nativeEvent);
        mouseEvent.type = 'mousemove';
        props.onMouseMove && props.onMouseMove(mouseEvent);
      },
      onPanResponderRelease: (event, gestureState) => {
        let eventShim = {...event.nativeEvent, type: 'mouseup'};
        this.canvas.dispatchEvent(eventShim);
        window.dispatchEvent(eventShim);

        let mouseEvent = this.eventTouch2Mouse(event.nativeEvent);
        mouseEvent.type = 'mousedown';
        props.onMouseUp && props.onMouseUp(mouseEvent);
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
    // devicePixelRatio default is undefined and means default is PixelRatio.get() ,
    // ref to "About devicePixelRatio" in README.md
    devicePixelRatio: undefined,
    // only affect webgl
    // false: use AutoSwap, means gcanvas use a setInterval(render, 16) to exec cached cmds
    //        to generate and display graphics
    // true: not use AutoSwap, means APP use it's own loop to call gl.clear(), thus gcanvas
    //       will exec cached cmds to generate and display graphics, then add gl.clear to
    //       cmds cache to be exec next time, and also offer APP a canvas._swapBuffers() if
    //       APP want exec cached cmds to generate and display graphics manually
    disableAutoSwap: false,
  };

  eventTouch2Mouse = (nativeEvent) => {
    if (nativeEvent.type) {
      // real mouse event have `type` but touch not
      // TODO: test with real mouse
      return {...nativeEvent};
    } else {
      return {
        altKey: false,
        button: 0,
        buttons: 1,
        clientX: nativeEvent.locationX,
        clientY: nativeEvent.locationY,
        ctrlKey: false,
        isTrusted: true,
        metaKey: false,
        pageX: nativeEvent.pageX,
        pageY: nativeEvent.pageY,
        shiftKey: false,
        target: this.canvas,
        timeStamp: nativeEvent.timestamp,
      }
    }
  }

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
        devicePixelRatio: this.props.devicePixelRatio,
        disableAutoSwap: this.props.disableAutoSwap,
        bridge: ReactNativeBridge,
      },
    );

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
