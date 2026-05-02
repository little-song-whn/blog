# 图片放这里

把文章里要用的图片直接丢进这个目录(或者按文章名建子目录,例如 `late-night-walk/sunset.jpg`)。

在 Markdown 里这样引用:

```markdown
![夜晚的紫金山](/static/images/late-night-walk/sunset.jpg)
```

注意:**路径以 `/static/` 开头**(绝对路径)。`build.py` 会在构建时自动加上 base_url 前缀,本地预览和部署到 GitHub Pages 都能正常显示。

## 推荐的图片处理

- 格式:`.jpg`(照片)或 `.png`(截图、图表)
- 宽度:不超过 1600px(再大就是浪费流量)
- 文件名:小写英文 + 连字符,例如 `nanjing-spring-2026.jpg`
