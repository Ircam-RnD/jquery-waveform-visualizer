(function($, waves, window, document) {

  var pluginName = 'waveformVisualizer';

  var defaults = {
    waveformColor: '#586e75',
    segmentColor: '#cb4b16',
    anchorColor: '#657b83',
    cursorColor: '#dc322f',
    segmentInteractions: { selectable: true },
    segmentOpacity: 0.3
  };

  var defaultHeight = 200;

  function Plugin($el, options) {
    this.config = $.extend({}, defaults, options);
    this.$el = $el;
    this.$audio = null;
    this.$player = null;
    this.$axis = null;
    this.$graph = null;

    this.graph = null; // wave timeline
    // this.getSize();
    this.width = this.$el.width();
    this.height = this.$el.height() || defaultHeight;
    this.audioHeight = null;
    this.axisHeight = 24;
    this.graphHeight = null;

    this.$el.height(this.height);
    // get data and audio
    this.audioPath = this.$el.attr('data-audio');
    this.annotationsPath = this.$el.attr('data-annotations');
    this.audioBuffer = null;
    this.annotations = null;

    // load audio file and annotation file
    var that = this;
    var audioBufferLoader = new waves.loaders.AudioBufferLoader();

    $.when(
      $.getJSON(this.annotationsPath),
      audioBufferLoader.load(this.audioPath)
    ).done(function(annotationsRes, audioPromise) {
      that.annotations = annotationsRes[0];

      audioPromise.then(function(audioBuffer) {
        try {
          that.audioBuffer = audioBuffer;
          that.initialize();
        } catch (err) {
          console.log(err.stack);
        }
      }, function(err) { conole.log(err); });
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
    this.graphHeight = this.height - this.audioHeight - this.axisHeight;

    this.$axis = $('<div>', { class: 'axis-container' });
    this.$graph = $('<div>', { class: 'graph-container' });
    this.$axis.css({'height': this.axisHeight, background: '#ffffff' });
    this.$graph.css({'height': this.graphHeight, background: '#ffffff' });

    this.$el.append(this.$axis, this.$graph);

    // create graph
    this.createTimeline();
    this.createAxis();
    this.bindPlayerEvents();
    this.bindSegmentEvents();
  };

  // -----------------------------------
  // create components
  // -----------------------------------
  Plugin.prototype.createTimeline = function() {
    var d3 = waves.ui.timeline.d3;

    // create graph
    this.graph = waves.ui.timeline()
      .width(this.width)
      .height(this.graphHeight)
      .xDomain([0, this.audioBuffer.duration]);

    this.waveformLayer = waves.ui.waveform()
      .data(this.audioBuffer.getChannelData(0).buffer)
      .sampleRate(this.audioBuffer.sampleRate)
      .color(this.config.waveformColor);

    this.segmentLayer = waves.ui.segment()
      .params({
        interactions: this.config.segmentInteractions,
        opacity: this.config.segmentOpacity
      })
      .data(this.annotations)
      .color((function(d, v) {
        if (v === undefined) { return d.color || this.config.segmentColor }
        d.color = v;
      }).bind(this));

    this.cursorLayer = waves.ui.marker()
      .params({ displayHandle: false })
      .color(this.config.cursorColor)
      .opacity(0.9);

    this.anchorLayer = waves.ui.marker()
      .params({ displayHandle: false })
      .color(this.config.anchorColor)
      .opacity(0.7);

    this.graph.add(this.waveformLayer);
    this.graph.add(this.segmentLayer);
    this.graph.add(this.cursorLayer);
    this.graph.add(this.anchorLayer);

    d3.select(this.$graph[0]).call(this.graph.draw);
  };

  Plugin.prototype.createAxis = function() {
    var d3 = waves.ui.timeline.d3;

    var zoomerSvg = d3.select(this.$axis[0]).append('svg')
      .attr('width', this.width)
      .attr('height', 30)
      .style('font-family', 'monospace')
      .style('font-size', '11px');

    var xAxis = d3.svg.axis()
      .scale(this.graph.xScale)
      .tickSize(1)
      .tickFormat(function(d) {
        var form = d % 1 === 0 ? '%M:%S' : '%M:%S:%L';
        var date = new Date(d * 1000);
        var format = d3.time.format(form);
        return format(date);
      });

    // add the axis to the newly created svg element
    var axis = zoomerSvg.append('g')
      .attr('class', 'x-axis')
      .attr('transform', 'translate(0, 0)')
      .attr('fill', '#555')
      .call(xAxis);

    var graph = this.graph;
    var anchor = this.anchorLayer;
    // instanciate the zoomer layer
    var zoom = waves.ui.zoomer()
      .select('.axis-container', this.$el[0])
      .on('mousedown', function(e) {
        var xDomainPos = graph.xScale.invert(e.anchor);
        anchor.setCurrentTime(xDomainPos);
        graph.update(anchor);
        // disable selection on body
        $('body').css({ userSelect: 'none' });
      })
      .on('mousemove', function(e) {
        e.originalEvent.preventDefault();
        // update graph
        graph.xZoom(e);
        graph.update();
        // redraw the axis to keep it up to date with the graph
        axis.call(xAxis);
      })
      .on('mouseup', function(e) {
        // set the final xZoom value of the graph
        graph.xZoomSet();
        // update axis
        axis.call(xAxis);
        // enable selection on body
        $('body').css({ userSelect: 'text' });
      });
  };

  // -----------------------------------
  // update cursor
  // -----------------------------------
  Plugin.prototype.updateCursorPosition = function() {
    this.currentTime = this.$player[0].currentTime;
    this.cursorLayer.setCurrentTime(this.currentTime);
    this.graph.update(this.cursorLayer);
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
    var segment = this.segmentLayer;
    var d3 = waves.ui.timeline.d3;
    var player = this.$player[0];

    segment.on('mousedown', function(item, e) {
      var datum = d3.select(item).datum();
      player.currentTime = datum.start;
      player.play();
    });
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
}(jQuery, waves, window, document));