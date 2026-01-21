import {
  Point,
  Vector,
  touchOrMouseEvent,
  roundPointCoordinates,
  approximateToAnAngleMultiplicity,
  approximateToAngles,
  findPointByPosition
} from './helpers';
import { SVGHelper } from './SVGHelpers';
import { pathActions, pathReducerAction, PathState } from './pathReducer';

const LASSO_CONSTANTS = {
  TOLERANCE: 10, // pixels
  ANGLE_SNAP_RADIANS: Math.PI / 12, // 15 degrees
  COORDINATE_PRECISION: 1e3
} as const;

interface LassoSelectionOptions {
  lookupForNearlyPoints?: boolean;
  lookupForApproximation?: boolean;
}

export class LassoSelection {
  private svgHelper: SVGHelper;
  private angles: number[] = [];

  constructor(svgHelper: SVGHelper) {
    this.svgHelper = svgHelper;
  }

  setAngles(angles: number[]): void {
    this.angles = angles;
  }

  getMousePosition(
    e: touchOrMouseEvent<SVGSVGElement>,
    pathState: PathState,
    options: LassoSelectionOptions = {}
  ): [Point, { point: Point; index: number }] {
    const { lookupForNearlyPoints = true, lookupForApproximation = true } = options;

    let pointer = this.svgHelper.getMouseCoordinates(e);

    if (lookupForApproximation) {
      pointer = this.applyAngleApproximation(pointer, pathState, e);
    }

    const { point, index } = findPointByPosition(
      pathState.points,
      pointer,
      LASSO_CONSTANTS.TOLERANCE
    );
    if (lookupForNearlyPoints && index > -1) {
      pointer = { ...point };
    }

    return [pointer, { point, index }];
  }

  onClickTouch(
    e: touchOrMouseEvent<SVGSVGElement>,
    pathState: PathState,
    dispatchAction: (action: pathReducerAction & { pointer?: Point }) => void,
    svgRef: React.RefObject<SVGSVGElement>,
    onPointerHide?: () => void
  ): void {
    if (pathState.closed) {
      if (e.target === svgRef.current) {
        dispatchAction({ type: pathActions.RESET });
      }
      return;
    }

    const [pointer] = this.getMousePosition(e, pathState);
    if (!this.svgHelper.isAboveTheBorder(pointer)) {
      dispatchAction({
        type: pathActions.ADD,
        payload: roundPointCoordinates(pointer, LASSO_CONSTANTS.COORDINATE_PRECISION)
      });
    } else {
      onPointerHide?.();
    }
  }

  onMove(
    e: touchOrMouseEvent<SVGSVGElement>,
    pathState: PathState,
    onSetPointer: (pointer: Point) => void
  ): void {
    const [pointer] = this.getMousePosition(e, pathState);
    onSetPointer(pointer);
  }

  onContextMenu(
    e: React.MouseEvent<SVGSVGElement, MouseEvent>,
    pathState: PathState,
    dispatchAction: (action: pathReducerAction & { pointer?: Point }) => void,
    onSetPointer: (pointer: Point) => void
  ): boolean {
    if (!pathState.closed) {
      const [pointer, { index }] = this.getMousePosition(e, pathState);
      if (index > -1) {
        dispatchAction({
          type: pathActions.DELETE,
          payload: index,
          pointer
        });
        return true; // Event handled
      } else {
        onSetPointer(pointer);
      }
    }
    return false; // Event not handled
  }

  onPointDrag(
    idx: number,
    delta: Vector,
    pathState: PathState,
    dispatchAction: (action: pathReducerAction & { pointer?: Point }) => void
  ): void {
    if (idx < 0 || idx >= pathState.points.length) {
      console.warn(`Invalid point index for drag: ${idx}`);
      return;
    }

    const point = { ...pathState.points[idx] };
    point.x += delta.dx;
    point.y += delta.dy;

    if (!this.svgHelper.isAboveTheBorder(point)) {
      dispatchAction({
        type: pathActions.MODIFY,
        payload: { ...point, index: idx }
      });
    }
  }

  onShapeDrag(
    delta: Vector,
    pathState: PathState,
    dispatchAction: (action: pathReducerAction & { pointer?: Point }) => void
  ): void {
    const newPath = pathState.points.map(({ x, y }) => ({
      x: x + delta.dx,
      y: y + delta.dy
    }));

    if (!newPath.some((point) => this.svgHelper.isAboveTheBorder(point))) {
      dispatchAction({
        type: pathActions.MOVE,
        payload: { x: delta.dx, y: delta.dy }
      });
    }
  }

  onPointClick(
    idx: number,
    pathState: PathState,
    dispatchAction: (action: pathReducerAction & { pointer?: Point }) => void
  ): void {
    if (idx < 0 || idx >= pathState.points.length) {
      console.warn(`Invalid point index for click: ${idx}`);
      return;
    }

    if (!pathState.closed) {
      dispatchAction({
        type: pathActions.ADD,
        payload: pathState.points[idx]
      });
    }
  }

  getPolylinePoints(pathState: PathState, pointer: Point): Point[] {
    const roundedPoints = pathState.points.map((point) => roundPointCoordinates(point));

    return roundedPoints.concat(
      pathState.closed ? roundedPoints[0] : roundPointCoordinates(pointer)
    );
  }

  private applyAngleApproximation(
    pointer: Point,
    pathState: PathState,
    e: touchOrMouseEvent<SVGSVGElement>
  ): Point {
    const ctrlCmdPressed = navigator.platform.includes('Mac') ? e.metaKey : e.ctrlKey;
    const lastPoint = pathState.points[pathState.points.length - 1];

    // straighten path from last point
    if (ctrlCmdPressed && lastPoint) {
      if (e.shiftKey) {
        // lookup for parallel lines
        return approximateToAngles(lastPoint, pointer, this.angles);
      } else {
        // angle approximation to 15 deg
        return approximateToAnAngleMultiplicity(
          lastPoint,
          pointer,
          LASSO_CONSTANTS.ANGLE_SNAP_RADIANS
        );
      }
    }

    return pointer;
  }
}
