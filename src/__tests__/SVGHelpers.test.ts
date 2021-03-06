import { SVGHelper } from '../SVGHelpers';

test('SVGHelper null/undefined Error', () => {
  expect(() => new SVGHelper(() => null).getSvg()).toThrowError();
  expect(() => new SVGHelper(() => undefined).getSvg()).toThrowError();
});
