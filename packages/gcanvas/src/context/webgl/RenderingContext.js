import GLenum from './GLenum';
import ActiveInfo from './ActiveInfo';
import Buffer from './Buffer';
import Framebuffer from './Framebuffer';
import Renderbuffer from './Renderbuffer';
import Texture from './Texture';
import Program from './Program';
import Shader from './Shader';
import ShaderPrecisionFormat from './ShaderPrecisionFormat';
import UniformLocation from './UniformLocation';
import GLmethod from './GLmethod';

const processArray = (array, checkArrayType = false) => {
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

  let type = 'Float32Array';
  if (checkArrayType) {
    if (array instanceof Uint8Array) {
      type = 'Uint8Array';
    } else if (array instanceof Uint16Array) {
      type = 'Uint16Array';
    } else if (array instanceof Uint32Array) {
      type = 'Uint32Array';
    } else if (array instanceof Float32Array) {
      type = 'Float32Array';
    } else if (array instanceof ArrayBuffer) {
      let uint8Array = new Uint8Array(array);
      return 1 + ',' + btoa(joinArray(uint8Array, ','));
    } else {
      throw new Error('Check array type failed. Array type is ' + typeof array);
    }
  }

  const ArrayTypes = {
    Uint8Array: 1,
    Uint16Array: 2,
    Uint32Array: 4,
    Float32Array: 14
  };
  return ArrayTypes[type] + ',' + btoa(joinArray(array, ','));
};

export default class WebGLRenderingContext {
  // static GBridge = null;

  className = 'WebGLRenderingContext';

  componentId = null;


  _resetContextAttributes({}) {}

  constructor(canvas, type, attrs) {
    this._canvas = canvas;
    this._type = type;
    this._version = 'WebGL 1.0';
    this._attrs = attrs;
    this._map = new Map();
    this._supportedExtensions = [];

    Object.keys(GLenum)
          .forEach(name => Object.defineProperty(this, name, {
            value: GLenum[name]
          }));

    this._resetContextAttributes({});
  }

  get canvas() {
    return this._canvas;
  }

  activeTexture = function(textureUnit) {
    WebGLRenderingContext.GBridge.callNative(
      this._canvas.id,
      GLmethod.activeTexture + ',' + textureUnit,
      true
    );
  }

  attachShader = function(progarm, shader) {
    WebGLRenderingContext.GBridge.callNative(
      this._canvas.id,
      GLmethod.attachShader + ',' + progarm.id + ',' + shader.id,
      true
    );
  }

  bindAttribLocation = function(program, index, name) {
    WebGLRenderingContext.GBridge.callNative(
      this._canvas.id,
      GLmethod.bindAttribLocation + ',' + program.id + ',' + index + ',' + name,
      true
    );
  }

  bindBuffer = function(target, buffer) {
    WebGLRenderingContext.GBridge.callNative(
      this._canvas.id,
      GLmethod.bindBuffer + ',' + target + ',' + (buffer ? buffer.id : 0),
      true
    );
  }

  bindFramebuffer = function(target, framebuffer) {
    WebGLRenderingContext.GBridge.callNative(
      this._canvas.id,
      GLmethod.bindFramebuffer + ',' + target + ',' + (framebuffer ? framebuffer.id : 0),
      true
    );
  }

  bindRenderbuffer = function(target, renderBuffer) {
    WebGLRenderingContext.GBridge.callNative(
      this._canvas.id,
      GLmethod.bindRenderbuffer + ',' + target + ',' + (renderBuffer ? renderBuffer.id : 0),
      true
    );
  }

  bindTexture = function(target, texture) {
    WebGLRenderingContext.GBridge.callNative(
      this._canvas.id,
      GLmethod.bindTexture + ',' + target + ',' + (texture ? texture.id : 0),
      // true, // if true, will flick before display all in https://github.com/flyskywhy/GCanvasRNExamples/src/nonDeclarative.js
    );
  }

  blendColor = function(r, g, b, a) {
    WebGLRenderingContext.GBridge.callNative(
      this._canvas.id,
      GLmethod.blendColor + ',' + r + ',' + g + ',' + b + ',' + a,
      true
    );
  }

  blendEquation = function(mode) {
    WebGLRenderingContext.GBridge.callNative(
      this._canvas.id,
      GLmethod.blendEquation + ',' + mode,
      true
    );
  }

  blendEquationSeparate = function(modeRGB, modeAlpha) {
    WebGLRenderingContext.GBridge.callNative(
      this._canvas.id,
      GLmethod.blendEquationSeparate + ',' + modeRGB + ',' + modeAlpha,
      true
    );
  }


  blendFunc = function(sfactor, dfactor) {
    WebGLRenderingContext.GBridge.callNative(
      this._canvas.id,
      GLmethod.blendFunc + ',' + sfactor + ',' + dfactor,
      true
    );
  }

  blendFuncSeparate = function(srcRGB, dstRGB, srcAlpha, dstAlpha) {
    WebGLRenderingContext.GBridge.callNative(
      this._canvas.id,
      GLmethod.blendFuncSeparate + ',' + srcRGB + ',' + dstRGB + ',' + srcAlpha + ',' + dstAlpha,
      true
    );
  }

  bufferData = function(target, data, usage) {
    WebGLRenderingContext.GBridge.callNative(
      this._canvas.id,
      GLmethod.bufferData + ',' + target + ',' + processArray(data, true) + ',' + usage,
      true
    );
  }

  bufferSubData = function(target, offset, data) {
    WebGLRenderingContext.GBridge.callNative(
      this._canvas.id,
      GLmethod.bufferSubData + ',' + target + ',' + offset + ',' + processArray(data, true),
      true
    );
  }

  checkFramebufferStatus = function(target) {
    const result = WebGLRenderingContext.GBridge.callNative(
      this._canvas.id,
      GLmethod.checkFramebufferStatus + ',' + target
    );
    return Number(result);
  }

