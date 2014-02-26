var updateUnderlayFPS = 25;

function fractaldom(options) {
	function later(f) {
		setTimeout(f,0);
	}

	var nodes = { };
	var edges = [ ];

	if (!options) {
		options = { };
		options.iconSize = 64;
	}

	var x = $('<div/>');

	x.addClass('fractaldom_surface');

	var dragging = false;
	var lastPoint = null;
	var startDragPoint = null;
	x.mousedown(function(m) {
		if (m.which==1) { 
			dragging = true;
			startDragPoint = [m.clientX, m.clientY];
		}		
	});
	x.mouseup(function(m) {
		dragging = false;
		lastPoint = null;
	});
	x.mousemove(function(m) {
		if (m.which!=1) {
			dragging = false;
			lastPoint = null;
			return;
		}


		if (dragging) {
			if (lastPoint) {
				var dx = m.clientX - lastPoint[0];
				var dy = m.clientY - lastPoint[1];
				for (var n in nodes) {
					var W = nodes[n];
					var p = W.parent().position();
					var P = W.parent();
					P.css('left', p.left + dx );
					P.css('top', p.top + dy );
				}
			}

			lastPoint = [m.clientX, m.clientY];		

			updateUnderlayCanvas();
		}
	});

	//var underlayCanvas = $('<canvas width="200" height="200"/>');
	//x.append(underlayCanvas);

	var underlayCanvas = $('<div/>').appendTo(x);
	underlayCanvas.addClass('underlaySVG');
	underlayCanvas.svg();
	underlayCanvas.find("svg").attr('width','100%').attr('height','100%');

	var svg = underlayCanvas.svg('get');
	
	var defs = svg.defs('myDefs');
	/*
	   <marker id="Triangle"
                viewBox="0 0 10 10" 
                refX="1" refY="5"
                markerWidth="6" 
                markerHeight="6"
                orient="auto">
            <path d="M 0 0 L 10 5 L 0 10 z" />
	    </marker>

		 <polyline points="10,90 50,80 90,20"
              fill="none" stroke="black" 
              stroke-width="2"
              marker-end="url(#Triangle)" />
	*/
	var triangle = svg.marker(defs, 'Triangle', 1, 5, 6, 6, 'auto', {
		viewBox: "0 0 10 10" 
	});
	svg.path(triangle, "M 0 0 L 10 5 L 0 10 z");

	function resizeUnderlayCanvas() {
		underlayCanvas.css('width', x.width());
		underlayCanvas.css('height', x.height());
	}

	function _updateUnderlayCanvas() {

		//var c = underlayCanvas.get(0);		
		//ctx.clearRect(0,0,c.width,c.height);
		//c.width = c.width; //clears the canvas

		var labels = [];
		for (var i = 0; i < edges.length; i++) {
			var E = edges[i];
			var nA = nodes[E[0]].parent();
			var nB = nodes[E[1]].parent();

			var docScrollTop = $(document).scrollTop();

			var npa = nA.offset();
			var npb = nB.offset();
			if ((!npa) || (!npb))
				continue;

			var npaw = nA.width();
			var npah = nA.height();
			var npbw = nB.width();
			var npbh = nB.height();

			var lineWidth = 5;
			var lineColor = 'lightgrey';
			var o = E[2];
			if (o) {
				lineWidth = o.lineWidth || lineWidth;
				lineColor = o.lineColor || lineColor;
			}

			var x1 = Math.round(npa.left + (npaw/2));
			var y1 = Math.round(npa.top - docScrollTop + (npah/2));
			var x2 = Math.round(npb.left + (npbw/2));
			var y2 = Math.round(npb.top - docScrollTop + (npbh/2));

			var mx = (x1+x2)/2;
			var my = (y1+y2)/2;

			var existingLine = E.svgLine;
			var existingLabel = E.svgLabel;
			if (!existingLine) {
				E.svgLine = svg.line(x1, y1, x2, y2,{
					'stroke': lineColor, 
					'stroke-width': lineWidth,
					'marker-segment': "url(#Triangle)",
					'marker-end': "url(#Triangle)",
					//'marker-pattern': "40 url(#Triangle) 40 url(#Triangle)"
				});
				if (o.label) {					
					E.svgLabel = svg.text(mx, my, o.label, { fontFamily: 'Verdana', fontSize: '12', fill: 'blue' });
				}
 
				/*E.svgLine = svg.polyline([[x1,y1],[x2,y2]], {
					'stroke': lineColor, 
					'stroke-width': lineWidth,
					//'marker-pattern': "40 url(#Triangle) 40 url(#Triangle)",
					'marker-segment': "url(#Triangle)",
					'marker-end': "url(#Triangle)",
					'marker-start': "url(#Triangle)",
					'marker': "url(#Triangle)",
				});*/

			}
			else {
				existingLine.setAttribute('x1',x1);
				existingLine.setAttribute('y1',y1);
				existingLine.setAttribute('x2',x2);
				existingLine.setAttribute('y2',y2);
				if (existingLabel) {
					existingLabel.setAttribute('x', mx);
					existingLabel.setAttribute('y', my);
				}
			}

			/*if (o.label) {
				var text = o.label.substring(0,24);
				ctx.fillStyle = lineColor;
  				ctx.font = "bold 24px Arial";
			    var metrics = ctx.measureText(text);
			    var width = metrics.width;
				var mpx = (x1+x2)/2-width/2;
				var mpy = (y1+y2)/2;
  				ctx.fillText(text, mpx, mpy);
			}*/
		}
	}
	var updateUnderlayCanvas = _.throttle( _updateUnderlayCanvas, Math.floor(1000.0 / parseFloat(updateUnderlayFPS)) );


	$(window).resize(function() {
		resizeUnderlayCanvas();
		updateUnderlayCanvas();
	});

	x.init = function() {
		resizeUnderlayCanvas();
		updateUnderlayCanvas();
	}

	x.removeNodes = function() {
		for (var n in nodes) {
			var N = nodes[n];
			N.dialog( "destroy" );
		}
	};

	x.newEdge = function(a, b, opt) {
		edges.push([a,b,opt]);
		updateUnderlayCanvas();
	};

	x.layoutFD = function(affectX, affectY, iterations) {
		var R = 0.2;
		var A = 0.5;

		var nodePosition = { };

		for (var i in nodes) {
			var ip = nodes[i].parent().position();
			nodePosition[i] = [ ip.left, ip.top ]; //TODO consider width/height
		}

		for (var n = 0; n < iterations; n++) {
			//calculate repulsive forces
			for (var i  in nodes) {
				var ip = nodePosition[i];

				for (var j in nodes) {

					if (i == j) continue;

					var jp = nodePosition[j];

					var dx = parseFloat(ip[0] - jp[0]);
					var dy = parseFloat(ip[1] - jp[1]);

					var dist = 0;
					if (affectX) dist+=dx*dx;
					if (affectY) dist+=dy*dy;
					var D = Math.sqrt( dist );
					if (D == 0) continue;

					D = R / D;	
					dx*=D; dy*=D;

					if (!affectX) dx = 0;				
					if (!affectY) dy = 0;

					nodePosition[j] = [ jp[0] - dx, jp[1] - dy ];
				}	
			}

			//calculate attractive forces
			for (var j = 0; j < edges.length; j++) {
				var a = edges[j][0];
				var b = edges[j][1];
				var ap = nodePosition[a];
				var bp = nodePosition[b];

				var dx = parseFloat(ap[0] - bp[0]);
				var dy = parseFloat(ap[1] - bp[1]);

				var dist = 0;
				if (affectX) dist+=dx*dx;
				if (affectY) dist+=dy*dy;
				var D = Math.sqrt( dist );
				if (D == 0) continue;

				D = A / D;
				dx*=D; dy*=D;

				if (!affectX) dx = 0;				
				if (!affectY) dy = 0;

				nodePosition[b] = [ bp[0] + dx, bp[1] + dy ];
			}			
		}

		for (var i in nodes) {
			var ip = nodePosition[i];
			nodes[i].position( ip[0], ip[1]);
		}

		updateUnderlayCanvas();
	};

	//https://jqueryui.com/dialog/
	x.newNode = function(id, opt) {
		if (!opt) opt = { };

		var e = opt.element ? opt.element : $('<div/>');
		var etype = e.prop('tagName');

		if (etype == 'IFRAME') {
			e.attr('width','99%');
			e.attr('height','99%');
		}


		e.addClass('fractaldom');

		opt.minHeight = options.iconSize;
		opt.minWidth = options.iconSize;
		//opt.focus = function( event, ui ) { console.log(e, 'focus'); return false; };

		e.dialog(opt);


		var resized;
		if (!opt.element) {
			var f = $('<div/>');
			e.append(f);
			resized = f;
		}
		else {
			resized = e;
		}


		function updateSize() {
			var h = e.parent().height();
			var w = e.parent().width();

			var tb = e.parent().find(".ui-dialog-titlebar");
			var content = e.parent().find(".ui-dialog-content");
			var slider = e.parent().find(".zoomSlider");
			var close = e.parent().find(".ui-dialog-titlebar-close");

			if ((w < 1.25 * options.iconSize) || (h < 1.25 * options.iconSize)) {
				content.hide();
				slider.hide();
				close.hide();
				tb.css('height', '100%');
			}
			else {
				content.show();
				slider.show();
				close.hide();
				tb.css('height', 'auto');
			}
		}
		//e.dialog({stack:false});
		e.dialog({ closeOnEscape: false });
		//e.dialog("widget").draggable("option","containment","none");
		e.dialog("widget").draggable("option","axis", "y" );
		e.dialog({
			  drag: function( event, ui ) {
				dragging = false;
				lastPoint = null;
				later(updateUnderlayCanvas);				
			  },
			  resize: function( event, ui ) {
				dragging = false;
				lastPoint = null;

				updateSize();
				later(updateUnderlayCanvas);
				return false;
			  },
			  close: function( event, ui ) {
				//
			  }
		});

		e.parent().addClass("fractal-dialog");

		var titlebar = e.parent().find(".ui-dialog-titlebar span").first();

		var minZoom = 0.2;
		var maxZoom = 2.5;


		function correctIFrameSize() {
			var zoom = e.attr('zoom') || 1.0;
			var pwidth = e.parent().width();
			var pheight = e.parent().width();
			var newWidth = pwidth / zoom;
			var newHeight = pheight / zoom;
			
			e.css('width', newWidth);
			e.css('height', newHeight);
		}

		function scaleNode(m) {
			var E = resized.parent().parent();
			var w = E.width() * m;
			var h = E.height() * m;
			resized.parent().parent().css('width', w).css('height', h);
			resized.parent().css('width', w).css('height', h);

			updateSize();
			updateUnderlayCanvas();
		}

		function setZoom(fs) {
			//e.css('font-size', (fs*100.0) + '%' );
			if (etype == 'IFRAME') {
				/*    zoom: 0.15;
					-moz-transform:scale(0.75);
					-moz-transform-origin: 0 0;
					-o-transform: scale(0.75);
					-o-transform-origin: 0 0;
					-webkit-transform: scale(0.75);
					-webkit-transform-origin: 0 0;*/
				e.css('-webkit-transform', 'scale(' + fs + ')');
				e.css('-webkit-transform-origin', '0 0');
				e.css('-moz-transform', 'scale(' + fs + ')');
				e.css('-moz-transform-origin', '0 0');
				e.css('-o-transform', 'scale(' + fs + ')');
				e.css('-o-transform-origin', '0 0');
				correctIFrameSize();
			}
			else {
				var ffs = (fs*100.0) + '%';
				resized.css('font-size', ffs );
				//resized.css('zoom', ffs );
			}
			resized.attr('zoom', fs);

			later(updateUnderlayCanvas);
		}
		function getZoom() {
			return parseFloat(e.attr('zoom'));
		}


		if (etype == 'IFRAME') {
			e.dialog({
			  resizeStop: function( event, ui ) { correctIFrameSize(); }
			});
		}

		var slider = $('<div>&nbsp;</div>');
		var mousedown = false;
		var startZoom = null;

		function handleSliderClick(s, e) {
			var px = s.offset().left;
			var x = e.clientX - px;
			

			var p = (parseFloat(x) / parseFloat(s.width()));
			//var z = minZoom + p * (maxZoom - minZoom);
			var z = minZoom + (p*p) * (maxZoom - minZoom);

			setZoom(z);
		}

		slider.mouseup(function(e) {
			handleSliderClick($(this), e);
			mousedown = false;
			return false;
		});
		slider.mousedown(function(e) {
			if (e.which == 1) {
				mousedown = true;
				startZoom = getZoom();
			}
			return false;
		});			
		slider.mousemove(function(e) {
			if (e.which == 0) mousedown = false;
			if (mousedown) {
				handleSliderClick($(this), e);
			}
		});
		slider.mousewheel(function(evt){
	       var direction = evt.deltaY;
			if (direction < 0) {	
				scaleNode(1.2);
			}
			else {
				scaleNode(1.0/1.2);
			}
			return false;
    	});

		//slider.mouseleave(function(e) { mousedown = false; });
		slider.addClass('zoomSlider');

		//titlebar.prepend("&nbsp;").prepend(slider);

		nodes[id] = e;		

		updateUnderlayCanvas();


		var returnable = e;
		if (f) {
			returnable = f;
		}

		e.position = returnable.position = function(x, y) {	
			e.parent().css('top', y);
			e.parent().css('left', x);
		};
		e.setWidth = returnable.setWidth = function(w) {	e.parent().css('width', w);		}
		e.setHeight = returnable.setHeight = function(h) {	e.parent().css('height', h);		}

		return returnable;
	};

	return x;		
}
