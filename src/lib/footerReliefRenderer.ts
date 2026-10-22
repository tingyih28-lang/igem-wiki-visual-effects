import * as THREE from "three";
import { footerReliefImage } from "../content/footerRelief";

const vertexShader = `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }
`;

// The height field is an artistic approximation from the supplied photograph,
// not a reconstructed 3D model. Preserve its baked lighting and add grazing light.
const fragmentShader = `
precision highp float;
uniform sampler2D uLight, uHeight, uSurface, uFlow;
uniform vec2 uSize, uPointer, uTexel;
uniform float uTheme, uScroll, uTime, uImageAspect;
varying vec2 vUv;
float heightAt(vec2 p) { return texture2D(uHeight, clamp(p, .001, .999)).r; }
float hash(vec2 p) { return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
float noise(vec2 p) {
  vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+1.),f.x),f.y);
}
void main() {
  float aspect = uSize.x / uSize.y;
  // Fit the actual artwork aspect, including the expanded landscape version.
  vec2 fit = vec2(max(aspect/uImageAspect,1.),max(uImageAspect/aspect,1.));
  vec2 uv = (vUv - .5) * fit * 1.04 + .5;
  vec2 viewOffset = uPointer * vec2(.003, .002) + vec2(0., uScroll * .004);
  uv += viewOffset;
  vec4 flow = texture2D(uFlow, vUv);
  vec2 velocity = (flow.rg - .5) * 2.;
  // Advection follows pointer direction; there are no oscillating/radial waves.
  uv += velocity * .0012;
  // Small depth-dependent parallax preserves the architectural silhouette.
  uv += viewOffset * (heightAt(uv) - .5) * .65;
  vec2 texel = uTexel;
  float dx = heightAt(uv + vec2(texel.x,0.)) - heightAt(uv - vec2(texel.x,0.));
  float dy = heightAt(uv + vec2(0.,texel.y)) - heightAt(uv - vec2(0.,texel.y));
  vec3 normal = normalize(vec3(-dx * 15., -dy * 15., 1.));
  vec3 key = normalize(vec3(uPointer.x * 1.1 - .3, uPointer.y * .8 + .7, .9));
  vec3 rest = normalize(vec3(-.3,.7,.9));
  float lighting = dot(normal, key) - dot(normal, rest);
  // Both themes sample the exact same pixels; only the material palette changes.
  vec3 ivory = texture2D(uLight, uv).rgb;
  float luminance = dot(ivory,vec3(.2126,.7152,.0722));
  vec3 charcoal = vec3(clamp(luminance*.4-.125,0.,1.));
  vec3 color = mix(ivory,charcoal,uTheme);
  color *= 1. + lighting * mix(.20, .42, uTheme);
  float sheen = pow(max(dot(reflect(-key, normal), vec3(0.,0.,1.)), 0.), 28.);
  color += sheen * .025;
  vec3 surface = texture2D(uSurface, clamp(uv,.001,.999)).rgb;
  vec2 ridgeNormal = (surface.rg - .5) * 2.;
  // Sparse image-derived ridges shape the color; no cursor-circle is composited.
  float brokenEdge = smoothstep(.12,.48,surface.b);
  float mask = smoothstep(.08, .65, flow.b) * brokenEdge;
  // Keep the irregular ridge pattern, but do not erase pale fine edges entirely.
  mask *= mix(.45,1.,smoothstep(.26,.72,noise(uv*125. + ridgeNormal*2.)));
  float hue = atan(ridgeNormal.y, ridgeNormal.x) / 6.283185 + .5;
  vec3 neon = .52 + .48 * cos(6.283185 * (hue + vec3(.02, .36, .67)));
  neon = mix(neon, vec3(.10,.94,.80), .18);
  // Ivory needs stronger color contrast than dark stone at the same brush size.
  color = mix(color, neon, mask * mix(.92,.76,uTheme));
  color += neon * mask * mix(.08, .20, uTheme);
  // Two independent flow channels: A reveals broad relief, B colors fine ridges.
  float bounds = smoothstep(0.,.025,uv.x)*smoothstep(0.,.025,uv.y)
    *(1.-smoothstep(.975,1.,uv.x))*(1.-smoothstep(.975,1.,uv.y));
  float revealNoise = noise(uv*28.)*.16 + noise(uv*73.)*.06;
  float reveal = smoothstep(.12+revealNoise,.52+revealNoise,flow.a) * bounds;
  float grain = (hash(gl_FragCoord.xy)-.5)*.009 + (noise(vUv*vec2(aspect,1.)*180.)-.5)*.012;
  vec3 bareStone = mix(vec3(.91,.89,.85),vec3(.085,.092,.09),uTheme)+grain;
  color = mix(bareStone,color,reveal);
  gl_FragColor = vec4(color, 1.);
}`;

