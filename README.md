jQuery waveform visualizer
===================================================

_A simple jQuery plugin build around [`waves.js`](https://github.com/Ircam-RnD/waves), to visualize waveform and segments along with an HTML5 audio player._

__warning__: this plugin relies on the `webAudioAPI` (IE not supported)

## Install

first load `jquery`, `waves.js` and the plugin files in your page, before closing the `body` tag is considered as a good practice.

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

- `data-audio` _(mandatory)_  
  value must be set to the path to your audio file  
  _for cross browser compatibility, use a `.wav` file, multiple sources are not yet supported_
- `data-annotations` _(optionnal)_  
  attribute value must be the path to your annotation data file

The data file is used to configure the segments on the visualization and must follow this convention:

```javascript
[
  {
    "start": 1.2, // in seconds
    "duration": 1 // in seconds
  }, {
    // ...
  }
]
```

You can also set the size of the module in css (defaults: `width: 100%, height: 200px`):

```css
#timeline {
  width: 800px;
  height: 240px;
}
```

Finally, initialize the plugin:

```javascript
$(document).ready(function() {
  $('#timeline').waveformVisualizer();
});
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

These values can be overriden in the plugin initialization:

```javascript
$('#timeline').waveformVisualizer({
  waveformColor: 'steelblue',
  // ...
})
```

## Example

To see a live example of the plugin, launch a file server in this directory and go to the `/example` folder