  // not a Web webgl API, used by @flyskywhy/react-native-gcanvas
  flushJsCommands2CallNative(
    methodType = 'sync',
    optionType = 'execWithDisplay',
  ) {
    WebGLRenderingContext.GBridge.callNative(
      this.componentId,
      '',
      false, // here false will let cmds cache be empty
      'webgl',
      methodType,
      optionType,
    );
  }

  clear = function(mask) {
    if (this._canvas._disableAutoSwap) {
      this.flushJsCommands2CallNative();
      // above exec cached cmds to generate and display graphics
      // below add gl.clear to cmds cache to be exec next time
      WebGLRenderingContext.GBridge.callNative(
        this._canvas.id,
        GLmethod.clear + ',' + mask,
        true,
      );
    } else {
      WebGLRenderingContext.GBridge.callNative(
        this._canvas.id,
        GLmethod.clear + ',' + mask,
        true, // TODO: no matter true or false in https://github.com/flyskywhy/snakeRN can keep 60 JS FPS, maybe need more APP code to test
      );
      this._canvas._needRender = true;
    }
  }

  clearColor = function(r, g, b, a) {
    WebGLRenderingContext.GBridge.callNative(
      this._canvas.id,
      GLmethod.clearColor + ',' + r + ',' + g + ',' + b,
      true
    );
  }

  clearDepth = function(depth) {
    WebGLRenderingContext.GBridge.callNative(
      this._canvas.id,
      GLmethod.clearDepth + ',' + depth,
      true
    );
  }

  clearStencil = function(s) {
    WebGLRenderingContext.GBridge.callNative(
      this._canvas.id,
      GLmethod.clearStencil + ',' + s
    );
  }

  colorMask = function(r, g, b, a) {
    WebGLRenderingContext.GBridge.callNative(
      this._canvas.id,
      GLmethod.colorMask + ',' + Number(r) + ',' + Number(g) + ',' + Number(b) + ',' + Number(a),
    );
  }

  compileShader = function(shader) {
    WebGLRenderingContext.GBridge.callNative(
      this._canvas.id,
      GLmethod.compileShader + ',' + shader.id,
      true
    );
  }

  compressedTexImage2D = function(target, level, internalformat, width, height, border, pixels) {
    WebGLRenderingContext.GBridge.callNative(
      this._canvas.id,
      GLmethod.compressedTexImage2D + ',' + target + ',' + level + ',' + internalformat + ',' +
          width + ',' + height + ',' + border + ',' + processArray(pixels),
      true
    );
  }

  compressedTexSubImage2D = function(target, level, xoffset, yoffset, width, height, format, pixels) {
    WebGLRenderingContext.GBridge.callNative(
      this._canvas.id,
      GLmethod.compressedTexSubImage2D + ',' + target + ',' + level + ',' + xoffset + ',' + yoffset + ',' +
          width + ',' + height + ',' + format + ',' + processArray(pixels),
      true
    );
  }


  copyTexImage2D = function(target, level, internalformat, x, y, width, height, border) {
    WebGLRenderingContext.GBridge.callNative(
      this._canvas.id,
      GLmethod.copyTexImage2D + ',' + target + ',' + level + ',' + internalformat + ',' + x + ',' + y + ',' +
          width + ',' + height + ',' + border,
      true
    );
  }

  copyTexSubImage2D = function(target, level, xoffset, yoffset, x, y, width, height) {
    WebGLRenderingContext.GBridge.callNative(
      this._canvas.id,
      GLmethod.copyTexSubImage2D + ',' + target + ',' + level + ',' + xoffset + ',' + yoffset + ',' + x + ',' + y + ',' +
          width + ',' + height,
      true, // TODO: maybe need more APP code to test
    );
  }

  createBuffer = function() {
    const result = WebGLRenderingContext.GBridge.callNative(
      this._canvas.id,
      GLmethod.createBuffer + ''
    );
    const buffer = new Buffer(result);
    this._map.set(buffer.uuid(), buffer);
    return buffer;
  }

  createFramebuffer = function() {
    const result = WebGLRenderingContext.GBridge.callNative(
      this._canvas.id,
      GLmethod.createFramebuffer + ''
    );
    const framebuffer = new Framebuffer(result);
    this._map.set(framebuffer.uuid(), framebuffer);
    return framebuffer;
  }


  createProgram = function() {
    const id = WebGLRenderingContext.GBridge.callNative(
      this._canvas.id,
      GLmethod.createProgram + ''
    );
    const program = new Program(id);
    this._map.set(program.uuid(), program);
    return program;
  }

  createRenderbuffer = function() {
    const id = WebGLRenderingContext.GBridge.callNative(
      this._canvas.id,
      GLmethod.createRenderbuffer + ''
    );
    const renderBuffer = new Renderbuffer(id);
    this._map.set(renderBuffer.uuid(), renderBuffer);
    return renderBuffer;
  }

  createShader = function(type) {
    const id = WebGLRenderingContext.GBridge.callNative(
      this._canvas.id,
      GLmethod.createShader + ',' + type
    );
    const shader = new Shader(id, type);
    this._map.set(shader.uuid(), shader);
    return shader;
  }

  createTexture = function() {
    const id = WebGLRenderingContext.GBridge.callNative(
      this._canvas.id,
      GLmethod.createTexture + ''
    );
    const texture = new Texture(id);
    this._map.set(texture.uuid(), texture);
    return texture;
  }

  cullFace = function(mode) {
    WebGLRenderingContext.GBridge.callNative(
      this._canvas.id,
      GLmethod.cullFace + ',' + mode,
      true
    );
  }


  deleteBuffer = function(buffer) {
    WebGLRenderingContext.GBridge.callNative(
      this._canvas.id,
      GLmethod.deleteBuffer + ',' + buffer.id,
      true
    );
  }

  deleteFramebuffer = function(framebuffer) {
    WebGLRenderingContext.GBridge.callNative(
      this._canvas.id,
      GLmethod.deleteFramebuffer + ',' + framebuffer.id,
      true
    );
  }

