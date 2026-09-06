# Avatar host SWF (Whirled2)

**License:** MIT (original Whirled2 code — not an AGPL copy).  
**Cache:** `?v=20260906bu`

## What this is

Tiny companion Flash host that Ruffle loads first. It `Loader`-loads the user’s avatar SWF and completes classic Whirled `controlConnect` on `contentLoaderInfo.sharedEvents`, so stock SDK avatars receive `appearanceChanged_v2` and play `state_*_walking` scenes.

## Build

```bash
cd tools/avatar-host
haxe -main AvatarHost -swf ../../assets/avatar-host/avatar-host.swf -D swf-header=220:280:24:000000 -swf-version 11
```

## EI API

`hostLoadUrl` · `hostLoadBytes` · `hostWalk` · `hostEmote` · `hostSetState` · `hostIsConnected` · `hostGetDebug`  
Bridge: `ExternalInterface.call("WhirledAvatarHostBridge", kind, payload)`.
