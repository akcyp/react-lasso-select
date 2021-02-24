export interface Point {
  x: number;
  y: number;
}

export interface Vector {
  dx: number;
  dy: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Dictionary<T> {
  [key: string]: T;
}

export type touchOrMouseEvent<T> =
  | React.MouseEvent<T, MouseEvent>
  | React.TouchEvent<T>;
export type touchAndMouseEvent<T> = React.MouseEvent<T, MouseEvent> &
  React.TouchEvent<T>;


export const objectToClassName = (obj: Dictionary<boolean>) => {
  return Object.keys(obj)
    .filter((key) => obj[key])
    .join(' ');
};

export const arePointsEqual = (p1: Point, p2: Point) =>
  p1.x === p2.x && p1.y === p2.y;

export const arePointListEqual = (arr1: Point[], arr2: Point[]) => {
  if ((!arr1 && arr2) || (arr1 && !arr2) || arr1.length !== arr2.length)
    return false;
  return arr1.every((point, i) => arePointsEqual(point, arr2[i]));
};

export const roundPointCoordinates = ({ x, y }: Point, p = 1): Point => ({
  x: Math.round((x + Number.EPSILON) * p) / p,
  y: Math.round((y + Number.EPSILON) * p) / p,
});

export function getClippedImageCanvas(
  src: string,
  path: Point[],
  callback: (err: Error | null, canvas: HTMLCanvasElement) => void,
  crop = true
) {
  const image = new Image();
  image.crossOrigin = 'Anonymous';
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return callback(new Error('CTX is null'), canvas);
  }
  image.onerror = () => {
    callback(new Error('Failed to load image'), canvas);
  };
  image.onload = () => {
    try {
      canvas.width = image.naturalWidth + 2;
      canvas.height = image.naturalHeight + 2;
      ctx.drawImage(image, 0, 0);
      if (path.length < 3) {
        callback(null, canvas);
        return;
      }
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(canvas.width, 0);
      ctx.lineTo(canvas.width, canvas.height);
      ctx.lineTo(0, canvas.height);
      ctx.lineTo(0, 0);
      ctx.lineTo(path[0].x + 1, path[0].y + 1);
      path.slice(1).forEach(({ x, y }) => ctx.lineTo(x + 1, y + 1));
      ctx.lineTo(path[0].x + 1, path[0].y + 1);
      ctx.lineTo(0, 0);
      ctx.closePath();
      ctx.clip('evenodd');
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fill();
      if (crop) {
        const xAxis = path.map(({ x }) => x + 1);
        const yAxis = path.map(({ y }) => y + 1);
        const [minX, minY] = [
          Math.min.apply(null, xAxis),
          Math.min.apply(null, yAxis),
        ];
        const [maxX, maxY] = [
          Math.max.apply(null, xAxis),
          Math.max.apply(null, yAxis),
        ];
        const [width, height] = [maxX - minX, maxY - minY];
        const imageData = ctx.getImageData(minX, minY, width, height);
        canvas.width = width;
        canvas.height = height;
        ctx.putImageData(imageData, 0, 0);
      }
      callback(null, canvas);
    } catch (err) {
      callback(err, canvas);
    }
  };
  image.src = src;
}