  deleteProgram = function(program) {
    WebGLRenderingContext.GBridge.callNative(
      this._canvas.id,
      GLmethod.deleteProgram + ',' + program.id,
      true
    );
  }

  deleteRenderbuffer = function(renderbuffer) {
    WebGLRenderingContext.GBridge.callNative(
      this._canvas.id,
      GLmethod.deleteRenderbuffer + ',' + renderbuffer.id,
      true
    );
  }

  deleteShader = function(shader) {
    WebGLRenderingContext.GBridge.callNative(
      this._canvas.id,
      GLmethod.deleteShader + ',' + shader.id,
      true
    );
  }

  deleteTexture = function(texture) {
    WebGLRenderingContext.GBridge.callNative(
      this._canvas.id,
      GLmethod.deleteTexture + ',' + texture.id,
      true
    );
  }

  depthFunc = function(func) {
    WebGLRenderingContext.GBridge.callNative(
      this._canvas.id,
      GLmethod.depthFunc + ',' + func
    );
  }

  depthMask = function(flag) {
    WebGLRenderingContext.GBridge.callNative(
      this._canvas.id,
      GLmethod.depthMask + ',' + Number(flag),
      true
    );
  }

  depthRange = function(zNear, zFar) {
    WebGLRenderingContext.GBridge.callNative(
      this._canvas.id,
      GLmethod.depthRange + ',' + zNear + ',' + zFar,
      true
    );
  }

  detachShader = function(program, shader) {
    WebGLRenderingContext.GBridge.callNative(
      this._canvas.id,
      GLmethod.detachShader + ',' + program.id + ',' + shader.id,
      true
    );
  }

  disable = function(cap) {
    WebGLRenderingContext.GBridge.callNative(
      this._canvas.id,
      GLmethod.disable + ',' + cap,
      true
    );
  }

  disableVertexAttribArray = function(index) {
    WebGLRenderingContext.GBridge.callNative(
      this._canvas.id,
      GLmethod.disableVertexAttribArray + ',' + index,
      true
    );
  }

  drawArrays = function(mode, first, count) {
    WebGLRenderingContext.GBridge.callNative(
      this._canvas.id,
      GLmethod.drawArrays + ',' + mode + ',' + first + ',' + count,
      true,
    );
    this._canvas._needRender = true;
  }

  drawElements = function(mode, count, type, offset) {
    WebGLRenderingContext.GBridge.callNative(
      this._canvas.id,
      GLmethod.drawElements + ',' + mode + ',' + count + ',' + type + ',' + offset,
      true,
    );
    this._canvas._needRender = true;
  }

  enable = function(cap) {
    WebGLRenderingContext.GBridge.callNative(
      this._canvas.id,
      GLmethod.enable + ',' + cap,
      true
    );
  }

  enableVertexAttribArray = function(index) {
    WebGLRenderingContext.GBridge.callNative(
      this._canvas.id,
      GLmethod.enableVertexAttribArray + ',' + index,
      true
    );
  }


  flush = function() {
    WebGLRenderingContext.GBridge.callNative(
      this._canvas.id,
      GLmethod.flush + ''
    );
  }

  framebufferRenderbuffer = function(target, attachment, textarget, texture) {
    WebGLRenderingContext.GBridge.callNative(
      this._canvas.id,
      GLmethod.framebufferRenderbuffer + ',' + target + ',' + attachment + ',' + textarget + ',' + (texture ? texture.id : 0),
      true
    );
  }

  framebufferTexture2D = function(target, attachment, textarget, texture, level) {
    WebGLRenderingContext.GBridge.callNative(
      this._canvas.id,
      GLmethod.framebufferTexture2D + ',' + target + ',' + attachment + ',' + textarget + ',' + (texture ? texture.id : 0) + ',' + level,
      true
    );
  }

  frontFace = function(mode) {
    WebGLRenderingContext.GBridge.callNative(
      this._canvas.id,
      GLmethod.frontFace + ',' + mode,
      true
    );
  }

  generateMipmap = function(target) {
    WebGLRenderingContext.GBridge.callNative(
      this._canvas.id,
      GLmethod.generateMipmap + ',' + target,
      true
    );
  }

  getActiveAttrib = function(progarm, index) {
    const resultString = WebGLRenderingContext.GBridge.callNative(
      this._canvas.id,
      GLmethod.getActiveAttrib + ',' + progarm.id + ',' + index
    );
    const [type, size, name] = resultString.split(',');
    return new ActiveInfo({
      type: Number(type),
      size: Number(size),
      name
    });
  }

  getActiveUniform = function(progarm, index) {
    const resultString = WebGLRenderingContext.GBridge.callNative(
      this._canvas.id,
      GLmethod.getActiveUniform + ',' + progarm.id + ',' + index
    );
    const [type, size, name] = resultString.split(',');
    return new ActiveInfo({
      type: Number(type),
      size: Number(size),
      name
    });
  }

  getAttachedShaders = function(progarm) {
    const result = WebGLRenderingContext.GBridge.callNative(
      this._canvas.id,
      GLmethod.getAttachedShaders + ',' + progarm.id
    );
    const [type, ...ids] = result;
    return ids.map(id => this._map.get(Shader.uuid(id)));
  }

  getAttribLocation = function(progarm, name) {
    return WebGLRenderingContext.GBridge.callNative(
      this._canvas.id,
      GLmethod.getAttribLocation + ',' + progarm.id + ',' + name
    );
  }

  getBufferParameter = function(target, pname) {
    const [type, res] = WebGLRenderingContext.GBridge.callNative(
      this._canvas.id,
      GLmethod.getBufferParameter + ',' + target + ',' + pname
    );
    return res;
  }

