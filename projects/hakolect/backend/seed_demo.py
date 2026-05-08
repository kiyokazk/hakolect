"""
Demo seed script for hakolect.

Usage (from /backend directory):
    source .venv/bin/activate
    python seed_demo.py

Or with a custom DB path:
    DATABASE_URL=sqlite:///./data/hakolect.db python seed_demo.py

To replace existing demo data with the latest sample set:
    python seed_demo.py --force

Skips gracefully if data already exists unless --force is used.
"""

import argparse
import os
import sys

# Allow running from the backend/ directory
sys.path.insert(0, os.path.dirname(__file__))

from dotenv import load_dotenv
load_dotenv()

from app.database import SessionLocal, engine, Base
from app import models

Base.metadata.create_all(bind=engine)


DEMO_FOLDERS = [
    {"id": 1, "name": "開発メモ", "parent_id": None, "sort_order": 0},
    {"id": 2, "name": "フロントエンド", "parent_id": 1, "sort_order": 0},
    {"id": 3, "name": "デザイン参考", "parent_id": None, "sort_order": 1},
    {"id": 4, "name": "あとで読む", "parent_id": None, "sort_order": 2},
]

DEMO_BOOKMARKS = [
    # --- 開発メモ ---
    {
        "url": "https://fastapi.tiangolo.com/",
        "title": "FastAPI 公式ドキュメント",
        "description": "高速で学習コストが低く、本番運用にも向いた Python 向け Web API フレームワーク。",
        "ogp_image_url": None,
        "favicon_url": "https://fastapi.tiangolo.com/img/favicon.png",
        "comment": "hakolect のバックエンド実装で最初に確認する資料。依存注入とレスポンスモデル周りを見返す。",
        "folder_id": 1,
        "sort_order": 0,
        "tags": ["Python", "バックエンド", "API"],
    },
    {
        "url": "https://docs.sqlalchemy.org/en/20/",
        "title": "SQLAlchemy 2.0 ドキュメント",
        "description": "Python 向け ORM / SQL ツールキット。2.0 系の書き方と関係定義を確認するための公式資料。",
        "ogp_image_url": None,
        "favicon_url": None,
        "comment": "Bookmark と Tag の多対多定義を見直す時に使う。日本語タグの保存確認にも使いやすい。",
        "folder_id": 1,
        "sort_order": 1,
        "tags": ["Python", "データベース", "ORM"],
    },
    {
        "url": "https://docs.docker.com/compose/",
        "title": "Docker Compose 概要",
        "description": "複数コンテナ構成の定義と起動手順を整理するための Docker 公式ガイド。",
        "ogp_image_url": None,
        "favicon_url": None,
        "comment": "ローカル確認環境をまとめて立ち上げる時の参照先。",
        "folder_id": 1,
        "sort_order": 2,
        "tags": ["Docker", "開発環境"],
    },
    # --- フロントエンド（開発メモの子） ---
    {
        "url": "https://react.dev/",
        "title": "React 公式ドキュメント",
        "description": "コンポーネント志向で UI を組み立てるための公式ドキュメント。",
        "ogp_image_url": "https://react.dev/images/og-home.png",
        "favicon_url": "https://react.dev/favicon.ico",
        "comment": "詳細パネルやモーダルの状態分離で迷った時に読む。",
        "folder_id": 2,
        "sort_order": 0,
        "tags": ["React", "フロントエンド"],
    },
    {
        "url": "https://tanstack.com/query/latest",
        "title": "TanStack Query 最新ガイド",
        "description": "非同期データ取得とキャッシュ管理のための実践的なガイド。",
        "ogp_image_url": None,
        "favicon_url": None,
        "comment": "一覧再読込や詳細更新後の反映を安定させるための参照先。",
        "folder_id": 2,
        "sort_order": 1,
        "tags": ["React", "状態管理", "データ取得"],
    },
    {
        "url": "https://tailwindcss.com/docs",
        "title": "Tailwind CSS ドキュメント",
        "description": "ユーティリティファーストな CSS フレームワークの公式ドキュメント。",
        "ogp_image_url": "https://tailwindcss.com/api/og?path=/docs",
        "favicon_url": "https://tailwindcss.com/favicons/favicon.ico",
        "comment": "一覧密度を維持しながら日本語テキストの折り返しを調整する時に使う。",
        "folder_id": 2,
        "sort_order": 2,
        "tags": ["CSS", "フロントエンド"],
    },
    {
        "url": "https://vitejs.dev/",
        "title": "Vite フロントエンドツール",
        "description": "高速な開発サーバーとビルド環境を提供するフロントエンドツール。",
        "ogp_image_url": None,
        "favicon_url": "https://vitejs.dev/logo.svg",
        "comment": "ローカル確認を素早く回したい時の基本。",
        "folder_id": 2,
        "sort_order": 3,
        "tags": ["JavaScript", "開発体験"],
    },
    # --- デザイン参考 ---
    {
        "url": "https://www.refactoringui.com/",
        "title": "Refactoring UI",
        "description": "開発者向けに UI デザインの考え方を整理した実践書。",
        "ogp_image_url": None,
        "favicon_url": None,
        "comment": "カードの情報優先順位や余白感を決める時の参考。",
        "folder_id": 3,
        "sort_order": 0,
        "tags": ["デザイン", "UI"],
    },
    {
        "url": "https://lucide.dev/icons/",
        "title": "Lucide Icons",
        "description": "軽量で統一感のあるオープンソースアイコンセット。",
        "ogp_image_url": None,
        "favicon_url": None,
        "comment": "削除導線やメニューアイコンの差し替え候補を探す時に便利。",
        "folder_id": 3,
        "sort_order": 1,
        "tags": ["デザイン", "アイコン"],
    },
    # --- あとで読む ---
    {
        "url": "https://www.joelonsoftware.com/2002/01/06/fire-and-motion/",
        "title": "Fire And Motion",
        "description": "ソフトウェア開発で勢いを維持する重要性を語る定番エッセイ。",
        "ogp_image_url": None,
        "favicon_url": None,
        "comment": "手が止まりそうな時に読み返す。",
        "folder_id": 4,
        "sort_order": 0,
        "tags": ["読み物", "開発思考"],
    },
    {
        "url": "https://www.paulgraham.com/makersschedule.html",
        "title": "Maker's Schedule, Manager's Schedule",
        "description": "作る人と管理する人で時間の使い方がどう違うかを説明する有名な記事。",
        "ogp_image_url": None,
        "favicon_url": None,
        "comment": "集中時間を守りたい時の再確認用。",
        "folder_id": 4,
        "sort_order": 1,
        "tags": ["読み物", "働き方"],
    },
    # --- Unsorted ---
    {
        "url": "https://developer.mozilla.org/ja/docs/Web/API/Intersection_Observer_API",
        "title": "Intersection Observer API - MDN",
        "description": "要素の表示状態変化を非同期で監視するための Web API 解説。",
        "ogp_image_url": None,
        "favicon_url": "https://developer.mozilla.org/favicon.ico",
        "comment": "無限スクロールや遅延読み込みを試す時の候補。まだ未整理。",
        "folder_id": None,
        "sort_order": 0,
        "tags": ["JavaScript", "未整理"],
    },
    {
        "url": "https://caniuse.com/",
        "title": "Can I use... ブラウザ対応表",
        "description": "最新の CSS / JavaScript 機能が各ブラウザで使えるか確認できる一覧。",
        "ogp_image_url": None,
        "favicon_url": None,
        "comment": "新しい UI を入れる前に必ず確認する。",
        "folder_id": None,
        "sort_order": 1,
        "tags": ["CSS", "JavaScript", "互換性"],
    },
]


