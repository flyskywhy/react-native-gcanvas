import GLmethod from '../context/webgl/GLmethod';

const isReactNativeIOS = () => {
  return GBridge.Platform.OS === 'ios';
};

const isReactNativeAndroid = () => {
  return GBridge.Platform.OS === 'android';
};

let isDebugging = false;

let isComboDisabled = false;

const logCommand = (function() {
  const methodQuery = [];
  Object.keys(GLmethod).forEach(key => {
    methodQuery[GLmethod[key]] = key;
  });
  const queryMethod = (id) => {
    return methodQuery[parseInt(id)] || 'NotFoundMethod';
  };
  const logCommand = (id, cmds) => {
    const mId = cmds.split(',')[0];
    const mName = queryMethod(mId);
    console.log(`=== callNative - componentId:${id}; method: ${mName}; cmds: ${cmds}`);
  };
  return logCommand;
})();

function joinArray(arr, sep) {
  let res = '';
  for (let i = 0; i < arr.length; i++) {
    if (i !== 0) {
      res += sep;
    }
    res += arr[i];
  }
  return res;
}

const commandsCache = {};
const viewport2commands = {};

const GBridge = {

  GCanvasModule: null,

  Platform: null,

  callEnable: (ref, configArray) => {
    commandsCache[ref] = [];

    return GBridge.GCanvasModule.enable({
      componentId: ref,
      config: configArray
    });
  },

  callEnableDebug: () => {
    isDebugging = true;
  },

  callEnableDisableCombo: () => {
    isComboDisabled = true;
  },

  callDisable: (ref) => {
    GBridge.GCanvasModule.disable(ref);
  },

  callSetContextType: function(componentId, context_type) {
    GBridge.GCanvasModule.setContextType(context_type, componentId);
  },

  callSetDevicePixelRatio: function(componentId, ratio) {
    GBridge.GCanvasModule.setDevicePixelRatio(componentId, ratio);
  },

  callResetGlViewport: function(componentId) {
    GBridge.GCanvasModule.resetGlViewport(componentId);
  },

  callToDataURL: function(componentId, mimeType, quality) {
    return GBridge.GCanvasModule.toDataURL(componentId, mimeType, quality);
  },

  callReset: function(componentId) {
    GBridge.GCanvasModule.resetComponent && GBridge.GCanvasModule.resetComponent(componentId);
  },

  callViewport: (componentId, viewportArgs) => {
    viewport2commands[componentId] = viewportArgs;
  },

  callNative: function(
    componentId,
    cmdArgs,
    isCacheCmd = false,
    contextType = 'webgl',
    methodType = 'sync',
    optionType = 'execWithoutDisplay',
  ) {
    if (contextType === '2d') {
      if (isDebugging) {
        console.log('>>> exec commands: ' + cmdArgs);
      }

      if (methodType === 'sync') {
        /* call native type description
         +---------------------------------------------------+
         |                   32 bit integer                  |
         +---------------------------------------------------+
         |    31~30    |    29      |      (28~0)            |
         | ContextType | MethodType |     OptionType         |
         +---------------------------------------------------+
         |    1-webgl  | 0-async RN |  0-execWithoutDisplay  |
         |    0-2d     | 1-sync RN  |  1-execWithDisplay     |
         +---------------------------------------------------+
         */
        // MethodType async RN above means call native async and resume JS
        //
        // MethodType sync RN above means call native untill native return then resume JS:
        // on Android, will waitUtilTimeout() cmd exec indirectly by QueueProc(), then resume JS
        // on iOS, if with ContextType 2d and OptionType execWithDisplay, will waitUtilTimeout() cmd exec indirectly
        //         by drawInRect(), then resume JS, but actually, since cause low JS FPS as described in getImageData()
        //         of `context/2d/RenderingContext.js`, seems `2d + sync RN + execWithDisplay` situation will not happen;
        //         if with ContextType webgl, ref to below
        //
        // OptionType execWithDisplay in 2d above means:
        // on Android, indirectly exec cmd to generate new graphics then eglSwapBuffers() to display new graphics
        //             on screen by QueueProc()
        // on iOS, setNeedsDisplay() to display old graphics on screen, and thus will impliedly invoke drawInRect()
        //         to indirectly exec cmd to generate new graphics (can then be getImageData() even not be displayed)
        //
        // OptionType execWithDisplay in webgl above means:
        // on Android, indirectly exec cmd to generate new graphics then eglSwapBuffers() to display new graphics
        //             on screen by QueueProc()
        // on iOS, directly exec cmd to generate new graphics then setNeedsDisplay() to display new graphics on
        //         screen, and will not impliedly invoke drawInRect() since `component.glkview.delegate = nil;`
        //
        // OptionType execWithoutDisplay in 2d or webgl above means:
        // on Android, just indirectly exec cmd by QueueProc() to generate new graphics
        // on iOS, just directly exec cmd to generate new graphics

        let type = optionType === 'execWithDisplay' ? 0x20000001 : 0x20000000;
        // extendCallNative() is a sync RN method, if want get exec cmd result, must use it
        const result = GBridge.GCanvasModule.extendCallNative({
          contextId: componentId,
          args: cmdArgs,
          type,
        });

        const res = result && result.result;

        if (isDebugging) {
          console.log('>>> result: ' + res);
        }

        return res;
      } else {
        let type = optionType === 'execWithDisplay' ? 0x00000001 : 0x00000000;
        // render() is an async RN method
        GBridge.GCanvasModule.render(componentId, cmdArgs, type);
      }
    } else { // 'webgl'
      if (isDebugging) {
        logCommand(componentId, cmdArgs);
      }

      if (cmdArgs) {
        commandsCache[componentId].push(cmdArgs);
      }

      if (!isCacheCmd || isComboDisabled) {
        let commands = joinArray(commandsCache[componentId], ';');
        commandsCache[componentId] = [];

        if (isReactNativeIOS()) {
          // if no hack additional viewportArgs beyond the commands, glViewport() in C++ will has no
          // effect in:
          // 1. `webgl_demo/cube.js` which invoke gl.viewport() every 16ms , and _disableAutoSwap is true
          // 2. https://github.com/flyskywhy/snakeRN which invoke gl.viewport() twice within pixi.js
          // damn iOS
          const viewportArgs = viewport2commands[componentId];
          if (viewportArgs) {
            commands = viewportArgs + ';' + commands;
          }
        }

        if (isDebugging) {
          console.log('>>> exec commands: ' + commands);
        }

        if (methodType === 'sync') {
          // most gl ops should be sync, otherwise may cause issue like
          // https://stackoverflow.com/questions/9008291/webgls-getattriblocation-oddly-returns-1
          let type = optionType === 'execWithDisplay' ? 0x60000001 : 0x60000000;
          const result = GBridge.GCanvasModule.extendCallNative({
            contextId: componentId,
            args: commands,
            type,
          });

          const res = result && result.result;

          if (isDebugging) {
            console.log('>>> result: ' + res);
          }

          return res;
        } else {
          let type = optionType === 'execWithDisplay' ? 0x40000001 : 0x40000000;
          GBridge.GCanvasModule.render(componentId, commands, type);
        }
      }
    }
  },


  texImage2D(componentId, ...args) {
    if (isReactNativeAndroid()) {
      const [target, level, internalformat, format, type, image] = args;
      GBridge.GCanvasModule.texImage2D(componentId, target, level, internalformat, format, type, image.src);
    }
  },

  texSubImage2D(componentId, ...args) {
    if (isReactNativeAndroid()) {
      const [target, level, xoffset, yoffset, format, type, image] = args;
      GBridge.GCanvasModule.texSubImage2D(componentId, target, level, xoffset, yoffset, format, type, image.src);
    }
  },

  drawCanvas2Canvas(map) {
    GBridge.GCanvasModule.drawCanvas2Canvas(map);
  },

  bindImageTexture(componentId, src, imageId) {
    GBridge.GCanvasModule.bindImageTexture([src, imageId], componentId, function(e) {

    });
  },

  preloadImage([url, id], callback) {
    GBridge.GCanvasModule.preLoadImage([url, id], function(image) {
      image.url = url;
      image.id = id;
      callback(image);
    });
  }
};

export default GBridge;
