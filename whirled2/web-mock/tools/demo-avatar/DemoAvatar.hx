/**
 * Whirled2 Flash QA demo avatar — ORIGINAL MIT stub (not AGPL).
 * Mimics AvatarControl handshake:
 *   dispatch controlConnect on loaderInfo.sharedEvents with userProps.appearanceChanged_v2
 * Beginner (?v=20260906ck): blue idle → green continuous walk cycle when hostWalk/moving.
 * ENGINE DEV: ConnectBag carries public props (plain Event dynamic props fail under Ruffle).
 * Also registers ExternalInterface hostWalk so DIRECT remount (no nest) still animates.
 */
import flash.display.Sprite;
import flash.events.Event;
import flash.external.ExternalInterface;

/** ConnectEvent-shaped carrier — props must be a real field, not a dynamic Event bag. */
class ConnectBag extends Event {
  public var props:Dynamic;
  public function new(p:Dynamic) {
    super("controlConnect", true, false);
    this.props = p;
  }
}

class DemoAvatar extends Sprite {
  var body:Sprite;
  var legL:Sprite;
  var legR:Sprite;
  var armL:Sprite;
  var armR:Sprite;
  var head:Sprite;
  var torso:Sprite;
  var walking:Bool = false;
  var orient:Float = 180;
  var phase:Float = 0;
  var eiReady:Bool = false;

  static function main() {
    flash.Lib.current.addChild(new DemoAvatar());
  }

  public function new() {
    super();
    body = new Sprite();
    head = new Sprite();
    torso = new Sprite();
    legL = new Sprite();
    legR = new Sprite();
    armL = new Sprite();
    armR = new Sprite();
    body.addChild(torso);
    body.addChild(legL);
    body.addChild(legR);
    body.addChild(armL);
    body.addChild(armR);
    body.addChild(head);
    addChild(body);
    // Hotspot-ish: figure centered near bottom of 220x280 stage
    body.x = 110;
    body.y = 200;
    drawIdleParts();
    addEventListener(Event.ADDED_TO_STAGE, onAdded);
    addEventListener(Event.ENTER_FRAME, onFrame);
  }

  function onAdded(_e:Event):Void {
    removeEventListener(Event.ADDED_TO_STAGE, onAdded);
    tryRegisterEi();
    tryConnect();
    // Retry connect a few times — nest Loader may attach sharedEvents slightly later
    haxe.Timer.delay(tryConnect, 40);
    haxe.Timer.delay(tryConnect, 120);
    haxe.Timer.delay(tryConnect, 320);
  }

  function tryRegisterEi():Void {
    if (eiReady) return;
    if (!ExternalInterface.available) return;
    try {
      // DIRECT remount path: JS callHostWalk / tryCallIntoSwf hits these on outer player.
      ExternalInterface.addCallback("hostWalk", eiHostWalk);
      ExternalInterface.addCallback("hostSleep", eiHostSleep);
      ExternalInterface.addCallback("hostEmote", eiHostEmote);
      ExternalInterface.addCallback("hostIsConnected", function() return true);
      ExternalInterface.addCallback("setMoving", function(m:Bool) { setWalking(m); return true; });
      ExternalInterface.addCallback("appearanceChanged_v2", appearanceChanged_v2);
      ExternalInterface.addCallback("setBodyState", function(s:String) {
        setWalking(s != null && (s.toLowerCase().indexOf("walk") >= 0 || s.toLowerCase() == "moving"));
        return true;
      });
      eiReady = true;
      try { ExternalInterface.call("WhirledAvatarHostBridge", "demo_ei_ready", true); } catch (e0:Dynamic) {}
    } catch (e:Dynamic) {}
  }

  function eiHostWalk(isMoving:Bool, newOrient:Float, locX:Dynamic = null):Bool {
    if (newOrient == newOrient) orient = newOrient;
    setWalking(isMoving);
    return true;
  }
  function eiHostSleep(_s:Bool):Bool { return true; }
  function eiHostEmote(_n:String):Bool {
    try {
      body.alpha = 0.45;
      haxe.Timer.delay(function() { body.alpha = 1; }, 200);
    } catch (e:Dynamic) {}
    return true;
  }

