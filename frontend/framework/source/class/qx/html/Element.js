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

/* ************************************************************************

#module(html)

************************************************************************ */

/**
 * High-performance, high-level DOM element creation and managment.
 *
 * Includes support for HTML and style attributes. Elements also have
 * got a powerful children and visibility managment.
 *
 * Processes DOM insertion and modification with a advanced logic
 * to reduce the real transactions.
 *
 * From the view of the parent you can use the following children managment
 * methods:
 * {@link #getChildren}, {@link #indexOf}, {@link #hasChild}, {@link #add},
 * {@link #addAt}, {@link #remove}, {@link #removeAt}, {@link #removeAll}
 *
 * Each child itself also has got some powerful methods to control its
 * position:
 * {@link #getParent}, {@link #free},
 * {@link #insertInto}, {@link #insertBefore}, {@link #insertAfter},
 * {@link #moveTo}, {@link #moveBefore}, {@link #moveAfter},
 */
qx.Class.define("qx.html.Element",
{
  extend : qx.core.Object,




  /*
  *****************************************************************************
     CONSTRUCTOR
  *****************************************************************************
  */

  /**
   * Creates a new Element
   *
   * @param tagName {String?"div"} Tag name of the element to create
   */
  construct : function(tagName)
  {
    this.base(arguments);

    // set tag name
    this._nodeName = tagName || "div";

    // All added children (each one is a qx.html.Element itself)
    this._children = [];

    // Maps which contains styles and attribute
    // These are used to keep data for pre-creation
    // and until the next sync. These are never cleared.
    // They always reflect the presently choosen values.
    // Please note that these need not to be always in
    // sync with the DOM.
    // These are created dynamically as required.
    // this.__attribValues = {};
    // this.__styleValues = {};
    // this.__eventValues = {};

    // Maps which contains the names / identifiers of the attributes,
    // styles or events which needs syncronization to the DOM.
    // These are created dynamically as required.
    // this.__attribJobs = {};
    // this.__styleJobs = {};
    // this.__eventJobs = {};

    // Add hashcode (temporary, while development)
    if (qx.core.Variant.isSet("qx.debug", "on")) {
      this.setAttribute("id", this.toHashCode());
    }
  },




  /*
  *****************************************************************************
     STATICS
  *****************************************************************************
  */

  statics :
  {
    /*
    ---------------------------------------------------------------------------
      STATIC DATA
    ---------------------------------------------------------------------------
    */

    /** {Boolean} If debugging should be enabled */
    _debug : true,


    /** {Map} Contains the modified {@link qx.html.Element}s. The key is the hash code. */
    _modified : {},


    /** {Map} Map of post actions for elements */
    _actions : {},






    /*
    ---------------------------------------------------------------------------
      PUBLIC ELEMENT FLUSH
    ---------------------------------------------------------------------------
    */

    /**
     * Flush the global modified list
     *
     * @type static
     */
    flush : function()
    {
      var modified = this._modified;

      if (qx.lang.Object.isEmpty(modified))
      {
        qx.core.Log.warn("Flush with no modificiations!");
        return;
      }




      // Split modified into rendered/invisible and keep
      // logically invisible children in the old modified.
      var domRendered = {};
      var domInvisible = {};
      var entry;

      for (var hc in modified)
      {
        entry = modified[hc];

        if (entry.__hasVisibleRoot())
        {
          // Add self to modified
          if (entry._element && qx.dom.Hierarchy.isRendered(entry._element)) {
            domRendered[hc] = entry;
          } else {
            domInvisible[hc] = entry;
          }

          // Cleanup modification list
          delete modified[hc];
        }
      }



      // User feedback
      if (qx.core.Variant.isSet("qx.debug", "on"))
      {
        if (this._debug)
        {
          qx.core.Log.debug("Updating " + qx.lang.Object.getLength(domInvisible) + " DOM invisible elements");
          for (var hc in domInvisible) {
            qx.core.Log.debug("  - " + domInvisible[hc].getAttribute("id") + " [" + domInvisible[hc].toHashCode() + "]");
          }

          qx.core.Log.debug("Updating " + qx.lang.Object.getLength(domRendered) + " DOM rendered elements");
          for (var hc in domRendered) {
            qx.core.Log.debug("  - " + domRendered[hc].getAttribute("id") + " [" + domRendered[hc].toHashCode() + "]");
          }
        }
      }




      // Flush queues: Apply children, styles and attributes
      for (var hc in domInvisible) {
        domInvisible[hc]._flush();
      }

      for (var hc in domRendered) {
        domRendered[hc]._flush();
      }




      // Process action list
      var post = this._actions;
      var actions = [ "deactivate", "blur", "activate", "focus" ];
      var action;

      for (var i=0, l=actions.length; i<l; i++)
      {
        action = actions[i];

        if (post[action])
        {
          if (post[action]._element) {
            qx.bom.Element[action](post[action]._element);
          }

          delete post[action];
        }
      }
    }
  },






  /*
  *****************************************************************************
     MEMBERS
  *****************************************************************************
  */

  members :
  {
    /*
    ---------------------------------------------------------------------------
      PROTECTED HELPERS/DATA
    ---------------------------------------------------------------------------
    */

    /** {Element} DOM element of this object */
    _element : null,


    /** {Boolean} Marker for always visible root nodes (often the body node) */
    _root : false,


    /** {Boolean} Whether the element should be included in the render result */
    _included : true,


    /** {Boolean} Whether the element should be visible in the render result */
    _visible : true,


    /**
     * Add the element to the global modification list.
     *
     * @type static
     * @return {void}
     */
    _scheduleSync : function() {
      qx.html.Element._modified[this.toHashCode()] = this;
    },


    /**
     * Internal helper to generate the DOM element
     *
     * @type member
     */
    _createDomElement : function()
    {
      this._element = qx.bom.Element.create(this._nodeName);
      this._element.QxElement = this;
    },

    _flushSelf : function()
    {
      if (!this._visible || !this._included) {
        return;
      }

      this.debug("Flush self...");

      var initial = !this._element;
      var recursive = initial || this._modifiedChildren;

      if (initial)
      {
        this._createDomElement();
        this._copyData();
      }
      else
      {
        this._syncData();
      }

      var children = this._children;
      var length = children.length;

      if (length > 0)
      {
        var child;
        for (var i=0; i<length; i++)
        {
          child = children[i];

          // this.debug("Process child: " + child.toHashCode());
          if (!child._element) {
            child._flushSelf();
          }
        }

        if (initial) {
          this._insertChildren();
        } else if (recursive) {
          this._syncChildren();
        }
      }
      else if (!initial)
      {
        this._syncChildren();
      }
    },









    /*
    ---------------------------------------------------------------------------
      FLUSH OBJECT
    ---------------------------------------------------------------------------
    */

    /**
     * Syncs data of an HtmlElement object to the DOM.
     *
     * @type member
     * @return {void}
     */
    _flush : function()
    {
      if (qx.core.Variant.isSet("qx.debug", "on"))
      {
        if (this._debug) {
          this.debug("Flush: " + this.getAttribute("id"));
        }
      }

      this._flushSelf();
    },




    /*
    ---------------------------------------------------------------------------
      SUPPORT FOR CHILDREN FLUSH
    ---------------------------------------------------------------------------
    */

    /**
     * Append all child nodes to the DOM
     * element. This function is used when the element is initially
     * created. After this initial apply {@link #_syncChildren} is used
     * instead.
     *
     * @type member
     * @return {void}
     */
    _insertChildren : function()
    {
      var domElement = document.createDocumentFragment();

      for (var i=0, children=this._children, l=children.length; i<l; i++)
      {
        if (children[i]._included) {
          domElement.appendChild(children[i]._element);
        }
      }

      this._element.appendChild(domElement);
    },


    /**
     * Syncronize internal children hierarchy to the DOM. This is used
     * for further runtime updates after the element has been created
     * initially.
     *
     * @type member
     * @return {void}
     */
    _syncChildren : function()
    {
      if (!this._modifiedChildren) {
        return;
      }

      delete this._modifiedChildren;


      var dataChildren = this._children;
      var dataLength = dataChildren.length
      var dataChild;
      var dataPos = 0;
      var dataEl;

      var domParent = this._element;
      var domChildren = domParent.childNodes;
      var domEl;

      if (qx.core.Variant.isSet("qx.debug", "on")) {
        var domOperations = 0;
      }

      // Remove children from DOM which are excluded or remove first
      for (var i=domChildren.length-1; i>=0; i--)
      {
        domEl = domChildren[i];
        dataEl = domEl.QxElement;

        if (!dataEl._included || dataEl._parent !== this)
        {
          if (qx.core.Variant.isSet("qx.debug", "on")) {
            domOperations++;
          }

          domParent.removeChild(domEl);
        }
      }

      // Start from beginning and bring DOM in sync
      // with the data structure
      for (var i=0; i<dataLength; i++)
      {
        dataChild = dataChildren[i];

        // Only process visible childs
        if (dataChild._included)
        {
          dataEl = dataChild._element;
          domEl = domChildren[dataPos];

          // Only do something when out of sync
          if (dataEl != domEl)
          {
            if (qx.core.Variant.isSet("qx.debug", "on")) {
              domOperations++
            }

            if (domEl) {
              domParent.insertBefore(dataEl, domEl);
            } else {
              domParent.appendChild(dataEl);
            }
          }

          // Increase counter which ignores invisible entries
          dataPos++;
        }
      }

      // User feedback
      if (qx.core.Variant.isSet("qx.debug", "on"))
      {
        if (this._debug) {
          this.debug("  - Modified DOM with " + domOperations + " operations");
        }
      }
    },





    /*
    ---------------------------------------------------------------------------
      SUPPORT FOR ATTRIBUTE/STYLE/EVENT FLUSH
    ---------------------------------------------------------------------------
    */

    /**
     * Copies data between the internal representation and the DOM. This
     * simply copies all the data and only works well directly after
     * element creation. After this the data must be synced using {@link #_syncData}
     *
     * @type member
     * @return {void}
     */
    _copyData : function()
    {
      var elem = this._element;

      // Copy attributes
      var data = this.__attribValues;
      if (data)
      {
        var Attribute = qx.bom.element.Attribute;

        for (var key in data) {
          Attribute.set(elem, key, data[key]);
        }
      }

      // Copy styles
      var data = this.__styleValues;
      if (data)
      {
        var Style = qx.bom.element.Style;

        for (var key in data) {
          Style.set(elem, key, data[key]);
        }
      }

      // Attach events
      var data = this.__eventValues;
      if (data)
      {
        var Event = qx.event.Registration;

        var entry;
        for (var key in data)
        {
          entry = data[key];
          Event.addListener(entry.target._element, entry.type, entry.listener, entry.self, entry.capture);
        }

        // Cleanup old event map
        // Events are directly used through event manager
        // after intial creation. This differs from the
        // handling of styles and attributes.
        delete this.__eventValues;
      }
    },


    /**
     * Syncronizes data between the internal representation and the DOM. This
     * is the counterpart of {@link #_copyData} and is used for further updates
     * after the element has been created.
     *
     * @type member
     * @return {void}
     */
    _syncData : function()
    {
      var elem = this._element;

      var Attribute = qx.bom.element.Attribute;
      var Style = qx.bom.element.Style;

      // Sync attributes
      var jobs = this.__attribJobs;
      if (jobs)
      {
        // qx.core.Log.debug("Attribute Jobs: ", jobs);
        var data = this.__attribValues;

        if (data)
        {
          var value;
          for (var key in jobs)
          {
            value = data[key];

            if (value !== undefined) {
              Attribute.set(elem, key, value);
            } else {
              Attribute.reset(elem, key);
            }
          }
        }

        this.__attribJobs = null;
      }

      // Sync styles
      var jobs = this.__styleJobs;
      if (jobs)
      {
        // qx.core.Log.debug("Style Jobs: ", jobs);
        var data = this.__styleValues;

        if (data)
        {
          var value;
          for (var key in data)
          {
            value = data[key];

            if (value !== undefined) {
              Style.set(elem, key, value);
            } else {
              Style.reset(elem, key);
            }
          }
        }

        this.__styleJobs = null;
      }

      // Events are directly kept in sync
    },








    /*
    ---------------------------------------------------------------------------
      PRIVATE HELPERS/DATA
    ---------------------------------------------------------------------------
    */

    /**
     * Walk up the internal children hierarchy and
     * look if one of the children is marked as root
     */
    __hasVisibleRoot : function()
    {
      var pa = this;

      // Any chance to cache this information in the parents?
      while(pa)
      {
        if (pa._root) {
          return true;
        }

        if (!pa._included || !pa._visible) {
          return false;
        }

        pa = pa._parent;
      }

      return false;
    },


    /**
     * Generates a unique key for a listener configuration
     *
     * @type member
     * @param type {String} Name of the event
     * @param listener {Function} Function to execute on event
     * @param self {Object} Execution context of given function
     * @param capture {Boolean ? false} Whether capturing should be enabled
     * @return {String} A unique ID for this configuration
     */
    __generateListenerId : function(type, listener, self, capture)
    {
      var Object = qx.core.Object;

      var id = "evt" + Object.toHashCode(type) + "-" + Object.toHashCode(listener);

      if (self) {
        id += "-" + Object.toHashCode(self);
      }

      if (capture) {
        id += "-capture";
      }

      return id;
    },


    /**
     * Internal helper for all children addition needs
     *
     * @type member
     * @param child {var} the element to add
     * @throws an exception if the given element is already a child
     *     of this element
     */
    __addChildHelper : function(child)
    {
      if (child._parent === this) {
        throw new Error("Child is already in: " + child);
      }

      if (child._root) {
        throw new Error("Root elements could not be inserted into other ones.");
      }

      // Remove from previous parent
      if (child._parent) {
        child._parent.remove(child);
      }

      // Convert to child of this object
      child._parent = this;

      // Register job and add to queue for existing elements
      if (this._element)
      {
        // Store job hint
        this._modifiedChildren = true;
        this._scheduleSync();
      }
    },


    /**
     * Internal helper for all children removal needs
     *
     * @type member
     * @param child {qx.html.Element} the removed element
     * @throws an exception if the given element is not a child
     *     of this element
     */
    __removeChildHelper : function(child)
    {
      if (child._parent !== this) {
        throw new Error("Has no child: " + child);
      }

      // Register job and add to queue for existing elements
      if (this._element)
      {
        // Store job hint
        this._modifiedChildren = true;
        this._scheduleSync();
      }

      // Remove reference to old parent
      delete child._parent;
    },


    /**
     * Internal helper for all children move needs
     *
     * @type member
     * @param child {qx.html.Element} the moved element
     * @throws an exception if the given element is not a child
     *     of this element
     */
    __moveChildHelper : function(child)
    {
      if (child._parent !== this) {
        throw new Error("Has no child: " + child);
      }

      // Register job and add to queue for existing elements
      if (this._element)
      {
        // Store job hint
        this._modifiedChildren = true;
        this._scheduleSync();
      }
    },









    /*
    ---------------------------------------------------------------------------
      CHILDREN MANAGEMENT (EXECUTED ON THE PARENT)
    ---------------------------------------------------------------------------
    */

    /**
     * Returns a copy of the internal children structure.
     *
     * @type member
     * @return {Array} the children list
     */
    getChildren : function()
    {
      // protect structure using a copy
      return qx.lang.Array.copy(this._children);
    },


    /**
     * Find the position of the given child
     *
     * @type member
     * @param child {qx.html.Element} the child
     * @return {Integer} returns the position. If the element
     *     is not a child <code>-1</code> will be returned.
     */
    indexOf : function(child) {
      return this._children.indexOf(child);
    },


    /**
     * Whether the given element is a child of this element.
     *
     * @type member
     * @param child {qx.html.Element} the child
     * @return {Boolean} Returns <code>true</code> when the given
     *    element is a child of this element.
     */
    hasChild : function(child) {
      return this._children.indexOf(child) !== -1;
    },


    /**
     * Append all given children at the end of this element.
     *
     * @type member
     * @param childs {qx.html.Element...} elements to insert
     * @return {qx.html.Element} this object (for chaining support)
     */
    add : function(childs)
    {
      if (arguments[1])
      {
        for (var i=0, l=arguments.length; i<l; i++) {
          this.__addChildHelper(arguments[i]);
        }

        this._children.push.apply(this._children, arguments);
      }
      else
      {
        this.__addChildHelper(childs);
        this._children.push(childs);
      }

      // Chaining support
      return this;
    },


    /**
     * Inserts a new element into this element at the given position.
     *
     * @type member
     * @param child {qx.html.Element} the element to insert
     * @param index {Integer} the index (starts at 0 for the
     *     first child) to insert (the index of the following
     *     children will be increased by one)
     * @return {qx.html.Element} this object (for chaining support)
     */
    addAt : function(child, index)
    {
      this.__addChildHelper(child);
      qx.lang.Array.insertAt(this._children, child, index);

      // Chaining support
      return this;
    },


    /**
     * Removes all given children
     *
     * @type member
     * @param childs {qx.html.Element...} children to remove
     * @return {qx.html.Element} this object (for chaining support)
     */
    remove : function(childs)
    {
      if (arguments[1])
      {
        var child;
        for (var i=0, l=arguments.length; i<l; i++)
        {
          child = arguments[i];

          this.__removeChildHelper(child);
          qx.lang.Array.remove(this._children, child);
        }
      }
      else
      {
        this.__removeChildHelper(childs);
        qx.lang.Array.remove(this._children, childs);
      }

      // Chaining support
      return this;
    },


    /**
     * Removes the child at the given index
     *
     * @type member
     * @param index {Integer} the position of the
     *     child (starts at 0 for the first child)
     * @return {qx.html.Element} this object (for chaining support)
     */
    removeAt : function(index)
    {
      var child = this._children[index];

      if (!child) {
        throw new Error("Has no child at this position!");
      }

      this.__removeChildHelper(child);
      qx.lang.Array.removeAt(this._children, index);

      // Chaining support
      return this;
    },


    /**
     * Remove all children from this element.
     *
     * @type member
     * @return
     */
    removeAll : function()
    {
      var children = this._children;
      for (var i=0, l=children.length; i<l; i++) {
        this.__removeChildHelper(children[i]);
      }

      // Clear array
      children.length = 0;

      // Chaining support
      return this;
    },






    /*
    ---------------------------------------------------------------------------
      CHILDREN MANAGEMENT (EXECUTED ON THE CHILD)
    ---------------------------------------------------------------------------
    */

    /**
     * Returns the parent of this element.
     *
     * @type member
     * @return {qx.html.Element|null} The parent of this element
     */
    getParent : function() {
      return this._parent || null;
    },


    /**
     * Insert self into the given parent. Normally appends self to the end,
     * but optionally a position can be defined. <code>0</code> will insert
     * at the begin.
     *
     * @type member
     * @param parent {qx.html.Element} The new parent of this element
     * @param index {Integer?null} Optional position
     * @return {qx.html.Element} this object (for chaining support)
     */
    insertInto : function(parent, index)
    {
      parent.__addChildHelper(this);

      if (index == null) {
        parent._children.push(this);
      } else {
        qx.lang.Array.insertAt(this._children, child, index);
      }

      return this;
    },


    /**
     * Insert self before the given (related) element
     *
     * @type member
     * @param rel {qx.html.Element} the related element
     * @return {qx.html.Element} this object (for chaining support)
     */
    insertBefore : function(rel)
    {
      var parent = rel._parent;

      parent.__addChildHelper(this);
      qx.lang.Array.insertBefore(parent._children, this, rel);

      return this;
    },


    /**
     * Insert self after the given (related) element
     *
     * @type member
     * @param rel {qx.html.Element} the related element
     * @return {qx.html.Element} this object (for chaining support)
     */
    insertAfter : function(rel)
    {
      var parent = rel._parent;

      parent.__addChildHelper(this);
      qx.lang.Array.insertAfter(parent._children, this, rel);

      return this;
    },


    /**
     * Move self to the given index in the current parent.
     *
     * @type member
     * @param index {Integer} the index (starts at 0 for the first child)
     * @return {qx.html.Element} this object (for chaining support)
     * @throws an exception when the given element is not child
     *      of this element.
     */
    moveTo : function(index)
    {
      var parent = this._parent;

      parent.__moveChildHelper(this);

      var oldIndex = parent._children.indexOf(this);

      if (oldIndex === index) {
        throw new Error("Could not move to same index!");
      } else if (oldIndex < index) {
        index--;
      }

      qx.lang.Array.removeAt(parent._children, oldIndex);
      qx.lang.Array.insertAt(parent._children, this, index);

      return this;
    },


    /**
     * Move self before the given (related) child.
     *
     * @type member
     * @param rel {qx.html.Element} the related child
     * @return {qx.html.Element} this object (for chaining support)
     */
    moveBefore : function(rel)
    {
      var parent = this._parent;
      return this.moveTo(parent._children.indexOf(rel));
    },


    /**
     * Move self after the given (related) child.
     *
     * @type member
     * @param rel {qx.html.Element} the related child
     * @return {qx.html.Element} this object (for chaining support)
     */
    moveAfter : function(rel)
    {
      var parent = this._parent;
      return this.moveTo(parent._children.indexOf(rel) + 1);
    },


    /**
     * Remove self from the current parent.
     *
     * @type member
     * @return {qx.html.Element} this object (for chaining support)
     */
    free : function()
    {
      var parent = this._parent;

      if (!parent) {
        throw new Error("Has no parent to remove from.");
      }

      parent.__removeChildHelper(this);
      qx.lang.Array.remove(parent._children, this);

      return this;
    },






    /*
    ---------------------------------------------------------------------------
      DOM ELEMENT ACCESS
    ---------------------------------------------------------------------------
    */

    /**
     * Returns the DOM element (if created). Please use this with caution.
     * It is better to make all changes to the object itself using the public
     * API rather than to the underlying DOM element.
     *
     * @type member
     * @internal
     * @return {Element} the DOM element node
     * @throws an error if the element was not yet created
     */
    getDomElement : function()
    {
      if (!this._element) {
        throw new Error("Element is not yet created!");
      }

      return this._element;
    },







    /*
    ---------------------------------------------------------------------------
      EXCLUDE SUPPORT
    ---------------------------------------------------------------------------
    */

    /**
     * Marks the element as included which means it will be moved into
     * the DOM again and synced with the internal data representation.
     *
     * @type member
     * @return {qx.html.Element} this object (for chaining support)
     */
    include : function()
    {
      if (this._included) {
        return;
      }

      delete this._included;

      var pa = this._parent;
      if (pa)
      {
        pa._modifiedChildren = true;
        pa._scheduleSync();
      }

      return this;
    },


    /**
     * Marks the element as excluded which means it will be removed
     * from the DOM and ignored for updates until it gets included again.
     *
     * @type member
     * @return {qx.html.Element} this object (for chaining support)
     */
    exclude : function()
    {
      if (!this._included) {
        return;
      }

      this._included = false;

      var pa = this._parent;
      if (pa)
      {
        pa._modifiedChildren = true;
        pa._scheduleSync();
      }

      return this;
    },


    /**
     * Whether the element is part of the DOM
     *
     * @return {Boolean} Whether the element is part of the DOM.
     */
    isIncluded : function() {
      return this._included === true;
    },






    /*
    ---------------------------------------------------------------------------
      VISIBILITY SUPPORT
    ---------------------------------------------------------------------------
    */

    show : function()
    {
      if (this._visible) {
        return;
      }

      this.resetStyle("display");
      delete this._visible;
    },

    hide : function()
    {
      if (!this._visible) {
        return;
      }

      this.setStyle("display", "none");
      this._visible = false;
    },

    isVisible : function() {
      return this._visible === true;
    },






    /*
    ---------------------------------------------------------------------------
      FOCUS/ACTIVATE SUPPORT
    ---------------------------------------------------------------------------
    */

    /**
     * Mark this element to get focussed on the next flush of the queue
     *
     * @type member
     * @return {void}
     */
    focus : function() {
      qx.html.Element._scheduleAction("focus", this);
    },


    /**
     * Mark this element to get blurred on the next flush of the queue
     *
     * @type member
     * @return {void}
     */
    blur : function() {
      qx.html.Element._scheduleAction("blur", this);
    },


    /**
     * Mark this element to get activated on the next flush of the queue
     *
     * @type member
     * @return {void}
     */
    activate : function() {
      qx.html.Element._scheduleAction("activate", this);
    },


    /**
     * Mark this element to get deactivated on the next flush of the queue
     *
     * @type member
     * @return {void}
     */
    deactivate : function() {
      qx.html.Element._scheduleAction("deactivate", this);
    },






    /*
    ---------------------------------------------------------------------------
      STYLE SUPPORT
    ---------------------------------------------------------------------------
    */

    /**
     * Set up the given style attribute
     *
     * @type member
     * @param key {String} the name of the style attribute
     * @param value {var} the value
     * @return {qx.html.Element} this object (for chaining support)
     */
    setStyle : function(key, value)
    {
      if (!this.__styleValues) {
        this.__styleValues = {};
      }

      if (this.__styleValues[key] == value) {
        return;
      }

      if (value == null) {
        delete this.__styleValues[key];
      } else {
        this.__styleValues[key] = value;
      }

      // Uncreated elements simply copy all data
      // on creation. We don't need to remember any
      // jobs. It is a simple full list copy.
      if (this._element)
      {
        // Dynamically create if needed
        if (!this.__styleJobs) {
          this.__styleJobs = {};
        }

        // Store job info
        this.__styleJobs[key] = true;
        this._scheduleSync();
      }

      return this;
    },


    /**
     * Removes the given style attribute
     *
     * @type member
     * @param key {String} the name of the style attribute
     * @return {qx.html.Element} this object (for chaining support)
     */
    removeStyle : function(key) {
      this.setStyle(key, null);
    },


    /**
     * Apply the given styles
     *
     * @type member
     * @param map {Map} Incoming style map (key=property name, value=property value)
     * @return {qx.html.Element} this object (for chaining support)
     */
    setStyles : function(map)
    {
      if (!this.__styleValues) {
        this.__styleValues = {};
      }

      var modified = {};
      for (var key in map)
      {
        if (this.__styleValues[key] != map[key]) {
          modified[key] = true;
        }
      }

      if (qx.lang.Object.isEmpty(modified)) {
        return;
      }

      for (var key in modified) {
        this.__styleValues[key] = map[key];
      }

      // Uncreated elements simply copy all data
      // on creation. We don't need to remember any
      // jobs. It is a simple full list copy.
      if (this._element)
      {
        // Dynamically create if needed
        if (!this.__styleJobs) {
          this.__styleJobs = {};
        }

        // Copy to jobs map
        for (var key in modified) {
          this.__styleJobs[key] = true;
        }

        this._scheduleSync();
      }

      return this;
    },


    /**
     * Get the value of the given style attribute.
     *
     * @type member
     * @param key {String} name of the style attribute
     * @return {var} the value of the style attribute
     */
    getStyle : function(key) {
      return this.__styleValues ? this.__styleValues[key] : null;
    },





    /*
    ---------------------------------------------------------------------------
      ATTRIBUTE SUPPORT
    ---------------------------------------------------------------------------
    */

    /**
     * Set up the given attribute
     *
     * @type member
     * @param key {String} the name of the attribute
     * @param value {var} the value
     * @return {qx.html.Element} this object (for chaining support)
     */
    setAttribute : function(key, value)
    {
      if (!this.__attribValues) {
        this.__attribValues = {};
      }

      if (this.__attribValues[key] == value) {
        return;
      }

      if (value == null) {
        delete this.__attribValues[key];
      } else {
        this.__attribValues[key] = value;
      }

      // Uncreated elements simply copy all data
      // on creation. We don't need to remember any
      // jobs. It is a simple full list copy.
      if (this._element)
      {
        // Dynamically create if needed
        if (!this.__attribJobs) {
          this.__attribJobs = {};
        }

        // Store job info
        this.__attribJobs[key] = true;
        this._scheduleSync();
      }

      return this;
    },


    /**
     * Removes the given attribute
     *
     * @type member
     * @param key {String} the name of the attribute
     * @return {qx.html.Element} this object (for chaining support)
     */
    removeAttribute : function(key, value) {
      this.setAttribute(key, null);
    },


    /**
     * Apply the given attributes
     *
     * @type member
     * @param map {Map} Incoming attribute map (key=attribute name, value=attribute value)
     * @return {qx.html.Element} this object (for chaining support)
     */
    setAttributes : function(map)
    {
      if (!this.__attribValues) {
        this.__attribValues = {};
      }

      var modified = {};
      for (var key in map)
      {
        if (this.__attribValues[key] != map[key]) {
          modified[key] = true;
        }
      }

      if (qx.lang.Object.isEmpty(modified)) {
        return;
      }

      for (var key in modified) {
        this.__attribValues[key] = map[key];
      }

      // Uncreated elements simply copy all data
      // on creation. We don't need to remember any
      // jobs. It is a simple full list copy.
      if (this._element)
      {
        // Dynamically create if needed
        if (!this.__attribJobs) {
          this.__attribJobs = {};
        }

        // Copy to jobs map
        for (var key in modified) {
          this.__attribJobs[key] = true;
        }

        this._scheduleSync();
      }

      return this;
    },


    /**
     * Get the value of the given attribute.
     *
     * @type member
     * @param key {String} name of the attribute
     * @return {var} the value of the attribute
     */
    getAttribute : function(key) {
      return this.__attribValues ? this.__attribValues[key] : null;
    },






    /*
    ---------------------------------------------------------------------------
      EVENT SUPPORT
    ---------------------------------------------------------------------------
    */

    /**
     * Adds an event listener to the element.
     *
     * @type member
     * @param type {String} Name of the event
     * @param listener {Function} Function to execute on event
     * @param self {Object} Execution context of given function
     * @param capture {Boolean ? false} Whether capturing should be enabled
     * @return {qx.html.Element} this object (for chaining support)
     */
    addListener : function(type, listener, self, capture)
    {
      if (this._element)
      {
        qx.event.Registration.addListener(this._element, type, listener, self, capture);
      }
      else
      {
        if (!this.__eventValues) {
          this.__eventValues = {};
        }

        var key = this.__generateListenerId(type, listener, self, capture);

        if (this.__eventValues[key]) {
          throw new Error("A listener of this configuration does already exist!");
        }

        this.__eventValues[key] = {
          target : this,
          type : type,
          listener : listener,
          self : self,
          capture : capture
        };
      }

      return this;
    },


    /**
     * Removes an event listener from the element.
     *
     * @type member
     * @param type {String} Name of the event
     * @param listener {Function} Function to execute on event
     * @param self {Object} Execution context of given function
     * @param capture {Boolean ? false} Whether capturing should be enabled
     * @return {qx.html.Element} this object (for chaining support)
     */
    removeListener : function(type, listener, self, capture)
    {
      if (this._element)
      {
        qx.event.Registration.removeListener(this._element, type, listener, self, capture);
      }
      else
      {
        var key = this.__generateListenerId(type, listener, self, capture);

        if (!this.__eventValues || !this.__eventValues[key]) {
          throw new Error("A listener of this configuration does not exist!");
        }

        delete this.__eventValues[key];
      }

      return this;
    },


    /**
     * Whether an element has the specified event listener
     *
     * @type member
     * @param type {String} Name of the event
     * @param listener {Function} Function to execute on event
     * @param self {Object} Execution context of given function
     * @param capture {Boolean ? false} Whether capturing should be enabled
     * @return {Boolean} <code>true</code> when such an event listener already exists
     */
    hasListener : function(type, listener, self, capture)
    {
      if (this._element)
      {
        return qx.event.Manager.hasListener(this._element, type, listener, self, capture);
      }
      else
      {
        var key = this.__generateListenerId(type, listener, self, capture);
        return (this.__eventValues && this.__eventValues[key]);
      }
    }
  },





  /*
  *****************************************************************************
     DESTRUCT
  *****************************************************************************
  */

  destruct : function()
  {
    this._disposeObjectDeep("_children", 1);
    this._disposeFields("__attribValues", "__styleValues", "__eventValues");
    this._disposeFields("__attribJobs", "__styleJobs", "__eventJobs");

    if (this._element) {
      this._element.QxElement = null;
    }

    this._disposeFields("_element");
  }
});
