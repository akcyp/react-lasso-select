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

describe('objectToClassName', () => {
  test('should return className string', () => {
    expect(
      objectToClassName({
        a: true,
        b: false,
        c: true
      })
    ).toBe('a c');
  });
});

describe('arePointsEqual', () => {
  test('should compare points', () => {
    expect(arePointsEqual({ x: 1, y: 2 }, { x: 1, y: 2 })).toBe(true);
    expect(arePointsEqual({ x: 1.99, y: 2 }, { x: 1.999, y: 2 })).toBe(false);
  });
});

describe('arePointListEqual', () => {
  test('should compare point lists', () => {
    expect(arePointListEqual([], [])).toBe(true);
    expect(arePointListEqual([{ x: 1, y: 1 }], [{ x: 1, y: 1 }])).toBe(true);
    expect(arePointListEqual([{ x: 1, y: 1 }], [])).toBe(false);
  });
});

describe('roundPointCoordinates', () => {
  test('should round the coordinates of a point', () => {
    expect(roundPointCoordinates({ x: 1.999, y: 1.00001 }, 100)).toStrictEqual({ x: 2, y: 1 });
  });
});

describe('findPointByPosition', () => {
  const pointsFactory = () => [
    [10, 10],
    [20, 20],
    [30, 30]
  ].map(([x, y]) => ({ x, y }));
  test('should find point with radius', () => {
    expect(findPointByPosition(pointsFactory(), { x: 21, y: 21 }, 1)).toStrictEqual({ point: pointsFactory()[1], index: 1 });
  });
  test('should not find point', () => {
    expect(findPointByPosition(pointsFactory(), { x: 21, y: 21 })).toStrictEqual({
      point: { x: NaN, y: NaN },
      index: -1
    });
  });
});

describe('getDistance', () => {
  test('should return distance between points', () => {
    expect(getDistance({ x: 3, y: 4 }, { x: 3, y: 5 })).toBe(1);
    expect(getDistance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
  });
});

describe('getAngle', () => {
  test('should return angle between points', () => {
    expect(getAngle({ x: 1, y: 1 }, { x: 1, y: 1 })).toBe(0);
    expect(getAngle({ x: 0, y: 0 }, { x: 1, y: 1 })).toBe(Math.PI / 4);
    expect(getAngle({ x: 0, y: 0 }, { x: -1, y: 0 })).toBe(Math.PI);
  });
});

describe('approximateToAnAngleMultiplicity', () => {
  test('should approximate point using another point and angle', () => {
    expect(approximateToAnAngleMultiplicity({ x: 0, y: 0 }, { x: 2, y: 2 }, Math.PI)).toStrictEqual({
      x: Math.hypot(2, 2),
      y: 0
    });
    const { x, y } = approximateToAnAngleMultiplicity({ x: 0, y: 0 }, { x: 3, y: 4 }, Math.PI / 4);
    expect(x).toBeCloseTo(3.5, 1);
    expect(y).toBeCloseTo(3.5, 1);
  });
});

describe('approximateToAngles', () => {
  test('should approximate point using another point and array of angles', () => {
    const { x, y } = approximateToAngles({ x: 0, y: 0 }, { x: 0, y: 2 }, [Math.PI / 3, Math.PI / 2]);
    expect(x).toBeCloseTo(0);
    expect(y).toBeCloseTo(2);
  });
});

describe('calculateAnglesBeetwenPoints', () => {
  test('should return angles between points', () => {
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
});
