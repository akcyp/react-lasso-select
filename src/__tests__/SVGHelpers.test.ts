import { SVGHelper } from '../SVGHelpers';

describe('SVGHelper', () => {
  test('with null/undefined should throw Error', () => {
    expect(() => new SVGHelper(() => null).getSvg()).toThrowError();
    expect(() => new SVGHelper(() => undefined).getSvg()).toThrowError();
  });
});
