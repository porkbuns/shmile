function PhotoView() {
    this.container = $('#viewport');
    this.canvas = new Raphael('viewport', Shmile.WINDOW_WIDTH, Shmile.WINDOW_HEIGHT);
    this.frames = this.canvas.set(); // List of SVG black rects
    this.images = this.canvas.set(); // List of SVG images
    this.all = this.canvas.set();
    this.overlayImage = null;
    
    this.photoBorder = 0;
    this.compositeDim = null;
    this.frameDim = null;
    this.compositeOrigin = null;
    this.compositeCenter = null;
}

PhotoView.prototype.toString = function() {
    ret = [];
    ret.push("Size of 'all' set: " + this.all.length);
    ret.push("Size of 'frames' set: " + this.frames.length);
    ret.push("Composite photo is: " + this.all[0].attr('width') + 'x' + this.all[0].attr('height'));
    ret.push("Frame photo is: " + this.frameDim.w + 'x' + this.frameDim.h);
    return ret.join('\n');
}

PhotoView.prototype.render = function() {
    var w = Shmile.WINDOW_WIDTH - Shmile.PHOTO_MARGIN;
    var h = Shmile.WINDOW_HEIGHT - Shmile.PHOTO_MARGIN;
    this.compositeDim = CameraUtils.scale4x6(w, h);
    this.compositeOrigin = {
        x: (Shmile.WINDOW_WIDTH - this.compositeDim.w) / 2,
        y: (Shmile.WINDOW_HEIGHT - this.compositeDim.h) / 2
    };
    this.compositeCenter = {
        x: this.compositeOrigin.x + (this.compositeDim.w/2),
        y: this.compositeOrigin.y + (this.compositeDim.h/2)
    }
    var r = this.canvas.rect(this.compositeOrigin.x, this.compositeOrigin.y, this.compositeDim.w, this.compositeDim.h);
    
    r.attr({'fill': 'white'});
    
    this.all.push(r);
    
    // Scale the photo padding too
    this.photoBorder = this.compositeDim.w / 50;

    //upper x
    var frame_x = this.compositeOrigin.x + this.photoBorder;
    var frame_y = this.compositeOrigin.y + this.photoBorder;
    this.frameDim = {
        w: (this.compositeDim.w - (3*this.photoBorder))/2,
        h: (this.compositeDim.h - (3*this.photoBorder))/2
    };
    var frame = this.canvas.rect(frame_x, frame_y, this.frameDim.w, this.frameDim.h);
    frame.attr({'fill': 'black'});
    var img = this.canvas.image(null, frame_x, frame_y, this.frameDim.w, this.frameDim.h);

    this.images.push(img);
    this.frames.push(frame);
    this.all.push(img);
    this.all.push(frame);
    
    frame = frame.clone();
    img = img.clone();
    frame.translate(this.frameDim.w + this.photoBorder, 0);
    img.translate(this.frameDim.w + this.photoBorder, 0);
    this.frames.push(frame);
    this.images.push(img);
    this.all.push(frame);
    this.all.push(img);
    
    frame = frame.clone();
    img = img.clone();
    frame.translate(-(this.frameDim.w + this.photoBorder), this.frameDim.h + this.photoBorder);
    img.translate(-(this.frameDim.w + this.photoBorder), this.frameDim.h + this.photoBorder);
    this.frames.push(frame);
    this.images.push(img);
    this.all.push(frame);
    this.all.push(img);
    
    frame = frame.clone();
    img = img.clone();
    frame.translate(this.frameDim.w + this.photoBorder, 0);
    img.translate(this.frameDim.w + this.photoBorder, 0);
    this.frames.push(frame);
    this.images.push(img);
    this.all.push(frame);
    this.all.push(img);
    
    // Draw the PNG logo overlay.
    var o = this.canvas.image(
        '/images/overlay.png',
        this.compositeOrigin.x,
        this.compositeOrigin.y,
        this.compositeDim.w,
        this.compositeDim.h);
    this.all.push(o);
    this.overlayImage = o;
    
    // Hide everything and move out of sight.
    this.all.hide();
    this.all.translate(-Shmile.WINDOW_WIDTH, 0);
}

/**
 * Updates the image at the set location.
 * @param {String} img_src
 *   The URL of the image resource the browser should fetch and display
 * @param {Integer} idx
 *   Index of frame to update
 * @param cb
 *   The callback to be executed when the UI has finished updating and zooming out.
 */
PhotoView.prototype.updatePhotoSet = function(img_src, idx, cb) {
    var view = this;
    var imgEl = view.images[idx];
    var frameEl = view.frames[idx];

    imgEl.attr({'src': img_src, 'opacity': 0});
    imgEl.show();

    var afterShowPhoto = function () {
       // We've found and revealed the photo, now hide the old black rect and zoom out
       frameEl.hide();
       p.zoomFrame(idx, 'out', cb);
    }
    imgEl.animate({'opacity': 1}, 200, afterShowPhoto);

}

/**
 * For in: assume the view has been rendered and reset to initial state and moved out of sight.
 * Slide in the composite image.
 * For out: assume the composite image is centered. Move out of sight and hide.
 */
PhotoView.prototype.animate = function(dir, cb) {
    if (dir === 'in') {
        this.all.show();
        this.images.hide();
        this.overlayImage.hide();
        this.all.animate({
            'translation': Shmile.WINDOW_WIDTH+",0"
            }, 1000, "<>", cb);        
    } else if (dir === 'out') {
        this.all.animate({
            'translation': Shmile.WINDOW_WIDTH+",0"
        }, 1000, "<>", cb);
    }
}

