# 中文字体放置说明

本目录用于存放 pdfmake 生成 PDF 所需的中文字体文件。

## 需要放入的字体文件

| 文件名 | 用途 |
|--------|------|
| `NotoSansSC-Regular.otf` | 常规体（用于正常文字） |
| `NotoSansSC-Bold.otf` | 粗体（用于标题、加粗文字） |

## 字体下载方式

### 方式一：思源黑体（Noto Sans SC）推荐
开源免费，支持简体中文。

1. 访问 GitHub 发布页：
   https://github.com/notofonts/noto-cjk/releases
2. 下载 `NotoSansSC.zip`（Sans 版本）
3. 解压后找到 `NotoSansSC-Regular.otf` 和 `NotoSansSC-Bold.otf`
4. 将这两个文件复制到本 `fonts/` 目录下

### 方式二：阿里巴巴普惠体
免费商用，字形现代。

1. 访问：
   https://fonts.alibabadesign.com/
2. 下载阿里巴巴普惠体 Regular 和 Bold
3. 如果下载的是 TTF 格式，请将文件名改为：
   - `NotoSansSC-Regular.otf`（或保持 `.ttf` 后缀，同时修改 index.js 中的路径）
   - `NotoSansSC-Bold.otf`

## 注意事项

1. **文件大小**：每个字体文件约 4-6MB，两个共约 10MB。上传云函数时会一并打包，请确保云函数总体积未超限（阿里云通常 50MB 以内）。
2. **文件名必须严格匹配**：如果字体文件后缀是 `.ttf` 而非 `.otf`，需要修改 `index.js` 中对应的路径。
3. **版权问题**：思源黑体（SIL Open Font License）和阿里巴巴普惠体均可免费商用，请放心使用。
