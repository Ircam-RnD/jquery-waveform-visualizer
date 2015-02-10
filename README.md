jQuery waveform visualizer
===================================================

_A simple jQuery plugin build around [`waves.js`](https://github.com/Ircam-RnD/waves), to visualize waveform and metadata._

__warning__: this plugin relies on the `webAudioAPI` (IE not supported)

## Install

first load `jquery`, `waves.js` and the plugin in your page (at the end of the `body` tag)

```html
<script src="/path/to/jquery.min.js"></script>
<script src="/path/to/waves.min.js"></script>
<script src="/path/to/jquery-waveform-visualizer.js"></script>
```

## Plugin initialization

In order to display the visualization, you need to insert the following tag:

```html
<div id="timeline" data-audio="/path/to/audio-file.wav" data-annotations="/path/to/annotations-file.json"></div>
```

_the both attributes `data-audio` and `data-annotations` are mandatory_  

- `data-audio` value must be set to the path of your audio file (for cross browser compatibility, it's better to use a `.wav` file, multiple sources are not yet supported)
- `data-annotations` value must be point to your annotation data file

The data file must have the following format (values are in seconds):

```json
[
  {
    "start": 1.2,
    "duration": 1
  }, {
    // ...
  }
]
```

If you want the module to have a specified size in your document, you can set it in css (defaults are: `width: 100%` and `height: 200px`):

```css
#timeline {
  width: 800px;
  height: 240px;
}
```

Finally, initialize the plugin:

```javascript
$('#timeline').waveformVisualizer();
```

## Configuration options

Here are the default values:

```javascript
var defaults = {
  waveformColor: '#586e75',
  segmentColor: '#cb4b16',
  anchorColor: '#657b83',
  cursorColor: '#dc322f',
  segmentOpacity: 0.3
};
```

these values can be overriden in the plugin initialization:

```javascript
$('#timeline').waveformVisualizer({
  waveformColor: 'steelblue',
  // ...
})
```

## Example

to see an example of the plugin, launch a file server in this directory and go to the `/example` folder


