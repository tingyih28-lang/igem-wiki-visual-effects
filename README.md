# iGEM Wiki Visual Effects

从 [PekingHSC 2026 Wiki](https://gitlab.igem.org/2026/pekinghsc) 整理的页面美化代码，包含可运行的 React + TypeScript 演示。

- **浮雕显影与移动霓虹**：鼠标移动时较大范围显现浮雕，较小范围仅在纹理棱边显色；黑白模式共享同一图像结构。
- **写实灯塔**：根据正文右侧留白缩放，滚动到页脚时避让，小屏隐藏。
- **海水波动**：塔身和主要礁石静止，底部水面产生横向流动和轻微起伏。

## 本地运行

需要 Node.js 20.19+ 或 22.12+。

```sh
npm install
npm run dev
```

打开终端显示的本地地址。使用宽屏查看灯塔；向下滚动到页脚，用鼠标查看浮雕互动。页面顶部可切换黑白模式。

```sh
npm run build
npm run preview
```

本仓库不配置自动网站发布。构建输出位于 `dist/`。

## 文件与接入

- `src/components/FooterRelief.tsx`：浮雕 React 组件，接近视口时延迟初始化渲染器。
- `src/lib/footerReliefRenderer.ts`：Three.js（基于 WebGL 的三维渲染库）着色器、光标轨迹、显影与霓虹逻辑。
- `src/styles/footer-relief.css`：浮雕、黑白主题和静态回退样式。
- `src/components/inclusivity/PharosLighthouse.tsx`：灯塔定位和海水画布动画。
- `src/styles/pharos-lighthouse.css`：灯塔布局、边缘渐隐和减少动态效果支持。
- `src/content/*Assets.json`：iGEM 官方静态资源库图片链接。

浮雕组件放在具有 `id="wiki-footer"` 和 `className="wiki-footer wiki-footer--relief"` 的 `<footer>` 内，并为页脚设置 `position: relative; overflow: hidden`。前景内容应位于具有 `position: relative; z-index: 1` 的容器内。页面根元素使用 `data-theme="light"` 或 `data-theme="dark"`。

灯塔组件只在需要它的页面挂载。它通过 `.wiki-content-layout` 判断阅读区域，通过 `.wiki-article-stack` 测量正文右边缘，通过 `.wiki-footer` 避让页脚。接入其他布局时请调整这三个选择器。原 Wiki 仅在 Inclusivity 页面挂载。

## 素材与演示适配

图片继续从 `static.igem.wiki` 加载，未复制到此代码仓库。高度与表面纹理属于艺术化近似，并非真实三维扫描或实验数据。

为使独立演示下载后直接可用，两处本地预览图片路径已改为默认使用 JSON 中的正式链接。浮雕仍可通过 `VITE_FOOTER_RELIEF_URL` 指定自己的素材目录。替换素材时请上传到自己的静态资源库，并修改对应 JSON。

动画支持系统“减少动态效果”设置。浮雕在触屏或图形加载失败时回退为静态图；灯塔窗口不可见时暂停绘制。演示会访问外部 iGEM 图片，离线时无法显示。

## 来源与许可

源码提取自 PekingHSC 2026 Wiki，遵循原项目的 **Creative Commons Attribution 4.0 International（知识共享署名 4.0 国际许可，CC BY 4.0）**。完整许可见 `LICENSE`。

独立演示页面和接入说明随本次整理新增。保留来源署名；原项目未在此提取记录中逐一标注各素材的单独权利信息，使用素材时仍需核对原项目署名及适用权限。
