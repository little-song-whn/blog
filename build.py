#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Static site generator for Doro 的博客.
Reads Markdown from content/, renders Jinja2 templates, outputs to dist/.

Usage:
    python build.py            # build site
    python build.py --serve    # build and serve at http://localhost:8000
"""
from __future__ import annotations

import argparse
import datetime as dt
import http.server
import re
import shutil
import socketserver
from pathlib import Path
from xml.sax.saxutils import escape as xml_escape

import markdown
import yaml
from jinja2 import Environment, FileSystemLoader, select_autoescape

ROOT = Path(__file__).parent
CONTENT = ROOT / "content"
TEMPLATES = ROOT / "templates"
STATIC = ROOT / "static"
DIST = ROOT / "dist"

# ---------------------------------------------------------------------------
# Site configuration
# ---------------------------------------------------------------------------
SITE = {
    "title": "Doro 的笔记",
    "description": "在研究与生活之间,留下一些思考的痕迹。",
    "author": "Doro",
    "email": "231300049@smail.nju.edu.cn",
    "github": "little-song-whn",
    "url": "https://little-song-whn.github.io/blog",
}

# ---------------------------------------------------------------------------
# About-page data (来自简历)
# ---------------------------------------------------------------------------
ABOUT = {
    "subtitle": "强化学习 · 具身智能 · 偶尔散步与写字",
    "intro_html": """
        <p>你好,我是 Doro —— 一个还在路上、和机器人、强化学习以及一群比我聪明得多的研究者打交道的人。
        平日里,我穿梭于代码、论文、真机数据之间;周末,我喜欢散步、读书、记录一些不算成熟的想法。</p>
        <p>这个博客是我的两个角落:一边写下科研路上的笔记与思考,一边记录生活里的小事与感受。
        如果你也在做相关的研究,或恰好读到了一些让你有共鸣的文字,欢迎写信给我。</p>
    """,
    "interests": (
        "强化学习 · 具身智能 · Vision-Language-Action 模型 · World Models · "
        "Real2Sim · 以及一切能让 AI 更好理解世界、与世界交互的方向。"
    ),
}

# ---------------------------------------------------------------------------
# Markdown setup
# ---------------------------------------------------------------------------
MD_EXTENSIONS = [
    "fenced_code",
    "codehilite",
    "tables",
    "footnotes",
    "toc",
    "attr_list",
    "md_in_html",
    "smarty",
]
MD_CONFIG = {
    "codehilite": {"css_class": "hl", "guess_lang": False},
    "toc": {"permalink": False},
}


def md_to_html(text: str) -> str:
    md = markdown.Markdown(extensions=MD_EXTENSIONS, extension_configs=MD_CONFIG)
    return md.convert(text)


# ---------------------------------------------------------------------------
# Post loading
# ---------------------------------------------------------------------------
FRONTMATTER_RE = re.compile(r"^---\s*\n(.*?)\n---\s*\n(.*)$", re.DOTALL)


def parse_post(path: Path, section: str) -> dict:
    raw = path.read_text(encoding="utf-8")
    m = FRONTMATTER_RE.match(raw)
    if not m:
        raise ValueError(f"Missing frontmatter in {path}")
    meta = yaml.safe_load(m.group(1)) or {}
    body = m.group(2)
    html = md_to_html(body)

    # Reading time: ~300 cn chars / minute, ~250 en words / minute combined
    plain = re.sub(r"<[^>]+>", "", html)
    chars = len(plain)
    reading_time = max(1, round(chars / 400))

    date = meta.get("date")
    if isinstance(date, str):
        date = dt.date.fromisoformat(date)
    elif isinstance(date, dt.datetime):
        date = date.date()

    slug = meta.get("slug") or path.stem
    url = f"{section}/{slug}/"

    return {
        "title": meta["title"],
        "subtitle": meta.get("subtitle"),
        "date": date,
        "date_display": date.strftime("%Y · %m · %d") if date else "",
        "tags": meta.get("tags", []),
        "slug": slug,
        "section": section,
        "url": url,
        "content_html": html,
        "reading_time": reading_time,
    }


def load_section(section: str) -> list[dict]:
    section_dir = CONTENT / section
    if not section_dir.exists():
        return []
    posts = [
        parse_post(p, section)
        for p in section_dir.glob("*.md")
        if not p.name.startswith("_")
    ]
    posts.sort(key=lambda p: p["date"] or dt.date.min, reverse=True)
    return posts


# ---------------------------------------------------------------------------
# Build
# ---------------------------------------------------------------------------
def build(base_url: str = "/") -> None:
    if DIST.exists():
        shutil.rmtree(DIST)
    DIST.mkdir(parents=True)

    # Copy static assets
    if STATIC.exists():
        shutil.copytree(STATIC, DIST / "static")

    env = Environment(
        loader=FileSystemLoader(str(TEMPLATES)),
        autoescape=select_autoescape(["html"]),
        trim_blocks=True,
        lstrip_blocks=True,
    )

    research_posts = load_section("research")
    life_posts = load_section("life")
    all_posts = research_posts + life_posts

    # Rewrite absolute /static/ paths so images work under any base_url
    # (local serve uses "/", GitHub project pages use "/blog/", etc.)
    for post in all_posts:
        post["content_html"] = (
            post["content_html"]
            .replace('src="/static/', f'src="{base_url}static/')
            .replace('href="/static/', f'href="{base_url}static/')
        )

    base_ctx = {
        "site": SITE,
        "root": base_url,
        "year": dt.date.today().year,
    }

    # Homepage
    (DIST / "index.html").write_text(
        env.get_template("index.html").render(
            research_posts=research_posts,
            life_posts=life_posts,
            **base_ctx,
        ),
        encoding="utf-8",
    )

    # Section pages
    sections_meta = {
        "research": {
            "section_title": "研究",
            "section_title_en": "Research",
            "section_heading": "在公式与代码之间寻找答案",
            "section_intro": "这里收录我科研路上的笔记 —— 论文阅读、算法理解、实验复盘,以及偶尔冒出的、不一定对但值得记下的猜想。",
        },
        "life": {
            "section_title": "生活",
            "section_title_en": "Life",
            "section_heading": "在日子里慢慢生长",
            "section_intro": "研究之外,生活也是值得书写的。这里是一些散落在日常里的片段 —— 一次散步、一本书、一段心情。",
        },
    }
    for section, meta in sections_meta.items():
        section_dir = DIST / section
        section_dir.mkdir(exist_ok=True)
        posts = research_posts if section == "research" else life_posts
        (section_dir / "index.html").write_text(
            env.get_template("list.html").render(
                section=section, posts=posts, **meta, **base_ctx,
            ),
            encoding="utf-8",
        )

    # Individual posts
    for posts in (research_posts, life_posts):
        for i, post in enumerate(posts):
            post_dir = DIST / post["section"] / post["slug"]
            post_dir.mkdir(parents=True, exist_ok=True)
            prev_post = posts[i + 1] if i + 1 < len(posts) else None
            next_post = posts[i - 1] if i > 0 else None
            (post_dir / "index.html").write_text(
                env.get_template("post.html").render(
                    post=post,
                    prev_post=prev_post,
                    next_post=next_post,
                    **base_ctx,
                ),
                encoding="utf-8",
            )

    # About page
    about_dir = DIST / "about"
    about_dir.mkdir(exist_ok=True)
    (about_dir / "index.html").write_text(
        env.get_template("about.html").render(about=ABOUT, **base_ctx),
        encoding="utf-8",
    )

    # RSS feed
    write_rss(all_posts, base_url)

    # 404 page
    (DIST / "404.html").write_text(
        env.get_template("base.html").render(
            **base_ctx,
        ).replace("{% block content %}{% endblock %}", "").replace(
            "</main>",
            '<div class="wrap" style="text-align:center; padding: 80px 0;">'
            '<h1 style="font-family: var(--serif-en); font-size: 6rem; margin: 0; color: var(--accent);">404</h1>'
            '<p style="font-style: italic; color: var(--ink-soft);">这一页似乎走丢了。</p>'
            '<p><a href="' + base_url + '" style="color: var(--accent);">回到首页</a></p>'
            '</div></main>'
        ),
        encoding="utf-8",
    )

    print(f"[OK] Built {len(research_posts)} research posts, {len(life_posts)} life posts")
    print(f"[OK] Output: {DIST}")


def write_rss(posts: list[dict], base_url: str) -> None:
    items = []
    for post in posts[:20]:
        link = f"{SITE['url']}{base_url}{post['url']}"
        items.append(f"""
    <item>
      <title>{xml_escape(post['title'])}</title>
      <link>{link}</link>
      <guid>{link}</guid>
      <pubDate>{post['date'].strftime('%a, %d %b %Y 00:00:00 +0800') if post['date'] else ''}</pubDate>
      <description>{xml_escape(post.get('subtitle') or '')}</description>
    </item>""")

    rss = f"""<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>{xml_escape(SITE['title'])}</title>
    <link>{SITE['url']}{base_url}</link>
    <description>{xml_escape(SITE['description'])}</description>
    <language>zh-cn</language>
    {''.join(items)}
  </channel>
</rss>
"""
    (DIST / "feed.xml").write_text(rss, encoding="utf-8")


# ---------------------------------------------------------------------------
# Local serve
# ---------------------------------------------------------------------------
def serve(port: int = 8000) -> None:
    class Handler(http.server.SimpleHTTPRequestHandler):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, directory=str(DIST), **kwargs)

    with socketserver.TCPServer(("", port), Handler) as httpd:
        print(f"\n→ http://localhost:{port}\n")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nbye!")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--serve", action="store_true", help="serve after build")
    parser.add_argument("--port", type=int, default=8000)
    parser.add_argument("--base", default="/", help="base URL path (e.g., /myrepo/)")
    args = parser.parse_args()

    build(base_url=args.base)
    if args.serve:
        serve(port=args.port)
