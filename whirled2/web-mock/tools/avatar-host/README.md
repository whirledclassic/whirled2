# Avatar host SWF (Whirled2)

**License:** MIT (original Whirled2 code — not an AGPL copy).  
**Cache:** `?v=20260906by`

## What this is

Tiny companion Flash host that Ruffle loads first (http URL). It loads the user’s avatar via **`Loader.loadBytes`** after JS sends base64 through EI `hostLoadBytes`, then completes classic Whirled `controlConnect` on `contentLoaderInfo.sharedEvents`, so stock SDK avatars receive `appearanceChanged_v2` and play `state_*_walking` scenes.

**Do not** pass `blob:` or `data:` URLs into nested `Loader.load` — they fail under Ruffle (blank stage). Use `hostLoadBytes` for IDB/blob Wear; `hostLoadUrl` only for http(s).

## Build

```bash
cd tools/avatar-host
haxe -main AvatarHost -swf ../../assets/avatar-host/avatar-host.swf -D swf-header=220:280:24:000000 -swf-version 11
```

## EI API

`hostLoadBytes` · `hostLoadBytesBegin` · `hostLoadBytesChunk` · `hostLoadBytesCommit` · `hostLoadUrl` · `hostWalk` · `hostSleep` · `hostSpoke` · `hostEmote` · `hostSetState` · `hostIsConnected` · `hostGetDebug`  
Bridge: `ExternalInterface.call("WhirledAvatarHostBridge", kind, payload)`.
