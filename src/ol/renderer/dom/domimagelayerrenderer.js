goog.provide('ol.renderer.dom.ImageLayer');

goog.require('goog.dom');
goog.require('goog.dom.TagName');
goog.require('goog.events');
goog.require('goog.events.EventType');
goog.require('goog.vec.Mat4');
goog.require('ol.Image');
goog.require('ol.ImageState');
goog.require('ol.ViewHint');
goog.require('ol.dom');
goog.require('ol.layer.Image');
goog.require('ol.renderer.dom.Layer');
goog.require('ol.vec.Mat4');



/**
 * @constructor
 * @extends {ol.renderer.dom.Layer}
 * @param {ol.renderer.Map} mapRenderer Map renderer.
 * @param {ol.layer.Image} imageLayer Image layer.
 */
ol.renderer.dom.ImageLayer = function(mapRenderer, imageLayer) {
  var target = goog.dom.createElement(goog.dom.TagName.DIV);
  target.style.position = 'absolute';

  goog.base(this, mapRenderer, imageLayer, target);

  /**
   * The last rendered image.
   * @private
   * @type {?ol.Image}
   */
  this.image_ = null;

  /**
   * @private
   * @type {goog.vec.Mat4.AnyType}
   */
  this.transform_ = goog.vec.Mat4.createNumberIdentity();

};
goog.inherits(ol.renderer.dom.ImageLayer, ol.renderer.dom.Layer);


/**
 * @protected
 * @return {ol.layer.Image} Image layer.
 */
ol.renderer.dom.ImageLayer.prototype.getImageLayer = function() {
  return /** @type {ol.layer.Image} */ (this.getLayer());
};


/**
 * @inheritDoc
 */
ol.renderer.dom.ImageLayer.prototype.prepareFrame =
    function(frameState, layerState) {

  var view2DState = frameState.view2DState;
  var viewCenter = view2DState.center;
  var viewResolution = view2DState.resolution;
  var viewRotation = view2DState.rotation;

  var image = this.image_;
  var imageLayer = this.getImageLayer();
  var imageSource = imageLayer.getImageSource();

  var hints = frameState.viewHints;

  if (!hints[ol.ViewHint.ANIMATING] && !hints[ol.ViewHint.INTERACTING]) {
    var image_ = imageSource.getImage(
        frameState.extent, viewResolution, view2DState.projection);
    if (!goog.isNull(image_)) {
      var imageState = image_.getState();
      if (imageState == ol.ImageState.IDLE) {
        goog.events.listenOnce(image_, goog.events.EventType.CHANGE,
            this.handleImageChange, false, this);
        image_.load();
      } else if (imageState == ol.ImageState.LOADED) {
        image = image_;
      }
    }
  }

  if (!goog.isNull(image)) {
    var imageExtent = image.getExtent();
    var imageResolution = image.getResolution();
    var transform = goog.vec.Mat4.createNumber();
    ol.vec.Mat4.makeTransform2D(transform,
        frameState.size[0] / 2, frameState.size[1] / 2,
        imageResolution / viewResolution, imageResolution / viewResolution,
        viewRotation,
        (imageExtent[0] - viewCenter[0]) / imageResolution,
        (viewCenter[1] - imageExtent[3]) / imageResolution);
    if (image != this.image_) {
      var imageElement = image.getImageElement(this);
      // Bootstrap sets the style max-width: 100% for all images, which breaks
      // prevents the image from being displayed in FireFox.  Workaround by
      // overriding the max-width style.
      imageElement.style.maxWidth = 'none';
      imageElement.style.position = 'absolute';
      goog.dom.removeChildren(this.target);
      goog.dom.appendChild(this.target, imageElement);
      this.image_ = image;
    }
    this.setTransform_(transform);
    this.updateAttributions(frameState.attributions, image.getAttributions());
    this.updateLogos(frameState, imageSource);
  }

};


/**
 * @param {goog.vec.Mat4.AnyType} transform Transform.
 * @private
 */
ol.renderer.dom.ImageLayer.prototype.setTransform_ = function(transform) {
  if (!ol.vec.Mat4.equals2D(transform, this.transform_)) {
    ol.dom.transformElement2D(this.target, transform, 6);
    goog.vec.Mat4.setFromArray(this.transform_, transform);
  }
};
