import { Point, touchOrMouseEvent } from './helpers';
import { SVGHelper } from './SVGHelpers';
import { pathActions, pathReducerAction, PathState } from './pathReducer';

const RECTANGLE_CONSTANTS = {
  INITIAL_POINT: 1,
  DRAWING_POINTS: 2,
  COMPLETE_POINTS: 4
} as const;

interface RectangleSelectionState {
  isDrawing: boolean;
  startPoint: Point | null;
  currentPoint: Point | null;
}

export class RectangleSelection {
  private svgHelper: SVGHelper;
  private state: RectangleSelectionState = {
    isDrawing: false,
    startPoint: null,
    currentPoint: null
  };

  constructor(svgHelper: SVGHelper) {
    this.svgHelper = svgHelper;
  }

  onStart(
    e: touchOrMouseEvent<SVGSVGElement>,
    pathState: PathState,
    dispatchAction: (action: pathReducerAction & { pointer?: Point }) => void
  ): boolean {
    const pointer = this.svgHelper.getMouseCoordinates(e);

    if (!this.isPointInBounds(pointer)) {
      return false;
    }

    if (pathState.closed || pathState.points.length > 0) {
      dispatchAction({ type: pathActions.RESET });
    }

    this.state = {
      isDrawing: true,
      startPoint: pointer,
      currentPoint: pointer
    };

    dispatchAction({
      type: pathActions.ADD,
      payload: pointer
    });

    return true;
  }

  onMove(
    e: touchOrMouseEvent<SVGSVGElement>,
    pathState: PathState,
    dispatchAction: (action: pathReducerAction & { pointer?: Point }) => void
  ): boolean {
    if (!this.state.isDrawing || !this.state.startPoint) {
      return false;
    }

    const pointer = this.svgHelper.getMouseCoordinates(e);

    if (!this.isPointInBounds(pointer)) {
      return false;
    }

    this.state.currentPoint = pointer;
    if (pathState.points.length === RECTANGLE_CONSTANTS.INITIAL_POINT && !pathState.closed) {
      dispatchAction({
        type: pathActions.ADD,
        payload: pointer
      });
      return true;
    }

    if (pathState.points.length === RECTANGLE_CONSTANTS.DRAWING_POINTS && !pathState.closed) {
      dispatchAction({
        type: pathActions.MODIFY,
        payload: { ...pointer, index: 1 },
        pointer
      });
      return true;
    }

    return false;
  }

  onEnd(
    e: touchOrMouseEvent<SVGSVGElement>,
    pathState: PathState,
    onComplete: (rectanglePoints: Point[]) => void,
    onCancel: (pointer: Point) => void
  ): void {
    const pointer = this.svgHelper.getMouseCoordinates(e);

    if (
      pathState.points.length === RECTANGLE_CONSTANTS.DRAWING_POINTS &&
      !pathState.closed &&
      this.state.startPoint
    ) {
      const rectanglePoints = this.createRectanglePoints(this.state.startPoint, pointer);
      onComplete(rectanglePoints);
    } else if (pathState.points.length === RECTANGLE_CONSTANTS.INITIAL_POINT && !pathState.closed) {
      onCancel(pointer);
    }

    this.reset();
  }

  getPolylinePoints(pathState: PathState, getRoundedPoints: () => Point[]): Point[] {
    const roundedPoints = getRoundedPoints();

    // completed rectangle
    if (pathState.closed && roundedPoints.length >= RECTANGLE_CONSTANTS.COMPLETE_POINTS) {
      return roundedPoints.concat(roundedPoints[0]);
    }

    // drawing rectangle
    if (roundedPoints.length === RECTANGLE_CONSTANTS.DRAWING_POINTS && !pathState.closed) {
      return roundedPoints;
    }

    return [];
  }

  getCurrentBounds(): { start: Point; end: Point } | null {
    if (!this.state.startPoint || !this.state.currentPoint) {
      return null;
    }
    return {
      start: this.state.startPoint,
      end: this.state.currentPoint
    };
  }

  isDrawing(): boolean {
    return this.state.isDrawing;
  }

  reset(): void {
    this.state = {
      isDrawing: false,
      startPoint: null,
      currentPoint: null
    };
  }

  private isPointInBounds(point: Point): boolean {
    return !this.svgHelper.isAboveTheBorder(point);
  }

  private createRectanglePoints(start: Point, end: Point): Point[] {
    return [
      { x: start.x, y: start.y }, // Top-left
      { x: end.x, y: start.y }, // Top-right
      { x: end.x, y: end.y }, // Bottom-right
      { x: start.x, y: end.y } // Bottom-left
    ];
  }
}
