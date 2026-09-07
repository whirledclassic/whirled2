/* whirled2 staff desk ?v=20260907e — chrome only */
(function(){"use strict";if(window.__whirledStaffConsole)return;window.__whirledStaffConsole=true;
var RK="whirled2.roles",LK="whirled2.staffLog",NK="whirled2.newsletter",SK="whirled2.newsletterSubs";
var LEVEL={player:0,trainee:1,mod:2,admin:3,owner:4};
var LABEL={player:"Player",trainee:"Trainee mod",mod:"Moderator",admin:"Admin",owner:"Owner"};
var PERMS={trainee:"who mail staff warn mute overview help diag",mod:"who mail staff warn mute unmute kick lockroom announce overview help reports diag",admin:"who mail staff warn mute unmute kick lockroom announce overview help reports diag promote demote newsletter ban unban wipechat grant",owner:"*"};
function session(){try{return JSON.parse(localStorage.getItem("whirled2.session")||"null")}catch(e){return null}}
function me(){var s=session();return s&&s.user?s.user:null}
function loadR(){try{return JSON.parse(localStorage.getItem(RK)||"{}")}catch(e){return{}}}
function saveR(m){try{localStorage.setItem(RK,JSON.stringify(m||{}))}catch(e){}}
function priv(s){s=String(s||"").toLowerCase();return s==="test"||s==="admin"||s==="josh"||s==="joshua"}
function roleOf(id){id=String(id||"");if(!id)return"player";if(priv(id))return"owner";
try{var s=session();if(s&&s.user&&String(s.user.id)===id&&priv(s.user.name))return"owner"}catch(e){}
var r=loadR()[id];if(r==="owner"||r==="admin"||r==="mod"||r==="trainee")return r;
try{var a=JSON.parse(localStorage.getItem("whirled2.admins")||"[]");if(a.indexOf(id)>=0)return"admin"}catch(e2){}
return"player"}
function lv(id){return LEVEL[roleOf(id)]||0}
function can(cmd,id){id=id||(me()&&me().id);var n=roleOf(id);if(n==="owner")return true;return (" "+(PERMS[n]||"")+" ").indexOf(" "+cmd+" ")>=0}
function setLevel(id,role){id=String(id||"");if(!id)return false;if(priv(id)&&role!=="owner")return false;
var m=loadR();if(role==="player")delete m[id];else m[id]=role;saveR(m);
try{var a=JSON.parse(localStorage.getItem("whirled2.admins")||"[]");if(!Array.isArray(a))a=[];
if(role==="admin"||role==="owner"){if(a.indexOf(id)<0)a.push(id)}else a=a.filter(function(x){return x!==id});
localStorage.setItem("whirled2.admins",JSON.stringify(a))}catch(e){}
log("setrole",id+" -> "+role);return true}
function log(k,d){try{var rows=JSON.parse(localStorage.getItem(LK)||"[]");var u=me();
rows.unshift({at:new Date().toISOString(),by:u?u.name:"sys",kind:k,detail:String(d||"").slice(0,300)});
localStorage.setItem(LK,JSON.stringify(rows.slice(0,200)))}catch(e){}}
function J(k,f){try{return JSON.parse(localStorage.getItem(k)||JSON.stringify(f))}catch(e){return f}}
function S(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}
function findUser(q){q=String(q||"").trim().toLowerCase();if(!q)return null;var hits=[];
function add(id,name){if(id)hits.push({id:String(id),name:String(name||id)})}
try{var u=JSON.parse(localStorage.getItem("whirled2.users")||"{}");Object.keys(u).forEach(function(k){var x=u[k];if(x)add(x.id||k,x.name||k)})}catch(e){}
try{var s=session();if(s&&s.user)add(s.user.id,s.user.name)}catch(e2){}
for(var i=0;i<hits.length;i++)if(hits[i].id.toLowerCase()===q||hits[i].name.toLowerCase()===q)return hits[i];
for(var j=0;j<hits.length;j++)if(hits[j].name.toLowerCase().indexOf(q)>=0)return hits[j];
return{id:q,name:q}}
function toast(t){var el=document.getElementById("staff-toast");if(!el){el=document.createElement("div");el.id="staff-toast";document.body.appendChild(el)}
el.textContent=t;el.className="staff-toast is-on";clearTimeout(toast._t);toast._t=setTimeout(function(){el.className="staff-toast"},2800)}
function sys(t){try{var list=J("whirled2.chat.loft",[]);list.push({id:"sys"+Date.now(),who:"Staff",userId:"staff",text:String(t||""),at:new Date().toISOString(),system:true});S("whirled2.chat.loft",list.slice(-80))}catch(e){}toast(t)}
function mailOv(){var u=me();if(!u)return{unread:0,total:0,inbox:[]};var list=J("whirled2.mail",[]);if(!Array.isArray(list))list=[];
var inbox=list.filter(function(m){return String(m.toId)===String(u.id)});return{unread:inbox.filter(function(m){return!m.read}).length,total:inbox.length,inbox:inbox.slice(0,8)}}
function groupOv(){var list=J("whirled2.groups",[]);if(!Array.isArray(list))list=[];return list.map(function(g){return{id:g.id,name:g.name,members:(g.members&&g.members.length)||0}})}
function publishNews(title,body){var u=me(),list=J(NK,[]);list.unshift({id:"n"+Date.now().toString(36),title:String(title||"Update").slice(0,120),body:String(body||"").slice(0,2000),at:new Date().toISOString(),by:u?u.name:"Staff"});S(NK,list.slice(0,40));
var subs=J(SK,{}),mail=J("whirled2.mail",[]);Object.keys(subs).forEach(function(uid){if(!subs[uid])return;mail.unshift({id:"mn"+Date.now().toString(36)+uid.slice(0,3),fromId:"staff",fromName:"Whirled2 Newsletter",toId:uid,toName:uid,subject:title,body:body,at:new Date().toISOString(),read:false})});S("whirled2.mail",mail.slice(0,200));log("newsletter",title)}
function isSub(){var u=me();return !!(u&&J(SK,{})[u.id])}
function toggleSub(on){var u=me();if(!u)return false;var s=J(SK,{});if(on===false)delete s[u.id];else s[u.id]=true;S(SK,s);return!!s[u.id]}
function helpText(id){var n=roleOf(id),L=["You are "+LABEL[n]+" (level "+(LEVEL[n]||0)+").","/staff open desk","/overview mail+groups"];
if(can("warn",id))L.push("/warn name reason");if(can("mute",id))L.push("/mute name /unmute name");if(can("kick",id))L.push("/kick name");
if(can("announce",id))L.push("/announce text");if(can("newsletter",id))L.push("/newsletter title | body");
if(can("promote",id))L.push("/grant name trainee|mod|admin /demote name");if(can("ban",id))L.push("/ban /unban /wipechat");
L.push("Shortcut Ctrl+Shift+A or `");return L.join("\n")}
function diag(){var o=[],s=session();o.push(s&&s.user?"in:"+s.user.name:"out");o.push("role:"+roleOf(s&&s.user&&s.user.id));
try{o.push("mail:"+J("whirled2.mail",[]).length)}catch(e){o.push("mail:bad")}
try{o.push("groups:"+J("whirled2.groups",[]).length)}catch(e2){o.push("groups:bad")}
o.push(document.getElementById("stage-slot")?"stage:ok":"stage:miss");o.push(typeof window.WhirledApi==="object"?"api:ok":"api:miss");return o}
function run(raw){var text=String(raw||"").trim(),u=me();if(!u)return{ok:false,error:"Sign in first."};
var m=text.match(/^\/(\S+)\s*([\s\S]*)$/);if(!m)return{ok:false,error:"Not a command."};
var cmd=m[1].toLowerCase(),arg=(m[2]||"").trim();
if(cmd==="desk"||cmd==="panel"||cmd==="mods")cmd="staff";if(cmd==="news"||cmd==="nl")cmd="newsletter";if(cmd==="ov")cmd="overview";if(cmd==="setrole")cmd="grant";if(cmd==="promote")cmd="grant";
if(cmd==="help"||cmd==="staffhelp")return{ok:true,info:helpText(u.id)};
if(cmd==="staff"&&!arg){openDesk();return{ok:true,info:"Opened staff desk."}}
var gate=cmd==="grant"||cmd==="demote"?"promote":cmd;
if(!can(gate,u.id)&&cmd!=="staff")return{ok:false,error:lv(u.id)<1?"Staff only. Owner: /grant Name trainee":"Level "+LABEL[roleOf(u.id)]+" cannot /"+cmd};
if(cmd==="who")return{ok:true,info:"Local occupants — check the room list."};
if(cmd==="overview"||cmd==="mail"){var mo=mailOv(),go=groupOv();return{ok:true,info:"Mail "+mo.unread+" unread / "+mo.total+". Groups: "+(go.map(function(g){return g.name+" ("+g.members+")"}).join(", ")||"none")}}
if(cmd==="warn"){var p=arg.split(/\s+/),t=findUser(p.shift());if(!t)return{ok:false,error:"Usage: /warn name reason"};var w=J("whirled2.warns",{});w[t.id]=(w[t.id]||0)+1;S("whirled2.warns",w);log("warn",t.name);sys(t.name+" warned ("+w[t.id]+").");return{ok:true,info:"Warned "+t.name}}
if(cmd==="mute"){var t2=findUser(arg);if(!t2)return{ok:false,error:"Usage: /mute name"};var mu=J("whirled2.mutes",{});mu[t2.id]=Date.now()+18e5;S("whirled2.mutes",mu);sys(t2.name+" muted 30m.");return{ok:true,info:"Muted "+t2.name}}
if(cmd==="unmute"){var t3=findUser(arg),mu2=J("whirled2.mutes",{});if(t3)delete mu2[t3.id];S("whirled2.mutes",mu2);return{ok:true,info:"Unmuted"}}
if(cmd==="kick"){var t4=findUser(arg);if(!t4)return{ok:false,error:"Usage: /kick name"};sys(t4.name+" asked to leave.");return{ok:true,info:"Kick noted"}}
if(cmd==="ban"||cmd==="unban"){var t5=findUser(arg),b=J("whirled2.bans",{});if(cmd==="ban"&&t5)b[t5.id]={at:Date.now()};if(cmd==="unban"&&t5)delete b[t5.id];S("whirled2.bans",b);return{ok:true,info:cmd+" "+(t5?t5.name:arg)}}
if(cmd==="announce"){if(!arg)return{ok:false,error:"Usage: /announce text"};sys("ANNOUNCE: "+arg);return{ok:true,info:"Announced"}}
if(cmd==="newsletter"){if(!arg)return{ok:false,error:"Usage: /newsletter title | body"};var bits=arg.split("|");publishNews((bits.shift()||"Update").trim(),bits.join("|").trim());return{ok:true,info:"Newsletter mailed to subscribers"}}
if(cmd==="grant"){var b2=arg.split(/\s+/),who=findUser(b2.shift()),role=(b2.shift()||"trainee").toLowerCase();if(!who)return{ok:false,error:"Usage: /grant name trainee|mod|admin"};
if(role==="admin"&&roleOf(u.id)!=="owner")return{ok:false,error:"Only owner grants admin"};
if(["trainee","mod","admin","player"].indexOf(role)<0)return{ok:false,error:"Roles: trainee mod admin player"};
setLevel(who.id,role);return{ok:true,info:who.name+" is now "+LABEL[role]}}
if(cmd==="demote"){var who2=findUser(arg);if(!who2)return{ok:false,error:"Usage: /demote name"};if(roleOf(who2.id)==="owner")return{ok:false,error:"Cannot demote owner"};if(roleOf(who2.id)==="admin"&&roleOf(u.id)!=="owner")return{ok:false,error:"Only owner demotes admin"};setLevel(who2.id,"player");return{ok:true,info:who2.name+" is Player"}}
if(cmd==="wipechat"){S("whirled2.chat.loft",[]);return{ok:true,info:"Chat wiped"}}
if(cmd==="diag")return{ok:true,info:diag().join(" · ")};
if(cmd==="lockroom"){try{localStorage.setItem("whirled2.roomLock",arg==="off"?"0":"1")}catch(e){}return{ok:true,info:"Lock "+(arg==="off"?"off":"on")}}
return{ok:false,error:"Unknown /"+cmd+" — /staffhelp"}}
function esc(s){return String(s||"").replace(/[&<>"']/g,function(c){return({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]})}
function deskHtml(){var u=me(),role=u?roleOf(u.id):"player",mo=mailOv(),go=groupOv(),news=J(NK,[]).slice(0,4),logs=J(LK,[]).slice(0,8),users=[];
try{var raw=JSON.parse(localStorage.getItem("whirled2.users")||"{}");Object.keys(raw).forEach(function(k){var x=raw[k];if(x)users.push({id:x.id||k,name:x.name||k})})}catch(e){}
if(u)users.unshift({id:u.id,name:u.name});var seen={};users=users.filter(function(x){if(seen[x.id])return false;seen[x.id]=true;return true});
var userRows=users.slice(0,20).map(function(x){var r=roleOf(x.id);return'<div class="sd-user"><b>'+esc(x.name)+"</b> <code>"+esc(x.id)+'</code> <span class="sd-pill sd-'+r+'">'+esc(LABEL[r])+"</span>"+(can("promote")?'<span class="sd-acts"><button type="button" data-sd-role="'+esc(x.id)+'" data-role="trainee">Trainee</button><button type="button" data-sd-role="'+esc(x.id)+'" data-role="mod">Mod</button>'+(roleOf(u&&u.id)==="owner"?'<button type="button" data-sd-role="'+esc(x.id)+'" data-role="admin">Admin</button>':"")+'<button type="button" data-sd-role="'+esc(x.id)+'" data-role="player">Player</button></span>':"")+"</div>"}).join("")||'<p class="sd-empty">No local users yet.</p>';
var mailRows=mo.inbox.map(function(m){return'<div class="sd-mail'+(m.read?"":" is-unread")+'"><b>'+esc(m.subject)+"</b> from "+esc(m.fromName)+"</div>"}).join("")||'<p class="sd-empty">Inbox empty.</p>';
var groupRows=go.map(function(g){return"<li><b>"+esc(g.name)+"</b> · "+g.members+" members</li>"}).join("")||"<li>Groups tab → create one.</li>";
var newsRows=news.map(function(n){return"<li><b>"+esc(n.title)+"</b></li>"}).join("")||"<li>None yet.</li>";
var logRows=logs.map(function(l){return"<li>"+esc((l.at||"").slice(11,19))+" <b>"+esc(l.kind)+"</b> "+esc(l.detail)+"</li>"}).join("")||"<li>Quiet.</li>";
return'<div class="sd-head"><strong>Staff desk</strong><span class="sd-pill sd-'+role+'">'+esc(LABEL[role])+'</span><button type="button" class="sd-x" data-sd-close="1">×</button></div><p class="sd-lead">Trainee: overview/warn/mute. Mod: kick/announce. Admin: newsletter + grant trainee/mod. Owner: grant admin.</p><div class="sd-grid"><section><h3>Mail</h3><p>'+mo.unread+" unread / "+mo.total+"</p>"+mailRows+"</section><section><h3>Groups</h3><ul>"+groupRows+"</ul></section><section><h3>Newsletter</h3><ul>"+newsRows+"</ul>"+(can("newsletter")?'<form id="sd-news"><input name="title" placeholder="Title"/><textarea name="body" placeholder="Body"></textarea><button type="submit">Send issue</button></form>':"")+'<button type="button" class="sd-sub" data-sd-sub="1">'+(isSub()?"Unsubscribe me":"Subscribe me")+'</button></section><section class="sd-span"><h3>People</h3>'+userRows+'</section><section class="sd-span"><h3>Log</h3><ul>'+logRows+'</ul></section></div><form id="sd-cmd"><input name="cmd" placeholder="/grant Name trainee" autocomplete="off"/><button type="submit">Run</button></form><pre class="sd-out" id="sd-out">'+esc(helpText(u&&u.id))+"</pre>"}
function ensure(){var w=document.getElementById("staff-desk");if(w)return w;w=document.createElement("aside");w.id="staff-desk";w.setAttribute("hidden","");document.body.appendChild(w);return w}
function openDesk(){var u=me();if(!u){toast("Sign in first.");return}if(lv(u.id)<1&&!priv(u.name)&&!priv(u.id)){toast("Not staff.");return}
var w=ensure();w.innerHTML=deskHtml();w.removeAttribute("hidden");w.classList.add("is-open")}
function closeDesk(){var w=document.getElementById("staff-desk");if(!w)return;w.setAttribute("hidden","");w.classList.remove("is-open")}
function writeOut(msg){var o=document.getElementById("sd-out");if(o)o.textContent=msg;toast(String(msg||"").split("\n")[0])}
function intercept(text){if(!/^\//.test(text))return false;var cmd=(text.match(/^\/(\S+)/)||[])[1]||"";
var ok={staff:1,desk:1,panel:1,staffhelp:1,overview:1,ov:1,grant:1,promote:1,setrole:1,demote:1,warn:1,mute:1,unmute:1,kick:1,ban:1,unban:1,announce:1,newsletter:1,news:1,nl:1,wipechat:1,diag:1,lockroom:1,mods:1};
if(!ok[cmd.toLowerCase()])return false;var res=run(text);writeOut(res.ok?res.info:res.error);if(res.ok&&(cmd==="staff"||cmd==="desk"))openDesk();return true}
document.addEventListener("submit",function(ev){var t=ev.target;if(!t)return;
if(t.id==="chat-form"){var input=document.getElementById("chat-input")||t.querySelector("input");var val=input?String(input.value||"").trim():"";if(val&&intercept(val)){ev.preventDefault();ev.stopPropagation();if(input)input.value=""}}
if(t.id==="sd-cmd"){ev.preventDefault();var c=String((new FormData(t)).get("cmd")||"").trim();if(!c)return;if(c.charAt(0)!=="/")c="/"+c;var res=run(c);openDesk();writeOut(res.ok?res.info:res.error)}
if(t.id==="sd-news"){ev.preventDefault();var fd=new FormData(t);publishNews(fd.get("title"),fd.get("body"));openDesk();writeOut("Newsletter sent.")}},true);
document.addEventListener("click",function(ev){var t=ev.target;if(!t||!t.closest)return;if(t.closest("[data-sd-close]")){closeDesk();return}
var rb=t.closest("[data-sd-role]");if(rb){var res=run("/grant "+rb.getAttribute("data-sd-role")+" "+rb.getAttribute("data-role"));openDesk();writeOut(res.ok?res.info:res.error);return}
if(t.closest("[data-sd-sub]")){var on=toggleSub(!isSub());openDesk();writeOut(on?"Subscribed.":"Unsubscribed.")}});
document.addEventListener("keydown",function(ev){if((ev.ctrlKey&&ev.shiftKey&&(ev.key==="A"||ev.key==="a"))||(ev.key==="`"&&ev.target&&!/input|textarea|select/i.test(ev.target.tagName))){ev.preventDefault();var w=document.getElementById("staff-desk");if(w&&w.classList.contains("is-open"))closeDesk();else openDesk()}});
function inject(){var nav=document.querySelector(".me-subnav,.me-links,.topbar");if(!nav||nav.querySelector("[data-open-staff]"))return;var u=me();if(!u||lv(u.id)<1)return;
var b=document.createElement("button");b.type="button";b.className="me-link";b.setAttribute("data-open-staff","1");b.textContent="Staff";b.onclick=function(e){e.preventDefault();openDesk()};nav.appendChild(b)}
function heal(){try{if(!Array.isArray(J("whirled2.groups",[])))S("whirled2.groups",[])}catch(e){S("whirled2.groups",[])}
try{if(!Array.isArray(J("whirled2.mail",[])))S("whirled2.mail",[])}catch(e2){S("whirled2.mail",[])}
var u=me();if(u&&(priv(u.id)||priv(u.name)))setLevel(u.id,"owner")}
window.WhirledStaff={roleOf:roleOf,levelOf:lv,can:can,setLevel:setLevel,runCommand:run,openDesk:openDesk,diag:diag,mailOverview:mailOv,publishNews:publishNews};
document.addEventListener("whirled:ready",function(){heal();inject()});setInterval(inject,2000);
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",heal);else heal();
})();
