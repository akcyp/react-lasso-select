import React from 'react';
import { withDraggable } from './withDraggable';
import { Point } from './helpers';

export interface SVGPolylineProps {
  path: Point[];
  animate: boolean;
  draggable: boolean;
}

export const SVGPolyline = withDraggable(
  React.forwardRef<SVGPolylineElement, SVGPolylineProps>(function SVGPolyline({ path, animate, draggable }, ref) {
    return (
      <polyline
        ref={ref}
        style={{cursor: draggable ? 'move' : ''}}
        points={path.map(({ x, y }) => `${x},${y}`).join(' ')}
        fill="rgba(0,0,0,0)"
        stroke="white"
        strokeWidth="1.5"
        shapeRendering="geometricPrecision"
        strokeDasharray="3"
        strokeDashoffset="0"
        vectorEffect="non-scaling-stroke"
      >
        {animate && (
          <animate
            attributeName="stroke-dashoffset"
            values="0;1000;0"
            dur="100s"
            repeatCount="indefinite"
          />
        )}
      </polyline>
    );
  })
);
