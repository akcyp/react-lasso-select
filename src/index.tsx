import React from 'react';
import PropTypes from 'prop-types';

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
  Size,
  approximateToAnAngleMultiplicity,
  approximateToAngles,
  calculateAnglesBeetwenPoints,
  findPointByPosition
} from './helpers';

import { pathReducer, pathActions, pathReducerAction } from './pathReducer';

export interface ReactLassoProps {
  src: string;
  value: Point[];
  style: React.CSSProperties;
  viewBox: Size;
  disabled: boolean;
  imageStyle: React.CSSProperties;
  onImageLoad: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void;
  onImageError: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void;
  onChange?: (path: Point[]) => void;
  onComplete?: (path: Point[]) => void;
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
  public path: ReactLassoPathState = {
    points: [],
    closed: false
  };
  public lastEmittedPoints: Point[] = [];
  public lastUpdatedPoints: Point[] = [];
  public imgError = false;
  public setPathFromPropsOnMediaLoad = true;
  constructor(props: ReactLassoProps) {
    super(props);
    this.state = {
      path: {
        points: [],
        closed: false
      },
      pointer: {
        x: props.viewBox.width / 2,
        y: props.viewBox.width / 2
      }
    };
  }
  render() {
    return (
      <div
        className={objectToClassName({
          ReactFreeSelect__Component: true,
          ReactFreeSelect__Closed: this.state.path.closed,
          ReactFreeSelect__Disabled: this.props.disabled
        })}
        style={{
          display: 'inline-block',
          position: 'relative',
          margin: '0',
          padding: '0',
          fontSize: '0',
          cursor: this.props.disabled ? 'not-allowed' : 'default',
          ...this.props.style
        }}
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
          style={{
            position: 'absolute',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            overflow: 'hidden',
            userSelect: 'none',
            touchAction: 'none'
          }}
          viewBox={`0 0 ${this.props.viewBox.width} ${this.props.viewBox.height}`}
          onMouseMove={this.onMouseMove}
          onTouchMove={this.onMouseMove}
          onClick={this.onClick}
          onTouchEnd={this.onTouchEnd}
          onContextMenu={this.onContextMenu}
          onMouseLeave={this.hidePointer}
        >
          {!!this.state.path.points.length && <SVGPolygon path={this.getPolygonPoints()} />}
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
                  !idx && this.state.path.points.length > 2 && !this.state.path.closed
                    ? 'pointer'
                    : undefined
              }}
              onDrag={({ dx, dy }) => this.onPointDrag(idx, { dx, dy })}
              onDragEnd={this.onDragEnd}
              onClick={() => this.onPointClick(idx)}
            />
          ))}
        </svg>
      </div>
    );
  }
  componentDidUpdate(prevProps: ReactLassoProps) {
    if (!prevProps.disabled && this.props.disabled && !this.path.closed) {
      this.hidePointer();
    }
    if (prevProps.src && prevProps.src !== this.props.src) {
      this.dispatchPathAction({ type: pathActions.RESET });
    } else if (!arePointListEqual(prevProps.value, this.props.value)) {
      if (this.isLoaded()) {
        this.setPathStateFromProps();
      } else {
        this.setPathFromPropsOnMediaLoad = true;
      }
    }
  }
  convertPoints(points: Point[]): Point[] {
    const aspectRatio = this.getAspectRatio();
    return this.svg.convertViewboxPointsToReal(points).map(({ x, y }) => ({
      x: Math.round(x / aspectRatio.x),
      y: Math.round(y / aspectRatio.y)
    }));
  }
  checkIfPathUpdated(wasClosedBefore: boolean) {
    if (this.path.closed || wasClosedBefore) {
      const convertedPoints = this.convertPoints(this.path.points);
      if (!arePointListEqual(convertedPoints, this.lastUpdatedPoints)) {
        this.emitOnComplete(convertedPoints);
        this.lastUpdatedPoints = convertedPoints.map(({ x, y }) => ({ x, y }));
      }
    }
  }
  emitOnChange({ points }: ReactLassoPathState) {
    if (this.props.onChange) {
      const convertedPoints = this.convertPoints(points);
      this.lastEmittedPoints = convertedPoints;
      this.props.onChange(convertedPoints);
    }
  }
  emitOnComplete(convertedPoints: Point[]) {
    if (this.props.onComplete) {
      this.props.onComplete(convertedPoints);
    }
  }
  setPointer({ x, y }: Point, force = false) {
    if (force || !this.props.disabled) {
      this.setState({
        path: this.path,
        pointer: { x, y }
      });
    }
  }
  hidePointer = () => {
    const lastPoint = this.path.points[this.path.points.length - 1] || {
      x: 0,
      y: 0
    };
    this.setPointer({ ...lastPoint }, true); // tricky way to hide pointer line
  };
  dispatchPathAction(action: pathReducerAction & { pointer?: Point }) {
    const wasClosedBefore = this.path.closed;
    const [newPathState, wasModified] = pathReducer(this.path, action);
    newPathState.points = newPathState.points.map((point) => roundPointCoordinates(point, 1e3));
    if (wasModified) {
      this.path = newPathState;
      this.setState({
        pointer: action.pointer || this.path.points[this.path.points.length - 1] || { x: 0, y: 0 },
        path: newPathState
      });
      this.angles = calculateAnglesBeetwenPoints(newPathState.points);
      this.emitOnChange(newPathState);
      if (![pathActions.MODIFY, pathActions.MOVE].includes(action.type)) {
        this.checkIfPathUpdated(wasClosedBefore); // optimized version of onChange
      }
    }
  }
  isLoaded() {
    if (this.imgError || !this.svgRef.current) return false;
    const svg = this.svgRef.current;
    return !!(svg.width.baseVal.value && svg.height.baseVal.value);
  }
  getAspectRatio(): Point {
    if (!this.imageRef.current) {
      return { x: NaN, y: NaN };
    }
    // original * aspectRatio = size
    return {
      x: this.imageRef.current.clientWidth / this.imageRef.current.naturalWidth,
      y: this.imageRef.current.clientHeight / this.imageRef.current.naturalHeight
    };
  }
  setPathStateFromProps() {
    if (arePointListEqual(this.lastEmittedPoints, this.props.value)) return;
    const aspectRatio = this.getAspectRatio();
    const value = this.svg.convertRealPointsToViewbox(
      this.props.value.map(({ x, y }) => ({
        x: x * aspectRatio.x,
        y: y * aspectRatio.y
      }))
    );
    this.dispatchPathAction({
      type: pathActions.CHANGE,
      payload: value
    });
  }
  getRoundedPoints() {
    return this.state.path.points.map((point) => roundPointCoordinates(point));
  }
  getBorder(): Point[] {
    return this.svg
      .getBorderPoints()
      .map((point) => roundPointCoordinates(point))
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
      this.state.path.closed ? roundedPoints[0] : roundPointCoordinates(this.state.pointer)
    );
  }
  getMousePosition(
    e: touchOrMouseEvent<SVGSVGElement>,
    lookupForNearlyPoints = true,
    lookupForApproximation = true
  ): [Point, { point: Point; index: number }] {
    let pointer = this.svg.getMouseCoordinates(e);
    if (lookupForApproximation) {
      const ctrlCmdPressed = navigator.platform.includes('Mac') ? e.metaKey : e.ctrlKey;
      const lastPoint = this.path.points[this.path.points.length - 1];
      // straighten path from last point
      if (ctrlCmdPressed && lastPoint) {
        if (e.shiftKey) {
          // lookup for parallel lines
          pointer = approximateToAngles(lastPoint, pointer, this.angles);
        } else {
          // angle approximation to 15 deg
          pointer = approximateToAnAngleMultiplicity(lastPoint, pointer, Math.PI / 12);
        }
      }
    }
    const { point, index } = findPointByPosition(this.path.points, pointer, 10);
    if (lookupForNearlyPoints && index > -1) {
      pointer = { ...point };
    }
    return [pointer, { point, index }];
  }
  // Events
  onShapeDrag = ({ dx, dy }: Vector) => {
    const newPath = this.path.points.map(({ x, y }) => ({
      x: x + dx,
      y: y + dy
    }));
    if (!newPath.some((point) => this.svg.isAboveTheBorder(point))) {
      this.dispatchPathAction({
        type: pathActions.MOVE,
        payload: { x: dx, y: dy }
      });
    }
  };
  onPointDrag = (idx: number, { dx, dy }: Vector) => {
    const point = { ...this.path.points[idx] };
    point.x += dx;
    point.y += dy;
    if (!this.svg.isAboveTheBorder(point)) {
      this.dispatchPathAction({
        type: pathActions.MODIFY,
        payload: { ...point, index: idx },
        pointer: point
      });
    }
  };
  onPointClick = (idx: number) => {
    if (!this.isLoaded() || this.props.disabled || this.path.closed) return;
    this.dispatchPathAction({
      type: pathActions.ADD,
      payload: this.path.points[idx]
    });
  };
  onDragEnd = () => {
    this.checkIfPathUpdated(false);
  };
  onMediaLoaded = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    if (this.setPathFromPropsOnMediaLoad) {
      this.setPathStateFromProps();
      this.setPathFromPropsOnMediaLoad = false;
    }
    this.imgError = false;
    this.props.onImageLoad(e);
  };
  onMediaError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    this.dispatchPathAction({ type: pathActions.RESET });
    this.imgError = true;
    this.props.onImageError(e);
  };
  onClickTouchEvent = (e: touchOrMouseEvent<SVGSVGElement>) => {
    if (!this.isLoaded()) return;
    if (this.props.disabled) return;
    if (this.path.closed) {
      if (e.target === this.svgRef.current) {
        this.dispatchPathAction({
          type: pathActions.RESET
        });
      }
      return;
    }
    const [pointer] = this.getMousePosition(e);
    if (!this.svg.isAboveTheBorder(pointer)) {
      this.dispatchPathAction({
        type: pathActions.ADD,
        payload: roundPointCoordinates(pointer, 1e3),
        pointer
      });
    } else {
      this.hidePointer();
    }
  };
  onClick = (e: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
    this.onClickTouchEvent(e);
  };
  onTouchEnd = (e: React.TouchEvent<SVGSVGElement>) => {
    if (e.cancelable) {
      e.preventDefault();
      this.onClickTouchEvent(e);
    }
  };
  onMouseMove = (e: touchOrMouseEvent<SVGSVGElement>) => {
    if (!this.isLoaded()) return;
    const [pointer] = this.getMousePosition(e);
    this.setPointer(pointer);
  };
  onContextMenu = (e: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
    if (!this.isLoaded()) return;
    e.preventDefault();
    if (this.props.disabled || this.path.closed) return;
    const [pointer, { index }] = this.getMousePosition(e);
    if (index > -1) {
      this.dispatchPathAction({
        type: pathActions.DELETE,
        payload: index,
        pointer
      });
    } else {
      this.setPointer(pointer);
    }
  };
  static propTypes = {
    value: PropTypes.arrayOf(
      PropTypes.exact({
        x: PropTypes.number.isRequired,
        y: PropTypes.number.isRequired
      })
    ),
    style: PropTypes.shape({}),
    viewBox: PropTypes.exact({
      width: PropTypes.number.isRequired,
      height: PropTypes.number.isRequired
    }),
    disabled: PropTypes.bool,
    onChange: PropTypes.func,
    onComplete: PropTypes.func,
    src: PropTypes.string.isRequired,
    imageAlt: PropTypes.string,
    crossOrigin: PropTypes.string,
    imageStyle: PropTypes.shape({}),
    onImageLoad: PropTypes.func,
    onImageError: PropTypes.func
  };
  static defaultProps = {
    value: [],
    style: {},
    imageStyle: {},
    viewBox: { width: 1e3, height: 1e3 },
    disabled: false,
    onImageError: Function.prototype,
    onImageLoad: Function.prototype
  };
}

export { ReactLasso as default, ReactLasso as Component, getClippedImageCanvas as getCanvas };
