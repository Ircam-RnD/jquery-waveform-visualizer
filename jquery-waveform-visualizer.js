(function($, window, document) {

  var ui = window.wavesUI || window.waves.ui;
  var loaders = window.wavesLoaders || window.waves.loaders;

  var pluginName = 'waveformVisualizer';

  var defaults = {
    waveformColor: '#586e75',
    segmentColor: '#cb4b16',
    cursorColor: '#dc322f',
    segmentInteractions: { selectable: true },
    segmentOpacity: 0.3
  };

  var defaultHeight = 120;

  function Plugin($el, options) {
    this.config = $.extend({}, defaults, options);
    this.$el = $el;
    this.$audio = null;
    this.$player = null;
    this.$axis = null;
    this.$graph = null;

    this.timeline = null; // wave timeline
    // this.getSize();
    this.width = this.$el.width();
    this.height = this.$el.height() || defaultHeight;
    this.audioHeight = null;
    this.axisHeight = 16;
    this.timelineHeight = null;

    this.$el.height(this.height);
    // get data and audio
    this.audioPath = this.$el.attr('data-audio');
    this.annotationsPath = this.$el.attr('data-annotations');
    this.audioBuffer = null;
    this.annotations = null;

    // load audio file and annotation file
    var that = this;
    var audioBufferLoader = new loaders.AudioBufferLoader();

    var promises = [audioBufferLoader.load(this.audioPath)];
    if (this.annotationsPath) {
      promises.push($.getJSON(this.annotationsPath));
    }

    $.when.apply($, promises).done(function(audioPromise, annotationsRes) {
      that.annotations = annotationsRes ? annotationsRes[0] : undefined;

      audioPromise.then(function(audioBuffer) {
        try {
          that.audioBuffer = audioBuffer;
          that.initialize();
        } catch (err) {
          console.error(err.stack);
        }
      }, function(err) { console.error(err); });
    });
  }

  // -----------------------------------
  // create DOM
  // -----------------------------------

  Plugin.prototype.initialize = function() {
    var parts = this.audioPath.split('.');
    var extention = parts[parts.length - 1];
    // create audio player
    this.$player = $('<audio>')
      .css('display', 'block')
      .attr('controls', true)
      .append($('<source>').attr('src', this.audioPath));
    // bind events
    this.$audio = $('<div>', { class: 'audio-container' })
      .css('background', '#121212')
      .append(this.$player);

    this.$el.append(this.$audio);
    // create DOM containers for visualization
    this.audioHeight = this.$audio.height();
    this.waveformHeight = this.height - this.audioHeight - this.axisHeight;

    this.$axis = $('<div>', { class: 'axis-container' });
    this.$graph = $('<div>', { class: 'graph-container' });
    this.$axis.css({'height': this.axisHeight, background: '#ffffff' });
    this.$graph.css({'height': this.timelineHeight, background: '#ffffff' });

    this.$el.append(this.$axis, this.$graph);

    // create graph
    this.createTimeline();
    this.bindPlayerEvents();
    this.bindSegmentEvents();
    this.bindTimelineStates();
  };

  // -----------------------------------
  // create components
  // -----------------------------------

  Plugin.prototype.createTimeline = function() {
    var pixelsPerSecond = this.width / this.audioBuffer.duration;

    // create timeline and tracks
    this.timeline = new ui.core.Timeline(pixelsPerSecond, this.width);

    this.timeline.createTrack(this.$axis[0], this.axisHeight, 'axis');
    this.timeline.createTrack(this.$graph[0], this.waveformHeight, 'main');

    // axis
    this.axisLayer = new ui.helpers.TimeAxisLayer({
      top: 0,
      height: this.axisHeight
    });

    this.axisLayer.setTimeContext(this.timeline.timeContext);

    this.timeline.addLayer(this.axisLayer, 'axis', 'default', true);

    // context
    this.waveformLayer = new ui.helpers.WaveformLayer(this.audioBuffer, {
      height: this.waveformHeight,
      color: this.config.waveformColor
    });

    this.cursorLayer = new ui.helpers.CursorLayer({
      top: 0,
      height: this.waveformHeight
    });


    if (this.annotations) {
      var segmentColor = this.config.segmentColor;

      this.segmentLayer = new ui.helpers.SegmentLayer(this.annotations, {
        height: this.waveformHeight,
      }, {
        color: function(d, v) {
          if (v !== undefined) { d.color = v; }
          return d.color || segmentColor;
        },
        x: function(d, v) {
          if (v !== undefined) { d.start = v; }
          return d.start;
        },
        width: function(d, v) {
          if (v !== undefined) { d.duration = v; }
          return d.duration;
        }
      });
    }

    this.timeline.addLayer(this.waveformLayer, 'main');

    if (this.segmentLayer) {
      this.timeline.addLayer(this.segmentLayer, 'main');
    }

    this.timeline.addLayer(this.cursorLayer, 'main');

    // lock timeline at: zoom >= 1 and offset <= 0
    this.timeline.on('update', (function() {
      this.timeline.offset = Math.min(this.timeline.offset, 0);
      // zoom do not work ???
      this.timeline.zoom = Math.max(this.timeline.zoom, 1);

      this.timeline.tracks.updateContainer();
    }).bind(this));
  };

  // -----------------------------------
  // update cursor
  // -----------------------------------

  Plugin.prototype.updateCursorPosition = function() {
    this.currentPosition = this.$player[0].currentTime;
    this.cursorLayer.currentPosition = this.currentPosition;
    this.timeline.tracks.update(this.cursorLayer);
  };

  Plugin.prototype.requestCursorUpdate = function() {
    var requestCursorUpdate = this.requestCursorUpdate.bind(this);
    this.updateCursorPosition();
    this.rAFId = requestAnimationFrame(requestCursorUpdate);
  };

  Plugin.prototype.cancelCursorUpdate = function() {
    cancelAnimationFrame(this.rAFId);
  };

  // -----------------------------------
  // events
  // -----------------------------------

  Plugin.prototype.bindTimelineStates = function() {
    var simpleEditionState = new ui.states.SimpleEditionState(this.timeline);
    var centeredZoomState = new ui.states.CenteredZoomState(this.timeline);

    this.$axis[0].addEventListener('mousedown', (function(e) {
      this.timeline.state = centeredZoomState;
    }).bind(this), true);

    this.$graph[0].addEventListener('mousedown', (function(e) {
      this.timeline.state = simpleEditionState;
    }).bind(this), true);
  }

  Plugin.prototype.bindPlayerEvents = function() {
    var player = this.$player[0];
    var updateCursorPosition = this.updateCursorPosition.bind(this);
    var requestCursorUpdate = this.requestCursorUpdate.bind(this);
    var cancelCursorUpdate = this.cancelCursorUpdate.bind(this);

    player.addEventListener('seeked', updateCursorPosition);
    player.addEventListener('play', requestCursorUpdate);
    player.addEventListener('pause', cancelCursorUpdate);
    player.addEventListener('ended', function() {
      cancelCursorUpdate();
      player.currentTime = 0;
      updateCursorPosition();
    });
  };

  Plugin.prototype.bindSegmentEvents = function() {
    if (!this.segmentLayer) { return; }

    var player = this.$player[0];
    var updateCursorPosition = this.updateCursorPosition.bind(this);

    this.$graph[0].addEventListener('dblclick', (function(e) {
      var item = this.segmentLayer.getItemFromDOMElement(e.target);
      if (!item) { return; }

      var datum = this.segmentLayer.getDatumFromItem(item);
      player.currentTime = datum.start;
      player.play();

      setTimeout(function() {
        player.pause();
        player.currentTime = datum.start;
        updateCursorPosition();
      }, datum.duration * 1000);
    }).bind(this), true);
  };

  // -----------------------------------
  // plugin factory
  // -----------------------------------
  $.fn[pluginName] = function(options) {
    options = options || {};

    return $(this).each(function(index, el) {
      var $el = $(el);

      if (!$el.data('plugin-' + pluginName)) {
        $el.data('plugin-' + pluginName, new Plugin($el, options));
      }
    });
  };
}(jQuery, window, document));
