import { SVGHelper } from '../SVGHelpers';

describe('SVGHelper', () => {
  it('getSVG method should throw Error when callback passed to the constructor returns undefined/null', () => {
    expect(() => new SVGHelper(() => null).getSvg()).toThrowError();
    expect(() => new SVGHelper(() => undefined).getSvg()).toThrowError();
  });
});
