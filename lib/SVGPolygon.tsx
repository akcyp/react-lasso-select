import { Point } from './helpers';

export interface SVGPolygonProps {
  path: Point[];
}

export function SVGPolygon({ path }: SVGPolygonProps) {
  return (
    <polygon
      style={{
        pointerEvents: 'none',
        transform: 'translate(-1px, -1px)'
      }}
      points={path.map(({ x, y }) => `${x},${y}`).join(' ')}
      fill="rgba(0, 0, 0, 0.5)"
      fillRule="evenodd"
      stroke="null"
      shapeRendering="geometricPrecision"
    />
  );
}
