import React from 'react';
import { SVGHelper } from './SVGHelpers';

import { Point, Vector, touchOrMouseEvent } from './helpers';

export interface WithDraggableProps {
  draggable: boolean;
  onDragStart?: (arg: Point & Vector) => void;
  onDrag?: (arg: Vector) => void;
  onDragEnd?: (arg: Point) => void;
}

// eslint-disable-next-line @typescript-eslint/ban-types
export const withDraggable = <P extends object>(
  Component: React.ComponentType<P>
) => class DraggableHOC extends React.Component<P & WithDraggableProps> {
public ref = React.createRef<SVGSVGElement>();
public svg = new SVGHelper(() => this.ref?.current?.ownerSVGElement);
public dragLastPosition: null | Point = null;
public wasMoved = false;
render() {
  const { draggable, onDrag, onDragStart, onDragEnd, ...rest } = this.props;
  return <Component ref={this.ref} {...(rest as P)} />;
}
componentDidUpdate(prevProps: WithDraggableProps) {
  if (prevProps.draggable && !this.props.draggable) {
    // cleanup after props.draggable changed to false
    if (this.dragLastPosition && this.wasMoved) {
      if (this.props.onDragEnd) {
        this.props.onDragEnd({
          x: this.dragLastPosition.x,
          y: this.dragLastPosition.y,
        });
      }
      this.dragLastPosition = null;
      this.wasMoved = false;
    }
  }
}
componentDidMount() {
  window.addEventListener('mousedown', this.onMouseTouchDown, true);
  window.addEventListener('mousemove', this.onMouseTouchMove, true);
  window.addEventListener('mouseup', this.onMouseTouchUp, true);
  window.addEventListener('touchstart', this.onMouseTouchDown, true);
  window.addEventListener('touchmove', this.onMouseTouchMove, true);
  window.addEventListener('touchend', this.onMouseTouchUp, true);
}
componentWillUnmount() {
  window.removeEventListener('mousedown', this.onMouseTouchDown);
  window.removeEventListener('mousemove', this.onMouseTouchMove);
  window.removeEventListener('mouseup', this.onMouseTouchUp);
  window.removeEventListener('touchstart', this.onMouseTouchDown);
  window.removeEventListener('touchmove', this.onMouseTouchMove);
  window.removeEventListener('touchend', this.onMouseTouchUp);
}
getMousePosition(ev: TouchEvent | MouseEvent) {
  const e = (ev as unknown) as touchOrMouseEvent<SVGSVGElement>;
  return this.svg.getMouseCoordinates(e);
}
onMouseTouchDown = (e: TouchEvent | MouseEvent) => {
  if (e.target === this.ref.current && this.props.draggable) {
    const target = e.target as EventTarget & SVGSVGElement;
    e.stopPropagation();
    this.dragLastPosition = this.getMousePosition(e);
    if (target.ownerSVGElement) {
      target.ownerSVGElement.focus({ preventScroll: true });
    }
  }
}
onMouseTouchMove = (e: TouchEvent | MouseEvent) => {
  if (this.dragLastPosition) {
    e.stopPropagation();
    const { x, y } = this.getMousePosition(e);
    const dx = x - this.dragLastPosition.x;
    const dy = y - this.dragLastPosition.y;
    if (!this.wasMoved && this.props.onDragStart) {
      this.props.onDragStart({
        x: this.dragLastPosition.x,
        y: this.dragLastPosition.y,
        dx,
        dy,
      });
    }
    if (this.props.onDrag) {
      this.props.onDrag({ dx, dy });
    }
    this.dragLastPosition = { x, y };
    this.wasMoved = true;
  }
}
onMouseTouchUp = (e: TouchEvent | MouseEvent) => {
  if (this.dragLastPosition && this.wasMoved) {
    e.stopPropagation();
    if (e instanceof MouseEvent || !e.touches) {
      window.addEventListener('click', (e) => e.stopPropagation(), {
        capture: true,
        once: true,
      });
    }
    if (this.props.onDragEnd) {
      this.props.onDragEnd({
        x: this.dragLastPosition.x,
        y: this.dragLastPosition.y,
      });
    }
  }
  if (e instanceof TouchEvent && (e.changedTouches || e.cancelable)) {
    e.preventDefault();
  }
  this.dragLastPosition = null;
  this.wasMoved = false;
}
  };