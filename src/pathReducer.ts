import { ReactLassoPathState } from '.';
import { arePointsEqual, Point } from './helpers';

export enum pathActions {
  ADD = 'ADD',
  DELETE = 'DELETE',
  MODIFY = 'MODIFY',
  MOVE = 'MOVE',
  RESET = 'RESET',
}

export type pathReducerAction =
  | { type: pathActions.ADD; payload: Point }
  | { type: pathActions.DELETE; payload: number }
  | { type: pathActions.MODIFY; payload: { index: number } & Point }
  | { type: pathActions.MOVE; payload: Point }
  | { type: pathActions.RESET };

export function pathReducer(
  state: ReactLassoPathState,
  action: pathReducerAction
): [ReactLassoPathState, boolean] {
  const length = state.points.length;
  switch (action.type) {
  case pathActions.ADD: {
    if (state.closed) return [state, false];
    if (
      (length > 0 &&
          arePointsEqual(state.points[length - 1], action.payload)) ||
        (length > 1 &&
          arePointsEqual(state.points[length - 2], action.payload))
    ) {
      return [state, false];
    }
    const needToBeClosed =
        length > 2 && arePointsEqual(state.points[0], action.payload);
    if (needToBeClosed)
      return [{ points: [...state.points], closed: true }, true];
    return [
      { points: [...state.points, action.payload], closed: false },
      true,
    ];
  }
  case pathActions.DELETE: {
    return [
      {
        points: [
          ...state.points.filter((_, idx) => action.payload !== idx),
        ],
        closed: length > 4 && state.closed,
      },
      true,
    ];
  }
  case pathActions.MODIFY: {
    const { x: sx, y: sy } = state.points[action.payload.index];
    const newPoints = state.points.map(({ x, y }) => {
      if (x === sx && y === sy) {
        return {
          x: action.payload.x,
          y: action.payload.y,
        };
      }
      return { x, y };
    });
    return [
      { points: newPoints, closed: state.closed },
      !!(action.payload.x || action.payload.y),
    ];
  }
  case pathActions.MOVE: {
    return [
      {
        points: state.points.map(({ x, y }) => ({
          x: x + action.payload.x,
          y: y + action.payload.y,
        })),
        closed: state.closed,
      },
      !!(action.payload.x || action.payload.y),
    ];
  }
  case pathActions.RESET:
    return [{ points: [], closed: false }, !!(state.points.length)];
  default:
    return [state, false];
  }
}
