import { type CSSProperties, type SyntheticEvent, Component, createRef } from 'react';
import PropTypes from 'prop-types';

import { SVGPolyline } from './SVGPolyline';
import { SVGPolygon } from './SVGPolygon';
import { SVGPoint } from './SVGPoint';
import { SVGHelper } from './SVGHelpers';

import {
  roundPointCoordinates,
  arePointListEqual,
  objectToClassName,
  Point,
  Vector,
  touchOrMouseEvent,
  Size,
  calculateAnglesBeetwenPoints
} from './helpers';

import { pathReducer, pathActions, pathReducerAction, PathState } from './pathReducer';
import { RectangleSelection } from './rectangleSelection';
import { LassoSelection } from './lassoSelection';

export type SelectionMode = 'lasso' | 'rectangle';

export interface ReactLassoProps {
  src: string;
  value: Point[];
  style: CSSProperties;
  viewBox: Size;
  disabled: boolean;
  disabledShapeChange: boolean;
  imageStyle: CSSProperties;
  onImageLoad: (e: SyntheticEvent<HTMLImageElement, Event>) => void;
  onImageError: (e: SyntheticEvent<HTMLImageElement, Event>) => void;
  onChange?: (path: Point[]) => void;
  onComplete?: (path: Point[]) => void;
  selectionMode?: SelectionMode;
  imageAlt?: string;
  crossOrigin?: 'anonymous' | 'use-credentials' | '';
}

export interface ReactLassoState {
  path: PathState;
  pointer: Point;
}

