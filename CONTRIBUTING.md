# 参与开发

## 日常修改

1. 同步 `main`，为一个独立功能建立分支，例如 `feature/io-alarm` 或 `fix/export-png`。
2. 修改 `src/` 或桌面代码；不要提交生成的 `app/index.html`、运行缓存、个人配置和 EXE。
3. 运行 `npm run check`、`npm test`，并在预览中验证交互。
4. 推送自己的分支，创建目标为 `main` 的 Pull Request，写清页面和验证方法。
5. 维护者审核，CI 通过后合并。有关联的子分支，先合并父分支，再更新子分支。

公开仓库中没有写权限的人，可以通过 Fork 后提交 PR；私有仓库需要先获得访问权限，并遵循仓库的 Fork 设置。有写权限的成员可以直接在仓库里建功能分支。多人同时调整同一页面时，先约定分工；Git 可以显示和合并差异，但仍需人工处理冲突。

## 基线和版本

- `main`：维护可用的统一版本。
- `feature/*`、`fix/*`：各自的功能和修复。
- `v3.0.1`：初始基线标签，保留在最初的基线提交上。
- `v3.0.2` 等标签：后续正式版本。不要把旧标签移动到新提交。

无需为每个版本保留一条永久分支。需要长期维护旧版本时，再建立 `maintenance/3.0` 等分支，并另行配置相应的发布规则；当前正式发布工作流只接受 main 的提交。

## 发布一个新版本

在自己的分支上更新版本并记录改动：

```bash
npm run version:set -- 3.0.2
npm run check
npm test
```

更新 CHANGELOG，提交并通过 PR 合并到 main。然后在最新 main 上创建并推送标签：

```bash
git switch main
git pull --ff-only
git tag -a v3.0.2 -m "Release 3.0.2"
git push origin v3.0.2
```

Release 工作流会检查标签与版本一致，并确认提交已属于 `origin/main`，随后测试、打包并创建发布草稿。维护者下载 EXE 做实际验收后，在 GitHub Releases 中发布草稿。

功能分支的单文件 EXE 试用包在 Actions 的 CI 运行页下载，保留 7 天。正式版在 Releases 下载，源码标签与 EXE 版本对应。
