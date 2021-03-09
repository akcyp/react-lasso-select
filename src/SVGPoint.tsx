import React from 'react';
import { withDraggable } from './withDraggable';
import { Point } from './helpers';

export interface SVGPointProps extends Point {
  style: React.CSSProperties;
  draggable: boolean;
  onClickTouchEvent: (e: React.MouseEvent | React.TouchEvent) => void;
}

export const SVGPoint = withDraggable(
  React.forwardRef<SVGRectElement, SVGPointProps>(function SVGPoint(
    { x, y, onClickTouchEvent, draggable, style },
    ref
  ) {
    const { cursor = draggable ? 'move' : 'default', ...rest } = style;
    return (
      <rect
        style={{
          cursor,
          ...rest
        }}
        ref={ref}
        x={x - 10}
        y={y - 10}
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          onClickTouchEvent(e);
        }}
        onTouchEnd={(e) => {
          e.stopPropagation();
          e.preventDefault();
          onClickTouchEvent(e);
        }}
        width="20px"
        height="20"
        fill="rgba(0, 0, 0, 0)"
        stroke="white"
        strokeWidth="1.25"
        vectorEffect="non-scaling-stroke"
        // vectorEffect="non-scaling-size" will be featured in SVG 2.0!
      />
    );
  })
);