// A small ping-pong flow field stores direction in RG and brush density in B.
// A faster-than-reference decay keeps the requested neon trail compact.
const flowShader = `
precision highp float;
uniform sampler2D uPrevious;
uniform vec2 uMouse, uVelocity;
uniform float uAspect, uDecay, uRevealDecay, uBrush, uDelta, uReset;
varying vec2 vUv;
void main() {
  if(uReset > .5) { gl_FragColor=vec4(.5,.5,0.,0.); return; }
  vec4 previous = texture2D(uPrevious, vUv);
  vec2 direction = (previous.rg - .5) * 2.;
  vec4 advected = texture2D(uPrevious, clamp(vUv - direction * .018 * uDelta, .001, .999));
  vec2 velocity = (advected.rg - .5) * 2. * uDecay;
  // Subtract a tiny floor so 8-bit targets cannot retain a permanent faint trace.
  float quantizationFloor = max(.0022,.0022*uDelta*60.);
  float density = max(0.,advected.b * uDecay - quantizationFloor);
  vec2 offset = (vUv - uMouse) * vec2(uAspect, 1.);
  // Anisotropic strokes follow motion, while texture normals break up the color.
  vec2 along = normalize(uVelocity+vec2(.00001));
  vec2 stroke = vec2(dot(offset,along)*.72,dot(offset,vec2(-along.y,along.x))*1.25);
  float brush = exp(-dot(stroke,stroke) / .0005) * uBrush;
  float broadBrush = exp(-dot(offset,offset) / .032) * uBrush;
  velocity = mix(velocity, uVelocity, brush * .45);
  density = min(1., density + brush * .32);
  float reveal = min(1.,max(0.,advected.a*uRevealDecay-quantizationFloor)+broadBrush*.18);
  gl_FragColor = vec4(velocity * .5 + .5, density, reveal);
}`;

