import React from 'react';
import { Point } from './types';

export interface SVGPolygonProps {
  path: Point[];
}

export function SVGPolygon({ path }: SVGPolygonProps) {
  return (
    <polygon
      points={path.map(({ x, y }) => `${x},${y}`).join(' ')}
      fill="rgba(0, 0, 0, 0.5)"
      fillRule="evenodd"
      stroke="null"
      shapeRendering="geometricPrecision"
    />
  );
}
