import GCanvasView from './components/GCanvasComponent';
import GImage from './packages/gcanvas/src/env/image';

const createCanvas = (width, height) => {
  const canvas = document.createElement('canvas');

  canvas.width = width;
  canvas.height = height;
  return canvas;
};

export {
    GCanvasView,
    GImage,
    createCanvas,
}
