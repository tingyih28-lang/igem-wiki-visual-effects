import { useEffect, useRef, useState } from "react";
import assets from "../../content/inclusivityLighthouseAssets.json";
import "../../styles/pharos-lighthouse.css";

const source = assets.image;

/** A stationary beacon with a small, independently animated band of seawater. */
export function PharosLighthouse() {
  const host = useRef<HTMLDivElement>(null);
  const picture = useRef<HTMLImageElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [visible, setVisible] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const article = document.querySelector(".wiki-article-stack");
    const layout = document.querySelector(".wiki-content-layout");
    const footer = document.querySelector(".wiki-footer");
    if (!article || !layout) return;
    const update = () => {
      const gutter = document.documentElement.clientWidth - article.getBoundingClientRect().right;
      const width = Math.min(368, gutter - 16, window.innerHeight * 0.49);
      const lift = Math.max(24, window.innerHeight - (footer?.getBoundingClientRect().top ?? Infinity) + 24);
      host.current?.style.setProperty("--beacon-width", `${Math.max(0, width)}px`);
      host.current?.style.setProperty("--beacon-bottom", `${lift}px`);
      setVisible(width >= 110 && window.innerWidth >= 1100 &&
        layout.getBoundingClientRect().top < window.innerHeight * 0.45 &&
        lift < window.innerHeight * 0.45);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    const observer = new ResizeObserver(update);
    observer.observe(article);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const surface = canvas.current;
    const image = picture.current;
    if (!surface || !image || !loaded || !visible) return;
    const context = surface.getContext("2d");
    if (!context) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let previous = 0;
    let elapsed = 0;
    const render = (now: number) => {
      frame = requestAnimationFrame(render);
      if (document.hidden || motion.matches) {
        previous = now;
        surface.style.opacity = "0";
        image.style.opacity = "1";
        return;
      }
      if (now - previous < 1000 / 30) return;
      elapsed += Math.min(now - (previous || now), 80) / 1000;
      previous = now;
      const width = Math.round(surface.clientWidth * Math.min(window.devicePixelRatio, 1.5));
      const height = Math.round(width * 1.5);
      if (!width) return;
      if (surface.width !== width || surface.height !== height) {
        surface.width = width;
        surface.height = height;
      }
      context.clearRect(0, 0, width, height);
      context.drawImage(image, 0, 0, width, height);
      // Only the foreground water moves; tower and main rock silhouette stay fixed.
      const start = Math.floor(height * 0.83);
      for (let y = start; y < height; y += 2) {
        const depth = (y - start) / (height - start);
        const strength = depth * depth * (3 - 2 * depth);
        const phase = y / height;
        const shift = (Math.sin(phase * 32 - elapsed * 1.65) +
          0.45 * Math.sin(phase * 64 + elapsed * 1.05)) * width * 0.014 * strength;
        const rise = Math.sin(phase * 38 - elapsed * 1.4) * height * 0.003 * strength;
        const sampleY = Math.min(image.naturalHeight - 2 / height * image.naturalHeight,
          Math.max(0, (y + rise) / height * image.naturalHeight));
        context.clearRect(0, y, width, Math.min(2, height - y));
        context.drawImage(image, 0, sampleY,
          image.naturalWidth, Math.min(2, height - y) / height * image.naturalHeight,
          shift, y, width, Math.min(2, height - y));
      }
      surface.style.opacity = "1";
      image.style.opacity = "0";
    };
    frame = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(frame);
      surface.style.opacity = "0";
      image.style.opacity = "1";
    };
  }, [loaded, visible]);

  if (!source) return null;
  return (
    <div ref={host} className={`pharos-lighthouse${visible ? " is-visible" : ""}`} aria-hidden="true">
      <img ref={picture} src={source} alt="" width="768" height="1152"
        decoding="async" loading="lazy" onLoad={() => setLoaded(true)} />
      <canvas ref={canvas} />
    </div>
  );
}