  // http://web-developer-articles.blogspot.com/2015/12/webgl-rendering-context.html
  // A current implementation of WebGL in a flagship browser will produce the following list of attributes and their default values:
  // {
  // antialias: true
  // depth: true
  // premultipliedAlpha: true
  // preserveDrawingBuffer: false
  // stencil: false
  // }
  //
  // https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/getContextAttributes
  // the getContextAttributes method returns an object that describes the attributes set on this context, for example:
  // {
  //   alpha: true,
  //   antialias: true,
  //   depth: true,
  //   failIfMajorPerformanceCaveat: false,
  //   powerPreference: "default",
  //   premultipliedAlpha: true,
  //   preserveDrawingBuffer: false,
  //   stencil: false,
  //   desynchronized: false
  // }
  getContextAttributesResult = {
    alpha: true,
    antialias: true,
    depth: true,
    failIfMajorPerformanceCaveat: false,
    powerPreference: "default",
    premultipliedAlpha: false,
    preserveDrawingBuffer: false,
    stencil: true,
    desynchronized: false
  };

  getContextAttributes = function() {
    return this.getContextAttributesResult;
  }

  getError = function() {
    const result = WebGLRenderingContext.GBridge.callNative(
      this._canvas.id,
      GLmethod.getError + ''
    );
    return result;
  }

  getExtension = function(name) {
    this.getSupportedExtensions();

    switch (name) {
      // return null to let _initGLContext() in @babylonjs@5.1.0/core/Engines/thinEngine.js works
      case 'EXT_disjoint_timer_query':
      case 'EXT_disjoint_timer_query_webgl2':
      case 'OES_texture_float':
      case 'OES_texture_half_float':
      case 'OES_vertex_array_object':
      case 'KHR_parallel_shader_compile':
      case 'EXT_texture_filter_anisotropic':
      case 'WEBKIT_EXT_texture_filter_anisotropic':
      case 'MOZ_EXT_texture_filter_anisotropic':

        // maybe some APP need these
        // case 'OES_texture_float_linear':
        // case 'OES_texture_half_float_linear':
        return null;
      default:
        return this._supportedExtensions.includes(name) ? true : null;
    }
  }

  getFramebufferAttachmentParameter = function(target, attachment, pname) {
    const result = WebGLRenderingContext.GBridge.callNative(
      this._canvas.id,
      GLmethod.getFramebufferAttachmentParameter + ',' + target + ',' + attachment + ',' + pname
    );
    switch (pname) {
      case GLenum.FRAMEBUFFER_ATTACHMENT_OBJECT_NAME:
        return this._map.get(Renderbuffer.uuid(result)) || this._map.get(Texture.uuid(result)) || null;
      default:
        return result;
    }
  }

  getParameter = function(pname) {
    const result = WebGLRenderingContext.GBridge.callNative(
      this._canvas.id,
      GLmethod.getParameter + ',' + pname
    );
    switch (pname) {
      case GLenum.VERSION:
        return this._version + result.replace(/.,/, ' ');
      case GLenum.ARRAY_BUFFER_BINDING: // buffer
      case GLenum.ELEMENT_ARRAY_BUFFER_BINDING: // buffer
        return this._map.get(Buffer.uuid(result)) || null;
      case GLenum.CURRENT_PROGRAM: // program
        return this._map.get(Program.uuid(result)) || null;
      case GLenum.FRAMEBUFFER_BINDING: // framebuffer
        return this._map.get(Framebuffer.uuid(result)) || null;
      case GLenum.RENDERBUFFER_BINDING: // renderbuffer
        return this._map.get(Renderbuffer.uuid(result)) || null;
      case GLenum.TEXTURE_BINDING_2D: // texture
      case GLenum.TEXTURE_BINDING_CUBE_MAP: // texture
        return this._map.get(Texture.uuid(result)) || null;
      case GLenum.ALIASED_LINE_WIDTH_RANGE: // Float32Array
      case GLenum.ALIASED_POINT_SIZE_RANGE: // Float32Array
      case GLenum.BLEND_COLOR: // Float32Array
      case GLenum.COLOR_CLEAR_VALUE: // Float32Array
      case GLenum.DEPTH_RANGE: // Float32Array
      case GLenum.MAX_VIEWPORT_DIMS: // Int32Array
      case GLenum.SCISSOR_BOX: // Int32Array
      case GLenum.VIEWPORT: // Int32Array
      case GLenum.COMPRESSED_TEXTURE_FORMATS: // Uint32Array
      default:
        const [type, ...res] = result.split(',');
        if (res.length === 1) {
          return Number(res[0]);
        } else {
          return res.map(Number);
        }
    }
  }

  getProgramInfoLog = function(progarm) {
    return WebGLRenderingContext.GBridge.callNative(
      this._canvas.id,
      GLmethod.getProgramInfoLog + ',' + progarm.id
    );
  }

  getProgramParameter = function(program, pname) {
    const res = WebGLRenderingContext.GBridge.callNative(
      this._canvas.id,
      GLmethod.getProgramParameter + ',' + program.id + ',' + pname
    );

    const [type, result] = res.split(',').map(i => parseInt(i));

    if (type === 1) {
      return Boolean(result);
    } else if (type === 2) {
      return result;
    } else {
      throw new Error('Unrecongized program paramater ' + res + ', type: ' + typeof res);
    }
  }


  getRenderbufferParameter = function(target, pname) {
    const result = WebGLRenderingContext.GBridge.callNative(
      this._canvas.id,
      GLmethod.getRenderbufferParameter + ',' + target + ',' + pname
    );
    return result;
  }


  getShaderInfoLog = function(shader) {
    return WebGLRenderingContext.GBridge.callNative(
      this._canvas.id,
      GLmethod.getShaderInfoLog + ',' + shader.id
    );
  }

  getShaderParameter = function(shader, pname) {
    return WebGLRenderingContext.GBridge.callNative(
      this._canvas.id,
      GLmethod.getShaderParameter + ',' + shader.id + ',' + pname
    );
  }

  getShaderPrecisionFormat = function(shaderType, precisionType) {
    const [rangeMin, rangeMax, precision] = WebGLRenderingContext.GBridge.callNative(
      this._canvas.id,
      GLmethod.getShaderPrecisionFormat + ',' + shaderType + ',' + precisionType
    );
    const shaderPrecisionFormat = new ShaderPrecisionFormat({
      rangeMin: Number(rangeMin),
      rangeMax: Number(rangeMax),
      precision: Number(precision)
    });
    return shaderPrecisionFormat;
  }

