import React from 'react';
import PropTypes from 'prop-types';

import './index.css';
import Polyline from './Polyline';
import Polygon from './Polygon';
import Point from './Point';

import {
  SVGHelper,
  arePointsEqual,
  roundPointCoordinates,
  arePointListEqual,
  objectToClassName,
  getClippedImageCanvas,
} from './helpers';
import { IPoint, IVector, touchOrMouseEvent } from './typings';

enum pathActions {
  ADD = 'ADD',
  DELETE = 'DELETE',
  MODIFY = 'MODIFY',
  MOVE = 'MOVE',
  RESET = 'RESET',
}

type pathReducerAction =
  | { type: pathActions.ADD; payload: IPoint }
  | { type: pathActions.DELETE; payload: number }
  | { type: pathActions.MODIFY; payload: { index: number } & IPoint }
  | { type: pathActions.MOVE; payload: IPoint }
  | { type: pathActions.RESET };

interface IReactLassoProps {
  src: string;
  initialPath: IPoint[];
  style: React.CSSProperties;
  viewBox: {
    width: number;
    height: number;
  };
  disabled: boolean;
  imageStyle: React.CSSProperties;
  onImageLoad: (e?: React.SyntheticEvent<HTMLImageElement, Event>) => void;
  onImageError: (e?: React.SyntheticEvent<HTMLImageElement, Event>) => void;

  onChange?: (path?: IPoint[]) => void;
  onUpdate?: (path?: IPoint[]) => void;
  imageAlt?: string;
  crossOrigin?: 'anonymous' | 'use-credentials' | '';
}

export interface IReactLassoPathState {
  points: IPoint[];
  closed: boolean;
}
export interface IReactLassoState {
  path: IReactLassoPathState;
  pointer: IPoint;
}

