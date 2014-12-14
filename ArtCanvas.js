/** 
 * ArtCanvas.js
 * @fileoverview HTML5 Canvas Library
 *
 * Copyright 2012, 2013, 2014@Tomohiro IKEDA
 * Released under the MIT license
 */
 
 
 
(function(global) {
    'use strict';

    /** 
     * This class can be used as global object.
     * This class has classes that are defined by "ArtCanvas.js" as class property.
     * This class manages data for drawing. For example, Layer, Canvas, Application Status ...etc
     * This class defines accessor methods as facade.
     * @param {HTMLElement} container This argument is the instance of HTMLElement for wrapping HTMLCanvasElements.
     * @param {HTMLCanvasElement} canvas This argument is the instance of HTMLCanvasElement as the first layer.
     * @param {number} width This argument is canvas width. The default value is 300 (px).
     * @param {number} height This argument is canvas height. The default value is 300 (px).
     * @param {Object.<function>} callbacks This argument is associative array that has callback functions.
     * @constructor
     */
    function ArtCanvas(container, canvas, width, height, callbacks) {
        this.container = document.body;

        if (container instanceof HTMLElement) {
            this.container = container;
        }

        //Set CSS properties for piling HTMLCanvasElements up
        this.container.style.position = 'relative';
        this.container.style.top      = '0px';
        this.container.style.left     = '0px';
        this.container.style.zIndex   = 1;

        var w = parseInt(width);
        var h = parseInt(height);

        this.container.style.width  = (w > 0) ? (w + 'px') : (ArtCanvas.DEFAULT_SIZES.WIDTH  + 'px');
        this.container.style.height = (h > 0) ? (h + 'px') : (ArtCanvas.DEFAULT_SIZES.HEIGHT + 'px');

        this.mode      = ArtCanvas.Mode.HAND;
        this.figure    = ArtCanvas.Figure.RECTANGLE;
        this.transform = ArtCanvas.Transform.TRANSLATE;

        /** {@type Array.<Canvas>} */
        this.layers = [];
        this.layers.push(new ArtCanvas.Canvas(this.container, canvas, width, height, (this.layers.length + 2)));

        this.activeLayer = 0;

        /** {@type Object.<function>} */
        this.callbacks = {
            drawstart   : function() {},
            drawmove    : function() {},
            drawend     : function() {},
            changemode  : function() {},
            selectlayer : function() {},
            showlayer   : function() {},
            hidelayer   : function() {},
            addlayer    : function() {},
            removelayer : function() {}
        };

        this.setCallbacks(callbacks);

        var imagedata = null;
        var isDown    = false;
        var self      = this;

        /**
         * This private method draws figure (Rectangle, Circle, Line ...etc).
         * @param {Canvas} activeCanvas This argument is the instance of Canvas in the target layer.
         * @param {CanvasRenderingContext2D} activeContext This argument is the instance of CanvasRenderingContext2D in the target layer.
         * @param {number} x This argument is relative horizontal position in HTMLCanvasElements.
         * @param {number} y This argument is relative vertical position in HTMLCanvasElements.
         * @param {Event} event This argument is event object to calculate position.
         */
        var _figure = function(activeCanvas, activeContext, x, y, event) {
            if (/mousedown|touchstart/i.test(event)) {
                var canvasElement = activeCanvas.getCanvas();
                var width         = canvasElement.width;
                var height        = canvasElement.height;
                imagedata         = activeContext.getImageData(0, 0, width, height);

                return;
            }

            var points = activeCanvas.paths.pop();
            var point  = points.pop();

            points.push(point);
            activeCanvas.paths.push(points);

            activeContext.putImageData(imagedata, 0, 0);

            switch (self.figure) {
                case ArtCanvas.Figure.RECTANGLE :
                    var left   = point.getX();
                    var top    = point.getY();
                    var offset = ArtCanvas.Point.getOffsetPoint(point, new ArtCanvas.Point(x, y));

                    activeContext.beginPath();
                    activeContext.rect(left, top, offset.getX(), offset.getY());
                    activeContext.stroke();
                    activeContext.fill();

                    if (/mouseup|touchend/i.test(event)) {
                        activeCanvas.paths.pop();
                        activeCanvas.paths.push(new ArtCanvas.Rectangle(left, top, offset.getX(), offset.getY()));
                    }

                    break;
                case ArtCanvas.Figure.CIRCLE :
                    var centerX = point.getX();
                    var centerY = point.getY();
                    var radius  = ArtCanvas.Point.getDistance(point, new ArtCanvas.Point(x, y));

                    activeContext.beginPath();
                    activeContext.arc(centerX, centerY, radius, 0, (2 * Math.PI), false);
                    activeContext.stroke();
                    activeContext.fill();

                    if (/mouseup|touchend/i.test(event)) {
                        activeCanvas.paths.pop();
                        activeCanvas.paths.push(new ArtCanvas.Circle(centerX, centerY, radius, 0, (2 * Math.PI), false));
                    }

                    break;
                case ArtCanvas.Figure.LINE :
                    activeContext.beginPath();
                    activeContext.moveTo(point.getX(), point.getY());
                    activeContext.lineTo(x, y);
                    activeContext.stroke();

                    if (/mouseup|touchend/i.test(event)) {
                        activeCanvas.paths.pop();
                        activeCanvas.paths.push(new ArtCanvas.Line(point, new ArtCanvas.Point(x, y)));
                    }

                    break;
                default :
                    break;
            }
        };

        /**
         * This private method is facade method for transforms (translate, scale rotate ...etc).
         * @param {Canvas} activeCanvas This argument is the instance of Canvas in the target layer.
         * @param {number} x This argument is relative horizontal position in HTMLCanvasElements.
         * @param {number} y This argument is relative vertical position in HTMLCanvasElements.
         */
        var _transform = function(activeCanvas, x, y) {
            var points = activeCanvas.paths.pop();
            var point  = points.pop();
            var offset = ArtCanvas.Point.getOffsetPoint(point, new ArtCanvas.Point(x, y));

            var amounts = [];

            switch (self.transform) {
                case ArtCanvas.Transform.TRANSLATE :
                    amounts.push(offset.getX());
                    amounts.push(offset.getY());
                    break;
                case ArtCanvas.Transform.SCALE :
                    var canvas = activeCanvas.getCanvas();

                    var scaleX = 1;
                    var scaleY = 1;

                    var offsetX = offset.getX();
                    var offsetY = offset.getY();

                    if (offsetX !== 0) {scaleX += (offsetX / canvas.width);}
                    if (offsetY !== 0) {scaleY += (offsetY / canvas.height);}

                    amounts.push(scaleX);
                    amounts.push(scaleY);
                    break;
                case ArtCanvas.Transform.ROTATE :
                    var radian = Math.atan2(offset.getY(), offset.getX());
                    var degree = (radian / Math.PI) * 180;

                    amounts.push(degree);
                    break;
                default :
                    break;
            }

            activeCanvas.transform(self.transform, amounts);

            points.push(point);
            activeCanvas.paths.push(points);
        };

        this.container.addEventListener(ArtCanvas.MouseEvents.START, function(event) {
            var activeCanvas  = self.layers[self.activeLayer];
            var activeContext = activeCanvas.getContext();

            var x = activeCanvas.getOffsetX(event);
            var y = activeCanvas.getOffsetY(event);

            switch (self.mode) {
                case ArtCanvas.Mode.HAND :
                    activeContext.beginPath();
                    activeContext.moveTo(x, y);
                    break;
                case ArtCanvas.Mode.FIGURE :
                    _figure(activeCanvas, activeContext, x, y, event.type);
                    break;
                case ArtCanvas.Mode.TEXT :
                    activeCanvas.createTextbox(new ArtCanvas.Point(x, y));
                    return;
                case ArtCanvas.Mode.TRANSFORM :
                    break;
                default :
                    break;
            }

            activeCanvas.paths.push([new ArtCanvas.Point(x, y)]);

            isDown = true;

            self.callbacks.drawstart(activeCanvas, activeContext, x, y);
        }, true);

        this.container.addEventListener(ArtCanvas.MouseEvents.MOVE, function(event) {
            if (!isDown) {
                return;
            }

            //for Touch Panel
            event.preventDefault();

            var activeCanvas  = self.layers[self.activeLayer];
            var activeContext = activeCanvas.getContext();

            var x = activeCanvas.getOffsetX(event);
            var y = activeCanvas.getOffsetY(event);

            switch (self.mode) {
                case ArtCanvas.Mode.HAND :
                    var points = activeCanvas.paths.pop();
                    var point  = points.pop();

                    activeContext.beginPath();
                    activeContext.moveTo(point.getX(), point.getY());
                    activeContext.lineTo(x, y);
                    activeContext.stroke();

                    points.push(point);
                    points.push(new ArtCanvas.Point(x, y));
                    activeCanvas.paths.push(points);
                    break;
                case ArtCanvas.Mode.TEXT :
                    break;
                case ArtCanvas.Mode.FIGURE :
                    _figure(activeCanvas, activeContext, x, y, event.type);
                    break;
                case ArtCanvas.Mode.TRANSFORM :
                    _transform(activeCanvas, x, y);
                    break;
                default :
                    break;
            }

            self.callbacks.drawmove(activeCanvas, activeContext, x, y);
        }, true);

        global.addEventListener(ArtCanvas.MouseEvents.END, function(event) {
            if (!isDown) {
                return;
            }

            var activeCanvas  = self.layers[self.activeLayer];
            var activeContext = activeCanvas.getContext();

            var x = activeCanvas.getOffsetX(event);
            var y = activeCanvas.getOffsetY(event);

            switch (self.mode) {
                case ArtCanvas.Mode.HAND   :
                    break
                case ArtCanvas.Mode.FIGURE :
                    _figure(activeCanvas, activeContext, x, y, event.type);
                    imagedata = null;
                    break;
                case ArtCanvas.Mode.TEXT :
                    break;
                case ArtCanvas.Mode.TRANSFORM :
                    activeCanvas.paths.pop();
                    break;
                default :
                    break;
            }

            //history.pushState(null, document.title, location.href);

            isDown = false;

            self.callbacks.drawend(activeCanvas, activeContext, x, y);
        }, true);

        //global.popstate = function() {
        //    
        //};
    }

    /** Constant values as class properties (static properties) */
    ArtCanvas.DEFAULT_SIZES        = {};
    ArtCanvas.DEFAULT_SIZES.WIDTH  = 300;
    ArtCanvas.DEFAULT_SIZES.HEIGHT = 300;

    /**
     * This method is getter for container width for drawing
     * @return {number} This is returned as container width for drawing
     */
    ArtCanvas.prototype.getContainerWidth = function() {
        return parseInt(this.container.style.width);
    };

    /**
     * This method is getter for container height for drawing
     * @return {number} This is returned as container height for drawing
     */
    ArtCanvas.prototype.getContainerHeight = function() {
        return parseInt(this.container.style.height);
    };

    /**
     * This method registers callbacks.
     * @param {Object.<function>} callbacks This argument is associative array that has callback functions.
     * @return {ArtCanvas} This is returned for method chain.
     */
    ArtCanvas.prototype.setCallbacks = function(callbacks) {
        if (Object.prototype.toString.call(callbacks) !== '[object Object]') {
            return this;
        }

        for (var key in callbacks) {
            if ((key in this.callbacks) && (Object.prototype.toString.call(callbacks[key]) === '[object Function]')) {
                this.callbacks[key] = callbacks[key];
            }
        }

        return this;
    };

    /**
     * This method is getter for string that is defined by Mode class.
     * @return {string} This is returned as string that is defined by Mode class.
     */
    ArtCanvas.prototype.getMode = function() {
        return this.mode;
    };

    /**
     * This method is setter for string that is defined by Mode class.
     * @param {string} mode This argument is string that is defined by Mode class.
     * @return {ArtCanvas} This is returned for method chain.
     */
    ArtCanvas.prototype.setMode = function(mode) {
        var m = String(mode).toLowerCase();

        switch (m) {
            case ArtCanvas.Mode.HAND      :
            case ArtCanvas.Mode.FIGURE    :
            case ArtCanvas.Mode.TRANSFORM :
                this.mode = m;
                break;
            case ArtCanvas.Mode.TEXT      :
                this.mode = m;
                this.addLayer(this.getContainerWidth(), this.getContainerHeight());
            default :
                break;
        }

        var canvas = this.layers[this.activeLayer];
        canvas.drawText(this.textStyle);;

        this.callbacks.changemode(m);

        return this;
    };

    /**
     * This method is getter for string that is defined by Figure class.
     * @return {string} This is returned as string that is defined by Figure class.
     */
    ArtCanvas.prototype.getFigure = function() {
        return this.figure;
    };

    /**
     * This method is setter for string that is defined by Figure class.
     * @param {string} figure This argument is string that is defined by Figure class.
     * @return {ArtCanvas} This is returned for method chain.
     */
    ArtCanvas.prototype.setFigure = function(figure) {
        var f = String(figure).toLowerCase();

        switch (f) {
            case ArtCanvas.Figure.RECTANGLE :
            case ArtCanvas.Figure.CIRCLE    :
            case ArtCanvas.Figure.LINE      :
                this.figure = f;
                break;
            default :
                break;
        }

        return this;
    };

    /**
     * This method gets fill color to HTMLCanvasElement in the target layer.
     * @return {string} This is returned as fill color to HTMLCanvasElement in the target layer.
     */
    ArtCanvas.prototype.getFillStyle = function() {
        var canvas = this.layers[this.activeLayer];
        return canvas.getFillStyle();
    };

    /**
     * This method sets fill color to HTMLCanvasElement in the target layer.
     * @param {string} fillStyle This argument is string for color.
     * @return {ArtCanvas} This is returned for method chain.
     */
    ArtCanvas.prototype.setFillStyle = function(fillStyle) {
        var canvas = this.layers[this.activeLayer];
        canvas.setFillStyle(fillStyle);

        return this;
    };

    /**
     * This method gets stroke color to HTMLCanvasElement in the target layer.
     * @return {string} This is returned as stroke color to HTMLCanvasElement in the target layer.
     */
    ArtCanvas.prototype.getStrokeStyle = function() {
        var canvas = this.layers[this.activeLayer];
        return canvas.getStrokeStyle();
    };

    /**
     * This method sets stroke color to HTMLCanvasElement in the target layer.
     * @param {string} strokeStyle This argument is string for color.
     * @return {ArtCanvas} This is returned for method chain.
     */
    ArtCanvas.prototype.setStrokeStyle = function(strokeStyle) {
        var canvas = this.layers[this.activeLayer];
        canvas.setStrokeStyle(strokeStyle);

        return this;
    };

    /**
     * This method gets line width to HTMLCanvasElement in the target layer.
     * @return {number} This is returned as line width to HTMLCanvasElement in the target layer.
     */
    ArtCanvas.prototype.getLineWidth = function() {
        var canvas = this.layers[this.activeLayer];
        return canvas.getLineWidth();
    };

    /**
     * This method sets line width to HTMLCanvasElement in the target layer.
     * @param {number} lineWidth This argument is number for line width.
     * @return {ArtCanvas} This is returned for method chain.
     */
    ArtCanvas.prototype.setLineWidth = function(lineWidth) {
        var canvas = this.layers[this.activeLayer];
        canvas.setLineWidth(lineWidth);

        return this;
    };

    /**
     * This method is getter for the instance of TextStyle.
     * @return {TextStyle} This is returned as the instance of TextStyle.
     */
    ArtCanvas.prototype.getTextStyle = function() {
        return this.textStyle;
    };

    /**
     * This method is setter for the instance of TextStyle.
     * @param{TextStyle} textStyle This argument is the instance of TextStyle.
     * @return {ArtCanvas} This is returned for method chain.
     */
    ArtCanvas.prototype.setTextStyle = function(textStyle) {
        if (textStyle instanceof ArtCanvas.TextStyle) {
            this.textStyle = textStyle;
        }

        return this;
    };

    /**
     * This method is getter for string that is defined by Transform class.
     * @return {string} This is returned as string that is defined by Transform class.
     */
    ArtCanvas.prototype.getTransform = function() {
        return this.transform;
    };

    /**
     * This method is setter for string that is defined by Transform class.
     * @param {string} transform This argument is string that is defined by Transform class.
     * @return {ArtCanvas} This is returned for method chain.
     */
    ArtCanvas.prototype.setTransform = function(transform) {
        var t = String(transform).toLowerCase();

        switch (t) {
            case ArtCanvas.Transform.TRANSLATE :
            case ArtCanvas.Transform.SCALE     :
            case ArtCanvas.Transform.ROTATE    :
                this.transform = t;
                break;
            default :
                break;
        }

        return this;
    };

    /**
     * This method validates layer number that is designated.
     * Then, if this number is valid, the designated callback is invoked.
     * @param {number} layerNumber This argument is layer number from 0.
     * @param {function} callback This argument is invoked if the designated number is valid.
     *     So, this function operates layer. For example, select, create, add, remove...etc.
     * @returns {boolean} If the designated number is valid, this value is true. Otherwise, this value is false.
     */
    ArtCanvas.prototype.validateLayerNumer = function(layerNumber, callback) {
        var index = parseInt(layerNumber);

        if ((index >= 0) && (index < this.layers.length)) {
            if (Object.prototype.toString.call(callback) === '[object Function]') {
                callback(index);
            }

            return true;
        } else {
            return false;
        }
    };

    /**
     * This method selects the target layer.
     * @param {number} layerNumber This argument is layer number from 0.
     * @return {ArtCanvas} This is returned for method chain.
     */
    ArtCanvas.prototype.selectLayer = function(layerNumber) {
        this.validateLayerNumer(layerNumber, function(index) {
            this.activeLayer = index;
            this.callbacks.selectlayer(index);
        }.bind(this));

        return this;
    };

    /**
     * This method shows the designated layer.
     * @param {number} layerNumber This argument is layer number from 0.
     * @return {ArtCanvas} This is returned for method chain.
     */
    ArtCanvas.prototype.showLayer = function(layerNumber) {
        this.validateLayerNumer(layerNumber, function(index) {
            var canvas        = this.layers[index];
            var canvasElement = canvas.getCanvas();

            canvasElement.style.visibility = 'visible';

            this.callbacks.showlayer(canvas, index);
        }.bind(this));

        return this;
    };

    /**
     * This method hides the designated layer.
     * @param {number} layerNumber This argument is layer number from 0.
     * @return {ArtCanvas} This is returned for method chain.
     */
    ArtCanvas.prototype.hideLayer = function(layerNumber) {
        this.validateLayerNumer(layerNumber, function(index) {
            var canvas        = this.layers[index];
            var canvasElement = canvas.getCanvas();

            canvasElement.style.visibility = 'hidden';

            this.callbacks.hidelayer(canvas, index);
        }.bind(this));

        return this;
    };

    /**
     * This method creates new layer.
     * @param {number} width This argument is canvas width.
     *     If this argument is omitted, the width that is designated constructor is used.
     * @param {number} height This argument is canvas height.
     *     If this argument is omitted, the height that is designated constructor is used.
     * @return {ArtCanvas} This is returned for method chain.
     */
    ArtCanvas.prototype.addLayer = function(width, height) {
        this.layers.push(new ArtCanvas.Canvas(this.container, null, width, height, (this.layers.length + 2)));
        this.activeLayer = this.layers.length - 1;

        this.callbacks.addlayer(this.layers[this.activeLayer], this.activeLayer);

        return this;
    };

    /**
     * This method removes the designated layer and deletes the instance of Canvas in the designated layer.
     * @param {number} layerNumber This argument is layer number from 0.
     * @return {ArtCanvas} This is returned for method chain.
     */
    ArtCanvas.prototype.removeLayer = function(layerNumber) {
        this.validateLayerNumer(layerNumber, function(index) {
            var canvas = this.layers[index];

            this.layers.splice(index, 1);
            this.activeLayer--;

            this.callbacks.removelayer(canvas, index);

            canvas = null;
        }.bind(this));

        return this;
    };

    /**
     * This method translates the drawn objects in the target layer.
     * @param {number} translateX This argument is horizontal translation amount.
     * @param {number} translateY This argument is vertical translation amount.
     * @return {ArtCanvas} This is returned for method chain.
     */
    ArtCanvas.prototype.translate = function(translateX, translateY) {
        var canvas = this.layers[this.activeLayer];
        canvas.transform(ArtCanvas.Transform.TRANSLATE, [translateX, translateY]);
        return this;
    };

    /**
     * This method scales the drawn objects in the target layer.
     * @param {number} scaleX This argument is horizontal scale rate.
     * @param {number} scaleY This argument is vertical scale rate.
     * @return {ArtCanvas} This is returned for method chain.
     */
    ArtCanvas.prototype.scale = function(scaleX, scaleY) {
        var canvas = this.layers[this.activeLayer];
        canvas.transform(ArtCanvas.Transform.SCALE, [scaleX, scaleY]);
        return this;
    };

    /**
     * This method rotates the drawn objects in the target layer.
     * @param {number} degree This argument is rotation degrees.
     * @return {ArtCanvas} This is returned for method chain.
     */
    ArtCanvas.prototype.rotate = function(degree) {
        var canvas = this.layers[this.activeLayer];
        canvas.transform(ArtCanvas.Transform.ROTATE, [degree]);
        return this;
    };

    (function() {

        /**
         * This static class wraps event for drawing.
         */
        function MouseEvents() {
        };

        var click = '';
        var start = '';
        var move  = '';
        var end   = '';

        //Touch Panel ?
        if (/iPhone|iPad|iPod|Android/.test(navigator.userAgent)) {
            click = 'touchend';
            start = 'touchstart';
            move  = 'touchmove';
            end   = 'touchend';
        } else {
            click = 'click';
            start = 'mousedown';
            move  = 'mousemove';
            end   = 'mouseup';
        }

        MouseEvents.CLICK = click;
        MouseEvents.START = start;
        MouseEvents.MOVE  = move;
        MouseEvents.END   = end;

        ArtCanvas.MouseEvents = MouseEvents;

    })();

    (function() {

        /**
         * This static class defines strings for representing application status.
         */
        function Mode() {
        }

        Mode.HAND      = 'hand';
        Mode.FIGURE    = 'figure';
        Mode.TEXT      = 'text';
        Mode.TOOL      = 'tool';
        Mode.TRANSFORM = 'transform';

        ArtCanvas.Mode = Mode;

    })();

    (function() {

        /**
         * This static class defines strings for drawing figure.
         */
        function Figure() {
        }

        Figure.RECTANGLE = 'rectangle';
        Figure.CIRCLE    = 'circle';
        Figure.LINE      = 'line';

        ArtCanvas.Figure = Figure;

    })();

    (function() {

        /**
         * This static class defines strings for draw tools.
         */
        function Tool() {
        }

        Tool.DROPPER = 'dropper';
        Tool.BUCKET  = 'bucket';

        ArtCanvas.Tool = Tool;

    })();

    (function() {

        /**
         * This static class defines strings for transforms.
         */
        function Transform() {
        }

        Transform.TRANSLATE = 'translate';
        Transform.SCALE     = 'scale';
        Transform.ROTATE    = 'rotate';

        ArtCanvas.Transform = Transform;

    })();

    (function() {

        /**
         * This class is to represent coordinate in the point.
         * Moreover, this class defined class methods to calculate coordinate.
         * @param {number} pointX This argument is horizontal coordinate.
         * @param {number} pointY This argument is vertical coordinate.
         * @constructor
         */
        function Point(pointX, pointY) {
            this.x = 0;
            this.y = 0;

            var x = parseFloat(pointX);
            var y = parseFloat(pointY);

            if (!isNaN(x)) {this.x = x;}
            if (!isNaN(y)) {this.y = y;}
        }

        /**
         * This method is getter for horizontal coordinate.
         * @return {number} This is returned as horizontal coordinate.
         */
        Point.prototype.getX = function() {
            return this.x;
        };

        /**
         * This method is getter for vertical coordinate.
         * @return {number} This is returned as vertical coordinate.
         */
        Point.prototype.getY = function() {
            return this.y;
        };

        /**
         * This class method calculates offset coordinate between the 2 points and creates the instance of Point.
         * @param {Point} point1 This argument is the instance of Point.
         * @param {Point} point2 This argument is the instance of Point.
         * @return {Point} This is returned as the instance of Point.
         */
        Point.getOffsetPoint = function(point1, point2) {
            var x = 0;
            var y = 0;

            if ((point1 instanceof Point) && (point2 instanceof Point)) {
                x = point2.getX() - point1.getX();
                y = point2.getY() - point1.getY();
            }

            return new Point(x, y);
        };

        /**
         * This class method calculates distance between the 2 points.
         * @param {Point} point1 This argument is the instance of Point.
         * @param {Point} point2 This argument is the instance of Point.
         * @return {number} This is returned as distance between the 2 points.
         */
        Point.getDistance = function(point1, point2) {
            var point = Point.getOffsetPoint(point1, point2);

            return Math.sqrt(Math.pow(point.getX(), 2) + Math.pow(point.getY(), 2));
        };

        ArtCanvas.Point = Point;

    })();

    (function() {

        /**
         * This class is to represent rectangle.
         * @param {number} top This argument is vertical coordinate at upper-left.
         * @param {number} left This argument is horizontal coordinate at upper left.
         * @param {number} width This argument is rectangle width.
         * @param {number} height This argument is rectangle height.
         * @constructor
         */
        function Rectangle(top, left, width, height) {
            this.top    = 0;
            this.left   = 0;
            this.width  = 0;
            this.height = 0;

            var t = parseFloat(top);
            var l = parseFloat(left);
            var w = parseFloat(width);
            var h = parseFloat(height);

            if (!isNaN(t)) {this.top    = t;}
            if (!isNaN(l)) {this.left   = l;}
            if (w >= 0)    {this.width  = w;}
            if (h >= 0)    {this.height = h;}
        }

        /**
         * This method is getter for vertical coordinate at upper-left.
         * @return {number} This is returned as vertical coordinate at upper-left.
         */
        Rectangle.prototype.getTop = function() {
            return this.top;
        };

        /**
         * This method is getter for horizontal coordinate at upper-left.
         * @return {number} This is returned as horizontal coordinate at upper-left.
         */
        Rectangle.prototype.getLeft = function() {
            return this.left;
        };

        /**
         * This method is getter for vertical coordinate at lower-right.
         * @return {number} This is returned as vertical coordinate at lower-right.
         */
        Rectangle.prototype.getBottom = function() {
            return this.top + this.height;
        };

        /**
         * This method is getter for horizontal coordinate at lower-right.
         * @return {number} This is returned as horizontal coordinate at lower-right.
         */
        Rectangle.prototype.getRight = function() {
            return this.left + this.width;
        };

        /**
         * This method is getter for coordinate at upper-left.
         * @return {Obect.<string, number>} This is returned as associative array for coordinate at upper-left.
         */
        Rectangle.prototype.getLeftTop = function() {
            return {top : this.top, left : this.left};
        };

        /**
         * This method is getter for coordinate at lower-right.
         * @return {Obect.<string, number>} This is returned as associative array for coordinate at lower-right.
         */
        Rectangle.prototype.getRightBottom = function() {
            return {bottom : (this.top + this.height), right : (this.left + this.width)};
        };

        /**
         * This method is getter for rectangle width.
         * @return {number} This is returned as rectangle width.
         */
        Rectangle.prototype.getWidth = function() {
            return this.width;
        };

        /**
         * This method is getter for rectangle height.
         * @return {number} This is returned as rectangle height.
         */
        Rectangle.prototype.getHeight = function() {
            return this.height;
        };

        /**
         * This method is getter for rectangle size.
         * @return {Object.<string, number>} This is returned as associative array for rectangle size.
         */
        Rectangle.prototype.getSize = function() {
            return {width : this.width, height : this.height};
        };

        ArtCanvas.Rectangle = Rectangle;

    })();

    (function() {

        /**
         * This class is to represent circle.
         * @param {number} centerX This argument is horizontal coordinate of the center.
         * @param {number} centerY This argument is vertical coordinate of the center.
         * @param {number} radius This argument is circle radius.
         * @constructor
         */
        function Circle(centerX, centerY, radius) {
            this.centerX = 0;
            this.centerY = 0;
            this.radius  = 0;

            var cx = parseFloat(centerX);
            var cy = parseFloat(centerY);
            var r  = parseFloat(radius);

            if (!isNaN(cx)) {this.centerX = cx;}
            if (!isNaN(cy)) {this.centerY = cy;}
            if (r >= 0)     {this.radius  = r;}
        }

        /**
         * This method is getter for horizontal coordinate of the center.
         * @return {number} This is returned as horizontal coordinate of the center.
         */
        Circle.prototype.getCenterX = function() {
            return this.centerX;
        };

        /**
         * This method is getter for vertical coordinate of the center.
         * @return {number} This is returned as vertical coordinate of the center.
         */
        Circle.prototype.getCenterY = function() {
            return this.centerY;
        };

        /**
         * This method is getter for the center coordinate.
         * @return {Object.<string, number>} This is returned as associative array for the center coordinate.
         */
        Circle.prototype.getCenter = function() {
            return {x : this.centerX, y : this.centerY};
        };

        /**
         * This method is getter for circle radius.
         * @return {number} This is returned as circle radius.
         */
        Circle.prototype.getRadius = function() {
            return this.radius;
        };

        ArtCanvas.Circle = Circle;

    })();

    (function() {

        /**
         * This class is to represent line.
         * @param {Point} startPoint This argument is the instance of Point for start point.
         * @param {Point} endPoint This argument is the instance of Point for end point.
         * @constructor
         */
        function Line(startPoint, endPoint) {
            this.startPoint = null;
            this.endPoint   = null;

            if (startPoint instanceof ArtCanvas.Point) {
                this.startPoint = startPoint;
            }

            if (endPoint instanceof ArtCanvas.Point) {
                this.endPoint = endPoint;
            }
        };

        /**
         * This method is getter for the instance of Point for start point.
         * @return {Point} This is returned as the instance of Point for start point.
         */
        Line.prototype.getStartPoint = function() {
            return this.startPoint;
        };

        /**
         * This method is getter for the instance of Point for end point.
         * @return {Point} This is returned as the instance of Point for end point.
         */
        Line.prototype.getEndPoint = function() {
            return this.endPoint;
        };

        ArtCanvas.Line = Line;

    })();

    (function() {

        /**
         * This class has properties that are to draw text on canvas.
         * @param {string} text This argument is text that is drawn on canvas.
         * @param {Point} point This argument is the instance of Point for text position.
         * @param {TextStyle} textStyle This argument is the instance of TextStyle.
         * @constructor
         */
        function Text(text, point, textStyle) {
            this.text      = String(text);
            this.point     = new ArtCanvas.Point(0, 0);
            this.textStyle = null;

            if (point instanceof ArtCanvas.Point) {
                this.point = point;
            }

            if (textStyle instanceof TextStyle) {
                this.textStyle = textStyle;
            }
        }

        /**
         * This method is getter for text that is drawn on canvas.
         * @return {string} This is returned as text that is drawn on canvas.
         */
        Text.prototype.getText = function() {
            return this.text;
        };

        /**
         * This method is getter for the instance of Point.
         * @return {Point} This is returned as the instance of Point.
         */
        Text.prototype.getPoint = function() {
            return this.point;
        };

        /**
         * This method is getter for the instance of TextStyle.
         * @return {TextStyle} This is returned as the instance of TextStyle.
         */
        Text.prototype.getTextStyle = function() {
            return this.textStyle;
        };

        /**
         * This class is to represent text style.
         * @param {Font} font This argument is the instance of Font.
         * @param {string} color This argument is string for color.
         * @constructor
         */
        function TextStyle(font, color) {
            this.font  = null;
            this.color = String(color);

            if (font instanceof Font) {
                this.font = font;
            }
        }

        /**
         * This method is getter for the instance of Font.
         * @return {Font} This is returned as the instance of Font.
         */
        TextStyle.prototype.getFont = function() {
            return this.font;
        };

        /**
         * This method is getter for string for color.
         * @return {string} This is returned as string for color.
         */
        TextStyle.prototype.getColor = function() {
            return this.color;
        };

        /**
         * This class has properties that relate to font.
         * @param {string} family This argument is string like CSS font-family.
         * @param {string} style This argument is string like CSS font-style.
         * @param {string} size This argument is string like CSS font-size.
         * @constructor
         */
        function Font(family, style, size) {
            this.family = String(family);
            this.style  = String(style);
            this.size   = String(size);
        }

        /**
         * This method is getter for font-family.
         * @return {string} This is returned as string for font-family.
         */
        Font.prototype.getFamily = function() {
            return this.family;
        };

        /**
         * This method is getter for font-style.
         * @return {string} This is returned as string for font-style.
         */
        Font.prototype.getStyle = function() {
            return this.style;
        };

        /**
         * This method is getter for font-size.
         * @return {string} This is returned as string for font-size.
         */
        Font.prototype.getSize = function() {
            return this.size;
        };

        /**
         * TThis method joins string for font.
         * @return {string} This is returned as joins string for font.
         */
        Font.prototype.getFontString = function() {
            return this.style + ' ' + this.size + ' ' + '"' + this.family + '"';
        };

        ArtCanvas.Text      = Text;
        ArtCanvas.TextStyle = TextStyle;
        ArtCanvas.Font      = Font;

    })();

    (function() {

        /** 
         * This class has properties to draw on each layer.
         * Therefore, the instance is created by the number of layers.
         * The instance of ArtCanvas manages the instance of this class.
         * @param {HTMLElement} container This argument is the instance of HTMLElement for wrapping HTMLCanvasElements.
         * @param {HTMLCanvasElement} canvas This argument is the instance of HTMLCanvasElement as the first layer.
         * @param {number} width This argument is canvas width.
         * @param {number} height This argument is canvas height.
         * @param {number} zIndex This argument is CSS z-index.
         * @constructor
         */
        function Canvas(container, canvas, width, height, zIndex) {
            this.container = document.body;
            this.canvas    = null;
            this.context   = null;

            if (container instanceof HTMLElement) {
                this.container = container;
            }

            if (canvas instanceof HTMLCanvasElement) {
                this.canvas = canvas;
            } else {
                this.canvas = document.createElement('canvas');
                this.container.appendChild(this.canvas);
            }

            this.context = this.canvas.getContext('2d');

            var w = parseInt(width);
            var h = parseInt(height);

            if (w > 0) {this.canvas.width  = w;}
            if (h > 0) {this.canvas.height = h;}

            this.clear();

            this.canvas.style.position = 'absolute';
            this.canvas.style.top      = '0px';
            this.canvas.style.left     = '0px';
            this.canvas.style.zIndex   = zIndex;

            this.context.strokeStyle = 'rgba(0, 0, 0, 1.0)';
            this.context.fillStyle   = 'rgba(0, 0, 0, 0.0)';
            this.context.globalAlpha = 1.0;
            this.context.lineWidth   = 1.0;
            this.context.lineCap     = 'round';
            this.context.lineJoin    = 'miter';

            this.textStyle = new ArtCanvas.TextStyle(new ArtCanvas.Font('Arial', 'normal', '16px'), 'rgba(0, 0, 0, 1.0)');

            /** {@type Array.<Point|Rectangle|Circle|Line|Text>} */
            this.paths      = [];

            //Transform Matrix
            this.transforms = {
                translate : {x : 0, y : 0},
                scale     : {x : 1, y : 1},
                skew      : {x : 0, y : 0},
                rotate    : 0
            };
        }

        /**
         * This method is getter for the instance of HTMLCanvasElement.
         * @return {HTMLCanvasElement} This is returned as the instance of HTMLCanvasElement
         */
        Canvas.prototype.getCanvas = function() {
            return this.canvas;
        };

        /**
         * This method is getter for the instance of CanvasRenderingContext2D.
         * @return {CanvasRenderingContext2D} This is returned as the instance of CanvasRenderingContext2D.
         */
        Canvas.prototype.getContext = function() {
            return this.context;
        };

        /**
         * This method draws all stored objects.
         * @param {boolean} isTransform This argument is to determine whether or not to execute transform.
         * @return {Canvas} This is returned for method chain.
         */
        Canvas.prototype.draw = function(isTransform) {
            if (isTransform) {
                this.transform();
            }

            for (var i = 0, len = this.paths.length; i < len; i++) {
                var paths = this.paths[i];

                if (Array.isArray(paths)) {
                    for (var j = 0, num = paths.length; j < num; j++) {
                        var path = paths[j];
                        var x    = path.getX();
                        var y    = path.getY();

                        if (j === 0) {
                            this.context.beginPath();
                            this.context.moveTo(x, y);
                        } else {
                            this.context.lineTo(x, y);
                            this.context.stroke();
                        }
                    }
                } else if (paths instanceof ArtCanvas.Rectangle) {
                    var top    = paths.getTop();
                    var left   = paths.getLeft();
                    var width  = paths.getWidth();
                    var height = paths.getHeight();

                    this.context.beginPath();
                    this.context.rect(top, left, width, height);
                    this.context.stroke();
                    this.context.fill();
                } else if (paths instanceof ArtCanvas.Circle) {
                    var centerX = paths.getCenterX();
                    var centerY = paths.getCenterY();
                    var radius  = paths.getRadius();

                    this.context.beginPath();
                    this.context.arc(centerX, centerY, radius, 0, (2 * Math.PI), false);
                    this.context.stroke();
                    this.context.fill();
                } else if (paths instanceof ArtCanvas.Line) {
                    var start = paths.getStartPoint();
                    var end   = paths.getEndPoint();

                    this.context.beginPath();
                    this.context.moveTo(start.getX(), start.getY());
                    this.context.lineTo(end.getX(), end.getY());
                    this.context.stroke();
                } else if (paths instanceof ArtCanvas.Text) {
                    var text      = paths.getText();
                    var point     = paths.getPoint();
                    var textStyle = paths.getTextStyle();

                    var font  = textStyle.getFont();
                    var color = textStyle.getColor();

                    var previousColor = this.context.fillStyle;

                    this.context.font = font.getFontString();
                    this.context.fillStyle = color;
                    this.context.fillText(text, point.getX(), point.getY());

                    this.context.fillStyle = previousColor;
                    
                }
            }

            return this;
        };

        /**
         * This method creates textbox and draws the input text.
         * @param {TextStyle} textStyle This argument is the instance of TextStyle.
         * @return {string} This is returned as the input text.
         */
        Canvas.prototype.drawText = function(textStyle) {
            if (!(textStyle instanceof ArtCanvas.TextStyle)) {
                return '';
            }

            var textbox = this.container.querySelector('[type="text"]');

            if (!(textbox instanceof HTMLInputElement)) {
                return '';
            }

            var font      = textStyle.getFont();
            var color     = textStyle.getColor();
            var fontSize  = parseInt(font.getSize());

            var text = textbox.value;
            var x    = parseInt(textbox.style.left);
            var y    = parseInt(textbox.style.top) + fontSize;

            this.container.removeChild(textbox);

            var heldColor = this.context.fillStyle;

            this.context.font      = font.getFontString();
            this.context.fillStyle = color;
            this.context.fillText(text, x, y);

            this.context.fillStyle = heldColor;

            this.paths.push(new ArtCanvas.Text(text, new ArtCanvas.Point(x, y), textStyle));

            return text;
        };

        /**
         * This method transforms the drawn objects on the basis of transform matrix.
         * @param {string} type This argument is string that is defined by Transform class.
         * @param {Arrat.<number>|number} amounts This argument is the amount of transform.
         * @return {Canvas} This is returned for method chain.
         */
        Canvas.prototype.transform = function(type, amounts) {
            if (!Array.isArray(amounts)) {
                amounts = [amounts];
            }

            var centerPoint = this.getCenterPoint();
            var centerX     = centerPoint.getX();
            var centerY     = centerPoint.getY();

            var transforms  = this.transforms;
            var translates  = transforms.translate;
            var scales      = transforms.scale;
            var skews       = transforms.skew;

            switch (String(type).toLowerCase()) {
                case ArtCanvas.Transform.TRANSLATE :
                    if (amounts.length < 2) {
                        break;
                    }

                    var dx = parseFloat(amounts[0]);
                    var dy = parseFloat(amounts[1]);

                    if (isNaN(dx) || isNaN(dy)) {
                        break;
                    }

                    translates.x = dx;
                    translates.y = dy;

                    break;
                case ArtCanvas.Transform.SCALE :
                    if (amounts.length < 2) {
                        break;
                    }

                    var sx = parseFloat(amounts[0]);
                    var sy = parseFloat(amounts[1]);

                    if (isNaN(sx) || isNaN(sy)) {
                        break;
                    }

                    scales.x = sx;
                    scales.y = sy;

                    break;
                case ArtCanvas.Transform.ROTATE :
                    if (amounts.length < 1) {
                        break;
                    }

                    var degree = parseFloat(amounts[0]);

                    if (isNaN(degree)) {
                        break;
                    }

                    transforms.rotate = (degree * Math.PI) / 180;

                    break;
                default :
                    break;
            }

            var rotate       = transforms.rotate;
            var rotateMatrix = [
                 Math.cos(rotate), Math.sin(rotate),
                -Math.sin(rotate), Math.cos(rotate),
                                0,                0
            ];

            this.clear();
            this.context.save();

            switch (String(type).toLowerCase()) {
                case ArtCanvas.Transform.TRANSLATE :
                case ArtCanvas.Transform.SCALE     :
                    this.context.setTransform(1, 0, 0, 1, 0, 0);
                    this.context.transform(1, 0, 0, 1, centerX, centerY);
                    this.context.transform.apply(this.context, rotateMatrix);
                    this.context.transform(1, 0, 0, 1, -centerX, -centerY);

                    this.context.transform(scales.x, 0, 0, scales.y, translates.x, translates.y);

                    break;
                case ArtCanvas.Transform.ROTATE :
                    this.context.setTransform(1, 0, 0, 1, 0, 0);
                    this.context.transform(scales.x, 0, 0, scales.y, translates.x, translates.y);

                    this.context.transform(1, 0, 0, 1, centerX, centerY);
                    this.context.transform.apply(this.context, rotateMatrix);
                    this.context.transform(1, 0, 0, 1, -centerX, -centerY);

                    break;
                default :
                    break;
            }

            if (arguments.length > 1) {
                this.draw(false);
                this.context.restore();
            }

            return this;
        };

        /**
         * This method clears canvas.
         * @return {Canvas} This is returned for method chain.
         */
        Canvas.prototype.clear = function() {
            this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
            return this;
        };

        /**
         * This method clears the all of stored objects.
         * @return {Canvas} This is returned for method chain.
         */
        Canvas.prototype.clearPaths = function() {
            this.paths = [];
            return this;
        };

        /**
         * This method gets fill color.
         * @return {string} This is returned as fill color.
         */
        Canvas.prototype.getFillStyle = function() {
            return this.context.fillStyle;
        };

        /**
         * This method sets fill color..
         * @param {string} fillStyle This argument is string for color.
         * @return {Canvas} This is returned for method chain.
         */
        Canvas.prototype.setFillStyle = function(fillStyle) {
            this.context.fillStyle = String(fillStyle);
            this.draw(true);

            return this;
        };

        /**
         * This method gets stroke color.
         * @return {string} This is returned as stroke color.
         */
        Canvas.prototype.getStrokeStyle = function() {
            return this.context.strokeStyle;
        };

        /**
         * This method sets stroke color..
         * @param {string} strokeStyle This argument is string for color.
         * @return {Canvas} This is returned for method chain.
         */
        Canvas.prototype.setStrokeStyle = function(strokeStyle) {
            this.context.strokeStyle = String(strokeStyle);
            this.draw(true);

            return this;
        };

        /**
         * This method gets line width
         * @return {number} This is returned as line width.
         */
        Canvas.prototype.getLineWidth = function() {
            return this.context.lineWidth;
        };

        /**
         * This method sets line width.
         * @param {number} lineWidth This argument is line width
         * @return {Canvas} This is returned for method chain.
         */
        Canvas.prototype.setLineWidth = function(lineWidth) {
            var w = parseFloat(lineWidth);

            if (w > 0) {
                this.context.lineWidth= w;
                this.draw(true);
            }

            return this;
        };

        /**
         * This method calculates relative horizontal coordinate on canvas from event object.
         * @param {Event} event This argument is to get coordinates at cursor.
         * @return {number} This is returned as relative horizontal coordinate on canvas.
         */
        Canvas.prototype.getOffsetX = function(event) {
            if (!(event instanceof Event)) {
                return 0;
            }

            if (event.pageX) {
                //Desktop
            } else if (event.touches[0]) {
                event = event.touches[0];         //Smartphone
            } else if (event.changedTouches[0]) {
                event = event.changedTouches[0];  //Smartphone
            }

            var scrollLeft = this.container.scrollLeft;
            var offsetX    = event.pageX - this.container.offsetLeft + scrollLeft;

            var w = this.canvas.width;

            if (offsetX < 0) {offsetX = 0;}
            if (offsetX > w) {offsetX = w;}

            return offsetX;
        };

        /**
         * This method calculates relative vertical coordinate on canvas from event object.
         * @param {Event} event This argument is to get coordinates at cursor.
         * @return {number} This is returned as relative vertical coordinate on canvas.
         */
        Canvas.prototype.getOffsetY = function(event) {
            if (!(event instanceof Event)) {
                return 0;
            }

            if (event.pageY) {
                //Desktop
            } else if (event.touches[0]) {
                event = event.touches[0];         //Smartphone
            } else if (event.changedTouches[0]) {
                event = event.changedTouches[0];  //Smartphone
            }

            var scrollTop = this.container.scrollTop;
            var offsetY   = event.pageY - this.container.offsetTop + scrollTop;

            var h = this.canvas.height;

            if (offsetY < 0) {offsetY = 0;}
            if (offsetY > h) {offsetY = h;}

            return offsetY;
        };

        /**
         * This method calculates center point of drawn object.
         * @return {Point} This is returned as the instance of Point for center point of drawn object.
         */
        Canvas.prototype.getCenterPoint = function() {
            var centerX = 0;
            var centerY = 0;

            for (var i = 0, len = this.paths.length; i < len; i++) {
                var paths = this.paths[i];

                if (Array.isArray(paths) || (paths instanceof ArtCanvas.Line)) {
                    var minX = Number.MAX_VALUE;
                    var minY = Number.MAX_VALUE;
                    var maxX = 0;
                    var maxY = 0;

                    if (Array.isArray(paths)) {
                        for (var j = 0, num = paths.length; j < num; j++) {
                            var path = paths[j];
                            var x    = path.getX();
                            var y    = path.getY();

                            if (x < minX) {minX = x;}
                            if (y < minY) {minY = y;}
                            if (x > maxX) {maxX = x;}
                            if (y > maxY) {maxY = y;}
                        }
                    } else if (paths instanceof ArtCanvas.Line) {
                        var start = paths.getStartPoint();
                        var end   = paths.getEndPoint();

                        minX = Math.min(start.getX(), end.getX());
                        minY = Math.min(start.getY(), end.getY());
                        maxX = Math.max(start.getX(), end.getX());
                        maxY = Math.max(start.getY(), end.getY());
                    }

                    centerX = parseInt(((maxX - minX) / 2) + minX);
                    centerY = parseInt(((maxY - minY) / 2) + minY);
                } else if (paths instanceof ArtCanvas.Rectangle) {
                    var left   = paths.getLeft();
                    var top    = paths.getTop();
                    var width  = paths.getWidth();
                    var height = paths.getHeight();

                    centerX = parseInt(width  / 2) + left;
                    centerY = parseInt(height / 2) + top;
                } else if (paths instanceof ArtCanvas.Circle) {
                    centerX = paths.getCenterX();
                    centerY = paths.getCenterY();
                } else if (paths instanceof ArtCanvas.Text) {
                    var text      = paths.getText();
                    var point     = paths.getPoint();
                    var textStyle = paths.getTextStyle();
                    var font      = textStyle.getFont();
                    var fontSize  = parseInt(font.getSize());

                    centerX = point.getX() + parseInt(this.context.measureText(text).width / 2);
                    centerY = point.getY() + parseInt(fontSize / 2);
                }
            }

            return new ArtCanvas.Point(centerX, centerY);
        };

        /**
         * This method creates textbox on canvas.
         * @param {Point} point This argument is textbox position.
         * @return {HTMLInputElement} This argument is returned as the instance of HTMLInputElement.
         */
        Canvas.prototype.createTextbox = function(point) {
            if (!(point instanceof ArtCanvas.Point)) {
                return this;
            }

            //Already exists ?
            if (this.container.querySelector('[type="text"]') instanceof HTMLInputElement) {
                return this;
            }

            var x = point.getX();
            var y = point.getY();

            var textbox = document.createElement('input');

            textbox.setAttribute('type', 'text');

            var textStyle  = this.textStyle;
            var font       = this.textStyle.getFont();
            var color      = this.textStyle.getColor();
            var fontFamily = font.getFamily();
            var fontStyle  = font.getStyle();
            var fontSize   = font.getSize();

            textbox.style.position   = 'absolute';
            textbox.style.top        = y + 'px';
            textbox.style.left       = x + 'px';
            textbox.style.zIndex     = parseInt(this.canvas.style.zIndex) + 1;
            textbox.style.outline    = 'none';
            //textbox.style.fontFamily = fontFamily;
            //textbox.style.fontStyle  = fontStyle;
            //textbox.style.fontSize   = fontSize;
            textbox.style.padding    = '0.5em';

            this.container.appendChild(textbox);

            return textbox;
        };

        ArtCanvas.Canvas = Canvas;

    })();

    //Export
    global.ArtCanvas = ArtCanvas;

})(window);
