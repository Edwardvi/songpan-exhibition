# 松潘户外文旅展览预演

用于展示六章策展内容、空间关系、山地资源、沿途协作与发展方向的三维网站。当前为方案初稿，包含R31模型、R4文案、两段视频、方向键移动及65万元预算估计。

## 上传后让其他人查看

1. 在GitHub创建公开仓库，例如 `songpan-exhibition`。
2. 将本项目解压后的全部文件和文件夹上传到仓库根目录。根目录应有 `README.md`、`.github/`、`site/`、`docs/`、`tools/`。
3. 在仓库 **Settings → Pages → Source** 选择 **GitHub Actions**。
4. 到 **Actions → Deploy Songpan exhibition → Run workflow**，选主分支并运行。
5. 工作流成功后，到 **Settings → Pages** 复制网站地址，发送给其他人。

网站地址形式为 `https://你的用户名.github.io/仓库名/`。可直接访问模型入口 `/model/`。完整操作与排错见[发布说明](docs/PUBLISH.md)。工作流会验证资产，再自动发布 `site/`，无需安装npm或编译网站。[GitHub官方Pages工作流说明](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)。

## 项目内容

- 宣传片、沉浸区、资源展示、五方协作、平台运行、发展展望，共六章，每章三个视点；首次进入为整栋建筑鸟瞰。
- 入口LED动态宣传片与沉浸区三墙连续影像，声音、进度、静态切换与暂停控制。
- 松潘县地形模型、公路铁路与独立徒步资料标记，资源总图与清晰画面切换。
- 居中章节阅读、预算汇总、47项清单与DOCX预算表下载。

发布目录目前包含 **45个网站文件，共98.15MiB**。宣传片分享版为720p、24fps、H.264/AAC、24.34MiB，完整时长与声音保留；压缩后的观感由用户检查。沉浸视频保持原文件。所有单个文件均小于25MiB，可用GitHub网页上传；上传规则见[GitHub官方说明](https://docs.github.com/en/repositories/working-with-files/managing-files/adding-a-file-to-a-repository)。

## 本地预览

在项目根目录运行：

```bash
python tools/preview.py
```

打开 `http://127.0.0.1:8080/`。此脚本需要Python3.9及以上，支持视频按字节读取与拖动进度。网页本身使用浏览器原生模块与本地Three.js，不依赖Python后台；GitHub Pages负责直接托管文件。

```bash
python tools/verify_release.py
```

可检查资产哈希、模型、视点、预算与文件大小。项目采用相对路径，仓库名改变时无需修改资源地址。

## 文件结构

```text
.github/workflows/pages.yml  自动发布配置
site/index.html             网站入口
site/model/                 页面、脚本和样式
site/model/assets/          R31分区模型、贴图、视点和文案
site/model/media/           宣传片与沉浸参考视频
site/model/data/            预算明细
site/model/downloads/       DOCX预算表
site/model/vendor/          本地Three.js及许可证
docs/                       发布、项目、来源及校核说明
tools/                      本地预览与资产校核
```

最新网站所需的全部资产已随项目收齐。Blender制作源和历史版本继续保留在原工作区，发布包固定使用当前R31模型。项目范围与维护入口见[项目说明](docs/PROJECT.md)，资料归属和第三方许可见[资产来源](docs/ASSET_SOURCES.md)。
