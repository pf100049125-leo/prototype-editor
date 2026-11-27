# GitHub 上手

## 第一次上传和建立基线

1. 在 GitHub 新建空仓库，名称例如 `prototype-editor`，选择公开或私有。先不要在网页端添加 README、gitignore 或许可证，以免与现有源码产生首次合并冲突。
2. 解压本项目，在 `package.json` 所在目录打开终端。上传的是解压后的源码文件，不是只上传 ZIP 或 EXE。
3. 使用自己已配置的 Git 身份执行以下命令；若尚未配置姓名和邮箱，可使用 GitHub Desktop 登录并创建首次提交，或先配置自己的 Git 身份。

```bash
git init -b main
git add .
git commit -m "chore: establish v3.0.1 baseline"
git remote add origin https://github.com/你的账号/prototype-editor.git
git push -u origin main
git tag -a v3.0.1 -m "Baseline 3.0.1"
git push origin v3.0.1
```

将示例地址换成你的仓库地址。`v3.0.1` 标记当前基线，未来分支无论如何发展，都可以定位到这次提交。本项目当前没有代你创建远程仓库或基线标签。

## 开启协作

在仓库 Settings 中添加协作者。成员从 main 新建功能分支，在自己的分支提交，再通过 Pull Request 申请合并。也可以从功能分支继续建立子分支，但成熟修改最终应汇入 main，减少长期分叉。

在 Settings 的分支保护或 Rulesets 中为 main 配置：

- 要求通过 Pull Request 合并。
- 有多人协作时，要求至少 1 人审查通过。
- 要求 `Windows checks and build` 检查通过，先等第一次 CI 运行后再选择该检查。
- 禁止强制推送和删除 main；基线标签也应限制修改和删除。

这些是 GitHub 仓库端设置，源码文件不会自动开启。私有仓库能否使用相关保护功能取决于账户套餐；以仓库界面显示的可用设置为准。

## 已配置的自动化

| 操作 | 自动执行 |
| --- | --- |
| 推送分支或创建 main 的 PR | 检查源码、运行测试、构建单文件 EXE 试用包 |
| 推送与 package.json 一致的 v 标签 | 校验 main 历史、检查、测试、构建单文件 EXE |
| 发布构建成功 | 创建含 EXE 和 SHA256SUMS 的 Release 草稿 |

试用包在 Actions 运行页的 Artifacts 下载，解压后运行单文件 EXE；通过运行记录识别对应分支和提交。维护者在 Releases 中检查并发布草稿，其他使用者下载正式 EXE 即可。

首次上传后检查 Actions 是否允许运行本仓库的工作流和官方 actions。Fork 的外部 PR 可能需要维护者批准运行。

## 版本更新

日常提交可以不改版本号；准备发布时，用 `npm run version:set -- 3.0.2` 同步 package、锁文件、窗口标题和预加载版本，再通过 PR 合并。发布命令见根目录 CONTRIBUTING.md。

Git 管理源码和历史，不会自动安装 EXE 到使用者电脑；新 EXE 仍由使用者从 Releases 下载。原型 JSON 文件的业务差异也不会自动理解，需要人工审查。

## 官方参考

- [GitHub Flow](https://docs.github.com/en/get-started/using-github/github-flow)
- [受保护分支](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)
- [版本发布](https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases)
- [Actions 工作流权限](https://docs.github.com/en/actions/tutorials/authenticate-with-github_token)

本地已检查代码与工作流结构；GitHub 上的真实运行需在上传后验证。当前不额外附加开源许可证，公开范围及授权由项目负责人确定。
