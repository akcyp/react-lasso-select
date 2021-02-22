export interface IPoint {
  x: number;
  y: number;
}

export interface IVector {
  dx: number;
  dy: number;
}

export interface Dictionary<T> {
  [key: string]: T;
}

export type touchOrMouseEvent<T> =
  | React.MouseEvent<T, MouseEvent>
  | React.TouchEvent<T>;
export type touchAndMouseEvent<T> = React.MouseEvent<T, MouseEvent> &
  React.TouchEvent<T>;
