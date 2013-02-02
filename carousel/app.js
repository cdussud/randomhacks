// Known bugs: pressing left / right keys too quickly will send the viewport to the
// wrong place. Fix: don't use the offset property of the images (it is useless during animations);
// compute it for ourselves instead.

// We've also made a few lame hardcoded assumptions: 
// - the viewport relies on being attached to #container under #viewport. 
// - we assume the viewport gets the entire browser client area to itself

(function(){

  window.App = {
  };

  // LightBox exposes one object as its model -- the collection
  // do collections have current selection?

  window.App.LightBox = (function() {

    // Main API class. Takes an array of image paths and inits backbone.
    function LightBox(imagePaths) {

      var images = new ImageCollection();
      _.each(imagePaths, function(path){
        images.add(new ImageModel({path: path}));
      });

      $(document).ready(function(){
        this.viewport = new Viewport({ collection: images });
      }.bind(this));
    }

    return LightBox;
  })();


  // Named ImageModel since Image conflicts
  var ImageModel = Backbone.Model.extend({
  });

  var ImageCollection = Backbone.Collection.extend({
    model: ImageModel
  });

  var ImageView = Backbone.View.extend({
    initialize: function() {
      this.render();
    },

    className: "image-wrapper",
    template: _.template($('#imageTemplate').html()),

    render: function() {
      this.$el.html(this.template(this.model.toJSON()));
      return this;
    }
  });


  var Viewport = Backbone.View.extend({

    initialize: function(){

      // Properties
      this.index = 0;
      this.viewportOffset = 0; // offset of viewport in pixels
      this.render();

      $('#container').html(this.el);
      this.resizeImages();
      this.moveTo(0);

      // Hook up to resize and key presses
      $(window).resize(this.onResize.bind(this));

      var self = this;
      $(document).keyup(function(event){
        switch(event.which){
          case 37:          // left arrow
            self.moveLeft();
            event.preventDefault();
            break;
          case 39:           // right arrow
            self.moveRight();
            event.preventDefault();
            break;
        }
      });
    },

    onResize: function(){
      // Called on window resize
      this.resizeImages();

      // When resize is complete move the viewport back to the correct
      // location (using a timer to detect when it seems the user is finished dragging)
      //
      // It's a workaround because we can't seem to disable transition animations
      // temporarily. With animations off we could update position on every resize.
      if (!this.timer){
        this.timer = window.setInterval(function(){
          now = new Date();
          if (this.lastResizeTime && now - this.lastResizeTime > 100)
          {
            console.log('timer')
            this.moveTo(this.index);
            this.timer = window.clearInterval(this.timer);
          }
        }.bind(this), 100);
      }

      
      this.lastResizeTime = new Date();
    },

    // Methods
    moveLeft: function(){
      if (this.index > 0) {
        this.index--;
        this.moveTo(this.index);
      }
    },

    moveRight: function(){
      if (this.index < this.collection.length - 1){
        this.index++;
        this.moveTo(this.index);
      }
    },

    // Move the viewport to the given image specified the by index
    moveTo: function(index){
      var offset = this.imageOffset(index);

      // Now center the image
      viewportCenter = this.viewportWidth() / 2;
      imageCenter = this.imageWidth(index) / 2;

      offset += -viewportCenter + imageCenter;

      this.moveBy(offset);
    },

    // Move by the given amount of pixels
    moveBy: function(amount){
      this.viewportOffset = -amount + this.viewportOffset;
      $('#container').css("transform","translateX(" + this.viewportOffset + "px)");
      this.resizeImages();
    },


    resizeImages: function() {
      
      // TODO: look up the actual width and height of the viewport instead
      var width = $(window).width() - 200; 
      var height = $(window).height() - 200;
      var viewportAspect = width / height;

      $('img').each(function(index, item){
      
        // Reset the width and height. Serves two purposes:
        // allows us to read the native (unconstrained) values of the
        // image and clears the old width / height in the case where we
        // switch from constraining one or the other (since one of the two must be
        // unconstrained to preserve the aspect ratio)

        // TODO: This can be avoided by 1. precalculating and storing the
        // aspect ratio of each image when initially loaded and 2. by only clearing 
        // width or height if we're about to switch to constraining the other one.

        $(this).width("");
        $(this).height("");

        var nativeWidth = $(this).width();
        var nativeHeight = $(this).height();

        var nativeAspect = nativeWidth / nativeHeight;


        // We're trying to constrain the image to always fit within the viewport while preserving 
        // the aspect ratio. This means we need to constrain the dimension of the image most likely 
        // to hit the edge of the viewport. Comparing aspect ratios is the simplest way to do this.
        nativeAspect > viewportAspect ? $(this).width(width) : $(this).height(height);

        // Vertically align the images
        var imageCenter = $(this).height() / 2;
        var viewportCenter = height / 2;
        $(this).css("transform","translateY(" + (viewportCenter - imageCenter) + "px)");
        
      });
    },


    render: function() {

      // Simply drop the images on the page
      this.collection.each(function(image){
        var imageView = new ImageView( { model: image });
        this.$el.append(imageView.el);
      }, this);

      return this;
    },

    //
    // Helpers
    //
    $imageWrapper: function(index){
      // TODO: this is a somewhat fragile way to get the image width.
      // Better to walk into this View's collection and find the element that way
      return $('#container .image-wrapper:eq(' + index + ')');
    },

    imageWidth: function(index){
      return this.$imageWrapper(index).outerWidth();
    },

    viewportWidth: function(){
      return $('#viewport').width();
    },

    imageOffset: function(index){
      // imageOffset is the horizontal offset of the image with respect
      // to the left side of the viewport.
      // Need to remove 100px to account for the padding on the left side,
      // since the offset we have access to is with respect to the window.
      // This is gives misleading values during animations; a better way would be to 
      // keep track of the widths of the images and look it up that way.
      return this.$imageWrapper(index).offset().left - 100;
    }

  });
})();