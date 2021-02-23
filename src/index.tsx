import React from 'react';
import PropTypes from 'prop-types';

import './index.css';
import { SVGPolyline } from './SVGPolyline';
import { SVGPolygon } from './SVGPolygon';
import { SVGPoint } from './SVGPoint';
import { SVGHelper } from './SVGHelpers';

import {
  roundPointCoordinates,
  arePointListEqual,
  objectToClassName,
  getClippedImageCanvas,
  Point,
  Vector,
  touchOrMouseEvent,
  Size
} from './helpers';

import { pathReducer, pathActions, pathReducerAction } from './pathReducer';

export interface ReactLassoProps {
  src: string;
  initialPath: Point[];
  style: React.CSSProperties;
  viewBox: Size;
  disabled: boolean;
  imageStyle: React.CSSProperties;
  onImageLoad: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void;
  onImageError: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void;
  onChange?: (path: Point[]) => void;
  onUpdate?: (path: Point[]) => void;
  imageAlt?: string;
  crossOrigin?: 'anonymous' | 'use-credentials' | '';
}

export interface ReactLassoPathState {
  points: Point[];
  closed: boolean;
}
export interface ReactLassoState {
  path: ReactLassoPathState;
  pointer: Point;
}

export class ReactLasso extends React.Component<ReactLassoProps, ReactLassoState> {
  public state: ReactLassoState;
  public imageRef = React.createRef<HTMLImageElement>();
  public svgRef = React.createRef<SVGSVGElement>();
  public svg = new SVGHelper(() => this.svgRef?.current);
  public angles: number[] = [];
  public lastEmittedPoints: Point[] = [];
  public error = false;
  constructor(props: ReactLassoProps) {
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
  }
  render() {
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
          ref={this.imageRef}
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
            <SVGPolygon path={this.getPolygonPoints()} />
          )}
          <SVGPolyline
            draggable={this.state.path.closed && !this.props.disabled}
            onDrag={this.onShapeDrag}
            onDragEnd={this.onDragEnd}
            animate={!this.props.disabled}
            path={this.getPolylinePoints()}
          />
          {this.getRoundedPoints().map(({ x, y }, idx) => (
            <SVGPoint
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
  componentDidUpdate(prevProps: ReactLassoProps) {
    if (
      (prevProps.src && prevProps.src !== this.props.src) ||
      (prevProps.disabled === false &&
        this.props.disabled &&
        !this.state.path.closed)
    ) {
      this.dispatchPathAction({ type: pathActions.RESET });
    }
  }
  convertPoints (points: Point[]): Point[] {
    const aspectRatio = this.getAspectRatio();
    return this.svg.convertViewboxPointsToReal(points)
      .map(({x, y}) => ({
        x: Math.round(x / aspectRatio.x),
        y: Math.round(y / aspectRatio.y)
      }));
  }
  emitOnChange({ points }: ReactLassoPathState) {
    if (this.props.onChange) {
      this.props.onChange(this.convertPoints(points));
    }
  }
  emitOnUpdate(convertedPoints: Point[]) {
    if (this.props.onUpdate) {
      this.props.onUpdate(convertedPoints);
    }
  }
  checkIfPathUpdated(wasClosedBefore: boolean, newPathState = this.state.path) {
    if (newPathState.closed || wasClosedBefore) {
      const convertedPoints = this.convertPoints(newPathState.points);
      if (!arePointListEqual(convertedPoints, this.lastEmittedPoints)) {
        this.emitOnUpdate(convertedPoints);
        this.lastEmittedPoints = convertedPoints.map(({ x, y }) => ({ x, y }));
      }
    }
  }
  setPointer({ x, y }: Point) {
    this.setState({
      path: this.state.path,
      pointer: { x, y },
    });
  }
  calculatePointsAngles(points = this.state.path.points) {
    const angles: number[] = [];
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
  dispatchPathAction(action: pathReducerAction & { pointer?: Point }) {
    const [newPathState, wasModified] = pathReducer(
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
  isLoaded() {
    if (this.error || !this.svgRef.current) return false;
    const svg = this.svgRef.current;
    return !!(svg.width.baseVal.value && svg.height.baseVal.value);
  }
  getAspectRatio (): Point {
    if (!this.imageRef.current) {
      return { x: NaN, y: NaN };
    }
    // original * aspectRatio = size
    return {
      x: this.imageRef.current.clientWidth / this.imageRef.current.naturalWidth,
      y: this.imageRef.current.clientHeight / this.imageRef.current.naturalHeight
    };
  }
  getRoundedPoints() {
    return this.state.path.points.map(roundPointCoordinates);
  }
  getBorder(): Point[] {
    return this.svg
      .getBorderPoints()
      .map(roundPointCoordinates)
      .map(({ x, y }) => ({ x: x - 1, y: y + 1 })); // fishy bug here so i have to margin area
  }
  getPolygonPoints(): Point[] {
    const roundedPoints = this.getRoundedPoints();
    const border = this.getBorder();
    return this.state.path.closed
      ? [...border, ...roundedPoints, roundedPoints[0], border[0]]
      : border;
  }
  getPolylinePoints(): Point[] {
    const roundedPoints = this.getRoundedPoints();
    return roundedPoints.concat(
      this.state.path.closed
        ? roundedPoints[0]
        : roundPointCoordinates(this.state.pointer)
    );
  }
  findPointByPosition(x: number, y: number, r = 0): { point: Point, index: number } {
    const index = this.state.path.points.findIndex(
      (point) => Math.max(Math.abs(point.x - x), Math.abs(point.y - y)) <= r
    );
    return { point: { ...this.state.path.points[index] }, index };
  }
  getMousePosition(
    e: touchOrMouseEvent<SVGSVGElement>,
    lookupForNearlyPoints = true,
    lookupForApproximation = true
  ): [Point, { point: Point; index: number }] {
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
  // Events
  onShapeDrag = ({ dx, dy }: Vector) => {
    const newPath = this.state.path.points.map(({ x, y }) => ({
      x: x + dx,
      y: y + dy,
    }));
    if (!newPath.some((point) => this.svg.isAboveTheBorder(point))) {
      this.dispatchPathAction({
        type: pathActions.MOVE,
        payload: { x: dx, y: dy },
      });
    }
  }
  onPointDrag = (idx: number, { dx, dy }: Vector) => {
    const point = { ...this.state.path.points[idx] };
    point.x += dx;
    point.y += dy;
    if (!this.svg.isAboveTheBorder(point)) {
      this.dispatchPathAction({
        type: pathActions.MODIFY,
        payload: { ...point, index: idx },
        pointer: point,
      });
    }
  }
  onDragEnd = () => {
    this.checkIfPathUpdated(false);
  }
  onMediaLoaded = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    if (this.props.initialPath.length) {
      const aspectRatio = this.getAspectRatio();
      const initialPoints = this.svg.convertRealPointsToViewbox(this.props.initialPath.map(({x, y}) => ({ x: x * aspectRatio.x, y: y * aspectRatio.y })));
      this.setState({
        path: {
          points: initialPoints,
          closed: this.props.initialPath.length > 2,
        },
        pointer: this.state.pointer,
      });
    }
    this.error = false;
    this.props.onImageLoad(e);
  }
  onMediaError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    this.dispatchPathAction({ type: pathActions.RESET });
    this.error = true;
    this.props.onImageError(e);
  }
  onClickTouchEvent = (e: touchOrMouseEvent<SVGSVGElement>) => {
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
    if (!this.svg.isAboveTheBorder(pointer)) {
      this.dispatchPathAction({
        type: pathActions.ADD,
        payload: { ...pointer },
        pointer,
      });
    } else {
      this.onMouseLeave();
    }
  }
  onClick = (e: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
    this.onClickTouchEvent(e);
  }
  onTouchEnd = (e: React.TouchEvent<SVGSVGElement>) => {
    if (e.cancelable) {
      e.preventDefault();
      this.onClickTouchEvent(e);
    }
  }
  onMouseMove = (e: touchOrMouseEvent<SVGSVGElement>) => {
    if (!this.isLoaded()) return;
    const [pointer] = this.getMousePosition(e);
    this.setPointer(pointer);
  }
  onContextMenu = (e: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
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
  onMouseLeave = () => {
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