  getShaderSource = function(shader) {
    const result = WebGLRenderingContext.GBridge.callNative(
      this._canvas.id,
      GLmethod.getShaderSource + ',' + shader.id
    );
    return result;
  }

  getSupportedExtensions = function() {
    if (this._supportedExtensions.length === 0) {
      const result = WebGLRenderingContext.GBridge.callNative(
        this._canvas.id,
        GLmethod.getSupportedExtensions + '',
      );
      result.split(' ').map(extension => {
        if (extension !== '') {
          this._supportedExtensions.push(extension.replace(/^GL_/, ''));
        }
      });

      let supportsWebGL2 = false;
      let version = Number(this.getParameter(GLenum.VERSION).replace(/^.*OpenGL ES /, '').replace(/ .*$/, ''));
      if (version !== NaN && version >= 3.0) {
        supportsWebGL2 = true;
      }

      if (supportsWebGL2) {
        this._supportedExtensions.push('WEBGL_compressed_texture_astc');
        this._supportedExtensions.push('WEBGL_compressed_texture_etc');
      }
    }

    return this._supportedExtensions;
  }

  getTexParameter = function(target, pname) {
    const result = WebGLRenderingContext.GBridge.callNative(
      this._canvas.id,
      GLmethod.getTexParameter + ',' + target + ',' + pname
    );
    return result;
  }

  getUniformLocation = function(program, name) {
    const id = WebGLRenderingContext.GBridge.callNative(
      this._canvas.id,
      GLmethod.getUniformLocation + ',' + program.id + ',' + name
    );
    if (id === 'null' || id === -1) {
      return null;
    } else {
      return new UniformLocation(Number(id), name);
    }
  }

  getVertexAttrib = function(index, pname) {
    const result = WebGLRenderingContext.GBridge.callNative(
      this._canvas.id,
      GLmethod.getVertexAttrib + ',' + index + ',' + pname
    );
    switch (pname) {
      case GLenum.VERTEX_ATTRIB_ARRAY_BUFFER_BINDING:
        return this._map.get(Buffer.uuid(result)) || null;
      case GLenum.CURRENT_VERTEX_ATTRIB: // Float32Array
      default:
        return result;
    }
  }

  getVertexAttribOffset = function(index, pname) {
    const result = WebGLRenderingContext.GBridge.callNative(
      this._canvas.id,
      GLmethod.getVertexAttribOffset + ',' + index + ',' + pname
    );
    return Number(result);
  }

  isBuffer = function(buffer) {
    const result = WebGLRenderingContext.GBridge.callNative(
      this._canvas.id,
      GLmethod.isBuffer + ',' + buffer.id
    );
    return Boolean(result);
  }

  isContextLost = function() {
    return false;
  }

  isEnabled = function(cap) {
    const result = WebGLRenderingContext.GBridge.callNative(
      this._canvas.id,
      GLmethod.isEnabled + ',' + cap
    );
    return Boolean(result);
  }

  isFramebuffer = function(framebuffer) {
    const result = WebGLRenderingContext.GBridge.callNative(
      this._canvas.id,
      GLmethod.isFramebuffer + ',' + framebuffer.id
    );
    return Boolean(result);
  }

  isProgram = function(program) {
    const result = WebGLRenderingContext.GBridge.callNative(
      this._canvas.id,
      GLmethod.isProgram + ',' + program.id
    );
    return Boolean(result);
  }

  isRenderbuffer = function(renderBuffer) {
    const result = WebGLRenderingContext.GBridge.callNative(
      this._canvas.id,
      GLmethod.isRenderbuffer + ',' + renderBuffer.id
    );
    return Boolean(result);
  }

  isShader = function(shader) {
    const result = WebGLRenderingContext.GBridge.callNative(
      this._canvas.id,
      GLmethod.isShader + ',' + shader.id
    );
    return Boolean(result);
  }

  isTexture = function(texture) {
    const result = WebGLRenderingContext.GBridge.callNative(
      this._canvas.id,
      GLmethod.isTexture + ',' + texture.id
    );
    return Boolean(result);
  }

  lineWidth = function(width) {
    WebGLRenderingContext.GBridge.callNative(
      this._canvas.id,
      GLmethod.lineWidth + ',' + width,
      true
    );
  }

  linkProgram = function(program) {
    WebGLRenderingContext.GBridge.callNative(
      this._canvas.id,
      GLmethod.linkProgram + ',' + program.id,
      true
    );
  }


  pixelStorei = function(pname, param) {
    switch (pname) {
      // OpenGL ES will glGetError()=GL_INVALID_ENUM , so be here
      // TODO: [WebGL和OpenGL的差异 - UNPACK_PREMULTIPLY_ALPHA_WEBGL](https://www.jianshu.com/p/bf21fda9a0b8)
      case GLenum.UNPACK_COLORSPACE_CONVERSION_WEBGL:
      case GLenum.UNPACK_FLIP_Y_WEBGL:
      case GLenum.UNPACK_PREMULTIPLY_ALPHA_WEBGL:
        break;
      default:
        WebGLRenderingContext.GBridge.callNative(
          this._canvas.id,
          GLmethod.pixelStorei + ',' + pname + ',' + Number(param),
        );
        break;
    }
  }

  polygonOffset = function(factor, units) {
    WebGLRenderingContext.GBridge.callNative(
      this._canvas.id,
      GLmethod.polygonOffset + ',' + factor + ',' + units
    );
  }

  readPixels = function(x, y, width, height, format, type, pixels) {
    const result = WebGLRenderingContext.GBridge.callNative(
      this._canvas.id,
      GLmethod.readPixels + ',' + x + ',' + y + ',' + width + ',' + height + ',' + format + ',' + type
    );
    return result;
  }

