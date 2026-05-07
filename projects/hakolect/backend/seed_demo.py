"""
Demo seed script for Hakolect.

Usage (from /backend directory):
    source .venv/bin/activate
    python seed_demo.py

Or with a custom DB path:
    DATABASE_URL=sqlite:///./data/hakolect.db python seed_demo.py

Skips gracefully if data already exists (idempotent on re-run).
"""

import os
import sys
from datetime import datetime, timezone

# Allow running from the backend/ directory
sys.path.insert(0, os.path.dirname(__file__))

from dotenv import load_dotenv
load_dotenv()

from app.database import SessionLocal, engine, Base
from app import models

Base.metadata.create_all(bind=engine)


DEMO_FOLDERS = [
    {"id": 1, "name": "Dev Resources",   "parent_id": None, "sort_order": 0},
    {"id": 2, "name": "Frontend",        "parent_id": 1,    "sort_order": 0},
    {"id": 3, "name": "Design",          "parent_id": None, "sort_order": 1},
    {"id": 4, "name": "Reading",         "parent_id": None, "sort_order": 2},
]

DEMO_BOOKMARKS = [
    # --- Dev Resources ---
    {
        "url": "https://fastapi.tiangolo.com/",
        "title": "FastAPI",
        "description": "FastAPI framework, high performance, easy to learn, fast to code, ready for production.",
        "ogp_image_url": None,
        "favicon_url": "https://fastapi.tiangolo.com/img/favicon.png",
        "comment": "Our backend framework. Docs are excellent.",
        "folder_id": 1,
        "sort_order": 0,
        "tags": ["python", "backend", "api"],
    },
    {
        "url": "https://docs.sqlalchemy.org/en/20/",
        "title": "SQLAlchemy 2.0 Documentation",
        "description": "The Python SQL Toolkit and Object Relational Mapper",
        "ogp_image_url": None,
        "favicon_url": None,
        "comment": "ORM we use for hakolect. v2 async style.",
        "folder_id": 1,
        "sort_order": 1,
        "tags": ["python", "database"],
    },
    {
        "url": "https://docs.docker.com/compose/",
        "title": "Docker Compose overview",
        "description": "Docker Compose is a tool for defining and running multi-container applications.",
        "ogp_image_url": None,
        "favicon_url": None,
        "comment": "",
        "folder_id": 1,
        "sort_order": 2,
        "tags": ["docker", "devops"],
    },
    # --- Frontend (sub of Dev Resources) ---
    {
        "url": "https://react.dev/",
        "title": "React – The library for web and native user interfaces",
        "description": "React lets you build user interfaces out of individual pieces called components.",
        "ogp_image_url": "https://react.dev/images/og-home.png",
        "favicon_url": "https://react.dev/favicon.ico",
        "comment": "Official React docs. New docs are much better.",
        "folder_id": 2,
        "sort_order": 0,
        "tags": ["react", "javascript"],
    },
    {
        "url": "https://tanstack.com/query/latest",
        "title": "TanStack Query – Powerful asynchronous state management",
        "description": "Powerful asynchronous state management, server-state utilities and data fetching for TS/JS.",
        "ogp_image_url": None,
        "favicon_url": None,
        "comment": "React Query v5. We use this for all API fetching in hakolect.",
        "folder_id": 2,
        "sort_order": 1,
        "tags": ["react", "javascript"],
    },
    {
        "url": "https://tailwindcss.com/docs",
        "title": "Tailwind CSS Documentation",
        "description": "Documentation for the Tailwind CSS utility-first CSS framework.",
        "ogp_image_url": "https://tailwindcss.com/api/og?path=/docs",
        "favicon_url": "https://tailwindcss.com/favicons/favicon.ico",
        "comment": "v3 docs. Check migration guide before v4.",
        "folder_id": 2,
        "sort_order": 2,
        "tags": ["css", "frontend"],
    },
    {
        "url": "https://vitejs.dev/",
        "title": "Vite – Next Generation Frontend Tooling",
        "description": "Get ready for a development environment that can finally catch up with you.",
        "ogp_image_url": None,
        "favicon_url": "https://vitejs.dev/logo.svg",
        "comment": "",
        "folder_id": 2,
        "sort_order": 3,
        "tags": ["javascript", "frontend"],
    },
    # --- Design ---
    {
        "url": "https://www.refactoringui.com/",
        "title": "Refactoring UI",
        "description": "Learn UI design with the book that teaches you how to make great-looking UIs.",
        "ogp_image_url": None,
        "favicon_url": None,
        "comment": "Best resource for dev-friendly UI design principles.",
        "folder_id": 3,
        "sort_order": 0,
        "tags": ["design", "ui"],
    },
    {
        "url": "https://lucide.dev/icons/",
        "title": "Lucide Icons",
        "description": "Beautiful & consistent icon toolkit made by the community.",
        "ogp_image_url": None,
        "favicon_url": None,
        "comment": "Icons we use in hakolect.",
        "folder_id": 3,
        "sort_order": 1,
        "tags": ["design", "icons"],
    },
    # --- Reading ---
    {
        "url": "https://www.joelonsoftware.com/2002/01/06/fire-and-motion/",
        "title": "Fire And Motion – Joel on Software",
        "description": "How to get and keep momentum in software projects.",
        "ogp_image_url": None,
        "favicon_url": None,
        "comment": "Classic Joel post. Worth re-reading every year.",
        "folder_id": 4,
        "sort_order": 0,
        "tags": ["productivity"],
    },
    {
        "url": "https://www.paulgraham.com/makersschedule.html",
        "title": "Maker's Schedule, Manager's Schedule",
        "description": "The difference between how makers and managers schedule their time.",
        "ogp_image_url": None,
        "favicon_url": None,
        "comment": "Essential reading for anyone who codes.",
        "folder_id": 4,
        "sort_order": 1,
        "tags": ["productivity"],
    },
    # --- Unsorted ---
    {
        "url": "https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API",
        "title": "Intersection Observer API – MDN",
        "description": "The Intersection Observer API provides a way to asynchronously observe changes in the intersection of a target element.",
        "ogp_image_url": None,
        "favicon_url": "https://developer.mozilla.org/favicon.ico",
        "comment": "",
        "folder_id": None,
        "sort_order": 0,
        "tags": ["javascript", "api"],
    },
    {
        "url": "https://caniuse.com/",
        "title": "Can I use... browser compatibility tables",
        "description": "Browser support tables for modern web technologies.",
        "ogp_image_url": None,
        "favicon_url": None,
        "comment": "Always check before using new CSS/JS features.",
        "folder_id": None,
        "sort_order": 1,
        "tags": ["css", "javascript"],
    },
]