def clear_existing_demo_data(db):
    db.query(models.BookmarkTag).delete()
    db.query(models.Bookmark).delete()
    db.query(models.Tag).delete()
    db.query(models.Folder).delete()
    db.flush()


def seed(force=False):
    db = SessionLocal()
    try:
        existing_count = db.query(models.Bookmark).count()
        if existing_count > 0 and not force:
            print(f"Database already has {existing_count} bookmark(s). Skipping seed.")
            print("To replace existing data with the latest sample set, run: python seed_demo.py --force")
            return

        if existing_count > 0 and force:
            print(f"Existing data found ({existing_count} bookmark(s)). Replacing with latest Japanese-centered sample data...")
            clear_existing_demo_data(db)

        print("Seeding Japanese-centered demo data...")

        # Create folders
        folder_map = {}
        for folder_data in DEMO_FOLDERS:
            folder = models.Folder(
                name=folder_data["name"],
                parent_id=folder_data["parent_id"],
                sort_order=folder_data["sort_order"],
            )
            db.add(folder)
            db.flush()
            folder_map[folder_data["id"]] = folder.id
            print(f"  Folder: {folder_data['name']} (id={folder.id})")

        # Update parent_ids to use real DB ids
        for folder_data in DEMO_FOLDERS:
            if folder_data["parent_id"] is not None:
                real_id = folder_map[folder_data["id"]]
                real_parent_id = folder_map[folder_data["parent_id"]]
                db.query(models.Folder).filter(models.Folder.id == real_id).update(
                    {"parent_id": real_parent_id}
                )

        db.flush()

        # Create bookmarks and tags
        tag_cache = {}
        for bookmark_data in DEMO_BOOKMARKS:
            real_folder_id = (
                folder_map[bookmark_data["folder_id"]]
                if bookmark_data["folder_id"] is not None
                else None
            )
            bookmark = models.Bookmark(
                url=bookmark_data["url"],
                title=bookmark_data["title"],
                description=bookmark_data["description"],
                ogp_image_url=bookmark_data["ogp_image_url"],
                favicon_url=bookmark_data["favicon_url"],
                comment=bookmark_data["comment"],
                folder_id=real_folder_id,
                sort_order=bookmark_data["sort_order"],
            )
            db.add(bookmark)
            db.flush()

            for tag_name in bookmark_data.get("tags", []):
                if tag_name not in tag_cache:
                    tag = db.query(models.Tag).filter(models.Tag.name == tag_name).first()
                    if not tag:
                        tag = models.Tag(name=tag_name)
                        db.add(tag)
                        db.flush()
                    tag_cache[tag_name] = tag.id
                bookmark_tag = models.BookmarkTag(
                    bookmark_id=bookmark.id,
                    tag_id=tag_cache[tag_name],
                )
                db.add(bookmark_tag)

            print(f"  Bookmark: {bookmark_data['title'][:50]}")

        db.commit()
        print(f"\nDone! Inserted {len(DEMO_FOLDERS)} folders and {len(DEMO_BOOKMARKS)} bookmarks.")
        print("Start the backend and open http://localhost:5173/hakolect/ to verify hakolect.")

    except Exception as e:
        db.rollback()
        print(f"Error: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed hakolect demo data")
    parser.add_argument(
        "--force",
        action="store_true",
        help="Replace existing data with the latest demo sample set",
    )
    args = parser.parse_args()
    seed(force=args.force)