  renderbufferStorage = function(target, internalFormat, width, height) {
    // WebGL can `GL_DEPTH_STENCIL` but OpenGL ES will getError so use `GL_DEPTH24_STENCIL8` instead
    const intfmt = internalFormat === GLenum.DEPTH_STENCIL ? GLenum.DEPTH24_STENCIL8 : internalFormat;

    WebGLRenderingContext.GBridge.callNative(
      this._canvas.id,
      GLmethod.renderbufferStorage + ',' + target + ',' + intfmt + ',' + width + ',' + height,
      true
    );
  }

  sampleCoverage = function(value, invert) {
    WebGLRenderingContext.GBridge.callNative(
      this._canvas.id,
      GLmethod.sampleCoverage + ',' + value + ',' + Number(invert),
      true
    );
  }

  scissor = function(x, y, width, height) {
    WebGLRenderingContext.GBridge.callNative(
      this._canvas.id,
      GLmethod.scissor + ',' + x + ',' + y + ',' + width + ',' + height,
      true
    );
  }

  shaderSource = function(shader, source) {
    WebGLRenderingContext.GBridge.callNative(
      this._canvas.id,
      GLmethod.shaderSource + ',' + shader.id + ',' + source,
      // true, // if true, will cause no display in https://github.com/flyskywhy/snakeRN
    );
  }

  stencilFunc = function(func, ref, mask) {
    WebGLRenderingContext.GBridge.callNative(
      this._canvas.id,
      GLmethod.stencilFunc + ',' + func + ',' + ref + ',' + mask,
      true
    );
  }

  stencilFuncSeparate = function(face, func, ref, mask) {
    WebGLRenderingContext.GBridge.callNative(
      this._canvas.id,
      GLmethod.stencilFuncSeparate + ',' + face + ',' + func + ',' + ref + ',' + mask,
      true
    );
  }

  stencilMask = function(mask) {
    WebGLRenderingContext.GBridge.callNative(
      this._canvas.id,
      GLmethod.stencilMask + ',' + mask,
      true
    );
  }

  stencilMaskSeparate = function(face, mask) {
    WebGLRenderingContext.GBridge.callNative(
      this._canvas.id,
      GLmethod.stencilMaskSeparate + ',' + face + ',' + mask,
      true
    );
  }

  stencilOp = function(fail, zfail, zpass) {
    WebGLRenderingContext.GBridge.callNative(
      this._canvas.id,
      GLmethod.stencilOp + ',' + fail + ',' + zfail + ',' + zpass
    );
  }

  stencilOpSeparate = function(face, fail, zfail, zpass) {
    WebGLRenderingContext.GBridge.callNative(
      this._canvas.id,
      GLmethod.stencilOp + ',' + face + ',' + fail + ',' + zfail + ',' + zpass,
      true
    );
  }

  texImage2D = function(...args) {
    this.flushJsCommands2CallNative();

    if (!args[args.length - 1]) {
      return;
    }

    let isImagePreLoadedInNative = false;
    if (args.length === 6) {
      let image = args[5];
      // TODO: image start with 'data:image'
      if (image && image.src) {
        if (image.complete) {
          // HTMLImageElement
          isImagePreLoadedInNative = true;
        } else {
          // TODO: do we need automatically load Image here then go on?
          console.warn('HTMLImageElement not loaded!');
          return;
        }
      }
    }

    if (isImagePreLoadedInNative) {
      if (WebGLRenderingContext.GBridge.Platform.OS === 'ios') {
        const [target, level, internalformat, format, type, image] = args;
        WebGLRenderingContext.GBridge.callNative(
          this._canvas.id,
          GLmethod.texImage2D + ',' + 6 + ',' + target + ',' + level + ',' + internalformat + ',' + format + ',' + type + ',' + image.src
        );
      } else {
        WebGLRenderingContext.GBridge.texImage2D(this._canvas.id, ...args);
      }
    } else {
      if (args.length === 6) {
        const [target, level, internalformat, format, type, image] = args;
        let imageData = {};
        const imageIsCanvas = image.hasOwnProperty('nodeName') && image.nodeName.toLowerCase() === 'canvas' && image._context;
        const imageIsImageData = image.data && image.width > 0 && image.height > 0;
        if (imageIsCanvas) {
          imageData = image._context.getImageData(0, 0, image.width, image.height);
        }
        if (imageIsImageData) {
          imageData = image;
        }
        if (imageData.data && imageData.width > 0 && imageData.height > 0) {
          // ImageData
          WebGLRenderingContext.GBridge.callNative(
            this._canvas.id,
            GLmethod.texImage2D + ',' + 9 + ',' + target + ',' + level + ',' + internalformat + ',' +
                imageData.width + ',' + imageData.height + ',' + 0 + ',' + format + ',' + type + ',' + processArray(new Uint8Array(imageData.data), true),
            // true, // if true, will flick before display all in https://github.com/flyskywhy/GCanvasRNExamples/src/nonDeclarative.js
          );
        }
      } else if (args.length === 9) {
        const [target, level, internalformat, width, height, border, format, type, image] = args;
        // usage example 1: gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 0, 0, 255]));
        // usage example 2: gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_X, 0, gl.RGBA, 2, 2, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([187,157,202,255,222,199,255,255,108,75,68,255,139,107,110,255]));
        WebGLRenderingContext.GBridge.callNative(
          this._canvas.id,
          GLmethod.texImage2D + ',' + 9 + ',' + target + ',' + level + ',' + internalformat + ',' +
              width + ',' + height + ',' + border + ',' + format + ',' + type + ',' + processArray(image, true),
          // true, // if true, will flick before display all in https://github.com/flyskywhy/GCanvasRNExamples/src/nonDeclarative.js
        );
      }
    }
  }


  texParameterf = function(target, pname, param) {
    WebGLRenderingContext.GBridge.callNative(
      this._canvas.id,
      GLmethod.texParameterf + ',' + target + ',' + pname + ',' + param,
      // true, // if true, will flick before display all in https://github.com/flyskywhy/GCanvasRNExamples/src/nonDeclarative.js
    );
  }

