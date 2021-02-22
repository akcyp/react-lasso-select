import React from 'react';
import withDraggable from './withDraggable';

export interface IPolylineProps {
  path: { x: number; y: number }[];
  animate: boolean;
}

export default withDraggable(
  React.forwardRef<SVGPolylineElement, IPolylineProps>(function Polyline(
    { path, animate } : IPolylineProps,
    ref
  ) {
    return (
      <polyline
        ref={ref}
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
