import {
  // getClippedImageCanvas,
  objectToClassName,
  arePointsEqual,
  arePointListEqual,
  roundPointCoordinates,
  findPointByPosition,
  getDistance,
  getAngle,
  approximateToAnAngleMultiplicity,
  approximateToAngles,
  calculateAnglesBeetwenPoints
} from '../helpers';

test('objectToClassName', () => {
  expect(
    objectToClassName({
      a: true,
      b: false,
      c: true
    })
  ).toBe('a c');
});

test('arePointsEqual', () => {
  expect(arePointsEqual({ x: 1, y: 2 }, { x: 1, y: 2 })).toBe(true);
  expect(arePointsEqual({ x: 1.99, y: 2 }, { x: 1.999, y: 2 })).toBe(false);
});

test('arePointListEqual', () => {
  expect(arePointListEqual([], [])).toBe(true);
  expect(arePointListEqual([{ x: 1, y: 1 }], [{ x: 1, y: 1 }])).toBe(true);
  expect(arePointListEqual([{ x: 1, y: 1 }], [])).toBe(false);
});

test('roundPointCoordinates', () => {
  expect(roundPointCoordinates({ x: 1.999, y: 1.00001 }, 100)).toEqual({ x: 2, y: 1 });
});

test('findPointByPosition', () => {
  const points = [
    [10, 10],
    [20, 20],
    [30, 30]
  ].map(([x, y]) => ({ x, y }));
  expect(findPointByPosition(points, { x: 21, y: 21 }, 1)).toEqual({ point: points[1], index: 1 });
  expect(findPointByPosition(points, { x: 21, y: 21 })).toEqual({
    point: { x: NaN, y: NaN },
    index: -1
  });
});

test('getDistance', () => {
  expect(getDistance({ x: 3, y: 4 }, { x: 3, y: 5 })).toBe(1);
  expect(getDistance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
});

test('getAngle', () => {
  expect(getAngle({ x: 1, y: 1 }, { x: 1, y: 1 })).toBe(0);
  expect(getAngle({ x: 0, y: 0 }, { x: 1, y: 1 })).toBe(Math.PI / 4);
  expect(getAngle({ x: 0, y: 0 }, { x: -1, y: 0 })).toBe(Math.PI);
});

test('approximateToAnAngleMultiplicity', () => {
  expect(approximateToAnAngleMultiplicity({ x: 0, y: 0 }, { x: 2, y: 2 }, Math.PI)).toEqual({
    x: Math.hypot(2, 2),
    y: 0
  });
  const { x, y } = approximateToAnAngleMultiplicity({ x: 0, y: 0 }, { x: 3, y: 4 }, Math.PI / 4);
  expect(x).toBeCloseTo(3.5, 1);
  expect(y).toBeCloseTo(3.5, 1);
});

test('approximateToAngles', () => {
  const { x, y } = approximateToAngles({ x: 0, y: 0 }, { x: 0, y: 2 }, [Math.PI / 3, Math.PI / 2]);
  expect(x).toBeCloseTo(0);
  expect(y).toBeCloseTo(2);
});

test('calculateAnglesBeetwenPoints', () => {
  const points = [
    { x: 0, y: 0 },
    { x: 1, y: 1 },
    { x: 2, y: 1 }
  ];
  expect(calculateAnglesBeetwenPoints(points)).toEqual([
    Math.PI / 4,
    Math.PI / 4 - Math.PI,
    0,
    Math.PI
  ]);
});