  texParameteri = function(target, pname, param) {
    WebGLRenderingContext.GBridge.callNative(
      this._canvas.id,
      GLmethod.texParameteri + ',' + target + ',' + pname + ',' + param,
      // true, // if true, will flick before display all in https://github.com/flyskywhy/GCanvasRNExamples/src/nonDeclarative.js
    );
  }

  texSubImage2D = function(...args) {
    this.flushJsCommands2CallNative();

    if (!args[args.length - 1]) {
      return;
    }

    let isImagePreLoadedInNative = false;
    if (args.length === 7) {
      let image = args[6];
      // TODO: image start with 'data:image'
      if (image && image.src) {
        if (image.complete) {
          // HTMLImageElement
          isImagePreLoadedInNative = true;
        } else {
          // TODO: do we need automatically load Image here then go on?
          console.warn('HTMLImageElement not loaded!');
          return;
        }
      }
    }

    if (isImagePreLoadedInNative) {
      if (WebGLRenderingContext.GBridge.Platform.OS === 'ios') {
        const [target, level, xoffset, yoffset, format, type, image] = args;
        WebGLRenderingContext.GBridge.callNative(
          this._canvas.id,
          GLmethod.texSubImage2D + ',' + 7 + ',' + target + ',' + level + ',' + xoffset + ',' + yoffset + ',' + format + ',' + type + ',' + image.src
        );
      } else {
        WebGLRenderingContext.GBridge.texSubImage2D(this._canvas.id, ...args);
      }
    } else {
      if (args.length === 7) {
        const [target, level, xoffset, yoffset, format, type, image] = args;
        let imageData = {};
        const imageIsCanvas = image.hasOwnProperty('nodeName') && image.nodeName.toLowerCase() === 'canvas' && image._context;
        const imageIsImageData = image.data && image.width > 0 && image.height > 0;
        if (imageIsCanvas) {
          imageData = image._context.getImageData(0, 0, image.width, image.height);
        }
        if (imageIsImageData) {
          imageData = image;
        }
        if (imageData.data && imageData.width > 0 && imageData.height > 0) {
          WebGLRenderingContext.GBridge.callNative(
            this._canvas.id,
            GLmethod.texSubImage2D + ',' + 9 + ',' + target + ',' + level + ',' + xoffset + ',' + yoffset + ',' +
                imageData.width + ',' + imageData.height + ',' + format + ',' + type + ',' + processArray(new Uint8Array(imageData.data), true),
            // true, // ref to texImage2D above
          );
        }
      } else if (args.length === 9) {
        const [target, level, xoffset, yoffset, width, height, format, type, image] = args;
        WebGLRenderingContext.GBridge.callNative(
          this._canvas.id,
          GLmethod.texSubImage2D + ',' + 9 + ',' + target + ',' + level + ',' + xoffset + ',' + yoffset + ',' +
              width + ',' + height + ',' + format + ',' + type + ',' + processArray(image, true),
          // true, // ref to texImage2D above
        );
      }
    }
  }

  uniform1f = function(location, v0) {
    WebGLRenderingContext.GBridge.callNative(
      this._canvas.id,
      GLmethod.uniform1f + ',' + location.id + ',' + v0,
      true,
    );
  }

  uniform1fv = function(location, value) {
    WebGLRenderingContext.GBridge.callNative(
      this._canvas.id,
      GLmethod.uniform1fv + ',' + location.id + ',' + processArray(value),
      true
    );
  }

  uniform1i = function(location, v0) {
    WebGLRenderingContext.GBridge.callNative(
      this._canvas.id,
      GLmethod.uniform1i + ',' + location.id + ',' + v0,
      true, // TODO: maybe need more APP code to test
    );
  }

  uniform1iv = function(location, value) {
    WebGLRenderingContext.GBridge.callNative(
      this._canvas.id,
      GLmethod.uniform1iv + ',' + location.id + ',' + processArray(value),
      true
    );
  }

  uniform2f = function(location, v0, v1) {
    WebGLRenderingContext.GBridge.callNative(
      this._canvas.id,
      GLmethod.uniform2f + ',' + location.id + ',' + v0 + ',' + v1,
      true
    );
  }

  uniform2fv = function(location, value) {
    WebGLRenderingContext.GBridge.callNative(
      this._canvas.id,
      GLmethod.uniform2fv + ',' + location.id + ',' + processArray(value),
      true
    );
  }

  uniform2i = function(location, v0, v1) {
    WebGLRenderingContext.GBridge.callNative(
      this._canvas.id,
      GLmethod.uniform2i + ',' + location.id + ',' + v0 + ',' + v1,
      true
    );
  }

  uniform2iv = function(location, value) {
    WebGLRenderingContext.GBridge.callNative(
      this._canvas.id,
      GLmethod.uniform2iv + ',' + location.id + ',' + processArray(value),
      true
    );
  }

  uniform3f = function(location, v0, v1, v2) {
    WebGLRenderingContext.GBridge.callNative(
      this._canvas.id,
      GLmethod.uniform3f + ',' + location.id + ',' + v0 + ',' + v1 + ',' + v2,
      true
    );
  }

  uniform3fv = function(location, value) {
    WebGLRenderingContext.GBridge.callNative(
      this._canvas.id,
      GLmethod.uniform3fv + ',' + location.id + ',' + processArray(value),
      true
    );
  }

  uniform3i = function(location, v0, v1, v2) {
    WebGLRenderingContext.GBridge.callNative(
      this._canvas.id,
      GLmethod.uniform3i + ',' + location.id + ',' + v0 + ',' + v1 + ',' + v2,
      true
    );
  }

  uniform3iv = function(location, value) {
    WebGLRenderingContext.GBridge.callNative(
      this._canvas.id,
      GLmethod.uniform3iv + ',' + location.id + ',' + processArray(value),
      true
    );
  }

  uniform4f = function(location, v0, v1, v2, v3) {
    WebGLRenderingContext.GBridge.callNative(
      this._canvas.id,
      GLmethod.uniform4f + ',' + location.id + ',' + v0 + ',' + v1 + ',' + v2 + ',' + v3,
      true
    );
  }

