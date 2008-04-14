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
     * Fabian Jakobs (fjakobs)

************************************************************************ */

/* ************************************************************************

#asset(qx/icon/Oxygen/16/places/folder.png)
#asset(qx/icon/Oxygen/48/places/folder.png)
#asset(qx/icon/Oxygen/48/devices/*)

************************************************************************ */

qx.Class.define("demobrowser.demo.widget.List_1",
{
  extend : qx.application.Standalone,

  members :
  {
    main: function()
    {
      this.base(arguments);

      var l1 = new qx.ui.form.List("multi");

      l1.set({ height: 300, width: 150 });

      var item;
      for( var i=1; i<=25; i++ )
      {
        item = new qx.ui.form.ListItem("Item No " + i, "icon/" + ((i % 4) ? "16" : "48") + "/places/folder.png");

        !(i % 9) && (item.setEnabled(false));
        l1.add(item);
      };

      this.getRoot().add(l1, 20, 20);




      var l2 = new qx.ui.form.List("single");

      l2.set({ height: 200, width: 150 });

      var l2l = [ "red", "violett", "rose", "blue", "green", "cyan", "magenta", "yellow", "brown", "orange", "black", "white", "grey", "gray", "brown" ];

      for (var i=0; i<l2l.length; i++) {
        l2.add(new qx.ui.form.ListItem(l2l[i]));
      };

      this.getRoot().add(l2, 400, 20);





      var l3 = new qx.ui.form.List("additive");

      l3.set({ height: 200, width: 150 });

      var l3l = [ "Leon","Lukas","Luca","Finn","Tim","Felix","Jonas","Luis",
      "Maximilian","Julian","Max","Paul","Niclas","Jan","Ben","Elias","Jannick",
      "Philipp","Noah","Tom","Moritz","Nico","David","Nils","Simon","Fabian",
      "Erik","Justin","Alexander","Jakob","Florian","Nick","Linus","Mika","Jason",
      "Daniel","Lennard","Marvin","Jannis","Tobias","Dominic","Marlon","Marc",
      "Johannes","Jonathan","Julius","Colin","Joel","Kevin","Vincent","Robin"];

      for (var i=0; i<l3l.length; i++) {
        l3.add(new qx.ui.form.ListItem(l3l[i]));
      };

      this.getRoot().add(l3, 600, 20);




      var l4 = new qx.ui.form.List("multi", true);

      l4.set({ width: 600 });

      var l4l = [ "audio-card.png","audio-input-microphone.png","battery.png",
      "camera-photo.png","camera-web.png","computer.png","display.png",
      "drive-harddisk.png","drive-optical.png","input-keyboard.png",
      "input-mouse.png","media-flash.png","media-optical.png","multimedia-player.png",
      "network-wired.png","network-wireless.png","pda.png","phone.png","printer.png" ];

      var l4pre = "icon/48/devices/"

      for (var i=0; i<l4l.length; i++) {
        l4.add(new qx.ui.form.ListItem(null, l4pre + l4l[i]));
      };

      this.getRoot().add(l4, 20, 400);




      var mode1 = new qx.ui.form.RadioButton("Single Selection");
      var mode2 = new qx.ui.form.RadioButton("Multi Selection");
      var mode3 = new qx.ui.form.RadioButton("Additive Selection");

      mode1.setValue("single");
      mode2.setValue("multi");
      mode3.setValue("additive");

      mode2.setChecked(true);

      this.getRoot().add(mode1, 180, 20);
      this.getRoot().add(mode2, 180, 40);
      this.getRoot().add(mode3, 180, 60);

      var rbm = new qx.ui.core.RadioManager([mode1, mode2, mode3]);

      rbm.addListener("changeSelected", function(e) {
        l1.setSelectionMode(e.getValue().getValue());
      });





      var show1 = new qx.ui.form.RadioButton("Show Label");
      var show2 = new qx.ui.form.RadioButton("Show Icon");
      var show3 = new qx.ui.form.RadioButton("Show Both");

      show1.setValue("label");
      show2.setValue("icon");
      show3.setValue("both");

      show3.setChecked(true);

      this.getRoot().add(show1, 180, 100);
      this.getRoot().add(show2, 180, 120);
      this.getRoot().add(show3, 180, 140);

      var rbm = new qx.ui.core.RadioManager([show1, show2, show3]);

      rbm.addListener("changeSelected", function(e)
      {
        for( var i=0; i<l1.getChildren().length; i++ ) {
          l1.getChildren()[i].setShow(e.getValue().getValue());
        }
      });
    }
  }
});
