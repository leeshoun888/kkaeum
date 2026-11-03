import{r as e}from"./rolldown-runtime-XKyaHtl9.js";import{A as t,C as n,D as r,E as i,N as a,O as o,S as s,T as c,_ as l,a as u,b as d,c as f,d as p,f as m,g as h,h as g,i as _,k as v,l as ee,m as te,n as ne,o as re,p as ie,r as ae,s as y,t as oe,u as b,v as se,w as x,x as S,y as C}from"./three-D7uax-Lj.js";import{w as ce}from"./index-PQavTMEt.js";var w=e(a(),1),T=t();function le(e){let t=e.sig;return{co2:e.co2,recirc:t.recirculation,fan:t.fanSpeed,setTemp:t.setTempC,cabinTemp:t.cabinTempC??t.setTempC,occupants:Math.max(1,Math.min(4,Math.round(t.occupants||1))),ambColor:t.ambient?.color??`#3CF2C8`,ambBright:t.ambient?.brightness??40,recline:t.seatRecline??12,seatVent:t.seatVentDriver??0,window:t.windowOpenPct??0,speed:t.speedKph,kss:e.est.kss,level:e.est.level,mode:e.mode,live:!0}}var E=(e,t,n)=>{let r=Math.min(1,Math.max(0,(n-e)/(t-e)));return r*r*(3-2*r)};function D(e){let t=e%26/26,n=t<.52,r;r=n?650+2350*E(.02,.5,t):3e3-2200*(1-(1-(t-.52)/.48)**3);let i=n?4+3.6*E(.18,.5,t):7.6-3.6*E(.55,.85,t),a=i>=8?4:i>=7?3:i>=6?2:+(i>=5);return{co2:r,recirc:n,fan:n?2:6,setTemp:22,cabinTemp:n?23.2+t*1.5:22.4,occupants:2,ambColor:`#3CF2C8`,ambBright:55,recline:12,seatVent:n?0:2,window:0,speed:96,kss:i,level:a,mode:`driving`,live:!1}}var O=()=>performance.now()/1e3;function ue(){let e=ce.getState().snap;return e?le(e):D(O())}var k=[[0,`#3CF2C8`],[1e3,`#3CF2C8`],[2e3,`#FFD04A`],[3500,`#FF9A3C`],[5e3,`#FF3B4F`]],A=k.map(([e,t])=>[e,new g(t)]);function de(e,t){for(let n=0;n<A.length-1;n++){let[r,i]=A[n],[a,o]=A[n+1];if(e<=a)return t.lerpColors(i,o,Math.max(0,(e-r)/(a-r)))}return t.copy(A[A.length-1][1])}function fe(e){for(let t=0;t<k.length-1;t++){let[n,r]=k[t],[i,a]=k[t+1];if(e<=i){let t=Math.max(0,(e-n)/(i-n)),o=parseInt(r.slice(1),16),s=parseInt(a.slice(1),16),c=e=>Math.round((o>>e&255)+((s>>e&255)-(o>>e&255))*t);return`rgb(${c(16)}, ${c(8)}, ${c(0)})`}}return k[k.length-1][1]}var pe=[`#3CF2C8`,`#9BE15D`,`#FFD04A`,`#FF9A3C`,`#FF3B4F`].map(e=>new g(e)),j=new g(`#3CF2C8`),M=new g(`#5AB8FF`),N=new g(`#FF9A5A`),P=new g(`#EAF4FF`),F=new g(`#9FE8FF`),I=new g(`#9B8CFF`),me=new g(`#5AB8FF`),he=2.42,L=6.5,R=[1.54,-1.595],ge=.385,_e=.385,z=.48,ve=.855;function ye(e,t){let n=e.length,r=[],i=Array(n).fill(0);for(let i=0;i<n-1;i++)r[i]=(t[i+1]-t[i])/(e[i+1]-e[i]);i[0]=r[0],i[n-1]=r[n-2];for(let e=1;e<n-1;e++)i[e]=r[e-1]*r[e]<=0?0:(r[e-1]+r[e])/2;for(let e=0;e<n-1;e++){if(r[e]===0){i[e]=0,i[e+1]=0;continue}let t=i[e]/r[e],n=i[e+1]/r[e],a=t*t+n*n;if(a>9){let o=3/Math.sqrt(a);i[e]=o*t*r[e],i[e+1]=o*n*r[e]}}return r=>{if(r<=e[0])return t[0];if(r>=e[n-1])return t[n-1];let a=0;for(;r>e[a+1];)a++;let o=e[a+1]-e[a],s=(r-e[a])/o,c=s*s,l=c*s;return(2*l-3*c+1)*t[a]+(l-2*c+s)*o*i[a]+(-2*l+3*c)*t[a+1]+(l-c)*o*i[a+1]}}var B=[[-2.42,.86],[-2.405,.94],[-2.382,1.023],[-2.309,1.107],[-2.205,1.237],[-1.913,1.482],[-1.704,1.613],[-1.547,1.655],[-1.2,1.672],[-.712,1.676],[.019,1.67],[.384,1.655],[.645,1.514],[.958,1.336],[1.272,1.19],[1.689,1.065],[2.055,.971],[2.336,.898],[2.42,.835]],V=ye(B.map(e=>e[0]),B.map(e=>e[1]));function H(e){let t=Math.abs(e);if(t>=z)return-1/0;let n=z*.6;return t<=n?.8266:ge+z*(.92-.55*((t-n)/.192)**1.5)}function be(e){let t=.22+.06*E(2,2.42,e)+.2*E(1.9,2.42,-e);for(let n of R)t=Math.max(t,H(e-n));return t}var xe=e=>.985*(1-.07*E(1.55,2.42,e)-.04*E(1.7,2.42,-e)),U=e=>1-.27*E(1.13,1.62,e);function W(e){let t=Math.min(1,Math.abs(e)/he),n=Math.max(.02,Math.sqrt(1-t**(e<0?34:22))),r=Math.max(.02,Math.sqrt(1-t**(e<0?14:12))),i=V(e),a=be(e);return{top:i,bot:a,cy:(i+a)/2,b:(i-a)/2*n,a:xe(e)*r}}function G(e,t){let n=W(e),r=Math.min(1,Math.max(-1,(t-n.cy)/n.b)),i=Math.abs(r)**(L/2),a=Math.sqrt(Math.max(0,1-i*i));return n.a*a**(2/L)*U(t)}function K(e,t,n){let r=W(e),i=Math.cos(t),a=Math.sin(t),o=r.cy+r.b*Math.sign(a)*Math.abs(a)**(2/L),s=r.a*Math.sign(i)*Math.abs(i)**(2/L)*U(o);return n.set(e,o,s)}function q(e,t,n){let r=n?-1:1;for(let i=n?he:-2.42;Math.abs(i)>1.6;i+=r*.002){let n=W(i);if(e>n.bot&&e<n.top&&G(i,e)>=Math.abs(t))return i}return n?1.6:-1.6}function Se(e=170,t=80){let n=new Float32Array(e*t*3),r=new v;for(let i=0;i<e;i++){let a=-2.42*Math.cos(Math.PI*i/(e-1));for(let e=0;e<t;e++){K(a,Math.PI*2*e/t,r);let o=(i*t+e)*3;n[o]=r.x,n[o+1]=r.y,n[o+2]=r.z}}let i=[];for(let n=0;n<e-1;n++)for(let e=0;e<t;e++){let r=n*t+e,a=(n+1)*t+e,o=n*t+(e+1)%t,s=(n+1)*t+(e+1)%t;i.push(r,a,o,a,s,o)}let a=new p;return a.setAttribute(`position`,new b(n,3)),a.setIndex(i),a.computeVertexNormals(),a.computeBoundingSphere(),a}function Ce(){let e=[],t=[],n=(e,t,n=!1)=>{for(let n=0;n<t.length-1;n++)e.push(t[n].x,t[n].y,t[n].z,t[n+1].x,t[n+1].y,t[n+1].z);if(n&&t.length>2){let n=t[t.length-1],r=t[0];e.push(n.x,n.y,n.z,r.x,r.y,r.z)}},r=1.006,i=(e,t,n)=>new v(e,t,n*G(e,t)*r),a=(e,t,r,a,o,s,c=24)=>{let l=[];for(let e=0;e<=c;e++)l.push(i(t+(a-t)*e/c,r+(o-r)*e/c,s));n(e,l)};for(let e of[-2.1,-1.6,-1,-.4,.2,.8,1.4,2]){let r=[];for(let t=0;t<=64;t++)r.push(K(e,Math.PI*2*t/64,new v));n(t,r)}for(let e of[Math.PI/2,.42,Math.PI-.42,-.28,Math.PI+.28,1.05,Math.PI-1.05]){let i=[];for(let t=0;t<=120;t++){let n=K(-2.42*.985*Math.cos(Math.PI*t/120),e,new v);i.push(n.setZ(n.z*r))}n(t,i)}let o=e=>V(e)-.07,s=.2;for(let e=.2;e<1.4;e+=.005)o(e)>1.18&&(s=e);for(let r of[-1,1]){let c=[];for(let e=-2.3;e<=1;e+=.04)c.push(i(e,1.14,r));n(e,c);let l=[];for(let e=-1.2;e<=s;e+=.04)l.push(i(e,1.1749999999999998,r));for(let e=s;e>=-1.3;e-=.03)l.push(i(e,Math.max(1.1749999999999998,o(e)),r));n(e,l,!0);for(let[t,a]of[[-.16,.045]])for(let s of[-a,a]){let a=t+s,c=[];for(let e=1.1749999999999998;e<=o(a);e+=.03)c.push(i(a,e,r));c.push(i(a,o(a),r)),n(e,c)}let u=[];for(let e=2.32;e>=1.27;e-=.03)u.push(i(e,V(e)-.045,r));n(e,u),a(e,1.05,.52,-1.1,.9,r,40),a(t,-1.1,.9,-1.2,.9,r,4);for(let[e,n]of[[1.07,1.02],[-.16,-.18],[-1.06,-1.3]])a(t,e,.47,n,1.13,r,12);for(let t of R){let a=[];for(let e=0;e<=48;e++){let n=-.48+2*z*e/48,o=Math.max(H(n*.999)+.035,.44);a.push(i(t+n*1.05,o,r))}n(e,a)}a(t,-1.05,.34,1,.34,r,30);let d=r*(G(1.2,1.2)+.02),f=r*.17;n(e,[[1.26,1.19,d],[1.26,1.3,d],[1.14,1.31,d+f],[1.12,1.21,d+f]].map(([e,t,n])=>new v(e,t,n)),!0)}let c=[];for(let e=-.72;e<=.72;e+=.06)c.push(new v(-1.66,1.665,e));n(e,c),c.length=0;for(let e=-.72;e<=.72;e+=.06)c.push(new v(-1.86,1.6,e));n(e,c);for(let r of[1.2,1.08,.96]){let i=[];for(let e=-.84;e<=.84;e+=.04)i.push(new v(q(r,e,!1)-.004,r,e));n(r===1.2?e:t,i)}for(let[r,i,a]of[[.865,.82,e],[.56,.6,t],[.44,.66,t]]){let e=[];for(let t=-i;t<=i+1e-6;t+=.04)e.push(new v(q(r,t,!0)+.004,r,t));n(a,e)}let u=e=>{let t=new p;return t.setAttribute(`position`,new l(e,3)),t};return[u(e),u(t)]}function J(e){let t=[],n=(n,r)=>{let i=q(n,r,e)+(e?.006:-.006),a=.034/2,o=[i,n-a,r-a],s=[i,n-a,r+a],c=[i,n+a,r+a],l=[i,n+a,r-a];t.push(...o,...s,...c,...o,...c,...l)},r=(e,t,r,i,a)=>{for(let o=0;o<t;o++)for(let t=0;t<i;t++)n(e+o*.046,a*(r+t*.046))};for(let t of[-1,1])if(e)r(.77,3,.52,7,t);else{r(1,2,.48,8,t);for(let e=-.42;e<=.42+1e-6;e+=.046)t===1&&n(1.023,e)}let i=new p;return i.setAttribute(`position`,new l(t,3)),i}function we(){let e=[],t=1.0899999999999999,n=e=>G(e,t)*.88;for(let t=.62;t>=-.62;t-=.155)e.push(new v(.86,1.0399999999999998,t));for(let r=.62;r>=-1.85;r-=.31)e.push(new v(r,t,-n(r)));for(let t=-.5;t<=.5;t+=.25)e.push(new v(-2.02,1.1099999999999999,t));for(let r=-1.85;r<=.62;r+=.31)e.push(new v(r,t,n(r)));return new r(new ie(e,!0,`centripetal`),260,.012,6,!0)}var Te=`
varying vec3 vWorld;
varying vec3 vN;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorld = wp.xyz;
  vN = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * wp;
}`,Ee=`
uniform vec3 uTint;
uniform vec3 uRim;
uniform float uBase;
uniform float uFade;
uniform float uScan;
uniform float uScanAmt;
varying vec3 vWorld;
varying vec3 vN;
void main() {
  vec3 N = normalize(vN);
  vec3 V = normalize(cameraPosition - vWorld);
  float ndv = dot(N, V);
  N *= sign(ndv);
  float f = pow(1.0 - abs(ndv), 3.0);
  vec3 R = reflect(-V, N);
  float spec = pow(max(dot(R, normalize(vec3(0.25, 1.0, 0.35))), 0.0), 48.0);
  float spec2 = pow(max(dot(R, normalize(vec3(-0.8, 0.35, -0.5))), 0.0), 90.0);
  float scan = exp(-pow((vWorld.x - uScan) * 7.0, 2.0)) * uScanAmt;
  vec3 col = uTint + uRim * (f * 1.35 + scan * 0.7) + vec3(0.85, 0.95, 1.0) * (spec * 0.55 + spec2 * 0.35);
  float a = uBase + f * 0.6 + spec * 0.45 + spec2 * 0.3 + scan * 0.12;
  gl_FragColor = vec4(col, clamp(a, 0.0, 1.0) * uFade);
  #include <colorspace_fragment>
}`,De=`
varying vec3 vN;
varying vec3 vV;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vN = normalize(normalMatrix * normal);
  vV = -mv.xyz;
  gl_Position = projectionMatrix * mv;
}`,Oe=`
uniform vec3 uColor;
uniform float uIntensity;
varying vec3 vN;
varying vec3 vV;
void main() {
  float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.0);
  vec3 col = uColor * (0.14 + f * 1.25) * uIntensity;
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}`,Y=`
uniform vec3 uColor;
varying float vAlpha;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c);
  if (d > 0.5) discard;
  float a = pow(smoothstep(0.5, 0.0, d), 1.6) * vAlpha;
  gl_FragColor = vec4(uColor, a);
  #include <colorspace_fragment>
}`,ke=`
attribute vec4 aSeed;
uniform float uClock;
uniform float uFrac;
uniform float uOpacity;
uniform float uSize;
uniform float uViewH;
uniform vec3 uMin;
uniform vec3 uMax;
varying float vAlpha;
vec3 flow(vec3 p, float t) {
  return vec3(
    sin(p.y * 2.1 + t * 0.7) + cos(p.z * 1.7 - t * 0.5),
    sin(p.z * 2.3 + t * 0.6) + cos(p.x * 1.3 + t * 0.4),
    sin(p.x * 1.9 - t * 0.8) + cos(p.y * 2.7 + t * 0.3));
}
void main() {
  float t = uClock + aSeed.w * 40.0;
  vec3 q = aSeed.xyz * 6.2831;
  vec3 d = flow(q, t) * 0.035 + flow(q * 1.9 + 3.1, t * 1.4) * 0.015;
  vec3 p = fract(aSeed.xyz + d + vec3(-uClock * 0.006, uClock * 0.0025, uClock * 0.0015));
  vec3 pos = mix(uMin, uMax, p);
  pos.z *= 1.0 - 0.24 * smoothstep(1.1, 1.6, pos.y);
  float edge = min(min(min(p.x, 1.0 - p.x), min(p.y, 1.0 - p.y)), min(p.z, 1.0 - p.z));
  float vis = step(aSeed.w, uFrac);
  float tw = 0.65 + 0.35 * sin(t * 2.3 + aSeed.x * 20.0);
  vAlpha = uOpacity * vis * smoothstep(0.0, 0.08, edge) * tw;
  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mv;
  float sz = uSize * (0.55 + 0.9 * fract(aSeed.w * 7.31));
  gl_PointSize = vis * sz * projectionMatrix[1][1] * uViewH * 0.5 / -mv.z;
}`,Ae=`
attribute vec4 aLane;   // x: lateral -1..1, y: spread 0..1, z: phase, w: rand
attribute float aTrail; // 0 head .. 1 tail
uniform float uFlow;
uniform float uMix;     // 0 fresh .. 1 recirculation
uniform float uWindow;  // 0..1
uniform float uAlpha;
uniform float uSize;
uniform float uViewH;
varying float vAlpha;
void main() {
  float sp = 0.75 + 0.5 * aLane.w;
  float s = fract(aLane.z + uFlow * sp - aTrail * 0.03);
  float isWin = step(0.84, aLane.w);
  // fresh air: cowl vents → over the occupants → rear extraction
  vec3 fresh = vec3(
    mix(1.02, -2.2, s),
    1.08 + 0.44 * sin(s * 3.14159) * (0.55 + 0.45 * aLane.y) - 0.18 * s * s,
    aLane.x * (0.18 + 0.52 * smoothstep(0.0, 0.3, s)) + 0.035 * sin(s * 14.0 + aLane.w * 6.0));
  float fa = smoothstep(0.0, 0.05, s) * smoothstep(1.0, 0.82, s);
  // recirculation: closed swirl loop
  float ph = 6.28318 * s;
  float rr = 0.6 + 0.4 * aLane.y;
  vec3 loopP = vec3(
    -0.45 + 1.25 * rr * cos(ph),
    1.08 + 0.3 * rr * sin(ph),
    aLane.x * 0.6 + 0.05 * sin(ph * 3.0 + aLane.w * 6.0));
  vec3 pos = mix(fresh, loopP, uMix);
  float a = mix(fa, 0.75, uMix);
  // driver window inflow
  vec3 win = vec3(0.32 - 1.5 * s, 1.3 - 0.28 * s + 0.05 * sin(s * 9.0 + aLane.w * 5.0), -0.8 + 0.85 * s * (0.5 + 0.5 * aLane.y));
  pos = mix(pos, win, isWin);
  a = mix(a, smoothstep(0.0, 0.08, s) * smoothstep(1.0, 0.6, s) * uWindow, isWin);
  float tail = 1.0 - aTrail;
  vAlpha = a * tail * tail * uAlpha;
  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = uSize * (0.35 + 0.65 * tail) * projectionMatrix[1][1] * uViewH * 0.5 / -mv.z;
}`,je=`
attribute vec4 aSeed;
uniform float uClock;
uniform float uFrac;
uniform float uSize;
uniform float uViewH;
uniform vec3 uOrigin;
varying float vAlpha;
void main() {
  float s = fract(aSeed.z + uClock * (0.25 + 0.2 * aSeed.w));
  float vis = step(aSeed.w, uFrac);
  vec3 pos = uOrigin + vec3(
    (aSeed.x - 0.5) * 0.42 + 0.04 * sin(s * 9.0 + aSeed.w * 10.0),
    s * 0.55,
    (aSeed.y - 0.5) * 0.36 + 0.04 * cos(s * 7.0 + aSeed.w * 8.0));
  vAlpha = sin(s * 3.14159) * vis * 0.55;
  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = vis * uSize * (0.6 + s) * projectionMatrix[1][1] * uViewH * 0.5 / -mv.z;
}`,Me=`
varying vec2 vP;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vP = wp.xz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}`,Ne=`
uniform vec3 uColor;
uniform float uScroll;
uniform float uPulse;
uniform float uFade;
varying vec2 vP;
float gridLine(vec2 p, float scale) {
  vec2 q = p * scale;
  vec2 g = abs(fract(q) - 0.5) / fwidth(q);
  return 1.0 - min(min(g.x, g.y), 1.0);
}
void main() {
  float r = length(vP / vec2(3.15, 2.0));
  float shadow = smoothstep(0.8, 0.1, r) * 0.32;
  float contact = smoothstep(0.62, 0.3, length(vP / vec2(2.6, 1.0))) * 0.3;
  float fade = smoothstep(1.35, 0.25, r);
  float grid = gridLine(vP + vec2(uScroll, 0.0), 2.0) * 0.22 * fade;
  float ring = smoothstep(0.012, 0.0, abs(r - 0.96)) * 0.45;
  float ring2 = smoothstep(0.008, 0.0, abs(r - 1.12)) * 0.18;
  float pr = fract(uPulse);
  float pulse = smoothstep(0.03, 0.0, abs(r - pr * 1.4)) * (1.0 - pr) * 0.5;
  vec3 glow = uColor * (grid + ring + ring2 + pulse) * uFade;
  gl_FragColor = vec4(glow, clamp(shadow + contact, 0.0, 0.85));
  #include <colorspace_fragment>
}`,Pe=new g,Fe=new g;function Ie(){return(0,w.useSyncExternalStore)(e=>{let t=window.matchMedia(`(prefers-reduced-motion: reduce)`);return t.addEventListener(`change`,e),()=>t.removeEventListener(`change`,e)},()=>window.matchMedia(`(prefers-reduced-motion: reduce)`).matches,()=>!1)}function Le({live:e,reduced:t}){let n=(0,w.useMemo)(()=>Se(),[]),[r,i]=(0,w.useMemo)(()=>Ce(),[]),a=(0,w.useMemo)(()=>J(!0),[]),o=(0,w.useMemo)(()=>J(!1),[]),s=(0,w.useMemo)(()=>{let e=(e,t)=>new x({vertexShader:Te,fragmentShader:Ee,transparent:!0,depthWrite:!1,side:e,uniforms:{uTint:{value:new g(`#06101c`)},uRim:{value:new g(`#3CF2C8`)},uBase:{value:t},uFade:{value:1},uScan:{value:-3},uScanAmt:{value:0}}});return{back:e(1,.14),front:e(0,.07),strong:new C({color:`#3CF2C8`,transparent:!0,opacity:.75,blending:2,depthWrite:!1,toneMapped:!1}),faint:new C({color:`#5AB8FF`,transparent:!0,opacity:.16,blending:2,depthWrite:!1,toneMapped:!1}),head:new S({color:`#E6F7FF`,toneMapped:!1,transparent:!0,side:2}),tail:new S({color:`#FF3B4F`,toneMapped:!1,transparent:!0,side:2})}},[]);return(0,w.useEffect)(()=>()=>{n.dispose(),r.dispose(),i.dispose(),a.dispose(),o.dispose(),Object.values(s).forEach(e=>e.dispose())},[n,r,i,a,o,s]),y(()=>{let n=e.current,r=n.t%7/7,i=2.9-r*5.8,a=t?0:Math.sin(Math.min(1,r*1.15)*Math.PI)*(1-n.nap*.7);for(let e of[s.back,s.front])e.uniforms.uRim.value.copy(n.rim).multiplyScalar(n.rimGain),e.uniforms.uScan.value=i,e.uniforms.uScanAmt.value=a,e.uniforms.uFade.value=.75+.25*n.rimGain;s.strong.color.copy(n.rim),s.strong.opacity=.75*n.rimGain,s.faint.color.lerpColors(M,n.rim,.35+.65*n.nap),s.faint.opacity=.16*n.rimGain;let o=1-.75*n.nap;s.head.color.set(`#E6F7FF`).multiplyScalar(1.6*o+n.wake*.8),s.tail.color.set(`#FF3B4F`).multiplyScalar(1.4*o)}),(0,T.jsxs)(`group`,{children:[(0,T.jsx)(`mesh`,{geometry:n,material:s.back,renderOrder:1}),(0,T.jsx)(`mesh`,{geometry:n,material:s.front,renderOrder:20}),(0,T.jsx)(`lineSegments`,{geometry:r,material:s.strong,renderOrder:21}),(0,T.jsx)(`lineSegments`,{geometry:i,material:s.faint,renderOrder:21}),(0,T.jsx)(`mesh`,{geometry:a,material:s.head,renderOrder:22}),(0,T.jsx)(`mesh`,{geometry:o,material:s.tail,renderOrder:22})]})}function Re({live:e}){let t=(0,w.useRef)([]),r=(0,w.useMemo)(()=>{let e=[[.262,-.118],[.3,-.13],[.352,-.133],[.374,-.124],[.384,-.104],[_e,0],[.384,.104],[.374,.124],[.352,.133],[.3,.13],[.262,.118]].map(([e,t])=>new o(e,t)),t=new se(e,72);t.rotateX(Math.PI/2);let r=new n(.228,.262,72),i=new te(.058,36),a=new n(.135,.152,60),c=new ee(.165,.014,.02);c.translate(.15,.028,0);let u=new h(.262,.262,.22,48,1,!0);u.rotateX(Math.PI/2);let d=[];for(let e=0;e<=96;e++){let t=e/96*Math.PI*2;d.push(Math.cos(t)*.262,Math.sin(t)*.262,0)}let f=new p;f.setAttribute(`position`,new l(d,3));let m=[];for(let e=0;e<18;e++)for(let t of[0,.075]){let n=null;for(let r=0;r<=1.0001;r+=.125){let i=.07+r*.165,a=e/18*Math.PI*2+t+r*.55,o=[Math.cos(a)*i,Math.sin(a)*i];n&&m.push(n[0],n[1],0,o[0],o[1],0),n=o}}for(let e of[.058,.145])for(let t=0;t<48;t++){let n=t/48*Math.PI*2,r=(t+1)/48*Math.PI*2;m.push(Math.cos(n)*e,Math.sin(n)*e,0,Math.cos(r)*e,Math.sin(r)*e,0)}let g=new p;g.setAttribute(`position`,new l(m,3));let _=new C({color:`#3CF2C8`,transparent:!0,opacity:.38,blending:2,depthWrite:!1,toneMapped:!1});return{tire:t,rim:r,hub:i,inner:a,spoke:c,barrel:u,ring:f,blades:g,tireMat:new s({color:`#07090d`,roughness:.6,metalness:.2}),rimMat:new s({color:`#1a2230`,roughness:.25,metalness:.9,side:2}),ringMat:new C({color:`#3CF2C8`,transparent:!0,opacity:.7,toneMapped:!1}),bladeMat:_}},[]);(0,w.useEffect)(()=>()=>{Object.values(r).forEach(e=>e.dispose())},[r]),y(()=>{let n=e.current;for(let e of t.current)e&&(e.rotation.z=-n.wheelAngle);r.ringMat.color.copy(n.rim),r.ringMat.opacity=.7*n.rimGain,r.bladeMat.color.copy(n.rim),r.bladeMat.opacity=.38*n.rimGain});let i=[];for(let e of R)for(let t of[-1,1])i.push([e,t]);return(0,T.jsx)(`group`,{children:i.map(([e,n],i)=>(0,T.jsxs)(`group`,{position:[e,ge,n*ve],children:[(0,T.jsx)(`mesh`,{geometry:r.tire,material:r.tireMat}),(0,T.jsx)(`mesh`,{geometry:r.barrel,material:r.rimMat}),(0,T.jsxs)(`group`,{ref:e=>void(t.current[i]=e),position:[0,0,n*.1],children:[(0,T.jsx)(`mesh`,{geometry:r.rim,material:r.rimMat}),(0,T.jsx)(`mesh`,{geometry:r.inner,material:r.rimMat}),(0,T.jsx)(`mesh`,{geometry:r.hub,material:r.rimMat}),Array.from({length:18},(e,t)=>(0,T.jsx)(`mesh`,{geometry:r.spoke,material:r.rimMat,rotation:[0,0,t/18*Math.PI*2*-n],scale:[1,n,1]},t)),(0,T.jsx)(`lineLoop`,{geometry:r.ring,material:r.ringMat,position:[0,0,n*.012]}),(0,T.jsx)(`lineSegments`,{geometry:r.blades,material:r.bladeMat,position:[0,0,n*.014],scale:[1,n,1]})]})]},i))})}var X=[{x:.1,z:-.4},{x:.1,z:.4},{x:-.95,z:.4},{x:-.95,z:-.4}];function ze({index:e,live:t,seatMat:n,holoMat:r}){let{x:a,z:o}=X[e],s=(0,w.useRef)(null),c=(0,w.useRef)(null),l=(0,w.useRef)(null),u=(0,w.useRef)(null),f=e===0;y(()=>{let n=t.current;s.current&&(s.current.rotation.z=f?d.degToRad(n.recline)+.1:.32);let r=n.occ[e];for(let e of[l.current,u.current])e&&(e.visible=r>.01,e.scale.setScalar(.6+.4*r));if(c.current){let e=0;f&&n.kss>=6.5&&(e=(.1+.16*Math.min(1,(n.kss-6.5)/2.5))*Math.max(0,Math.sin(n.t*.85))**4),e+=f?n.nap*.12:0,c.current.rotation.z=-e}});let p=(0,w.useMemo)(()=>new m(.135,.26,6,16),[]),h=(0,w.useMemo)(()=>new m(.065,.28,4,12),[]),g=(0,w.useMemo)(()=>new i(.098,24,16),[]);return(0,w.useEffect)(()=>()=>[p,h,g].forEach(e=>e.dispose()),[p,h,g]),(0,T.jsxs)(`group`,{position:[a,0,o],children:[(0,T.jsx)(_,{args:[.5,.12,.48],radius:.045,smoothness:3,position:[0,.62,0],material:n}),(0,T.jsxs)(`group`,{ref:s,position:[-.23,.66,0],children:[(0,T.jsx)(_,{args:[.12,.62,.47],radius:.05,smoothness:3,position:[0,.31,0],material:n}),(0,T.jsx)(_,{args:[.1,.14,.26],radius:.04,smoothness:3,position:[.01,.72,0],material:n}),(0,T.jsxs)(`group`,{ref:l,children:[(0,T.jsx)(`mesh`,{geometry:p,material:r,position:[.17,.32,0]}),(0,T.jsx)(`group`,{ref:c,position:[.17,.56,0],children:(0,T.jsx)(`mesh`,{geometry:g,material:r,position:[.03,.1,0]})})]})]}),(0,T.jsx)(`group`,{ref:u,children:[-.09,.09].map(e=>(0,T.jsxs)(`group`,{children:[(0,T.jsx)(`mesh`,{geometry:h,material:r,position:[.07,.76,e],rotation:[0,0,Math.PI/2]}),(0,T.jsx)(`mesh`,{geometry:h,material:r,position:[.3,.55,e],rotation:[0,0,.25]})]},e))})]})}function Be({live:e}){let t=(0,w.useMemo)(()=>{let e=e=>new x({vertexShader:De,fragmentShader:Oe,transparent:!0,depthWrite:!1,blending:2,uniforms:{uColor:{value:e.clone()},uIntensity:{value:1}}});return{seat:new s({color:`#1b2433`,roughness:.55,metalness:.25,emissive:`#070c14`}),driver:e(j),passenger:e(me),dash:new s({color:`#141c2a`,roughness:.35,metalness:.6,transparent:!0,opacity:.55,depthWrite:!1}),screen:new S({color:`#3CF2C8`,toneMapped:!1,transparent:!0,opacity:.85}),wheel:new s({color:`#2a3446`,roughness:.3,metalness:.7}),strip:new S({color:`#3CF2C8`,toneMapped:!1,transparent:!0}),floor:new S({color:`#0b1320`,transparent:!0,opacity:.5,depthWrite:!1})}},[]),n=(0,w.useMemo)(()=>we(),[]),r=(0,w.useRef)(null);return(0,w.useEffect)(()=>()=>{n.dispose(),Object.values(t).forEach(e=>e.dispose())},[n,t]),y(()=>{let n=e.current;t.driver.uniforms.uColor.value.copy(n.driver),t.driver.uniforms.uIntensity.value=.9*(1-.4*n.nap)+.3*n.wake,t.passenger.uniforms.uIntensity.value=.6*(1-.4*n.nap);let i=n.ambBright;t.strip.color.copy(n.amb).multiplyScalar(.25+2.2*i),t.screen.color.copy(n.rim).multiplyScalar(.5+.6*(1-n.nap)),r.current&&(r.current.color.copy(n.amb),r.current.intensity=.4+5*i)}),(0,T.jsxs)(`group`,{children:[(0,T.jsx)(_,{args:[3.3,.03,1.4],radius:.012,smoothness:2,position:[-.45,.5,0],material:t.floor}),(0,T.jsx)(_,{args:[.26,.1,1.42],radius:.045,smoothness:3,position:[.88,1,0],material:t.dash}),(0,T.jsx)(`mesh`,{position:[.74,1.1,-.22],rotation:[0,-Math.PI/2,0],material:t.screen,children:(0,T.jsx)(`planeGeometry`,{args:[.86,.07]})}),(0,T.jsx)(`group`,{position:[.56,1,X[0].z],rotation:[0,Math.PI/2,0],children:(0,T.jsx)(`group`,{rotation:[-.42,0,0],children:(0,T.jsx)(`mesh`,{material:t.wheel,children:(0,T.jsx)(`torusGeometry`,{args:[.165,.018,10,40]})})})}),(0,T.jsx)(`mesh`,{geometry:n,material:t.strip}),(0,T.jsx)(`pointLight`,{ref:r,position:[-.35,1.3,0],distance:3.4,decay:1.6}),X.map((n,r)=>(0,T.jsx)(ze,{index:r,live:e,seatMat:t.seat,holoMat:r===0?t.driver:t.passenger},r))]})}function Z(){return f(e=>e.size.height)*f(e=>e.viewport.dpr)}function Ve({live:e,count:t=2600}){let n=Z(),{geo:r,mat:i}=(0,w.useMemo)(()=>{let e=new Float32Array(t*4);for(let n=0;n<t*4;n++)e[n]=Math.random();let n=new p;return n.setAttribute(`position`,new b(new Float32Array(t*3),3)),n.setAttribute(`aSeed`,new b(e,4)),n.boundingSphere=new c(new v(-.4,1,0),3),{geo:n,mat:new x({vertexShader:ke,fragmentShader:Y,transparent:!0,depthWrite:!1,blending:2,uniforms:{uClock:{value:0},uFrac:{value:.2},uOpacity:{value:.5},uSize:{value:.03},uViewH:{value:800},uMin:{value:new v(-2,.58,-.78)},uMax:{value:new v(1,1.55,.78)},uColor:{value:new g(`#3CF2C8`)}}})}},[t]);return(0,w.useEffect)(()=>()=>(r.dispose(),i.dispose()),[r,i]),y(()=>{let t=e.current,r=Math.min(1,Math.max(0,(t.co2-400)/4600)),a=i.uniforms;a.uClock.value=t.co2Clock,a.uFrac.value=.06+.94*r**.75,a.uOpacity.value=(.35+.6*r)*(1-.35*t.nap),a.uSize.value=.026+.018*r,a.uViewH.value=n,a.uColor.value.copy(t.co2Col)}),(0,T.jsx)(`points`,{geometry:r,material:i,renderOrder:10,frustumCulled:!1})}function He({live:e,lanes:t=220,trail:n=10}){let r=Z(),{geo:i,mat:a}=(0,w.useMemo)(()=>{let e=t*n,r=new Float32Array(e*4),i=new Float32Array(e);for(let e=0;e<t;e++){let t=[Math.random()*2-1,Math.random(),Math.random(),Math.random()];for(let a=0;a<n;a++){let o=e*n+a;r.set(t,o*4),i[o]=a/(n-1)}}let a=new p;return a.setAttribute(`position`,new b(new Float32Array(e*3),3)),a.setAttribute(`aLane`,new b(r,4)),a.setAttribute(`aTrail`,new b(i,1)),{geo:a,mat:new x({vertexShader:Ae,fragmentShader:Y,transparent:!0,depthWrite:!1,blending:2,uniforms:{uFlow:{value:0},uMix:{value:0},uWindow:{value:0},uAlpha:{value:.6},uSize:{value:.022},uViewH:{value:800},uColor:{value:new g(`#9FE8FF`)}}})}},[t,n]);return(0,w.useEffect)(()=>()=>(i.dispose(),a.dispose()),[i,a]),y(()=>{let t=e.current,n=a.uniforms;n.uFlow.value=t.flowClock,n.uMix.value=t.recircMix,n.uWindow.value=t.window,n.uAlpha.value=(.12+.6*Math.min(1,t.fan/5))*(1-.5*t.nap),n.uViewH.value=r,n.uColor.value.lerpColors(F,I,t.recircMix)}),(0,T.jsx)(`points`,{geometry:i,material:a,renderOrder:11,frustumCulled:!1})}function Ue({live:e,count:t=160}){let n=Z(),{geo:r,mat:i}=(0,w.useMemo)(()=>{let e=new Float32Array(t*4);for(let n=0;n<t*4;n++)e[n]=Math.random();let n=new p;return n.setAttribute(`position`,new b(new Float32Array(t*3),3)),n.setAttribute(`aSeed`,new b(e,4)),{geo:n,mat:new x({vertexShader:je,fragmentShader:Y,transparent:!0,depthWrite:!1,blending:2,uniforms:{uClock:{value:0},uFrac:{value:0},uSize:{value:.03},uViewH:{value:800},uOrigin:{value:new v(X[0].x,.69,X[0].z)},uColor:{value:new g(`#BFF6FF`)}}})}},[t]);return(0,w.useEffect)(()=>()=>(r.dispose(),i.dispose()),[r,i]),y(()=>{let t=e.current;i.uniforms.uClock.value=t.wispClock,i.uniforms.uFrac.value=t.seatVent/3,i.uniforms.uViewH.value=n}),(0,T.jsx)(`points`,{geometry:r,material:i,renderOrder:12,frustumCulled:!1})}function We({live:e}){let t=(0,w.useMemo)(()=>new S({color:`#9FE8FF`,toneMapped:!1,transparent:!0,opacity:.8,depthWrite:!1}),[]);return(0,w.useEffect)(()=>()=>t.dispose(),[t]),y(()=>{let n=e.current,r=1-n.recircMix;t.color.lerpColors(F,I,n.recircMix).multiplyScalar(.4+1.6*r*Math.min(1,n.fan/4+.2))}),(0,T.jsx)(`group`,{children:[-.42,-.14,.14,.42].map(e=>(0,T.jsx)(`mesh`,{position:[1.12,1.135,e],rotation:[-Math.PI/2,0,0],material:t,children:(0,T.jsx)(`planeGeometry`,{args:[.05,.2]})},e))})}function Ge({live:e}){let t=(0,w.useMemo)(()=>new x({vertexShader:Me,fragmentShader:Ne,transparent:!0,depthWrite:!1,premultipliedAlpha:!0,uniforms:{uColor:{value:new g(`#3CF2C8`)},uScroll:{value:0},uPulse:{value:0},uFade:{value:1}}}),[]);return(0,w.useEffect)(()=>()=>t.dispose(),[t]),y(()=>{let n=e.current;t.uniforms.uColor.value.copy(n.rim),t.uniforms.uScroll.value=n.scroll,t.uniforms.uPulse.value=n.t*.22,t.uniforms.uFade.value=n.rimGain}),(0,T.jsx)(`mesh`,{rotation:[-Math.PI/2,0,0],position:[0,.002,0],material:t,renderOrder:-1,children:(0,T.jsx)(`planeGeometry`,{args:[10,7]})})}function Ke({reduced:e,hero:t}){let n=(0,w.useRef)({t:0,co2:600,recircMix:0,fan:3,recline:12,seatVent:0,window:0,speed:0,kss:3,nap:0,wake:0,breath:0,occ:[1,0,0,0],amb:new g(`#3CF2C8`),ambBright:.4,rim:new g(`#3CF2C8`),rimGain:1,driver:new g(`#3CF2C8`),co2Col:new g(`#3CF2C8`),flowClock:0,co2Clock:0,wispClock:0,wheelAngle:0,scroll:0}),r=(0,w.useMemo)(()=>new g,[]),i=(0,w.useRef)(null),a=(0,w.useRef)(null);return y((t,o)=>{let s=Math.min(.1,o),c=n.current,l=ue(),u=e?.3:1,f=d.damp;c.t+=s*u,c.co2=f(c.co2,l.co2,1.8,s),c.recircMix=f(c.recircMix,+!!l.recirc,1.6,s),c.fan=f(c.fan,l.fan,2,s),c.recline=f(c.recline,l.recline,1.5,s),c.seatVent=f(c.seatVent,l.seatVent,2,s),c.window=f(c.window,Math.min(1,l.window/40),2,s),c.speed=f(c.speed,l.speed,1.5,s),c.kss=f(c.kss,l.kss,1.2,s),c.nap=f(c.nap,+(l.mode===`napping`),1,s),c.wake=f(c.wake,+(l.mode===`waking`),1.2,s),c.breath=.5+.5*Math.sin(c.t*Math.PI*2/5.5);for(let e=0;e<4;e++)c.occ[e]=f(c.occ[e],+(e===0||e<l.occupants),3,s);r.set(l.ambColor),r.lerp(N,c.nap).lerp(P,c.wake),c.amb.lerp(r,1-Math.exp(-2*s));let p=l.ambBright/100*(1-c.nap)*(1-c.wake)+c.nap*(.18+.22*c.breath)+c.wake*.95;c.ambBright=f(c.ambBright,p,2,s),Pe.copy(j).lerp(M,.15).lerp(N,c.nap).lerp(P,c.wake*.85),c.rim.copy(Pe),c.rimGain=1-c.nap*(.5-.18*c.breath)+.3*c.wake;let m=Math.min(4,Math.max(0,(c.kss-4)/1.25)),h=Math.floor(m);Fe.lerpColors(pe[h],pe[Math.min(4,h+1)],m-h),c.driver.copy(Fe),de(c.co2,c.co2Col);let g=1-c.recircMix,_=(.05+c.fan*.05)*g+(.03+c.fan*.01)*c.recircMix;c.flowClock+=s*_*u*(c.fan<.15?.2:1),c.co2Clock+=s*(.35+c.co2/6e3)*u,c.wispClock+=s*u;let v=c.speed*.08*u;c.wheelAngle+=s*v,c.scroll+=s*c.speed*u/36,i.current&&(i.current.intensity=1.1*(1-.6*c.nap)+.6*c.wake),a.current&&(a.current.intensity=.35*(1-.5*c.nap)+.3*c.wake)},-1),(0,T.jsxs)(T.Fragment,{children:[(0,T.jsx)(`hemisphereLight`,{ref:a,args:[`#9fc8ff`,`#05070b`,.35]}),(0,T.jsx)(`directionalLight`,{ref:i,position:[3,6,-4],color:`#dfefff`}),(0,T.jsxs)(`group`,{position:[.2,0,0],scale:t?1.08:1,children:[(0,T.jsx)(Ge,{live:n}),(0,T.jsx)(Re,{live:n}),(0,T.jsx)(Be,{live:n}),(0,T.jsx)(We,{live:n}),(0,T.jsx)(Ve,{live:n,count:t?2400:2600}),(0,T.jsx)(He,{live:n}),(0,T.jsx)(Ue,{live:n}),(0,T.jsx)(Le,{live:n,reduced:e})]})]})}function qe(){return(0,T.jsxs)(ne,{multisampling:4,enableNormalPass:!1,children:[(0,T.jsx)(oe,{mipmapBlur:!0,intensity:.85,luminanceThreshold:.18,luminanceSmoothing:.3,radius:.72}),(0,T.jsx)(ae,{eskil:!1,offset:.3,darkness:.6})]})}function Q(){let e=(0,w.useRef)(null),[t,n]=(0,w.useState)(!0);return(0,w.useEffect)(()=>{let t=e.current;if(!t||typeof IntersectionObserver>`u`)return;let r=new IntersectionObserver(([e])=>n(e.isIntersecting),{rootMargin:`80px`});return r.observe(t),()=>r.disconnect()},[]),[e,t]}function Je({hero:e,reduced:t,active:n}){return(0,T.jsxs)(re,{frameloop:n?`always`:`never`,dpr:[1,2],gl:{antialias:!1,alpha:!1,powerPreference:`high-performance`,stencil:!1},camera:{position:e?[6.3,3,-6.7]:[4.9,2.9,-5.6],fov:e?30:32,near:.1,far:60},onCreated:({gl:e,camera:t,controls:n})=>{e.setClearColor(0,1),globalThis.__twin={...globalThis.__twin??{},camera:t,controls:n}},style:{background:`#000`,mixBlendMode:`screen`},children:[(0,T.jsx)(Ke,{reduced:t,hero:e}),(0,T.jsx)(u,{ref:e=>{let t=globalThis;e&&(t.__twin={...t.__twin??{},controls:e})},makeDefault:!0,target:[0,e?.75:.85,0],enableDamping:!0,dampingFactor:.07,enablePan:!1,enableZoom:!e,minDistance:5.2,maxDistance:11,minPolarAngle:Math.PI*.18,maxPolarAngle:Math.PI*.46,autoRotate:!t,autoRotateSpeed:e?.35:.5,rotateSpeed:.6}),(0,T.jsx)(qe,{})]})}var Ye={driving:{t:`주행 중`,c:`var(--aurora)`},parked:{t:`정차`,c:`var(--text-2)`},napping:{t:`휴식 · 낮잠`,c:`#FF9A5A`},waking:{t:`기상 시퀀스`,c:`#EAF4FF`}};function Xe(){let e=ce(e=>e.snap),[t,n]=(0,w.useState)(()=>e?null:D(O()));return(0,w.useEffect)(()=>{if(e)return;let t=window.setInterval(()=>n(D(O())),250);return()=>window.clearInterval(t)},[e]),e?le(e):t??D(O())}var Ze=5e3,$=e=>`${Math.min(Ze,Math.max(0,e))/Ze*100}%`;function Qe(){let e=Xe(),t=fe(e.co2),n=Ye[e.mode]??Ye.driving;return(0,T.jsxs)(`div`,{className:`ct-overlay`,"aria-live":`off`,children:[(0,T.jsxs)(`div`,{className:`ct-tl`,children:[(0,T.jsxs)(`div`,{className:`ct-eyebrow`,children:[(0,T.jsx)(`span`,{className:e.live?`ct-live`:`ct-live demo`}),`Cabin Digital Twin`]}),(0,T.jsxs)(`div`,{className:`ct-co2`,children:[(0,T.jsx)(`span`,{className:`ct-co2-val`,style:{color:t,textShadow:`0 0 18px ${t}55`},children:Math.round(e.co2).toLocaleString(`en-US`)}),(0,T.jsx)(`span`,{className:`ct-co2-unit`,children:`ppm`}),(0,T.jsx)(`span`,{className:`ct-co2-label`,children:`CO₂`})]}),(0,T.jsxs)(`div`,{className:`ct-rows`,children:[(0,T.jsx)(`span`,{className:`ct-k`,children:`공조`}),(0,T.jsxs)(`span`,{className:`ct-v`,children:[(0,T.jsx)(`span`,{className:`ct-air-dot`,style:{background:e.recirc?`#9B8CFF`:`#9FE8FF`,boxShadow:`0 0 8px ${e.recirc?`#9B8CFF`:`#9FE8FF`}`}}),e.recirc?`내기순환`:`외기유입`]}),(0,T.jsx)(`span`,{className:`ct-k`,children:`온도`}),(0,T.jsxs)(`span`,{className:`ct-v`,children:[e.cabinTemp.toFixed(1),`°C `,(0,T.jsxs)(`small`,{children:[`설정 `,e.setTemp.toFixed(1),`°`]})]}),(0,T.jsx)(`span`,{className:`ct-k`,children:`송풍`}),(0,T.jsxs)(`span`,{className:`ct-v`,children:[Math.round(e.fan),`단`]}),(0,T.jsx)(`span`,{className:`ct-k`,children:`탑승`}),(0,T.jsxs)(`span`,{className:`ct-v`,children:[e.occupants,`명`]})]})]}),(0,T.jsx)(`div`,{className:`ct-tr`,children:(0,T.jsx)(`span`,{className:`ct-mode`,style:{color:n.c,borderColor:`color-mix(in srgb, ${n.c} 40%, transparent)`},children:e.live?n.t:`DEMO`})}),(0,T.jsxs)(`div`,{className:`ct-bl`,children:[(0,T.jsx)(`span`,{className:`ct-legend-title`,children:`CO₂ ppm`}),(0,T.jsx)(`div`,{className:`ct-legend-bar`,children:(0,T.jsx)(`span`,{className:`ct-legend-marker`,style:{left:$(e.co2)}})}),(0,T.jsxs)(`div`,{className:`ct-legend-ticks`,children:[(0,T.jsx)(`span`,{style:{left:$(1e3)},children:`1,000`}),(0,T.jsx)(`span`,{style:{left:$(2e3)},children:`2,000`}),(0,T.jsx)(`span`,{style:{left:$(3500)},children:`3,500`})]})]}),(0,T.jsxs)(`div`,{className:`ct-br`,children:[`KSS `,e.kss.toFixed(1),` · `,Math.round(e.speed),` km/h`]})]})}function $e({height:e=360}){let t=Ie(),[n,r]=Q();return(0,T.jsxs)(`div`,{ref:n,className:`ct-root`,style:{height:e},children:[(0,T.jsx)(Je,{hero:!1,reduced:t,active:r}),(0,T.jsx)(Qe,{})]})}function et({height:e=520,className:t}){let n=Ie(),[r,i]=Q();return(0,T.jsx)(`div`,{ref:r,className:`ct-root ct-hero${t?` ${t}`:``}`,style:{height:e},children:(0,T.jsx)(Je,{hero:!0,reduced:n,active:i})})}export{$e as CabinTwin,$e as default,et as CabinTwinHero};