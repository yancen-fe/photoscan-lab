# PhotoScan Lab

[中文](#中文) | [English](#english)

## 中文

PhotoScan Lab 是一个纯浏览器运行的图片转扫描件工具。它可以把上传的照片处理成适合申请材料、表单、证明文件等场景使用的扫描件效果，也可以保留原图色彩，只做旋转和校正。

所有图片处理都在本地浏览器中完成，不会上传到服务器。

### 功能

- 上传或拖拽导入 JPG、PNG、WEBP、BMP 图片
- 复印机风格扫描效果，保留纸张边缘和轻微碳粉颗粒
- 原色模式：保留上传图片原本色彩，只做旋转、自动校正等几何处理
- 自动校正倾斜角度，并支持手动微调旋转
- 支持左转 90 度、右转 90 度、旋转归零
- 可选自动裁边，默认关闭
- 支持 4.5 x 3.5 cm、3.5 x 4.5 cm、1 寸、2 寸、1:1 等裁剪规格
- 导出文件名自动携带裁剪规格和像素尺寸
- 导出 PNG 或 JPEG
- 最近图片历史，方便切回刚处理过的文件

### 技术栈

- React
- TypeScript
- Vite
- Canvas image processing
- Lucide React icons

### 本地开发

```bash
npm install
npm run dev
```

默认开发地址：

```text
http://127.0.0.1:5173/
```

### 构建

```bash
npm run build
```

构建产物会输出到 `dist/`。

### 预览生产构建

```bash
npm run preview
```

### 部署

PhotoScan Lab 可以作为静态站点部署。腾讯云 CVM 部署说明见：

```text
docs/deploy-tencent-cloud.md
```

### 隐私

PhotoScan Lab 不依赖后端服务。上传、处理、预览和导出都在浏览器本地完成。

### 仓库

https://github.com/yancen-fe/photoscan-lab

## English

PhotoScan Lab is a browser-only tool for turning uploaded photos into scan-style document images. It is designed for application materials, forms, certificates, and other upload-ready document scenarios. It can also preserve the original colors while only applying rotation and alignment adjustments.

All image processing runs locally in the browser. Images are not uploaded to a server.

### Features

- Upload or drag and drop JPG, PNG, WEBP, and BMP images
- Copier-style scan effect with visible paper edges and subtle toner grain
- Original color mode: keep the uploaded image colors while applying rotation and alignment adjustments
- Automatic deskew with manual fine rotation control
- Rotate left 90 degrees, rotate right 90 degrees, and reset rotation
- Optional automatic edge crop, disabled by default
- Crop presets including 4.5 x 3.5 cm, 3.5 x 4.5 cm, 1-inch, 2-inch, and 1:1
- Export filenames include the selected crop preset and pixel size
- Export as PNG or JPEG
- Recent image history for quickly returning to previously processed files

### Tech Stack

- React
- TypeScript
- Vite
- Canvas image processing
- Lucide React icons

### Getting Started

```bash
npm install
npm run dev
```

Default local development URL:

```text
http://127.0.0.1:5173/
```

### Build

```bash
npm run build
```

The production files are generated in `dist/`.

### Preview Production Build

```bash
npm run preview
```

### Deploy

PhotoScan Lab can be deployed as a static site. For Tencent Cloud CVM deployment, see:

```text
docs/deploy-tencent-cloud.md
```

### Privacy

PhotoScan Lab does not require a backend service. Uploading, processing, previewing, and exporting all happen locally in the browser.

### Repository

https://github.com/yancen-fe/photoscan-lab
