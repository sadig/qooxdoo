/* ************************************************************************

   qooxdoo - the new era of web development

   http://qooxdoo.org

   Copyright:
     2009 1&1 Internet AG, Germany, http://www.1und1.de

   License:
     LGPL: http://www.gnu.org/licenses/lgpl.html
     EPL: http://www.eclipse.org/org/documents/epl-v10.php
     See the LICENSE file in the project's top-level directory for details.

   Authors:
     * Gabriel Munteanu (gabios)

************************************************************************ */

qx.Class.define("qx.test.event.dispatch.MouseEventOnDocument",
{
  extend : qx.dev.unit.TestCase,

  members :
  {
    setUp : function()
    {
      this.root = qx.bom.Element.create("div", {id: "root"});
      document.body.appendChild(this.root);
    },


    tearDown : function()
    {
      var Reg = qx.event.Registration;

      Reg.removeAllListeners(document);
      Reg.removeAllListeners(window);
      Reg.removeAllListeners(this.root);

      document.body.removeChild(document.getElementById("root"));
    },
    
    testMouseEventsOnDocument: function(){
      this.doWork(document);
    },
    
    testMouseEventsOnWindow: function(){
      this.doWork(window);
    },
    
    testMouseEventsOnDomNode: function(){
      this.doWork(this.root);
    },
    
    doWork: function(el){
      if (qx.core.Variant.isSet("qx.debug", "on")){
        qx.log.Logger.clear();
        var events = ['mousemove','click','mousedown','mouseup'];
        var ringAppender = new qx.log.appender.RingBuffer();
        qx.log.Logger.register(ringAppender);
        for(var i=0;i<events.length;i++ ) {
          qx.bom.Element.addListener(el, events[i], function(){});
        }
        var warnings = ringAppender.getAllLogEvents().length;
        this.assertTrue( 0 === warnings , warnings + " events in ['mousemove','click','mousedown','mouseup'] generated a warning when added to target "+el);
        qx.log.Logger.unregister(ringAppender);
        qx.log.Logger.clear();
      }
    }
    
  }
});
