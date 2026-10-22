import { useEffect, useRef, type CSSProperties } from "react";
import { footerReliefImage } from "../content/footerRelief";

/** A locally authored image-based relief, inspired by the reference's material,
 * pointer flow and eased camera. No reference models or runtime are copied. */
export function FooterRelief() {
  const layerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const layer = layerRef.current;
    const footer = layer?.closest("footer");
    if (!layer || !footer || !footerReliefImage("light.webp")) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const finePointer = window.matchMedia("(pointer: fine)");
    let disposed = false;
    let active = false;
    let stop: (() => void) | undefined;
    let initializing = false;

    const start = async () => {
      if (initializing || stop || disposed || !finePointer.matches || motion.matches) return;
      initializing = true;
      // Keep the three.js renderer out of the initial page bundle.
      try {
        const { createFooterRelief } = await import("../lib/footerReliefRenderer");
        if (disposed || motion.matches || !finePointer.matches) return;
        stop = await createFooterRelief(layer, footer, () => active && !document.hidden);
        if (disposed || motion.matches || !finePointer.matches) {
          stop();
          stop = undefined;
        }
      } catch {
        // CSS keeps the original relief visible if graphics or textures fail.
        layer.classList.add("has-static-fallback");
      } finally {
        initializing = false;
      }
    };
    const observer = new IntersectionObserver(([entry]) => {
      active = entry.isIntersecting;
      if (active) void start();
    }, { rootMargin: "250px" });
    observer.observe(footer);
    const onPreference = () => {
      if (motion.matches || !finePointer.matches) {
        stop?.();
        stop = undefined;
      } else if (active) void start();
    };
    motion.addEventListener("change", onPreference);
    finePointer.addEventListener("change", onPreference);
    return () => {
      disposed = true;
      observer.disconnect();
      motion.removeEventListener("change", onPreference);
      finePointer.removeEventListener("change", onPreference);
      stop?.();
    };
  }, []);

  return <div ref={layerRef} className="wiki-footer__relief" aria-hidden="true" style={{
    "--relief-light": footerReliefImage("light.webp") ? `url("${footerReliefImage("light.webp")}")` : "none",
  } as CSSProperties}>
    <div className="wiki-footer__relief-still" />
  </div>;
}