export async function createFooterRelief(
  layer: HTMLElement,
  footer: HTMLElement,
  isActive: () => boolean,
): Promise<() => void> {
  const renderer = new THREE.WebGLRenderer({ alpha: false, antialias: false, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.domElement.className = "wiki-footer__relief-canvas";
  const textures: THREE.Texture[] = [];
  let material: THREE.ShaderMaterial | undefined;
  let flowMaterial: THREE.ShaderMaterial | undefined;
  const flowTargets = [0, 1].map(() => new THREE.WebGLRenderTarget(192, 192, {
    minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter,
    depthBuffer: false, stencilBuffer: false,
  }));
  const geometry = new THREE.PlaneGeometry(2, 2);
  try {
    const loader = new THREE.TextureLoader();
    const results = await Promise.allSettled(["light.webp", "height.webp", "surface.webp"].map(async file => {
      const texture = await loader.loadAsync(footerReliefImage(file)!);
      textures.push(texture);
      texture.minFilter = THREE.LinearFilter;
      texture.generateMipmaps = false;
      return texture;
    }));
    if (results.some(result => result.status === "rejected")) throw new Error("Relief texture unavailable");
    const [light, height, surface] = results.map(result => (result as PromiseFulfilledResult<THREE.Texture>).value);
    const lightImage = light.image as HTMLImageElement;
    const heightImage = height.image as HTMLImageElement;
    for (const texture of [height, surface]) {
      const image = texture.image as HTMLImageElement;
      if (image.width !== lightImage.width || image.height !== lightImage.height) {
        throw new Error("Relief textures must be uploaded as a matching set");
      }
    }
    const flowUniforms = {
      uPrevious: { value: flowTargets[0].texture },
      uMouse: { value: new THREE.Vector2(-10,-10) },
      uVelocity: { value: new THREE.Vector2() },
      uAspect: { value: 1 }, uDecay: { value: .953 },
      uRevealDecay: { value: .99 },
      uReset: { value: 1 },
      uBrush: { value: 0 }, uDelta: { value: .016 },
    };
    flowMaterial = new THREE.ShaderMaterial({ vertexShader, fragmentShader: flowShader, uniforms: flowUniforms, depthTest: false, depthWrite: false });
    const flowScene = new THREE.Scene();
    flowScene.add(new THREE.Mesh(geometry, flowMaterial));
    const camera = new THREE.Camera();
    const resetFlow = () => {
      flowUniforms.uReset.value = 1;
      for (let i=0;i<flowTargets.length;i++) {
        flowUniforms.uPrevious.value = flowTargets[1-i].texture;
        renderer.setRenderTarget(flowTargets[i]);
        renderer.render(flowScene,camera);
      }
      renderer.setRenderTarget(null);
      flowUniforms.uReset.value = 0;
    };
    resetFlow();
    const uniforms = {
      uLight: { value: light }, uHeight: { value: height }, uSurface: { value: surface },
      uSize: { value: new THREE.Vector2(1, 1) }, uPointer: { value: new THREE.Vector2() },
      uTexel: { value: new THREE.Vector2(1 / heightImage.width, 1 / heightImage.height) },
      uImageAspect: { value: lightImage.width / lightImage.height },
      uTheme: { value: document.documentElement.dataset.theme === "dark" ? 1 : 0 },
      uScroll: { value: 0 }, uTime: { value: 0 }, uFlow: { value: flowTargets[0].texture },
    };
    material = new THREE.ShaderMaterial({ vertexShader, fragmentShader, uniforms, depthTest: false, depthWrite: false });
    const scene = new THREE.Scene();
    scene.add(new THREE.Mesh(geometry, material));
    const target = new THREE.Vector2();
    let previousTime = performance.now();
    let frame = 0;
    let flowIndex = 0;
    let pointerInside = false;
    const pointer = new THREE.Vector2(.5,.5);
    const previousPointer = new THREE.Vector2(.5,.5);
    let contextLost = false;
    const resize = () => {
      const rect = layer.getBoundingClientRect();
      uniforms.uSize.value.set(rect.width, rect.height);
      flowUniforms.uAspect.value = rect.width / Math.max(rect.height, 1);
      renderer.setSize(rect.width, rect.height, false);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(layer);
    resize();
    const move = (event: PointerEvent) => {
      const rect = footer.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width;
      const y = 1 - (event.clientY - rect.top) / rect.height;
      target.set((x - .5) * 2, (y - .5) * 2);
      pointer.set(x,y);
      if (!pointerInside) previousPointer.copy(pointer);
      pointerInside = true;
    };
    const leave = () => { target.set(0, 0); pointerInside = false; };
    const lost = (event: Event) => { event.preventDefault(); contextLost = true; layer.classList.remove("is-rendered"); };
    const restored = () => { contextLost = false; resetFlow(); };
    footer.addEventListener("pointermove", move, { passive: true });
    footer.addEventListener("pointerleave", leave);
    renderer.domElement.addEventListener("webglcontextlost", lost);
    renderer.domElement.addEventListener("webglcontextrestored", restored);
    const render = () => {
      frame = requestAnimationFrame(render);
      const time = performance.now();
      const delta = Math.min((time - previousTime) / 1000, .05);
      previousTime = time;
      if (!isActive() || contextLost) return;
      const ease = 1 - Math.exp(-delta * 6);
      uniforms.uTime.value += delta;
      uniforms.uPointer.value.lerp(target, ease);
      const darkMode = document.documentElement.dataset.theme === "dark" ? 1 : 0;
      uniforms.uTheme.value += (darkMode - uniforms.uTheme.value) * ease;
      const rect = footer.getBoundingClientRect();
      uniforms.uScroll.value = THREE.MathUtils.clamp((window.innerHeight * .5 - rect.top) / rect.height - .5, -1, 1);
      const speed = Math.min(pointer.distanceTo(previousPointer) / Math.max(delta, .001), 2.);
      flowUniforms.uMouse.value.copy(pointer);
      flowUniforms.uVelocity.value.subVectors(pointer, previousPointer).multiplyScalar(1 / Math.max(delta, .001)).clampLength(0, 1);
      flowUniforms.uBrush.value = pointerInside ? Math.min(speed * 2., 1.) : 0;
      flowUniforms.uDecay.value = Math.pow(.93, delta * 60);
      flowUniforms.uRevealDecay.value = Math.pow(.991, delta * 60);
      flowUniforms.uDelta.value = delta;
      previousPointer.lerp(pointer, 1 - Math.exp(-delta * 18));
      flowUniforms.uPrevious.value = flowTargets[flowIndex].texture;
      flowIndex = 1 - flowIndex;
      renderer.setRenderTarget(flowTargets[flowIndex]);
      renderer.render(flowScene, camera);
      renderer.setRenderTarget(null);
      uniforms.uFlow.value = flowTargets[flowIndex].texture;
      renderer.render(scene, camera);
      layer.classList.add("is-rendered");
    };
    layer.append(renderer.domElement);
    render();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      footer.removeEventListener("pointermove", move);
      footer.removeEventListener("pointerleave", leave);
      renderer.domElement.removeEventListener("webglcontextlost", lost);
      renderer.domElement.removeEventListener("webglcontextrestored", restored);
      layer.classList.remove("is-rendered");
      renderer.domElement.remove();
      textures.forEach(texture => texture.dispose());
      material?.dispose();
      flowMaterial?.dispose();
      flowTargets.forEach(target => target.dispose());
      geometry.dispose();
      renderer.dispose();
    };
  } catch (error) {
    textures.forEach(texture => texture.dispose());
    material?.dispose();
    flowMaterial?.dispose();
    flowTargets.forEach(target => target.dispose());
    geometry.dispose();
    renderer.dispose();
    throw error;
  }
}
