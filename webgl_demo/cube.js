import React, {Component} from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {GCanvasView} from '@flyskywhy/react-native-gcanvas';

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
      // canvas.width not equal canvas.clientWidth, so have to assign again
      this.canvas.width = this.canvas.clientWidth;
      this.canvas.height = this.canvas.clientHeight;
    }
    this.gl = this.canvas.getContext('webgl');
  };

  onCanvasResize = ({width, height, canvas}) => {
    canvas.width = width;
    canvas.height = height;

    this.interval && clearInterval(this.interval);
    this.drawSome();
  };

  drawSome = () => {
    // On Android, sometimes this.isGReactTextureViewReady is false e.g.
    // navigate from a canvas page into a drawer item page with
    // react-navigation on Android, the canvas page will be maintain
    // mounted by react-navigation, then if you continually call
    // this drawSome() in some loop, it's wasting CPU and GPU,
    // if you don't care about such wasting, you can delete
    // this.isGReactTextureViewReady and related onIsReady.

    if (this.gl && this.isGReactTextureViewReady) {
      this.startCube();
    }
  };

  // ref to https://github.com/flyskywhy/react-native-gcanvas/blob/f01fa6917c4a4938bf9b1bb8cab2358f93a7b4b4/examples/WeexGCanvasExample/examples/webgl/cube.vue
  startCube = () => {
    var gl = this.gl;
    var squareVerticesBuffer;
    var mvMatrix;
    var shaderProgram;
    var vertexPositionAttribute;
    var perspectiveMatrix;

    /*========== Defining and storing the geometry ==========*/
    var vertices = [
      -1,-1,-1, 1,-1,-1, 1, 1,-1, -1, 1,-1,
      -1,-1, 1, 1,-1, 1, 1, 1, 1, -1, 1, 1,
      -1,-1,-1, -1, 1,-1, -1, 1, 1, -1,-1, 1,
      1,-1,-1, 1, 1,-1, 1, 1, 1, 1,-1, 1,
      -1,-1,-1, -1,-1, 1, 1,-1, 1, 1,-1,-1,
      -1, 1,-1, -1, 1, 1, 1, 1, 1, 1, 1,-1,
    ];

    var colors = [
      5,3,7, 5,3,7, 5,3,7, 5,3,7,
      1,1,3, 1,1,3, 1,1,3, 1,1,3,
      0,0,1, 0,0,1, 0,0,1, 0,0,1,
      1,0,0, 1,0,0, 1,0,0, 1,0,0,
      1,1,0, 1,1,0, 1,1,0, 1,1,0,
      0,1,0, 0,1,0, 0,1,0, 0,1,0,
    ];

    var indices = [
      0,1,2, 0,2,3, 4,5,6, 4,6,7,
      8,9,10, 8,10,11, 12,13,14, 12,14,15,
      16,17,18, 16,18,19, 20,21,22, 20,22,23,
    ];

    // Create and store data into vertex buffer
    var vertex_buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

    // Create and store data into color buffer
    var color_buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, color_buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);

    // Create and store data into index buffer
    var index_buffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, index_buffer);
    gl.bufferData(
      gl.ELEMENT_ARRAY_BUFFER,
      new Uint16Array(indices),
      gl.STATIC_DRAW,
    );

    /*=================== Shaders =========================*/

    var vertCode =
      'attribute vec3 position;' +
      'uniform mat4 Pmatrix;' +
      'uniform mat4 Vmatrix;' +
      'uniform mat4 Mmatrix;' +
      'attribute vec3 color;' + //the color of the point
      'varying vec3 vColor;' +
      'void main(void) { ' + //pre-built function
      'gl_Position = Pmatrix*Vmatrix*Mmatrix*vec4(position, 1.);' +
      'vColor = color;' +
      '}';

    var fragCode =
      'precision mediump float;' +
      'varying vec3 vColor;' +
      'void main(void) {' +
      'gl_FragColor = vec4(vColor, 1.);' +
      '}';

    var vertShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertShader, vertCode);
    gl.compileShader(vertShader);

    var fragShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragShader, fragCode);
    gl.compileShader(fragShader);

    var shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertShader);
    gl.attachShader(shaderProgram, fragShader);
    gl.linkProgram(shaderProgram);

    /* ====== Associating attributes to vertex shader =====*/
    var Pmatrix = gl.getUniformLocation(shaderProgram, 'Pmatrix');
    var Vmatrix = gl.getUniformLocation(shaderProgram, 'Vmatrix');
    var Mmatrix = gl.getUniformLocation(shaderProgram, 'Mmatrix');

    gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer);
    var position = gl.getAttribLocation(shaderProgram, 'position');
    gl.vertexAttribPointer(position, 3, gl.FLOAT, false, 0, 0);

    // Position
    gl.enableVertexAttribArray(position);
    gl.bindBuffer(gl.ARRAY_BUFFER, color_buffer);
    var color = gl.getAttribLocation(shaderProgram, 'color');
    gl.vertexAttribPointer(color, 3, gl.FLOAT, false, 0, 0);

    // Color
    gl.enableVertexAttribArray(color);
    gl.useProgram(shaderProgram);

    /*==================== MATRIX =====================*/

    function get_projection(angle, a, zMin, zMax) {
      var ang = Math.tan((angle * 0.5 * Math.PI) / 180); //angle*.5
      return [
        0.5 / ang, 0 , 0, 0,
        0, 0.5 * a / ang, 0, 0,
        0, 0, -(zMax + zMin) / (zMax - zMin), -1,
        0, 0, (-2 * zMax * zMin) / (zMax - zMin), 0,
      ];
    }

    var width = this.canvas.width,
      height = this.canvas.height;
    var proj_matrix = get_projection(40, width / height, 1, 100);

    var mov_matrix = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
    var view_matrix = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

    // translating z
    view_matrix[14] = view_matrix[14] - 6; //zoom

    /*==================== Rotation ====================*/
    function rotateZ(m, angle) {
      var c = Math.cos(angle);
      var s = Math.sin(angle);
      var mv0 = m[0],
        mv4 = m[4],
        mv8 = m[8];

      m[0] = c * m[0] - s * m[1];
      m[4] = c * m[4] - s * m[5];
      m[8] = c * m[8] - s * m[9];

      m[1] = c * m[1] + s * mv0;
      m[5] = c * m[5] + s * mv4;
      m[9] = c * m[9] + s * mv8;
    }

    function rotateX(m, angle) {
      var c = Math.cos(angle);
      var s = Math.sin(angle);
      var mv1 = m[1],
        mv5 = m[5],
        mv9 = m[9];

      m[1] = m[1] * c - m[2] * s;
      m[5] = m[5] * c - m[6] * s;
      m[9] = m[9] * c - m[10] * s;

      m[2] = m[2] * c + mv1 * s;
      m[6] = m[6] * c + mv5 * s;
      m[10] = m[10] * c + mv9 * s;
    }

    function rotateY(m, angle) {
      var c = Math.cos(angle);
      var s = Math.sin(angle);
      var mv0 = m[0],
        mv4 = m[4],
        mv8 = m[8];

      m[0] = c * m[0] + s * m[2];
      m[4] = c * m[4] + s * m[6];
      m[8] = c * m[8] + s * m[10];

      m[2] = c * m[2] - s * mv0;
      m[6] = c * m[6] - s * mv4;
      m[10] = c * m[10] - s * mv8;
    }

    /*=================Drawing===========================*/
    var time_old = 0;
    var time = 0;
    function draw() {
      var dt = time - time_old;
      rotateZ(mov_matrix, dt * 0.005); //time
      rotateY(mov_matrix, dt * 0.002);
      rotateX(mov_matrix, dt * 0.003);
      time_old = time;
      time += 16;

      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl.LEQUAL);
      gl.clearColor(0.5, 0.5, 0.5, 0.9);
      gl.clearDepth(1.0);

      gl.viewport(0.0, 0.0, width, height);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.uniformMatrix4fv(Pmatrix, false, proj_matrix);
      gl.uniformMatrix4fv(Vmatrix, false, view_matrix);
      gl.uniformMatrix4fv(Mmatrix, false, mov_matrix);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, index_buffer);
      gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);
    }

    this.interval = setInterval(draw, 16);
  };

  takePicture = () => {
    if (this.canvas) {
      const data = this.canvas.toDataURL('image/jpeg', 0.77);
      console.warn(data);
    }
  };

  render() {
    return (
      <View style={styles.container}>
        <TouchableOpacity onPress={this.drawSome}>
          <Text style={styles.welcome}>{this.state.debugInfo}</Text>
        </TouchableOpacity>
        <View style={[styles.gcanvas, {backgroundColor: 'black'}]}>
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
              disableAutoSwap={false /* Default is false. Only affect webgl. No matter true or false can offer 60 JS FPS. Most webgl APP has it's own gl.clear in it's own loop, so most webgl APP can set disableAutoSwap to true if display effect will be better */}
              style={styles.gcanvas}
            />
          )}
        </View>
        <TouchableOpacity onPress={this.takePicture}>
          <Text style={styles.welcome}>Click me toDataURL('image/jpeg', 0.77)</Text>
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
