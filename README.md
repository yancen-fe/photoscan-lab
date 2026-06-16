# PhotoScan Lab

PhotoScan Lab 是一个纯浏览器运行的图片转扫描件工具。它可以把上传的照片处理成适合申请材料、表单、证明文件等场景使用的扫描件效果，也可以保留原图色彩，只做旋转和校正。

所有图片处理都在本地浏览器中完成，不会上传到服务器。

## Features

- 上传或拖拽导入 JPG、PNG、WEBP、BMP 图片
- 复印机风格扫描效果，保留纸张边缘和轻微碳粉颗粒
- 原色模式：保留上传图片原本色彩，只做旋转、自动校正等几何处理
- 自动校正倾斜角度，并支持手动微调旋转
- 支持左转 90 度、右转 90 度、旋转归零
- 可选自动裁边，默认关闭
- 导出 PNG 或 JPEG
- 最近图片历史，方便切回刚处理过的文件

## Tech Stack

- React
- TypeScript
- Vite
- Canvas image processing
- Lucide React icons

## Getting Started

```bash
npm install
npm run dev
```

默认开发地址：

```text
http://127.0.0.1:5173/
```

## Build

```bash
npm run build
```

构建产物会输出到 `dist/`。

## Preview Production Build

```bash
npm run preview
```

## Privacy

PhotoScan Lab 不依赖后端服务。上传、处理、预览和导出都在浏览器本地完成。

## Repository

https://github.com/yancen-fe/photoscan-lab
