/**
 * Whirled2 AvatarHost — ORIGINAL thin companion SWF (not AGPL copy).
 * Protocol studied from Grey Havens whirled-api / msoy ControlBackend behavior:
 * avatar dispatches "controlConnect" on loaderInfo.sharedEvents; host fills hostProps;
 * walk is driven by calling userProps.appearanceChanged_v2(loc, orient, moving, sleeping).
 *
 * JS bridge (ExternalInterface):
 *   hostLoadUrl(url) / hostWalk(moving, orient) / hostEmote(name) / hostSetState(state)
 *   callbacks via ExternalInterface.call("WhirledAvatarHostBridge", ...)
 */
import flash.display.Loader;
import flash.display.Sprite;
import flash.display.StageAlign;
import flash.display.StageScaleMode;
import flash.events.Event;
import flash.events.IOErrorEvent;
import flash.external.ExternalInterface;
import flash.net.URLRequest;
import flash.system.ApplicationDomain;
import flash.system.LoaderContext;

class AvatarHost extends Sprite {
  var loader:Loader;
  var userProps:Dynamic;
  var connected:Bool = false;
  var orient:Float = 180;
  var moving:Bool = false;
  var state:String = null;
  var location:Array<Dynamic>;

  static function main() {
    flash.Lib.current.addChild(new AvatarHost());
  }

  public function new() {
    super();
    location = [0.5, 0, 0.5];
    try {
      var st = flash.Lib.current.stage;
      if (st != null) {
        st.align = StageAlign.TOP_LEFT;
        st.scaleMode = StageScaleMode.NO_SCALE;
      }
    } catch (e:Dynamic) {}

    if (ExternalInterface.available) {
      try {
        ExternalInterface.addCallback("hostLoadUrl", hostLoadUrl);
        ExternalInterface.addCallback("hostWalk", hostWalk);
        ExternalInterface.addCallback("hostEmote", hostEmote);
        ExternalInterface.addCallback("hostSetState", hostSetState);
        ExternalInterface.addCallback("hostIsConnected", hostIsConnected);
        ExternalInterface.addCallback("hostGetDebug", hostGetDebug);
        bridge("ready", null);
      } catch (e:Dynamic) {
        bridge("ei_error", Std.string(e));
      }
    }
  }

  function bridge(kind:String, payload:Dynamic):Void {
    if (!ExternalInterface.available) return;
    try {
      ExternalInterface.call("WhirledAvatarHostBridge", kind, payload);
    } catch (e:Dynamic) {}
  }

  function hostLoadUrl(url:String):Bool {
    if (url == null || url == "") {
      bridge("error", "empty-url");
      return false;
    }
    connected = false;
    userProps = null;
    if (loader != null) {
      try { loader.contentLoaderInfo.sharedEvents.removeEventListener("controlConnect", onControlConnect); } catch (e:Dynamic) {}
      try { removeChild(loader); } catch (e:Dynamic) {}
      try { loader.unloadAndStop(true); } catch (e:Dynamic) {}
      loader = null;
    }
    loader = new Loader();
    var li = loader.contentLoaderInfo;
    li.addEventListener(Event.COMPLETE, onLoaded);
    li.addEventListener(IOErrorEvent.IO_ERROR, onLoadError);
    // Must listen before avatar AvatarControl ctor fires controlConnect
    li.sharedEvents.addEventListener("controlConnect", onControlConnect, false, 0, true);
    addChild(loader);
    var ctx = new LoaderContext(false, new ApplicationDomain(ApplicationDomain.currentDomain));
    try {
      loader.load(new URLRequest(url), ctx);
      bridge("loading", url);
      return true;
    } catch (e:Dynamic) {
      bridge("error", Std.string(e));
      return false;
    }
  }

  function onLoaded(_e:Event):Void {
    bridge("loaded", null);
    // If connect already happened, nudge idle appearance
    if (connected) callAppearance(false);
  }

  function onLoadError(e:IOErrorEvent):Void {
    bridge("error", e != null ? e.text : "io-error");
  }

