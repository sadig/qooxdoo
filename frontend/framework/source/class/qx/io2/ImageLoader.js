/* ************************************************************************

   qooxdoo - the new era of web development

   http://qooxdoo.org

   Copyright:
     2004-2008 1&1 Internet AG, Germany, http://www.1und1.de

   License:
     LGPL: http://www.gnu.org/licenses/lgpl.html
     EPL: http://www.eclipse.org/org/documents/epl-v10.php
     See the LICENSE file in the project's top-level directory for details.

   Authors:
     * Sebastian Werner (wpbasti)

************************************************************************ */

/**
 * This class can help to load images dynamically. This is useful for
 * preloading them and cache their dimensions.
 */
qx.Bootstrap.define("qx.io2.ImageLoader",
{
  statics :
  {
    /** {Map} Internal data structure to cache image sizes */
    __data : {},


    /**
     * Whether the given image is loaded.
     *
     * @type static
     * @param source {String} Image source to query
     * @return {Boolean} <code>true</code> when the image is loaded
     */
    isLoaded : function(source) {
      return !!this.__data[source];
    },


    /**
     * Returns the size of a previously loaded image
     *
     * @type static
     * @param source {String} Image source to query
     * @return {Map} The dimension of the image. If the image is not yet loaded,
     *    the dimensions are given as 0x0 pixel.
     */
    getSize : function(source) {
      return this.__data[source] || { width : 0, height : 0 };
    },


    /**
     * Loads the given image. Supports a callback which is
     * executed when the image is loaded.
     *
     * This method works asychronous.
     *
     * @type static
     * @param source {String} Image source to load
     * @param callback {Function} Callback function to execute
     * @param context {Object} Context in which the given callback should be executed
     * @return {void}
     */
    load : function(source, callback, context)
    {
      // Shorthand
      var data = this.__data;

      // Normalize context
      if (callback && !context) {
        context = window;
      }

      // Already known image source
      if (data[source])
      {
        if (callback) {
          callback.call(context, source, data[source]);
        }

        return;
      }

      // Create image element
      var el = new Image();

      el.onload = qx.lang.Function.bind(this.__onload, this, el, callback, context);
      el.onerror = qx.lang.Function.bind(this.__onerror, this, el);

      el.src = source;
    },


    /**
     * Internal event listener for all load events.
     *
     * @type static
     * @param element {Element} DOM element which represents the image
     * @param callback {Function} Callback function to execute
     * @param context {Object} Context in which the given callback should be executed
     * @return {void}
     */
    __onload : function(element, callback, context)
    {
      // Shorthand
      var data = this.__data;
      var source = element.src;

      // Store dimensions
      data[source] =
      {
        width : this.__getWidth(element),
        height : this.__getHeight(element)
      }

      // Cleanup listeners
      element.onload = element.onerror = null;

      // Execute callback
      if (callback) {
        callback.call(context, source, data[source]);
      }
    },


    /**
     * Internal event listener for all error events.
     *
     * @type static
     * @param element {Element} DOM element which represents the image
     * @return {void}
     */
    __onerror : function(element)
    {
      // Cleanup listeners
      element.onload = element.onerror = null;

      // Throw error
      throw new Error("Could not load image: " + element.src);
    },


    /**
     * Returns the natural width of the given image element.
     *
     * @type static
     * @param element {Element} DOM element which represents the image
     * @return {Integer} Image width
     */
    __getWidth : qx.core.Variant.select("qx.client",
    {
      "gecko" : function(element) {
        return element.naturalWidth;
      },

      "default" : function(element) {
        return element.width;
      }
    }),


    /**
     * Returns the natural height of the given image element.
     *
     * @type static
     * @param element {Element} DOM element which represents the image
     * @return {Integer} Image height
     */
    __getHeight : qx.core.Variant.select("qx.client",
    {
      "gecko" : function(element) {
        return element.naturalHeight;
      },

      "default" : function(element) {
        return element.height;
      }
    })
  }
});