/**
 * zoomFrame zooms into the indicated frame.
 * Call it once to zoom in, call it again to zoom out.
 *
 * @param idx Frame index
 *   Expect zoomFrame(1) to be matched immediately by zoomFrame(1)
 * frame: 0 (upper left), 1 (upper-right), 2 (lower-left), 3 (lower-right)
 * @param dir 'in' or 'out'
 *   Zoom in or out
 * @param onfinish
 *   Callback executed when the animation is finished.
 *
 * Depends on the presence of the State.zoomed object to store zoom info.
 */
PhotoView.prototype.zoomFrame = function(idx, dir, onfinish) {
    var view = this;
    var composite = this.all[idx];

    var frame = this.frames[idx];
    var frameX = frame.attr('x');
    var frameW = frame.attr('width');
    var frameY = frame.attr('y');
    var frameH = frame.attr('height');
    var centerX = frameX + frameW/2;
    var centerY = frameY + frameH/2;

    var animSpeed = 700;
    
    // delta to translate to.
    var dx = this.compositeCenter.x - centerX;
    var dy = this.compositeCenter.y - centerY;
    var scaleFactor = this.compositeDim.w / this.frameDim.w;
        
    if (dir === "out" && State.zoomed) {
        scaleFactor = 1;
        dx = -State.zoomed.dx;
        dy = -State.zoomed.dy;
        view.all.animate({
            'scale': [1, 1, view.compositeCenter.x, view.compositeCenter.y].join(','),        
        }, animSpeed, 'bounce', function() {
            view.all.animate({
                'translation': dx+','+dy
            }, animSpeed, '<>', onfinish)
        });
        // Clear the zoom data.
        State.zoomed = null;
    } else if (dir !== "out") {
        view.all.animate({
            'translation': dx+','+dy
        }, animSpeed, '<>', function() {
            view.all.animate({
                'scale': [scaleFactor, scaleFactor, view.compositeCenter.x, view.compositeCenter.y].join(','),
            }, animSpeed, 'bounce', onfinish)
        });
        // Store the zoom data for next zoom.
        State.zoomed = {
            dx: dx,
            dy: dy,
            scaleFactor: scaleFactor
        };
    }
}

/**
 * Reset visibility, location of composite image for next round.
 */
PhotoView.prototype.slideInNext = function() {
    this.resetState();
    this.modalMessage('Next!');
    this.all.hide();
    this.all.translate(-Shmile.WINDOW_WIDTH * 2, 0);
    this.animate('in', function() {
      $('#start-button').fadeIn();
    });
}

/**
 * Resets the state variables.
 */
PhotoView.prototype.resetState = function () {
    State = {
        photoset: [],
        set_id: null,
        current_frame_idx: 0,
        zoomed: null
    };
}

/**
 * Faux camera flash
 */
PhotoView.prototype.flashEffect = function(duration) {
    if (duration === undefined) { duration = 200; }
    var rect = this.canvas.rect(0, 0, Shmile.WINDOW_WIDTH, Shmile.WINDOW_HEIGHT);
    rect.attr({'fill': 'white', 'opacity': 0});
    rect.animate({'opacity': 1}, duration, ">", function() {
        rect.animate({'opacity': 0}, duration, "<");
        rect.remove();
    })

}

/**
 * Draws a modal with some text.
 */
PhotoView.prototype.modalMessage = function(text, persistTime, animateSpeed, cb) {
    if (animateSpeed === undefined) { var animateSpeed = 200; }
    if (persistTime === undefined) { var persistTime = 500; }

    var sideLength = Shmile.WINDOW_HEIGHT * 0.3;
    var x = (Shmile.WINDOW_WIDTH - sideLength)/2;
    var y = (Shmile.WINDOW_HEIGHT - sideLength)/2;
    var all = this.canvas.set();
    var r = this.canvas.rect(x, y,
        sideLength,
        sideLength,
        15);
    r.attr({'fill': '#222',
            'fill-opacity': 0.7,
            'stroke-color': 'white'});
    all.push(r);
    var txt = this.canvas.text(x + sideLength/2, y + sideLength/2, text);
    txt.attr({'fill': 'white',
        'font-size': '50',
        'font-weight': 'bold'
    });
    all.push(txt);
    all.attr({'opacity': 0});
    all.animate({
        'opacity': 1,
        'scale': '1.5,1.5',
        'font-size': '70'
    }, animateSpeed, '>');
    
    // Timer to delete self nodes.
    var t = setTimeout(function(all) {
        // Delete nodes
        txt.remove();
        r.remove();
        if (cb) cb();
    }, persistTime, all);
}

/**
 * Applies the final image overlay to the composite image.
 * This will usually contain the wedding logo: 24-bit transparent PNG
 */
PhotoView.prototype.showOverlay = function(animate) {
    this.overlayImage.show();
    if (animate) {
        //this.overlayImage.attr({'opacity':0});
        this.overlayImage.animate({'opacity':1}, Shmile.OVERLAY_DELAY);
    }
}
/**
 * Removes the overlay
 */
PhotoView.prototype.hideOverlay = function(animate) {
    var view = this;
    if (animate) {
        this.overlayImage.animate({'opacity':0}, Shmile.OVERLAY_DELAY, function() {
            view.overlayImage.hide();
        });
    } else {
        this.overlayImage.hide();
    }
}

