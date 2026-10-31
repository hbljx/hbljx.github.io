# GitHub Pages 部署

本包可直接作为静态站点发布：上传全部内容到仓库根目录（含 .nojekyll），在 Settings → Pages 选择 Deploy from a branch → main → /(root)，保存后等待部署完成。无需构建或配置 DEPLOY_PAGES。

详见根目录 [README.md](../README.md)。支持根站点及项目子路径。

如果使用其他静态托管服务，也可以直接上传完整目录；tools/build.sh 是可选压缩流程，并非 GitHub Pages 分支发布的前置步骤。
