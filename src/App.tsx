import { SyntheticEvent, useCallback, useMemo, useState } from 'react';
import src from './assets/demo.jpg';
import './App.css';
import { getCanvas, ReactLassoSelect } from '../lib';

interface Point {
  x: number;
  y: number;
}

interface Controls {
  width: number;
  disabled: boolean;
  disabledShapeChange: boolean;
}

const blankImage = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw=';
const pointsToString = (points: Point[]) => points.map(({ x, y }) => `${x},${y}`).join(' ');
const pointsFromString = (raw: string): Point[] =>
  raw
    .split(' ')
    .map((point) => point.split(','))
    .map(([x, y]) => ({ x: Number(x), y: Number(y) }));

const initialPoints = pointsFromString('172,173 509,99 458,263');

export default function App() {
  const [points, setPoints] = useState<Point[]>(initialPoints);
  const pointsAsString = useMemo(() => pointsToString(points), [points]);

  const [clippedImg, setClippedImg] = useState(blankImage);
  const [imgSize, setImgSize] = useState({ width: 0, height: 0 });

  const [controls, setControls] = useState<Controls>({
    width: 300,
    disabled: false,
    disabledShapeChange: false
  });

  const setControl = useCallback(
    <T extends keyof Controls>(key: T, value: Controls[T]) => {
      setControls((prev) => ({ ...prev, [key]: value }));
    },
    [setControls]
  );

  return (
    <main className="main">
      <div className="component">
        <ReactLassoSelect
          value={points}
          src={src}
          disabled={controls.disabled}
          disabledShapeChange={controls.disabledShapeChange}
          imageStyle={{ width: `${controls.width}px` }}
          onChange={setPoints}
          onComplete={(value: Point[]) => {
            if (!value.length) return;
            getCanvas(src, value, (err: Error | null, canvas: HTMLCanvasElement) => {
              if (!err) {
                setClippedImg(canvas.toDataURL());
              }
            });
          }}
          onImageLoad={(e: SyntheticEvent<HTMLImageElement, Event>) => {
            console.log('RLS: onImageLoad event triggered');
            const img = e.target as HTMLImageElement;
            setImgSize({
              width: img.naturalWidth,
              height: img.naturalHeight
            });
          }}
          onImageError={() => {
            console.log('RLS: onImageError event triggered');
          }}
        />
      </div>
      <div className="controls">
        <p className="points">Points: {pointsAsString}</p>

        <div className="control">
          <label htmlFor="c-width">Width:</label>
          <input
            id="c-width"
            type="range"
            min="0"
            max="1000"
            value={controls.width}
            onChange={(e) => setControl('width', +e.target.value)}
          />
        </div>

        <div className="control">
          <label htmlFor="c-disabled">Disabled:</label>
          <input
            id="c-disabled"
            type="checkbox"
            checked={controls.disabled}
            onChange={(e) => setControl('disabled', e.target.checked)}
          />
        </div>

        <div className="control">
          <label htmlFor="c-disabled-reshape">DisabledShapeChange:</label>
          <input
            id="c-disabled-reshape"
            type="checkbox"
            checked={controls.disabledShapeChange}
            onChange={(e) => setControl('disabledShapeChange', e.target.checked)}
          />
        </div>

        <svg className="minimap" viewBox={`0 0 ${imgSize.width} ${imgSize.height}`}>
          <polyline fill="red" points={pointsAsString} />
        </svg>
        <div className="clipped-image">
          <img src={clippedImg} alt="Clipped image" />
        </div>
      </div>
    </main>
  );
}
