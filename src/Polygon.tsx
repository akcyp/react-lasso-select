import React from 'react';

export interface IPolygonProps {
  path: { x: number; y: number }[];
}

function Polygon({ path }: IPolygonProps): JSX.Element {
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
export default Polygon;
