import { Point, roundPointCoordinates, Size, touchOrMouseEvent } from './helpers';

export class SVGHelper {
  public getSvgElement: () => SVGSVGElement | null | undefined;
  constructor(getSvgElement: () => SVGSVGElement | null | undefined) {
    this.getSvgElement = getSvgElement;
  }
  getSvg() {
    const svg = this.getSvgElement();
    if (!svg) throw new Error('SVG is null');
    return svg;
  }
  getCTM() {
    const svg = this.getSvg();
    let ctm = svg.getCTM();
    if (ctm === null) {
      const svgChild = svg.querySelector('polyline');
      const matrix = svgChild?.getCTM();
      if (matrix) {
        matrix.f = 0;
        ctm = matrix;
      }
    }
    if (!ctm) throw new Error('CTM is null');
    return ctm;
  }
  getViewboxSize() {
    return this.getSvg().viewBox.baseVal;
  }
  getRealSize(): Size {
    return {
      width: this.getSvg().width.baseVal.value,
      height: this.getSvg().height.baseVal.value
    };
  }
  getViewboxOffset(): Point {
    const svg = this.getSvg();
    const { width: rWidth, height: rHeight } = this.getRealSize();
    const { width: vWidth, height: vHeight } = this.getViewboxSize();
    const point = Object.assign(svg.createSVGPoint(), {
      x: rWidth,
      y: rHeight
    });
    const ctm = this.getCTM();
    const { x, y } = point.matrixTransform(ctm.inverse());
    // only for preserveAspectRatio="xMidYMid meet" !!!
    return {
      x: x - vWidth,
      y: y - vHeight
    };
  }
  convertViewboxPointsToReal(points: Point[]): Point[] {
    const svg = this.getSvg();
    const ctm = this.getCTM();
    return points.map(({ x, y }) => {
      const p = Object.assign(svg.createSVGPoint(), { x, y }).matrixTransform(ctm);
      return roundPointCoordinates(p);
    });
  }
  convertRealPointsToViewbox(points: Point[]): Point[] {
    const svg = this.getSvg();
    const ctm = this.getCTM().inverse();
    return points.map(({ x, y }) => {
      const p = Object.assign(svg.createSVGPoint(), { x, y }).matrixTransform(ctm);
      return roundPointCoordinates(p, 1e3);
    });
  }
  getBorderPoints(repeatFirst = true) {
    const { width, height } = this.getViewboxSize();
    const { x: offsetX, y: offsetY } = this.getViewboxOffset();
    const arr: Point[] = [
      { x: -offsetX, y: -offsetY },
      { x: width + offsetX, y: -offsetY },
      { x: width + offsetX, y: height + offsetY },
      { x: -offsetX, y: height + offsetY }
    ];
    if (repeatFirst) {
      arr.push({ x: -offsetX, y: -offsetY });
    }
    return arr;
  }
  isAboveTheBorder({ x, y }: Point) {
    const { width, height } = this.getViewboxSize();
    const { x: offsetX, y: offsetY } = this.getViewboxOffset();
    return x < -offsetX || x > width + offsetX || y < -offsetY || y > height + offsetY;
  }
  getMouseCoordinates(event: touchOrMouseEvent<SVGSVGElement>): Point {
    const e = event as React.MouseEvent<SVGSVGElement, MouseEvent> &
      React.TouchEvent<SVGSVGElement>;
    const { clientX, clientY } =
      e.changedTouches && e.touches ? e.changedTouches[0] || e.touches[0] : e;
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
