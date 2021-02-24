import React from 'react';
import { withDraggable } from './withDraggable';
import { Point } from './helpers';

export interface SVGPointProps extends Point {
  style: React.CSSProperties;
  draggable: boolean;
}

export const SVGPoint = withDraggable(
  React.forwardRef<SVGRectElement, SVGPointProps>(function SVGPoint({ x, y, style }, ref) {
    return (
      <rect
        style={style}
        ref={ref}
        x={x - 10}
        y={y - 10}
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
