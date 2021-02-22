# React-lasso-select

A responsive react tool for marking irregular areas in images (lasso / free select). No dependencies!

[![React Lasso Select on NPM](https://img.shields.io/npm/v/react-lasso-select.svg)](https://www.npmjs.com/package/react-lasso-select)
![Minified size](https://img.shields.io/bundlephobia/min/react-lasso-select)

![Preview](preview.jpg)

## Features

- Responsive (you can change image size even while selecting!)
- Touch events support
- Keyboard support for precise selection
- No dependencies

## Installation

```bash
npm i react-lasso-select
```

## Usage

Import the main js module and css file:

```js
import ReactLassoSelect from 'react-lasso-select';
import 'react-lasso-select/lib/index.css';
```

## Example

```jsx
import ReactLassoSelect, { getCanvas } from 'react-lasso-select';
import 'react-lasso-select/lib/index.css';

function App () {
  const src = './demo.jpg';
  const [points, setPoints] = useState([]);
  const [clippedImg, setClippedImg] = useState();
  return (
    <div className="App">
      <ReactLassoSelect
        src={src}
        onUpdate={ path => {
          setPoints(path);
          getCanvas(src, path, (canvas) => {
            setClippedImg(canvas.toDataURL());
          });
        }}
      />
      <div>Points: {points.map(({x, y}) => `${x},${y}`).join(' ')}</div>
      <div><img src={clippedImg} alt="clipped" /></div>
    </div>
  );
}
```

## Props

Most important props:

- `src` (string) (required) Specifies the path to the image (or base64 string)
- `onUpdate(path)` Callback fired every time path has been changed
- `onChange(path)` Callback fired every time path has been updated

Props related to component:

- `initialPath` (array of {x: number, y: number}) default path set each time an image is loaded
- `disabled` (boolean, default false) Set to true to block selecting
- `style` (object) CSS style attributes for component container
- `viewBox` ({width: number, height: number}) Viewbox attribute for svg element, avoid changing the default value.

Props related to image:

- `imageAlt` (string) Specifies an alternate text for the image, if the image for some reason cannot be displayed
- `crossOrigin` (string) CrossOrigin attributes for image element
- `imageStyle` (object) CSS style properties for image
- `onImageLoad(event)` A callback which happens when the image is loaded
- `onImageError(event)` Callback called when image is unable to load

## Difference between `onUpdate` and `onChange` props

- `onChange` is triggered with every little movement while dragging points
- `onUpdate` runs at the end of a drag, so it's better to use it for better performance

## Contributing / Developing

Feel free to post any PR or issues. Be here for information on features, bug fixes, or documentation.

To develop clone this repository and run `npm i -D` and `npm run build`, this will create a `lib` folder with compiled files.