  function tryConnect():Void {
    try {
      var root = flash.Lib.current;
      var li = root.loaderInfo;
      if (li == null) return;
      var userProps:Dynamic = {};
      Reflect.setField(userProps, "appearanceChanged_v2", appearanceChanged_v2);
      Reflect.setField(userProps, "appearanceChanged_v1", appearanceChanged_v1);
      Reflect.setField(userProps, "gotControl_v1", function() {});
      Reflect.setField(userProps, "messageReceived_v1", function(name:String, _arg:Dynamic, _isAction:Bool) {
        eiHostEmote(name);
      });
      Reflect.setField(userProps, "getActions_v1", function() return ["Wave"]);
      Reflect.setField(userProps, "getStates_v1", function() return ["Default"]);
      // Club AbstractControl ConnectEvent shape: event.props.userProps / hostProps
      var bag:Dynamic = {};
      Reflect.setField(bag, "userProps", userProps);
      // CRITICAL (?v=20260906ck): subclass with public props field — dynamic Event props drop under Ruffle.
      var e = new ConnectBag(bag);
      li.sharedEvents.dispatchEvent(e);
    } catch (e:Dynamic) {}
  }

  function appearanceChanged_v2(loc:Array<Dynamic>, o:Float, moving:Bool, _sleeping:Bool):Void {
    if (o == o) orient = o;
    setWalking(moving);
  }

  function appearanceChanged_v1(loc:Array<Dynamic>, o:Float, moving:Bool):Void {
    appearanceChanged_v2(loc, o, moving, false);
  }

  function setWalking(m:Bool):Void {
    walking = m;
    if (!walking) {
      phase = 0;
      drawIdleParts();
    } else {
      drawWalkParts();
    }
    applyOrient();
  }

  function applyOrient():Void {
    // Orient < 180 faces left (uravatar Body parity)
    body.scaleX = (orient < 180) ? -1 : 1;
  }

  function onFrame(_e:Event):Void {
    if (!walking) return;
    phase += 0.35;
    var swing = Math.sin(phase) * 22;
    var bob = Math.abs(Math.sin(phase)) * 4;
    try {
      legL.rotation = -swing;
      legR.rotation = swing;
      armL.rotation = swing * 0.7;
      armR.rotation = -swing * 0.7;
      body.y = 200 - bob;
    } catch (e:Dynamic) {}
  }

  function paintStick(colHead:Int, colLine:Int):Void {
    head.graphics.clear();
    head.graphics.beginFill(colHead);
    head.graphics.drawCircle(0, -90, 22);
    head.graphics.endFill();
    torso.graphics.clear();
    torso.graphics.lineStyle(8, colLine);
    torso.graphics.moveTo(0, -68);
    torso.graphics.lineTo(0, -20);
    legL.graphics.clear();
    legL.graphics.lineStyle(8, colLine);
    legL.graphics.moveTo(0, 0);
    legL.graphics.lineTo(-4, 40);
    legL.x = 0;
    legL.y = -20;
    legR.graphics.clear();
    legR.graphics.lineStyle(8, colLine);
    legR.graphics.moveTo(0, 0);
    legR.graphics.lineTo(4, 40);
    legR.x = 0;
    legR.y = -20;
    armL.graphics.clear();
    armL.graphics.lineStyle(8, colLine);
    armL.graphics.moveTo(0, 0);
    armL.graphics.lineTo(-20, 22);
    armL.x = 0;
    armL.y = -55;
    armR.graphics.clear();
    armR.graphics.lineStyle(8, colLine);
    armR.graphics.moveTo(0, 0);
    armR.graphics.lineTo(20, 22);
    armR.x = 0;
    armR.y = -55;
  }

  function drawIdleParts():Void {
    paintStick(0x4aa3df, 0x2b6ea8);
    legL.rotation = 10;
    legR.rotation = -10;
    armL.rotation = 0;
    armR.rotation = 0;
    body.y = 200;
    applyOrient();
  }

  function drawWalkParts():Void {
    // Green walk palette — continuous ENTER_FRAME swings legs (not a static pose).
    paintStick(0x5ecf8a, 0x2b8a55);
    applyOrient();
  }
}