  function onControlConnect(evt:Dynamic):Void {
    var props:Dynamic = evt;
    try {
      if (Reflect.hasField(evt, "props") && evt.props != null) props = evt.props;
    } catch (e:Dynamic) {}

    if (userProps != null) {
      try { Reflect.setField(props, "alreadyConnected", true); } catch (e2:Dynamic) {}
      return;
    }

    try {
      userProps = Reflect.field(props, "userProps");
    } catch (e3:Dynamic) {
      userProps = null;
    }
    if (userProps == null) {
      bridge("error", "no-userProps");
      return;
    }

    var hostProps:Dynamic = {};
    Reflect.setField(hostProps, "startTransaction", function() {});
    Reflect.setField(hostProps, "commitTransaction", function() {});
    Reflect.setField(hostProps, "setLocation_v1", setLocation_v1);
    Reflect.setField(hostProps, "setMoveSpeed_v1", function(_n:Float) {});
    Reflect.setField(hostProps, "setOrientation_v1", function(o:Float) { orient = o; });
    Reflect.setField(hostProps, "setState_v1", function(s:String) { state = s; });
    Reflect.setField(hostProps, "getState_v1", function() return state);
    Reflect.setField(hostProps, "setHotSpot_v1", function(_x:Float, _y:Float, _h:Float) {});
    Reflect.setField(hostProps, "setPreferredY_v1", function(_p:Int) {});
    Reflect.setField(hostProps, "sendMessage_v1", sendMessage_v1);
    Reflect.setField(hostProps, "sendSignal_v1", function(_n:String, _a:Dynamic) {});
    Reflect.setField(hostProps, "getRoomBounds_v1", function() return [800.0, 600.0, 1.0]);
    Reflect.setField(hostProps, "getInstanceId_v1", function() return 1);
    Reflect.setField(hostProps, "getViewerName_v1", function(_id:Int) return "You");
    Reflect.setField(hostProps, "canEditRoom_v1", function(_id:Int) return true);
    Reflect.setField(hostProps, "getMyEntityId_v1", function() return "avatar:self");
    Reflect.setField(hostProps, "getEntityIds_v1", function(_t:String) return []);
    Reflect.setField(hostProps, "getEntityProperty_v1", function(_id:String, _k:String) return null);
    Reflect.setField(hostProps, "lookupMemory_v1", function(_k:String) return null);
    Reflect.setField(hostProps, "updateMemory_v1", function(_k:String, _v:Dynamic, _cb:Dynamic) {});
    Reflect.setField(hostProps, "getMemories_v1", function() return {});
    Reflect.setField(hostProps, "showPopup_v1", function(_t:String, _p:Dynamic, _w:Float, _h:Float, _c:UInt, _a:Float) return false);
    Reflect.setField(hostProps, "clearPopup_v1", function() {});
    Reflect.setField(hostProps, "getCamera_v1", function(_i:String) return null);
    Reflect.setField(hostProps, "getMicrophone_v1", function(_i:Int) return null);
    Reflect.setField(hostProps, "getMusicId3_v1", function() return null);
    Reflect.setField(hostProps, "getMusicOwner_v1", function() return 0);

    var initProps:Dynamic = {};
    Reflect.setField(initProps, "orient", orient);
    Reflect.setField(initProps, "isMoving", moving);
    Reflect.setField(initProps, "location", location);
    Reflect.setField(initProps, "env", "room");
    Reflect.setField(hostProps, "initProps", initProps);

    try {
      Reflect.setField(props, "hostProps", hostProps);
    } catch (e4:Dynamic) {
      bridge("error", "cannot-set-hostProps");
      return;
    }

    connected = true;
    bridge("connected", null);
    // Grant control so registerActions/ticks behave like a real room host
    try {
      if (Reflect.hasField(userProps, "gotControl_v1")) {
        Reflect.callMethod(userProps, Reflect.field(userProps, "gotControl_v1"), []);
      }
    } catch (eCtrl:Dynamic) {}
    // Idle appearance so Body/MovieClipBody paints default standing scene
    callAppearance(false);
    // Pull registered actions/states for chrome menus
    tryPullLists();
  }

  function tryPullLists():Void {
    try {
      if (Reflect.hasField(userProps, "getActions_v1")) {
        var acts = Reflect.callMethod(userProps, Reflect.field(userProps, "getActions_v1"), []);
        bridge("actions", acts);
      }
    } catch (e:Dynamic) {}
    try {
      if (Reflect.hasField(userProps, "getStates_v1")) {
        var sts = Reflect.callMethod(userProps, Reflect.field(userProps, "getStates_v1"), []);
        bridge("states", sts);
      }
    } catch (e2:Dynamic) {}
  }

  function callAppearance(isMoving:Bool):Void {
    moving = isMoving;
    if (userProps == null) return;
    try {
      if (Reflect.hasField(userProps, "appearanceChanged_v2")) {
        Reflect.callMethod(userProps, Reflect.field(userProps, "appearanceChanged_v2"), [location, orient, moving, false]);
        return;
      }
      if (Reflect.hasField(userProps, "appearanceChanged_v1")) {
        Reflect.callMethod(userProps, Reflect.field(userProps, "appearanceChanged_v1"), [location, orient, moving]);
      }
    } catch (e:Dynamic) {
      bridge("appearance_error", Std.string(e));
    }
  }

  function hostWalk(isMoving:Bool, newOrient:Float):Bool {
    if (newOrient == newOrient) orient = newOrient; // not NaN
    callAppearance(isMoving);
    return connected;
  }

  function hostEmote(name:String):Bool {
    if (userProps == null || name == null || name == "") return false;
    try {
      if (Reflect.hasField(userProps, "messageReceived_v1")) {
        Reflect.callMethod(userProps, Reflect.field(userProps, "messageReceived_v1"), [name, null, true]);
        return true;
      }
    } catch (e:Dynamic) {
      bridge("emote_error", Std.string(e));
    }
    return false;
  }

  function hostSetState(s:String):Bool {
    state = s;
    if (userProps == null) return false;
    try {
      if (Reflect.hasField(userProps, "stateSet_v1")) {
        Reflect.callMethod(userProps, Reflect.field(userProps, "stateSet_v1"), [s]);
        return true;
      }
    } catch (e:Dynamic) {}
    return false;
  }

  function hostIsConnected():Bool {
    return connected;
  }

  function hostGetDebug():Dynamic {
    return {
      connected: connected,
      orient: orient,
      moving: moving,
      state: state,
      location: location,
      hasUserProps: userProps != null
    };
  }

  function setLocation_v1(x:Float, y:Float, z:Float, o:Float):Void {
    location = [x, y, z];
    orient = o;
    bridge("setLocation", { x: x, y: y, z: z, orient: o });
  }

  function sendMessage_v1(name:String, arg:Dynamic, isAction:Bool):Void {
    if (isAction) bridge("action", { name: name, arg: arg });
    else bridge("message", { name: name, arg: arg });
  }
}
