import { pathReducer, pathActions } from '../pathReducer';

describe('pathReducer action', () => {
  test('pathActions.ADD should add point', () => {
    const [newPathState, wasModified] = pathReducer(
      { closed: false, points: [] },
      {
        type: pathActions.ADD,
        payload: { x: 1, y: 1 }
      }
    );
    expect(newPathState).toStrictEqual({ closed: false, points: [{ x: 1, y: 1 }] });
    expect(wasModified).toBe(true);
  });

  test('pathActions.ADD should not add the same point', () => {
    const [newPathState, wasModified] = pathReducer(
      { closed: false, points: [{ x: 1, y: 1 }] },
      {
        type: pathActions.ADD,
        payload: { x: 1, y: 1 }
      }
    );
    expect(newPathState).toStrictEqual({ closed: false, points: [{ x: 1, y: 1 }] });
    expect(wasModified).toBe(false);
  });

  test('pathActions.DELETE} should delete point from list', () => {
    const [newPathState, wasModified] = pathReducer(
      { closed: false, points: [{ x: 1, y: 1 }, { x: 2, y: 2 }] },
      {
        type: pathActions.DELETE,
        payload: 0
      }
    );
    expect(newPathState).toStrictEqual({ closed: false, points: [{ x: 2, y: 2}] });
    expect(wasModified).toBe(true);
  });

  test('pathActions.RESET should assign point list to empty array', () => {
    const [newPathState, wasModified] = pathReducer(
      {
        closed: false,
        points: [
          { x: 1, y: 1 },
          { x: 2, y: 2 }
        ]
      },
      {
        type: pathActions.RESET
      }
    );
    expect(newPathState).toStrictEqual({ closed: false, points: [] });
    expect(wasModified).toBe(true);
  });

  test('pathActions.MOVE should replace all points', () => {
    const [newPathState, wasModified] = pathReducer(
      {
        closed: false,
        points: [
          { x: 1, y: 1 },
          { x: 2, y: 2 }
        ]
      },
      {
        type: pathActions.MOVE,
        payload: {
          x: 0.5,
          y: 0.5
        }
      }
    );
    expect(newPathState).toStrictEqual({
      closed: false,
      points: [
        { x: 1.5, y: 1.5 },
        { x: 2.5, y: 2.5 }
      ]
    });
    expect(wasModified).toBe(true);
  });

  test('pathActions.MODIFY should update point', () => {
    const [newPathState, wasModified] = pathReducer(
      {
        closed: false,
        points: [
          { x: 1, y: 1 },
          { x: 2, y: 2 }
        ]
      },
      {
        type: pathActions.MODIFY,
        payload: {
          x: 0.5,
          y: 0.5,
          index: 0
        }
      }
    );
    expect(newPathState).toStrictEqual({
      closed: false,
      points: [
        { x: 0.5, y: 0.5 },
        { x: 2, y: 2 }
      ]
    });
    expect(wasModified).toBe(true);
  });

  test('pathActions.CHANGE should update state', () => {
    const [newPathState, wasModified] = pathReducer(
      {
        closed: false,
        points: [
          { x: 1, y: 1 },
          { x: 2, y: 2 }
        ]
      },
      {
        type: pathActions.CHANGE,
        payload: [{ x: 0, y: 0 }]
      }
    );
    expect(newPathState).toStrictEqual({ closed: false, points: [{ x: 0, y: 0 }] });
    expect(wasModified).toBe(true);
  });

  test('pathActions.ADD first point should close path', () => {
    const [newPathState, wasModified] = pathReducer(
      {
        closed: false,
        points: [
          { x: 1, y: 1 },
          { x: 2, y: 2 },
          { x: 3, y: 3 }
        ]
      },
      {
        type: pathActions.ADD,
        payload: {
          x: 1,
          y: 1
        }
      }
    );
    expect(newPathState).toStrictEqual({
      closed: true,
      points: [
        { x: 1, y: 1 },
        { x: 2, y: 2 },
        { x: 3, y: 3 }
      ]
    });
    expect(wasModified).toBe(true);
  });
});