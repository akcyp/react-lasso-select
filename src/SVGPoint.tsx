import React from 'react';
import { Point } from './types';
import { withDraggable } from './withDraggable';

export interface SVGPointProps extends Point {
  style: React.CSSProperties;
}

export const SVGPoint = withDraggable(
  React.forwardRef<SVGRectElement, SVGPointProps>(function SVGPoint({ x, y, style }, ref) {
    return (
      <rect
        ref={ref}
        x={x - 10}
        y={y - 10}
        width="20px"
        height="20"
        fill="rgba(0, 0, 0, 0)"
        stroke="white"
        strokeWidth="1.25"
        style={style}
        vectorEffect="non-scaling-stroke"
        // vectorEffect="non-scaling-size" will be featured in SVG 2.0!
      />
    );
  })
);
