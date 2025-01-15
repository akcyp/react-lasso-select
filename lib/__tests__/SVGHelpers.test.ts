import { describe, test, expect } from 'vitest';
import { SVGHelper } from '../SVGHelpers';

describe('SVGHelper', () => {
  test('getSVG method should throw Error when callback passed to the constructor returns undefined/null', () => {
    expect(() => new SVGHelper(() => null).getSvg()).toThrowError();
    expect(() => new SVGHelper(() => undefined).getSvg()).toThrowError();
  });
});
