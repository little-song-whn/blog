# Doro 的笔记

一个温暖文艺风的个人博客 —— 一边写研究,一边写生活。

## 快速开始

```powershell
# 1. 激活 Python 环境(已经预装了依赖)
conda activate PPTX

# 2. 构建并预览
python build.py --serve
# 浏览器打开 http://localhost:8000

# 3. 只构建,不预览
python build.py
```

构建产物输出到 `dist/`,直接是可部署的静态文件。

## 写一篇新文章

1. 在 `content/research/` 或 `content/life/` 新建一个 Markdown 文件,例如 `my-post.md`。
2. 头部加 frontmatter:

   ```markdown
   ---
   title: 文章标题
   subtitle: 副标题(可选)
   date: 2026-05-01
   tags: [标签1, 标签2]
   slug: my-post
   ---

   正文从这里开始...
   ```

3. 重新 build 即可。

### 支持的 Markdown 特性

- **数学公式**:行内 `$E = mc^2$`,块级 `$$ ... $$`(KaTeX 渲染)
- **代码高亮**:三个反引号包裹,带语言标记
- **脚注**:`[^1]` 引用,底部 `[^1]: 说明`
- **表格、引用、列表**(Markdown 标准)
- **目录**:在文章里写 `[TOC]`

### 插入图片

1. 把图片丢进 `static/images/`(可以按文章名建子目录,比如 `static/images/my-post/cover.jpg`)。
2. 在 Markdown 里用绝对路径引用,**必须以 `/static/` 开头**:

   ```markdown
   ![一张春天的玉兰](/static/images/my-post/cover.jpg)
   ```

3. `build.py` 会自动处理 base_url,本地预览和 GitHub Pages 部署都能正常显示,不用操心。

> 小贴士:图片宽度建议不超过 1600px,文件名用小写英文 + 连字符。

## 部署到 GitHub Pages

### 第一次部署

1. 在 GitHub 新建一个仓库,例如 `doro.github.io`(用户主页)
   或 `myblog`(项目页)。

2. 修改 `build.py` 顶部的 `SITE` 字典:
   ```python
   SITE = {
       ...
       "github": "你的 github 用户名",
       "url": "https://你的用户名.github.io",
   }
   ```

3. 如果是项目页(URL 形如 `username.github.io/myblog/`),
   修改 `.github/workflows/deploy.yml` 中的 `--base /` 为 `--base /myblog/`。

4. 推送代码:
   ```bash
   git init
   git add .
   git commit -m "initial blog"
   git branch -M main
   git remote add origin https://github.com/你的用户名/仓库名.git
   git push -u origin main
   ```

5. 在 GitHub 仓库 → Settings → Pages → Source 选择 **GitHub Actions**。

6. 等待 Actions 跑完,博客就上线了。

### 之后每次更新

写完新文章,直接:

```bash
git add .
git commit -m "new post: ..."
git push
```

Actions 会自动 build & deploy,大约 1-2 分钟后线上更新。

## 自定义

### 修改个人信息
编辑 `build.py` 中的 `SITE` 和 `ABOUT` 字典。

### 修改样式
所有视觉样式都在 `static/css/style.css`,顶部 `:root` 块定义了配色和字体。
试试改这些变量:
- `--paper`: 背景色
- `--ink`: 主文字色
- `--accent`: 强调色(默认是 terracotta 赭石红)

### 修改栏目文案
首页 hero、栏目页的标题/简介都在 `build.py` 的 `sections_meta` 字典里。

## 目录结构

```
blog/
├── build.py                # 构建脚本
├── content/                # ← 你写的内容都在这里
│   ├── research/           #   研究文章
│   └── life/               #   生活文章
├── templates/              # Jinja2 模板
├── static/css/             # 样式
├── dist/                   # 生成的静态站点(已加 gitignore)
└── .github/workflows/      # 自动部署
```

## 致谢

字体:Newsreader (Google Fonts) · Noto Serif SC (Google Fonts)
公式:KaTeX · 代码:highlight.js