def seed():
    db = SessionLocal()
    try:
        existing_count = db.query(models.Bookmark).count()
        if existing_count > 0:
            print(f"Database already has {existing_count} bookmark(s). Skipping seed.")
            print("To re-seed, delete data/hakolect.db and re-run.")
            return

        print("Seeding demo data...")

        # Create folders
        folder_map = {}
        for f in DEMO_FOLDERS:
            folder = models.Folder(
                name=f["name"],
                parent_id=f["parent_id"],
                sort_order=f["sort_order"],
            )
            db.add(folder)
            db.flush()
            folder_map[f["id"]] = folder.id
            print(f"  Folder: {f['name']} (id={folder.id})")

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
        for bm_data in DEMO_BOOKMARKS:
            real_folder_id = (
                folder_map[bm_data["folder_id"]]
                if bm_data["folder_id"] is not None
                else None
            )
            bm = models.Bookmark(
                url=bm_data["url"],
                title=bm_data["title"],
                description=bm_data["description"],
                ogp_image_url=bm_data["ogp_image_url"],
                favicon_url=bm_data["favicon_url"],
                comment=bm_data["comment"],
                folder_id=real_folder_id,
                sort_order=bm_data["sort_order"],
            )
            db.add(bm)
            db.flush()

            for tag_name in bm_data.get("tags", []):
                if tag_name not in tag_cache:
                    tag = db.query(models.Tag).filter(models.Tag.name == tag_name).first()
                    if not tag:
                        tag = models.Tag(name=tag_name)
                        db.add(tag)
                        db.flush()
                    tag_cache[tag_name] = tag.id
                bt = models.BookmarkTag(bookmark_id=bm.id, tag_id=tag_cache[tag_name])
                db.add(bt)

            print(f"  Bookmark: {bm_data['title'][:50]}")

        db.commit()
        print(f"\nDone! Inserted {len(DEMO_FOLDERS)} folders and {len(DEMO_BOOKMARKS)} bookmarks.")
        print("Start the backend and open http://localhost:5173/hakolect/ to verify.")

    except Exception as e:
        db.rollback()
        print(f"Error: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
