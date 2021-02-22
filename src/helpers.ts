import { Dictionary, IPoint, touchOrMouseEvent } from './typings';

export const objectToClassName = (obj: Dictionary<boolean>): string => {
  return Object.keys(obj)
    .filter((key) => obj[key])
    .join(' ');
};

export const arePointsEqual = (p1: IPoint, p2: IPoint): boolean =>
  p1.x === p2.x && p1.y === p2.y;
export const arePointListEqual = (arr1: IPoint[], arr2: IPoint[]): boolean => {
  if ((!arr1 && arr2) || (arr1 && !arr2) || arr1.length !== arr2.length)
    return false;
  return arr1.every((point, i) => arePointsEqual(point, arr2[i]));
};
export const roundPointCoordinates = ({ x, y }: IPoint): IPoint => ({
  x: Math.round(x),
  y: Math.round(y),
});

export class SVGHelper {
    public getSvgElement: () => SVGSVGElement | null | undefined
    constructor(getSvgElement: () => SVGSVGElement | null | undefined) {
      this.getSvgElement = getSvgElement;
    }
    getSvg (): SVGSVGElement {
      const svg = this.getSvgElement();
      if (!svg) throw new Error('SVG is null');
      return svg;
    }
    getCTM(): DOMMatrix {
      const ctm = this.getSvg().getCTM();
      if (!ctm) throw new Error('CTM is null');
      return ctm;
    }
    getViewboxSize(): DOMRect {
      return this.getSvg().viewBox.baseVal;
    }
    getRealSize(): { width: number, height: number } {
      return {
        width: this.getSvg().width.baseVal.value,
        height: this.getSvg().height.baseVal.value,
      };
    }
    getViewboxOffset(): IPoint {
      const svg = this.getSvg();
      const { width: rWidth, height: rHeight } = this.getRealSize();
      const { width: vWidth, height: vHeight } = this.getViewboxSize();
      const point = Object.assign(svg.createSVGPoint(), {
        x: rWidth,
        y: rHeight,
      });
      const ctm = this.getCTM();
      const { x, y } = point.matrixTransform(ctm.inverse());
      // only for preserveAspectRatio="xMidYMid meet" !!!
      return {
        x: x - vWidth,
        y: y - vHeight,
      };
    }
    convertViewboxPointsToReal(points: IPoint[]): IPoint[] {
      const svg = this.getSvg();
      const ctm = this.getCTM();
      return points.map(({ x, y }) => {
        const p = Object.assign(svg.createSVGPoint(), { x, y }).matrixTransform(
          ctm
        );
        return { x: Math.floor(p.x), y: Math.floor(p.y) };
      });
    }
    convertRealPointsToViewbox(points: IPoint[]): IPoint[] {
      const svg = this.getSvg();
      const ctm = this.getCTM().inverse();
      return points.map(({ x, y }) => {
        const p = Object.assign(svg.createSVGPoint(), { x, y }).matrixTransform(
          ctm
        );
        return { x: p.x, y: p.y };
      });
    }
    getBorderPoints(repeatFirst = true): IPoint[] {
      const { width, height } = this.getViewboxSize();
      const { x: offsetX, y: offsetY } = this.getViewboxOffset();
      const arr = [
        { x: -offsetX, y: -offsetY },
        { x: width + offsetX, y: -offsetY },
        { x: width + offsetX, y: height + offsetY },
        { x: -offsetX, y: height + offsetY },
      ];
      if (repeatFirst) {
        arr.push({ x: -offsetX, y: -offsetY });
      }
      return arr;
    }
    isAboveTheBorder({ x, y }: IPoint): boolean {
      const { width, height } = this.getViewboxSize();
      const { x: offsetX, y: offsetY } = this.getViewboxOffset();
      return (x < -offsetX || x > width + offsetX || y < -offsetY || y > height + offsetY);
    }
    getMouseCoordinates(event: touchOrMouseEvent<SVGSVGElement>): IPoint {
      const e = event as React.MouseEvent<SVGSVGElement, MouseEvent> &
      React.TouchEvent<SVGSVGElement>;
      const { clientX, clientY } =
      e.changedTouches && e.changedTouches.length
        ? e.changedTouches[0]
        : e.touches
          ? e.touches[0]
          : e;
      const svg = this.getSvg();
      const ctm = svg.getScreenCTM();
      if (!ctm) throw new Error('ScreenCTM is null');
      const point = svg.createSVGPoint();
      point.x = clientX;
      point.y = clientY;
      const { x, y } = point.matrixTransform(ctm.inverse());
      return { x, y };
    }
}

export function getClippedImageCanvas(
  src: string,
  path: IPoint[],
  callback: (err: Error | null, canvas: HTMLCanvasElement) => void,
  resize = true
): void {
  const image = new Image();
  image.crossOrigin = 'Anonymous';
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return callback(new Error('CTX is null'), canvas);
  }
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
      if (resize) {
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