export class ReactLassoSelect extends Component<ReactLassoProps, ReactLassoState> {
  public state: ReactLassoState;
  public imageRef = createRef<HTMLImageElement>();
  public svgRef = createRef<SVGSVGElement>();
  public svg = new SVGHelper(() => this.svgRef?.current);
  public rectangleSelection = new RectangleSelection(this.svg);
  public lassoSelection = new LassoSelection(this.svg);
  public angles: number[] = [];
  public path: PathState = {
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
    const isRectangleMode = this.props.selectionMode === 'rectangle';
    const cursor =
      isRectangleMode && !this.props.disabled
        ? 'crosshair'
        : this.props.disabled
          ? 'not-allowed'
          : 'default';

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
          cursor: cursor,
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
            touchAction: 'none',
            cursor: cursor
          }}
          viewBox={`0 0 ${this.props.viewBox.width} ${this.props.viewBox.height}`}
          onMouseDown={this.onMouseDown}
          onMouseMove={this.onMouseMove}
          onMouseUp={this.onMouseUp}
          onTouchStart={this.onTouchStart}
          onTouchMove={this.onTouchMove}
          onTouchEnd={this.onTouchEnd}
          onClick={this.onClick}
          onContextMenu={this.onContextMenu}
          onMouseLeave={this.hidePointer}
        >
          <rect visibility="hidden" />
          {!!this.state.path.points.length && <SVGPolygon path={this.getPolygonPoints()} />}
          <SVGPolyline
            draggable={this.state.path.closed && !this.props.disabled}
            onDrag={this.onShapeDrag}
            onDragEnd={this.onDragEnd}
            animate={!this.props.disabled}
            path={this.getPolylinePoints()}
            selectionMode={this.props.selectionMode ?? 'lasso'}
          />
          {this.getRoundedPoints().map(({ x, y }, idx) => (
            <SVGPoint
              key={idx}
              x={x}
              y={y}
              draggable={!this.props.disabled && !this.props.disabledShapeChange}
              style={{
                cursor:
                  !idx && this.state.path.points.length > 2 && !this.state.path.closed
                    ? 'pointer'
                    : undefined
              }}
              onDrag={({ dx, dy }) => this.onPointDrag(idx, { dx, dy })}
              onDragEnd={this.onDragEnd}
              onClickTouchEvent={() => this.onPointClick(idx)}
            />
          ))}
        </svg>
      </div>
    );
  }
  onMouseDown = (e: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
    if (this.props.selectionMode === 'rectangle') {
      this.onRectangleStart(e);
    }
  };
  onMouseMove = (e: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
    if (this.props.selectionMode === 'rectangle') {
      this.onRectangleMove(e);
    } else {
      this.onMouseTouchMove(e);
    }
  };
  onMouseUp = (e: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
    if (this.props.selectionMode === 'rectangle') {
      this.onRectangleEnd(e);
    }
  };
  onTouchStart = (e: React.TouchEvent<SVGSVGElement>) => {
    if (this.props.selectionMode === 'rectangle') {
      this.onRectangleStart(e);
    }
  };
  onTouchMove = (e: React.TouchEvent<SVGSVGElement>) => {
    if (this.props.selectionMode === 'rectangle') {
      this.onRectangleMove(e);
    } else {
      this.onMouseTouchMove(e);
    }
  };
  onRectangleStart = (e: touchOrMouseEvent<SVGSVGElement>) => {
    if (this.props.disabled || !this.isLoaded()) return;

    this.rectangleSelection.onStart(e, this.state.path, this.dispatchPathAction.bind(this));
  };
  onRectangleMove = (e: touchOrMouseEvent<SVGSVGElement>) => {
    if (this.props.disabled || !this.isLoaded()) return;

    this.rectangleSelection.onMove(e, this.state.path, this.dispatchPathAction.bind(this));
  };
  onRectangleEnd = (e: touchOrMouseEvent<SVGSVGElement>) => {
    if (this.props.disabled || !this.isLoaded()) return;

    this.rectangleSelection.onEnd(
      e,
      this.state.path,
      this.finishRectangleSelection.bind(this),
      this.cancelRectangleSelection.bind(this)
    );
  };
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
  emitOnChange({ points, closed }: PathState) {
    if (!this.props.onChange) return;

    const shouldEmit = this.shouldEmitChange(points, closed);
    if (!shouldEmit) return;

    const convertedPoints = this.convertPoints(points);
    this.lastEmittedPoints = convertedPoints;
    this.props.onChange(convertedPoints);
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
    if (this.props.selectionMode === 'rectangle') {
      return this.rectangleSelection.getPolylinePoints(
        this.state.path,
        this.getRoundedPoints.bind(this)
      );
    }

    return this.lassoSelection.getPolylinePoints(this.state.path, this.state.pointer);
  }
  getMousePosition(
    e: touchOrMouseEvent<SVGSVGElement>,
    lookupForNearlyPoints = true,
    lookupForApproximation = true
  ): [Point, { point: Point; index: number }] {
    this.lassoSelection.setAngles(this.angles);

    return this.lassoSelection.getMousePosition(e, this.state.path, {
      lookupForNearlyPoints,
      lookupForApproximation
    });
  }
  // Events
  onShapeDrag = ({ dx, dy }: Vector) => {
    this.lassoSelection.onShapeDrag(
      { dx, dy },
      this.state.path,
      this.dispatchPathAction.bind(this)
    );
  };
  onPointDrag = (idx: number, { dx, dy }: Vector) => {
    this.lassoSelection.onPointDrag(
      idx,
      { dx, dy },
      this.state.path,
      this.dispatchPathAction.bind(this)
    );
  };
  onPointClick = (idx: number) => {
    if (this.isLoaded() && !this.props.disabled) {
      this.lassoSelection.onPointClick(idx, this.state.path, this.dispatchPathAction.bind(this));
    }
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
  onLassoClick = (e: touchOrMouseEvent<SVGSVGElement>) => {
    if (this.isLoaded() && !this.props.disabled && this.props.selectionMode === 'lasso') {
      this.lassoSelection.onClickTouch(
        e,
        this.state.path,
        this.dispatchPathAction.bind(this),
        this.svgRef,
        this.hidePointer.bind(this)
      );
    }
  };
  onClick = (e: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
    if (this.props.selectionMode === 'lasso') {
      this.onLassoClick(e);
    }
  };
  onTouchEnd = (e: React.TouchEvent<SVGSVGElement>) => {
    if (this.props.selectionMode === 'rectangle') {
      this.onRectangleEnd(e);
    } else {
      if (e.cancelable) {
        e.preventDefault();
        this.onLassoClick(e);
      }
      this.hidePointer();
    }
  };
  onMouseTouchMove = (e: touchOrMouseEvent<SVGSVGElement>) => {
    if (this.isLoaded()) {
      this.lassoSelection.onMove(e, this.state.path, this.setPointer.bind(this));
    }
  };
  onContextMenu = (e: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
    if (this.isLoaded()) {
      e.preventDefault();
      if (!this.props.disabled) {
        this.lassoSelection.onContextMenu(
          e,
          this.state.path,
          this.dispatchPathAction.bind(this),
          this.setPointer.bind(this)
        );
      }
    }
  };

  private finishRectangleSelection(rectanglePoints: Point[]) {
    this.path = { points: rectanglePoints, closed: true };
    this.setState({
      path: { points: rectanglePoints, closed: true },
      pointer: rectanglePoints[0]
    });

    this.emitOnChange({ points: rectanglePoints, closed: true });
    const convertedPoints = this.convertPoints(rectanglePoints);
    this.emitOnComplete(convertedPoints);
  }

  private cancelRectangleSelection(pointer: Point) {
    this.setState({
      path: { points: [], closed: false },
      pointer: pointer
    });
    this.path = { points: [], closed: false };
  }

  private shouldEmitChange(points: Point[], closed: boolean): boolean {
    if (this.props.selectionMode === 'rectangle') {
      return this.shouldEmitRectangleChange(points, closed);
    }

    return true; // lasso mode
  }

  private shouldEmitRectangleChange(points: Point[], closed: boolean): boolean {
    const MIN_RECTANGLE_POINTS = 4;

    // Emit for completed rectangles
    const isCompletedRectangle = closed && points.length >= MIN_RECTANGLE_POINTS;

    // Emit for resetting selection
    const isClearingSelection = points.length === 0 && this.lastEmittedPoints.length > 0;

    return isCompletedRectangle || isClearingSelection;
  }

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
    disabledShapeChange: PropTypes.bool,
    onChange: PropTypes.func,
    onComplete: PropTypes.func,
    src: PropTypes.string.isRequired,
    imageAlt: PropTypes.string,
    crossOrigin: PropTypes.string,
    imageStyle: PropTypes.shape({}),
    onImageLoad: PropTypes.func,
    onImageError: PropTypes.func,
    selectionMode: PropTypes.oneOf(['lasso', 'rectangle'])
  };
  static defaultProps = {
    value: [],
    style: {},
    imageStyle: {},
    viewBox: { width: 1e3, height: 1e3 },
    disabled: false,
    disabledShapeChange: false,
    onImageError: Function.prototype,
    onImageLoad: Function.prototype,
    selectionMode: 'lasso' // default to lasso
  };
}
