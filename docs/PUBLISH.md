# GitHub发布说明

## 用网页上传

1. 解压项目压缩包，进入 `songpan-exhibition` 文件夹。
2. 登录GitHub，创建仓库，名称可用 `songpan-exhibition`，可见性选择Public，创建空仓库。
3. 在仓库的上传入口，或 **Add file → Upload files**，将文件夹内全部文件和子文件夹拖入。`.github` 文件夹必须上传。上传完成后提交到main分支。
4. 确认仓库首页直接能看到 `README.md` 和 `site/`。如果它们处在额外一层 `songpan-exhibition/` 里，将这层里面的内容移到仓库根目录。
5. **Settings → Pages → Build and deployment → Source** 选择 **GitHub Actions**。
6. **Actions → Deploy Songpan exhibition → Run workflow**，选择main并运行；仓库主分支为master也支持。
7. 等待build和deploy均变绿，打开 **Settings → Pages** 的网站链接。把此链接分享给参观者。

首次上传时Pages尚未开启，自动工作流可能失败；完成第5步后重新运行即可。后续向main或master更新文件，会自动验证和发布。

官方操作依据：[上传文件](https://docs.github.com/en/repositories/working-with-files/managing-files/adding-a-file-to-a-repository)、[Pages工作流](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)。GitHub网页单文件上限25MiB、每批最多100个文件；本发布包符合这两个条件。

## 使用GitHub Desktop

如果网页上传不稳定，可先在GitHub创建公开仓库，再用GitHub Desktop克隆到本机。把本包内的文件和文件夹复制进克隆目录，提交后Push origin，然后按上面的第5—7步启用Pages。媒体都是实际MP4文件，无需Git LFS。

## 常见问题

| 现象 | 检查位置 |
|---|---|
| 只有仓库文件，没有网站 | 到Settings → Pages选择GitHub Actions，并运行发布工作流 |
| 页面404 | 确认build和deploy成功；确认site/在仓库根目录，发布源为Actions |
| 模型、贴图或预算文件404 | 确认文件全部上传，目录名称和大小写保持原样；查看build的Check website files |
| 影片没有自动播放 | 点击章节或下方播放按钮；部分浏览器要求用户操作后才播放有声音的视频 |
| 修改后提示Changed asset | 修改文件后同步更新docs/asset-manifest.json中的bytes和sha256，再提交 |
| 初次进入略慢 | 需要下载约35MiB的两块分区模型；影片只在播放时加载，清晰贴图按需加载 |

## 修改文件后的校核

有意修改网站资产后，在项目根目录运行下列命令更新清单，再运行校核。它只更新随发布的网站文件清单。

```bash
python tools/update_manifest.py
python tools/verify_release.py
```

实际GitHub线上发布需要在用户自己的仓库启用Pages。本包已进行本地根路径和仓库子路径测试，尚未在用户GitHub账户上部署。
