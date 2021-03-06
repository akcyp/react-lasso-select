import { pathReducer, pathActions } from '../pathReducer';

test(`pathReducer: ${pathActions.ADD}`, () => {
  const [newPathState, wasModified] = pathReducer(
    { closed: false, points: [] },
    {
      type: pathActions.ADD,
      payload: { x: 1, y: 1 }
    }
  );
  expect(newPathState).toEqual({ closed: false, points: [{ x: 1, y: 1 }] });
  expect(wasModified).toBe(true);
});

test(`pathReducer: ${pathActions.ADD} the same point`, () => {
  const [newPathState, wasModified] = pathReducer(
    { closed: false, points: [{ x: 1, y: 1 }] },
    {
      type: pathActions.ADD,
      payload: { x: 1, y: 1 }
    }
  );
  expect(newPathState).toEqual({ closed: false, points: [{ x: 1, y: 1 }] });
  expect(wasModified).toBe(false);
});

test(`pathReducer: ${pathActions.DELETE}`, () => {
  const [newPathState, wasModified] = pathReducer(
    { closed: false, points: [{ x: 1, y: 1 }] },
    {
      type: pathActions.DELETE,
      payload: 0
    }
  );
  expect(newPathState).toEqual({ closed: false, points: [] });
  expect(wasModified).toBe(true);
});

test(`pathReducer: ${pathActions.RESET}`, () => {
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
  expect(newPathState).toEqual({ closed: false, points: [] });
  expect(wasModified).toBe(true);
});

test(`pathReducer: ${pathActions.MOVE}`, () => {
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
  expect(newPathState).toEqual({
    closed: false,
    points: [
      { x: 1.5, y: 1.5 },
      { x: 2.5, y: 2.5 }
    ]
  });
  expect(wasModified).toBe(true);
});

test(`pathReducer: ${pathActions.MODIFY}`, () => {
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
  expect(newPathState).toEqual({
    closed: false,
    points: [
      { x: 0.5, y: 0.5 },
      { x: 2, y: 2 }
    ]
  });
  expect(wasModified).toBe(true);
});

test(`pathReducer: ${pathActions.CHANGE}`, () => {
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
  expect(newPathState).toEqual({ closed: false, points: [{ x: 0, y: 0 }] });
  expect(wasModified).toBe(true);
});

test('pathReducer: close path', () => {
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
  expect(newPathState).toEqual({
    closed: true,
    points: [
      { x: 1, y: 1 },
      { x: 2, y: 2 },
      { x: 3, y: 3 }
    ]
  });
  expect(wasModified).toBe(true);
});