  uniform4fv = function(location, value) {
    WebGLRenderingContext.GBridge.callNative(
      this._canvas.id,
      GLmethod.uniform4fv + ',' + location.id + ',' + processArray(value),
      true
    );
  }

  uniform4i = function(location, v0, v1, v2, v3) {
    WebGLRenderingContext.GBridge.callNative(
      this._canvas.id,
      GLmethod.uniform4i + ',' + location.id + ',' + v0 + ',' + v1 + ',' + v2 + ',' + v3,
      true
    );
  }

  uniform4iv = function(location, value) {
    WebGLRenderingContext.GBridge.callNative(
      this._canvas.id,
      GLmethod.uniform4iv + ',' + location.id + ',' + processArray(value, true),
      true
    );
  }

  uniformMatrix2fv = function(location, transpose, value) {
    WebGLRenderingContext.GBridge.callNative(
      this._canvas.id,
      GLmethod.uniformMatrix2fv + ',' + location.id + ',' + Number(transpose) + ',' + processArray(value),
      true
    );
  }

  uniformMatrix3fv = function(location, transpose, value) {
    WebGLRenderingContext.GBridge.callNative(
      this._canvas.id,
      GLmethod.uniformMatrix3fv + ',' + location.id + ',' + Number(transpose) + ',' + processArray(value),
      true
    );
  }

  uniformMatrix4fv = function(location, transpose, value) {
    WebGLRenderingContext.GBridge.callNative(
      this._canvas.id,
      GLmethod.uniformMatrix4fv + ',' + location.id + ',' + Number(transpose) + ',' + processArray(value),
      true
    );
  }

  useProgram = function(progarm) {
    WebGLRenderingContext.GBridge.callNative(
      this._canvas.id,
      GLmethod.useProgram + ',' + progarm.id + '',
      true
    );
  }


  validateProgram = function(program) {
    WebGLRenderingContext.GBridge.callNative(
      this._canvas.id,
      GLmethod.validateProgram + ',' + program.id,
      true
    );
  }

  vertexAttrib1f = function(index, v0) {
    WebGLRenderingContext.GBridge.callNative(
      this._canvas.id,
      GLmethod.vertexAttrib1f + ',' + index + ',' + v0,
      true
    );
  }

  vertexAttrib2f = function(index, v0, v1) {
    WebGLRenderingContext.GBridge.callNative(
      this._canvas.id,
      GLmethod.vertexAttrib2f + ',' + index + ',' + v0 + ',' + v1,
      true
    );
  }

  vertexAttrib3f = function(index, v0, v1, v2) {
    WebGLRenderingContext.GBridge.callNative(
      this._canvas.id,
      GLmethod.vertexAttrib3f + ',' + index + ',' + v0 + ',' + v1 + ',' + v2,
      true
    );
  }

  vertexAttrib4f = function(index, v0, v1, v2, v3) {
    WebGLRenderingContext.GBridge.callNative(
      this._canvas.id,
      GLmethod.vertexAttrib4f + ',' + index + ',' + v0 + ',' + v1 + ',' + v2 + ',' + v3,
      true
    );
  }

  vertexAttrib1fv = function(index, value) {
    WebGLRenderingContext.GBridge.callNative(
      this._canvas.id,
      GLmethod.vertexAttrib1fv + ',' + index + ',' + processArray(value),
      true
    );
  }

  vertexAttrib2fv = function(index, value) {
    WebGLRenderingContext.GBridge.callNative(
      this._canvas.id,
      GLmethod.vertexAttrib2fv + ',' + index + ',' + processArray(value),
      true
    );
  }

  vertexAttrib3fv = function(index, value) {
    WebGLRenderingContext.GBridge.callNative(
      this._canvas.id,
      GLmethod.vertexAttrib3fv + ',' + index + ',' + processArray(value),
      true
    );
  }

  vertexAttrib4fv = function(index, value) {
    WebGLRenderingContext.GBridge.callNative(
      this._canvas.id,
      GLmethod.vertexAttrib4fv + ',' + index + ',' + processArray(value),
      true
    );
  }

  vertexAttribPointer = function(index, size, type, normalized, stride, offset) {
    WebGLRenderingContext.GBridge.callNative(
      this._canvas.id,
      GLmethod.vertexAttribPointer + ',' + index + ',' + size + ',' + type + ',' + Number(normalized) + ',' + stride + ',' + offset,
      true
    );
  }

  viewport = function(x, y, width, height) {
    const cmdArgs = GLmethod.viewport + ',' + x + ',' + y + ',' + width + ',' + height;
    if (WebGLRenderingContext.GBridge.Platform.OS === 'ios') {
      // ref to the comment in WebGLRenderingContext.GBridge.callNative()
      WebGLRenderingContext.GBridge.callViewport(this._canvas.id, cmdArgs);
    } else {
      // TODO: need some APP code to test which is better that will not cause low JS FPS if change
      //       viewport() frequently just like comments in getImageData() of `2d/RenderingContext.js`
      if (this._canvas._disableAutoSwap) {
        WebGLRenderingContext.GBridge.callNative(
          this._canvas.id,
          cmdArgs,
          false,
          'webgl',
          'sync',
          'execWithDisplay',
        );
        // TODO: no matter above or below in https://github.com/flyskywhy/snakeRN can keep 30 JS FPS on Huawei Mate 20, maybe need more APP code to test
        // WebGLRenderingContext.GBridge.callNative(
        //   this._canvas.id,
        //   cmdArgs,
        //   true,
        // );
      } else {
        WebGLRenderingContext.GBridge.callNative(
          this._canvas.id,
          cmdArgs,
          true, // TODO: no matter true or false in https://github.com/flyskywhy/snakeRN can keep 30 JS FPS on Huawei Mate 20, maybe need more APP code to test
        );
      }
    }

    this._canvas._needRender = true;
  }
}