class ReactLasso extends React.Component<IReactLassoProps, IReactLassoState> {
  public state: IReactLassoState;
  public svgRef = React.createRef<SVGSVGElement>();
  public svg = new SVGHelper(() => this.svgRef?.current);
  public angles: number[] = [];
  public lastEmittedPoints: IPoint[] = [];
  public error = false;
  constructor(props: IReactLassoProps) {
    super(props);
    this.state = {
      path: {
        points: [],
        closed: false,
      },
      pointer: {
        x: props.viewBox.width / 2,
        y: props.viewBox.width / 2,
      },
    };
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onClick = this.onClick.bind(this);
    this.onTouchEnd = this.onTouchEnd.bind(this);
    this.onContextMenu = this.onContextMenu.bind(this);
    this.onMouseLeave = this.onMouseLeave.bind(this);
    this.onMediaLoaded = this.onMediaLoaded.bind(this);
    this.onMediaError = this.onMediaError.bind(this);
    this.onShapeDrag = this.onShapeDrag.bind(this);
    this.onDragEnd = this.onDragEnd.bind(this);
  }
  render(): JSX.Element {
    return (
      <div
        className={objectToClassName({
          ReactFreeSelect__Component: true,
          ReactFreeSelect__Closed: this.state.path.closed,
          ReactFreeSelect__Disabled: this.props.disabled,
        })}
        style={this.props.style}
      >
        <img
          src={this.props.src}
          alt={this.props.imageAlt}
          crossOrigin={this.props.crossOrigin}
          style={this.props.imageStyle}
          onLoad={this.onMediaLoaded}
          onError={this.onMediaError}
        />
        <svg
          ref={this.svgRef}
          viewBox={`0 0 ${this.props.viewBox.width} ${this.props.viewBox.height}`}
          onMouseMove={this.onMouseMove}
          onTouchMove={this.onMouseMove}
          onClick={this.onClick}
          onTouchEnd={this.onTouchEnd}
          onContextMenu={this.onContextMenu}
          onMouseLeave={this.onMouseLeave}
        >
          {!!this.state.path.points.length && (
            <Polygon path={this.getPolygonPoints()} />
          )}
          <Polyline
            draggable={this.state.path.closed && !this.props.disabled}
            onDrag={this.onShapeDrag}
            onDragEnd={this.onDragEnd}
            animate={!this.props.disabled}
            path={this.getPolylinePoints()}
          />
          {this.getRoundedPoints().map(({ x, y }, idx) => (
            <Point
              key={idx}
              x={x}
              y={y}
              draggable={!this.props.disabled}
              style={{
                cursor:
                  !idx &&
                  this.state.path.points.length > 2 &&
                  !this.state.path.closed
                    ? 'pointer'
                    : '',
              }}
              onDrag={({ dx, dy }) => this.onPointDrag(idx, { dx, dy })}
              onDragEnd={this.onDragEnd}
            />
          ))}
        </svg>
      </div>
    );
  }
  componentDidUpdate(prevProps: IReactLassoProps): void {
    if (
      (prevProps.src && prevProps.src !== this.props.src) ||
      (prevProps.disabled === false &&
        this.props.disabled &&
        !this.state.path.closed)
    ) {
      this.dispatchPathAction({ type: pathActions.RESET });
    }
  }
  emitOnChange({ points }: IReactLassoPathState): void {
    if (this.props.onChange) {
      this.props.onChange(this.svg.convertViewboxPointsToReal(points));
    }
  }
  emitOnUpdate(convertedPoints: IPoint[]): void {
    if (this.props.onUpdate) {
      this.props.onUpdate(convertedPoints);
    }
  }
  checkIfPathUpdated(wasClosedBefore: boolean, newPathState = this.state.path): void {
    if (newPathState.closed || wasClosedBefore) {
      const convertedPoints = this.svg.convertViewboxPointsToReal(
        newPathState.points
      );
      if (!arePointListEqual(convertedPoints, this.lastEmittedPoints)) {
        this.emitOnUpdate(convertedPoints);
        this.lastEmittedPoints = convertedPoints.map(({ x, y }) => ({ x, y }));
      }
    }
  }
  onDragEnd(): void {
    this.checkIfPathUpdated(false);
  }
  setPointer({ x, y }: IPoint): void {
    this.setState({
      path: this.state.path,
      pointer: { x, y },
    });
  }
  calculatePointsAngles(points = this.state.path.points): number[] {
    const angles = [];
    for (let i = 1; i < points.length; i++) {
      const alpha = Math.atan2(
        points[i].y - points[i - 1].y,
        points[i].x - points[i - 1].x
      );
      const alpha2 = alpha + Math.PI;
      angles.push(alpha, alpha2 > Math.PI ? alpha2 - 2 * Math.PI : alpha2);
    }
    return angles.filter((val, idx, ths) => ths.indexOf(val) === idx);
  }
  _pathReducer(
    state: IReactLassoPathState,
    action: pathReducerAction
  ): [IReactLassoPathState, boolean] {
    const length = state.points.length;
    switch (action.type) {
    case pathActions.ADD: {
      if (state.closed) return [state, false];
      if (
        (length > 0 &&
            arePointsEqual(state.points[length - 1], action.payload)) ||
          (length > 1 &&
            arePointsEqual(state.points[length - 2], action.payload))
      ) {
        return [state, false];
      }
      const needToBeClosed =
          length > 2 && arePointsEqual(state.points[0], action.payload);
      if (needToBeClosed)
        return [{ points: [...state.points], closed: true }, true];
      return [
        { points: [...state.points, action.payload], closed: false },
        true,
      ];
    }
    case pathActions.DELETE: {
      return [
        {
          points: [
            ...state.points.filter((_, idx) => action.payload !== idx),
          ],
          closed: length > 4 && state.closed,
        },
        true,
      ];
    }
    case pathActions.MODIFY: {
      const { x: sx, y: sy } = state.points[action.payload.index];
      const newPoints = state.points.map(({ x, y }) => {
        if (x === sx && y === sy) {
          return {
            x: action.payload.x,
            y: action.payload.y,
          };
        }
        return { x, y };
      });
      return [
        { points: newPoints, closed: state.closed },
        Boolean(action.payload.x || action.payload.y),
      ];
    }
    case pathActions.MOVE: {
      return [
        {
          points: state.points.map(({ x, y }) => ({
            x: x + action.payload.x,
            y: y + action.payload.y,
          })),
          closed: state.closed,
        },
        Boolean(action.payload.x || action.payload.y),
      ];
    }
    case pathActions.RESET:
      return [{ points: [], closed: false }, !state.points.length];
    default:
      return [state, false];
    }
  }
  dispatchPathAction(action: pathReducerAction & { pointer?: IPoint }): void {
    const [newPathState, wasModified] = this._pathReducer(
      this.state.path,
      action
    );
    if (wasModified) {
      const wasClosedBefore = this.state.path.closed;
      this.setState({
        pointer: action.pointer || this.state.pointer,
        path: newPathState,
      });
      this.angles = this.calculatePointsAngles(newPathState.points);
      if (newPathState.closed || wasClosedBefore) {
        this.emitOnChange(newPathState);
      }
      if (
        action.type === pathActions.RESET ||
        action.type === pathActions.ADD ||
        action.type === pathActions.DELETE
      ) {
        this.checkIfPathUpdated(wasClosedBefore, newPathState); // optimized version of onUpdate
      }
    }
  }
  onShapeDrag({ dx, dy }: IVector): void {
    const newPath = this.state.path.points.map(({ x, y }) => ({
      x: x + dx,
      y: y + dy,
    }));
    if (!newPath.some((point) => this.isAboveTheBorder(point))) {
      this.dispatchPathAction({
        type: pathActions.MOVE,
        payload: { x: dx, y: dy },
      });
    }
  }
  onPointDrag(idx: number, { dx, dy }: IVector): void {
    const point = { ...this.state.path.points[idx] };
    point.x += dx;
    point.y += dy;
    if (!this.isAboveTheBorder(point)) {
      this.dispatchPathAction({
        type: pathActions.MODIFY,
        payload: { ...point, index: idx },
        pointer: point,
      });
    }
  }
  isLoaded(): boolean {
    if (this.error || !this.svgRef.current) return false;
    const svg = this.svgRef.current;
    return Boolean(svg.width.baseVal.value && svg.height.baseVal.value);
  }
  getRoundedPoints(): IPoint[] {
    return this.state.path.points.map(roundPointCoordinates);
  }
  getBorder(): IPoint[] {
    return this.svg
      .getBorderPoints()
      .map(roundPointCoordinates)
      .map(({ x, y }) => ({ x: x - 1, y: y + 1 })); // fishy bug here so i have to margin area
  }
  getPolygonPoints(): IPoint[] {
    const roundedPoints = this.getRoundedPoints();
    const border = this.getBorder();
    return this.state.path.closed
      ? [...border, ...roundedPoints, roundedPoints[0], border[0]]
      : border;
  }
  getPolylinePoints(): IPoint[] {
    const roundedPoints = this.getRoundedPoints();
    return roundedPoints.concat(
      this.state.path.closed
        ? roundedPoints[0]
        : roundPointCoordinates(this.state.pointer)
    );
  }
  isAboveTheBorder(point: IPoint): boolean {
    return this.svg.isAboveTheBorder(point);
  }
  findPointByPosition(x: number, y: number, r = 0): { point: IPoint, index: number } {
    const index = this.state.path.points.findIndex(
      (point) => Math.max(Math.abs(point.x - x), Math.abs(point.y - y)) <= r
    );
    return { point: { ...this.state.path.points[index] }, index };
  }
  getMousePosition(
    e: touchOrMouseEvent<SVGSVGElement>,
    lookupForNearlyPoints = true,
    lookupForApproximation = true
  ): [IPoint, { point: IPoint; index: number }] {
    let pointer = this.svg.getMouseCoordinates(e);
    if (lookupForApproximation) {
      const ctrlCmdPressed = navigator.platform.includes('Mac')
        ? e.metaKey
        : e.ctrlKey;
      const lastPoint = this.state.path.points[
        this.state.path.points.length - 1
      ];
      // straighten path from last point
      if (ctrlCmdPressed && lastPoint) {
        const r = Math.hypot(pointer.x - lastPoint.x, pointer.y - lastPoint.y);
        const angle = Math.atan2(
          pointer.y - lastPoint.y,
          pointer.x - lastPoint.x
        );
        if (e.shiftKey) {
          // lookup for parallel lines
          if (this.state.path.points.length > 1) {
            const nearestAngle = this.angles.reduce(
              (prev, now) =>
                Math.abs(now - angle) < Math.abs(prev - angle) ? now : prev,
              Infinity
            );
            if (nearestAngle !== Infinity) {
              pointer.x = lastPoint.x + r * Math.cos(nearestAngle);
              pointer.y = lastPoint.y + r * Math.sin(nearestAngle);
            }
          }
        } else {
          const minAngle = Math.PI / 12;
          // angle approximation to 15 deg
          const newAngle = Math.round(angle / minAngle) * minAngle;
          pointer.x = lastPoint.x + r * Math.cos(newAngle);
          pointer.y = lastPoint.y + r * Math.sin(newAngle);
        }
      }
    }
    const { point, index } = this.findPointByPosition(pointer.x, pointer.y, 10);
    if (lookupForNearlyPoints && index > -1) {
      pointer = { ...point };
    }
    return [pointer, { point, index }];
  }
  onMediaLoaded(e: React.SyntheticEvent<HTMLImageElement, Event>): void {
    if (this.props.initialPath.length) {
      this.setState({
        path: {
          points: this.props.initialPath,
          closed: this.props.initialPath.length > 2,
        },
        pointer: this.state.pointer,
      });
    }
    this.error = false;
    this.props.onImageLoad(e);
  }
  onMediaError(e: React.SyntheticEvent<HTMLImageElement, Event>): void {
    this.dispatchPathAction({ type: pathActions.RESET });
    this.error = true;
    this.props.onImageError(e);
  }
  onClickTouchEvent(e: touchOrMouseEvent<SVGSVGElement>): void {
    if (!this.isLoaded()) return;
    if (this.props.disabled) return;
    if (this.state.path.closed) {
      if (e.target === this.svgRef.current) {
        this.dispatchPathAction({
          type: pathActions.RESET,
        });
      }
      return;
    }
    const [pointer] = this.getMousePosition(e);
    if (!this.isAboveTheBorder(pointer)) {
      this.dispatchPathAction({
        type: pathActions.ADD,
        payload: { ...pointer },
        pointer,
      });
    } else {
      this.onMouseLeave();
    }
  }
  onClick(e: React.MouseEvent<SVGSVGElement, MouseEvent>): void {
    this.onClickTouchEvent(e);
  }
  onTouchEnd(e: React.TouchEvent<SVGSVGElement>): void {
    if (e.cancelable) {
      e.preventDefault();
      this.onClickTouchEvent(e);
    }
  }
  onMouseMove(e: touchOrMouseEvent<SVGSVGElement>): void {
    if (!this.isLoaded()) return;
    const [pointer] = this.getMousePosition(e);
    this.setPointer(pointer);
  }
  onContextMenu(e: React.MouseEvent<SVGSVGElement, MouseEvent>): void {
    if (!this.isLoaded()) return;
    e.preventDefault();
    if (this.props.disabled || this.state.path.closed) return;
    const [pointer, { index }] = this.getMousePosition(e);
    if (index > -1) {
      this.dispatchPathAction({
        type: pathActions.DELETE,
        payload: index,
        pointer,
      });
    } else {
      this.setPointer(pointer);
    }
  }
  onMouseLeave(): void {
    const lastPoint = this.state.path.points[this.state.path.points.length - 1];
    if (lastPoint) {
      this.setPointer({ ...lastPoint }); // tricky way to hide pointer line
    }
  }
  static propTypes = {
    initialPath: PropTypes.arrayOf(
      PropTypes.exact({
        x: PropTypes.number.isRequired,
        y: PropTypes.number.isRequired,
      })
    ),
    style: PropTypes.shape({}),
    viewBox: PropTypes.exact({
      width: PropTypes.number.isRequired,
      height: PropTypes.number.isRequired,
    }),
    disabled: PropTypes.bool,
    onChange: PropTypes.func,
    onUpdate: PropTypes.func,
    src: PropTypes.string.isRequired,
    imageAlt: PropTypes.string,
    crossOrigin: PropTypes.string,
    imageStyle: PropTypes.shape({}),
    onImageLoad: PropTypes.func,
    onImageError: PropTypes.func,
  };
  static defaultProps = {
    initialPath: [],
    style: {},
    imageStyle: {},
    viewBox: { width: 1e3, height: 1e3 },
    disabled: false,
    onImageError: Function.prototype,
    onImageLoad: Function.prototype
  };
}

export {
  ReactLasso as default,
  ReactLasso as Component,
  getClippedImageCanvas as getCanvas,
};
