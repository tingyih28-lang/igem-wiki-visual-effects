import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import { FooterRelief } from "./components/FooterRelief";
import { PharosLighthouse } from "./components/inclusivity/PharosLighthouse";
import "./styles/footer-relief.css";
import "./styles/demo.css";

function Demo() {
  const [dark, setDark] = useState(true);
  const toggle = () => {
    document.documentElement.dataset.theme = dark ? "light" : "dark";
    setDark(!dark);
  };
  return <>
    <header className="demo-header"><a href="#top">WIKI VISUAL EFFECTS</a>
      <button onClick={toggle}>切换为{dark ? "白色" : "黑色"}模式</button></header>
    <main id="top" className="wiki-page-shell">
      <div className="wiki-content-layout">
        <article className="wiki-article-stack">
          <p className="eyebrow">PEKINGHSC · VISUAL COMPONENTS</p>
          <h1>浮雕、光与海水</h1>
          <p className="intro">从 Wiki 项目整理的三种页面美化效果：移动光标显现浮雕、局部棱边霓虹，以及灯塔下方的动态海水。</p>
          <section><h2>右侧灯塔</h2><p>灯塔和主要礁石保持稳定，前景海水缓慢流动，并带有轻微上下起伏。组件根据正文右侧留白调整大小，窄屏时自动隐藏。</p><p>向下滚动时，灯塔会避让页脚，不覆盖正文。请使用宽屏窗口查看。</p></section>
          <section><h2>局部海水动画</h2><p>海水通过画布分行采样产生位移，只影响画面底部约 17% 的区域。动画最高每秒 30 帧，窗口不可见时暂停绘制。</p><p>系统开启“减少动态效果”时会显示静态图片。</p></section>
          <section><h2>页脚浮雕互动</h2><p>继续向下滚动，将鼠标移入页脚。较大范围逐渐显现浮雕，较小范围沿纹理棱边出现霓虹，黑白模式使用同一幅图像的几何结构。</p><p>支持细指针的设备启用互动渲染；触屏、减少动态效果或图形加载失败时使用静态背景。</p></section>
        </article>
      </div>
      <PharosLighthouse />
    </main>
    <footer id="wiki-footer" className="wiki-footer wiki-footer--relief">
      <FooterRelief />
      <div className="container"><p className="eyebrow">MOVE YOUR POINTER</p><h2>让光走过浮雕。</h2><p>移动鼠标，观察局部显影与棱边霓虹。</p>
        <div className="wiki-footer__signature" />
        <p className="wiki-footer__legal">源自 <a href="https://gitlab.igem.org/2026/pekinghsc">PekingHSC 2026 Wiki</a> · <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a></p>
      </div>
    </footer>
  </>;
}

createRoot(document.getElementById("root")!).render(<StrictMode><Demo /></StrictMode>);
