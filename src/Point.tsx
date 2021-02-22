import React from 'react';
import withDraggable from './withDraggable';

export interface IPointProps {
  x: number;
  y: number;
  style: React.CSSProperties;
}

export default withDraggable(
  React.forwardRef<SVGRectElement, IPointProps>(function Point(
    { x, y, style }: IPointProps,
    ref
  ) {
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
