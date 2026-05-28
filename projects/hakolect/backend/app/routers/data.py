import json
import re
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import JSONResponse
from sqlalchemy import func
from sqlalchemy.orm import Session, selectinload

from .. import models
from ..auth import optional_api_key
from ..database import get_db

router = APIRouter(prefix="/data", tags=["data"])

EXPORT_VERSION = "1.0"
FILENAME_SAFE_RE = re.compile(r"[^A-Za-z0-9._-]+")


def _isoformat(value: Optional[datetime]) -> Optional[str]:
    if value is None:
        return None
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


def _parse_datetime(value: Optional[str]) -> Optional[datetime]:
    if not value or not isinstance(value, str):
        return None
    normalized = value.replace("Z", "+00:00")
    try:
        parsed = datetime.fromisoformat(normalized)
    except ValueError:
        return None
    if parsed.tzinfo is not None:
        parsed = parsed.astimezone(timezone.utc).replace(tzinfo=None)
    return parsed


def _today_string() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def _safe_filename_part(value: str) -> str:
    cleaned = FILENAME_SAFE_RE.sub("-", value.strip()).strip("-._")
    return cleaned or "folder"


def _content_disposition(filename: str) -> Dict[str, str]:
    return {
        "Content-Disposition": f'attachment; filename="{filename}"',
        "Content-Type": "application/json",
    }


def _load_folders(db: Session) -> List[models.Folder]:
    return db.query(models.Folder).order_by(models.Folder.parent_id.asc().nullsfirst(), models.Folder.sort_order.asc(), models.Folder.id.asc()).all()


def _folder_maps(folders: List[models.Folder]) -> Tuple[Dict[int, models.Folder], Dict[Optional[int], List[models.Folder]], Dict[int, str]]:
    by_id = {folder.id: folder for folder in folders}
    child_map: Dict[Optional[int], List[models.Folder]] = {}
    path_map: Dict[int, str] = {}

    for folder in folders:
        child_map.setdefault(folder.parent_id, []).append(folder)

    def build_path(folder: models.Folder) -> str:
        cached = path_map.get(folder.id)
        if cached:
            return cached
        parts = [folder.name]
        current = folder.parent_id
        seen = {folder.id}
        while current is not None and current in by_id and current not in seen:
            seen.add(current)
            parent = by_id[current]
            parts.append(parent.name)
            current = parent.parent_id
        path = " / ".join(reversed(parts))
        path_map[folder.id] = path
        return path

    for folder in folders:
        build_path(folder)

    for siblings in child_map.values():
        siblings.sort(key=lambda item: (item.sort_order, item.id))

    return by_id, child_map, path_map


def _build_folder_export_tree(
    child_map: Dict[Optional[int], List[models.Folder]],
    folder: models.Folder,
    path_map: Dict[int, str],
) -> Dict[str, Any]:
    return {
        "name": folder.name,
        "path": path_map[folder.id],
        "sort_order": folder.sort_order,
        "children": [
            _build_folder_export_tree(child_map, child, path_map)
            for child in child_map.get(folder.id, [])
        ],
    }


def _collect_descendant_ids(child_map: Dict[Optional[int], List[models.Folder]], root_id: int) -> List[int]:
    collected: List[int] = []
    stack = [root_id]
    while stack:
        current = stack.pop()
        collected.append(current)
        children = child_map.get(current, [])
        for child in reversed(children):
            stack.append(child.id)
    return collected


def _serialize_bookmark(bookmark: models.Bookmark) -> Dict[str, Any]:
    return {
        "url": bookmark.url,
        "title": bookmark.title,
        "description": bookmark.description,
        "ogp_image_url": bookmark.ogp_image_url,
        "favicon_url": bookmark.favicon_url,
        "comment": bookmark.comment,
        "folder_path": bookmark.folder_path,
        "sort_order": bookmark.sort_order,
        "source": bookmark.source,
        "tags": bookmark.tags,
        "created_at": _isoformat(bookmark.created_at),
        "updated_at": _isoformat(bookmark.updated_at),
    }


def _bookmarks_query(db: Session):
    return db.query(models.Bookmark).options(
        selectinload(models.Bookmark.bookmark_tags).selectinload(models.BookmarkTag.tag),
        selectinload(models.Bookmark.folder),
    )


def _build_export_payload(
    *,
    scope: str,
    folders_tree: List[Dict[str, Any]],
    bookmarks: List[models.Bookmark],
    tags: List[str],
    stats: Dict[str, int],
    folder_name: Optional[str] = None,
    folder_path: Optional[str] = None,
) -> Dict[str, Any]:
    meta: Dict[str, Any] = {
        "version": EXPORT_VERSION,
        "exported_at": _isoformat(datetime.now(timezone.utc)),
        "scope": scope,
        "stats": stats,
    }
    if folder_name is not None:
        meta["folder_name"] = folder_name
    if folder_path is not None:
        meta["folder_path"] = folder_path

    return {
        "hakolect_export": meta,
        "folders": folders_tree,
        "tags": tags,
        "bookmarks": [_serialize_bookmark(bookmark) for bookmark in bookmarks],
    }


@router.get("/export")
def export_all_data(
    db: Session = Depends(get_db),
    _: Optional[str] = Depends(optional_api_key),
):
    folders = _load_folders(db)
    _, child_map, path_map = _folder_maps(folders)
    bookmarks = _bookmarks_query(db).order_by(models.Bookmark.folder_id.asc().nullsfirst(), models.Bookmark.sort_order.asc(), models.Bookmark.id.asc()).all()
    tags = [name for (name,) in db.query(models.Tag.name).order_by(models.Tag.name.asc()).all()]

    payload = _build_export_payload(
        scope="full",
        folders_tree=[
            _build_folder_export_tree(child_map, folder, path_map)
            for folder in child_map.get(None, [])
        ],
        bookmarks=bookmarks,
        tags=tags,
        stats={
            "bookmarks_count": len(bookmarks),
            "folders_count": len(folders),
            "tags_count": len(tags),
        },
    )

    return JSONResponse(
        content=payload,
        headers=_content_disposition(f"hakolect-export-{_today_string()}.json"),
    )


@router.get("/export/folder/{folder_id}")
def export_folder_data(
    folder_id: int,
    db: Session = Depends(get_db),
    _: Optional[str] = Depends(optional_api_key),
):
    folders = _load_folders(db)
    by_id, child_map, path_map = _folder_maps(folders)
    folder = by_id.get(folder_id)
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")

    descendant_ids = _collect_descendant_ids(child_map, folder_id)
    bookmarks = _bookmarks_query(db).filter(models.Bookmark.folder_id.in_(descendant_ids)).order_by(models.Bookmark.folder_id.asc(), models.Bookmark.sort_order.asc(), models.Bookmark.id.asc()).all()
    tag_names = sorted({tag for bookmark in bookmarks for tag in bookmark.tags})

    payload = _build_export_payload(
        scope="folder",
        folder_name=folder.name,
        folder_path=path_map[folder.id],
        folders_tree=[_build_folder_export_tree(child_map, folder, path_map)],
        bookmarks=bookmarks,
        tags=tag_names,
        stats={
            "bookmarks_count": len(bookmarks),
            "subfolders_count": max(len(descendant_ids) - 1, 0),
            "tags_count": len(tag_names),
        },
    )

    filename = f"hakolect-export-{_safe_filename_part(folder.name)}-{_today_string()}.json"
    return JSONResponse(content=payload, headers=_content_disposition(filename))


@router.get("/export/unsorted")
def export_unsorted_data(
    db: Session = Depends(get_db),
    _: Optional[str] = Depends(optional_api_key),
):
    bookmarks = _bookmarks_query(db).filter(models.Bookmark.folder_id.is_(None)).order_by(models.Bookmark.sort_order.asc(), models.Bookmark.id.asc()).all()
    tag_names = sorted({tag for bookmark in bookmarks for tag in bookmark.tags})

    payload = _build_export_payload(
        scope="unsorted",
        folders_tree=[],
        bookmarks=bookmarks,
        tags=tag_names,
        stats={
            "bookmarks_count": len(bookmarks),
            "tags_count": len(tag_names),
        },
    )

    return JSONResponse(
        content=payload,
        headers=_content_disposition(f"hakolect-export-unsorted-{_today_string()}.json"),
    )


def _parse_folder_tree(nodes: List[Dict[str, Any]]) -> List[Tuple[str, int, Optional[datetime]]]:
    items: List[Tuple[str, int, Optional[datetime]]] = []

    def walk(children: List[Dict[str, Any]]):
        for node in children or []:
            path = str(node.get("path") or "").strip()
            if path:
                items.append((path, int(node.get("sort_order") or 0), _parse_datetime(node.get("created_at"))))
            walk(node.get("children") or [])

    walk(nodes)
    return items


def _find_folder_by_name(db: Session, parent_id: Optional[int], name: str) -> Optional[models.Folder]:
    query = db.query(models.Folder).filter(models.Folder.name == name)
    if parent_id is None:
        query = query.filter(models.Folder.parent_id.is_(None))
    else:
        query = query.filter(models.Folder.parent_id == parent_id)
    return query.first()


def _ensure_folder_path(
    db: Session,
    folder_path: str,
    *,
    created_at: Optional[datetime] = None,
    path_sort_orders: Optional[Dict[str, int]] = None,
    cache: Optional[Dict[str, models.Folder]] = None,
) -> Tuple[models.Folder, int]:
    normalized = " / ".join(part.strip() for part in folder_path.split("/") if part.strip())
    if not normalized:
        raise ValueError("Invalid folder path")

    created_count = 0
    current_path_parts: List[str] = []
    parent_id: Optional[int] = None
    folder: Optional[models.Folder] = None

    for part in [segment.strip() for segment in normalized.split(" / ") if segment.strip()]:
        current_path_parts.append(part)
        current_path = " / ".join(current_path_parts)
        if cache and current_path in cache:
            folder = cache[current_path]
            parent_id = folder.id
            continue

        folder = _find_folder_by_name(db, parent_id, part)
        if folder is None:
            next_sort_order = path_sort_orders.get(current_path, 0) if path_sort_orders else 0
            folder = models.Folder(
                name=part,
                parent_id=parent_id,
                sort_order=next_sort_order,
                created_at=created_at or datetime.utcnow(),
            )
            db.add(folder)
            db.flush()
            created_count += 1
        if cache is not None:
            cache[current_path] = folder
        parent_id = folder.id

    if folder is None:
        raise ValueError("Invalid folder path")
    return folder, created_count


@router.post("/import")
async def import_data(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _: Optional[str] = Depends(optional_api_key),
):
    try:
        raw = await file.read()
        payload = json.loads(raw.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise HTTPException(
            status_code=400,
            detail="Invalid file format. Expected Hakolect export JSON with version 1.0.",
        ) from exc

    export_meta = payload.get("hakolect_export")
    bookmarks_payload = payload.get("bookmarks")
    folders_payload = payload.get("folders", [])

    if not isinstance(export_meta, dict) or export_meta.get("version") != EXPORT_VERSION or not isinstance(bookmarks_payload, list):
        raise HTTPException(
            status_code=400,
            detail="Invalid file format. Expected Hakolect export JSON with version 1.0.",
        )

    folder_cache: Dict[str, models.Folder] = {}
    existing_folders = _load_folders(db)
    _, _, existing_path_map = _folder_maps(existing_folders)
    for folder in existing_folders:
        folder_cache[existing_path_map[folder.id]] = folder

    path_sort_orders = {path: sort_order for path, sort_order, _ in _parse_folder_tree(folders_payload)}
    folder_created_at = {path: created_at for path, _, created_at in _parse_folder_tree(folders_payload)}

    folders_created = 0
    for path, _, created_at in _parse_folder_tree(folders_payload):
        _, created = _ensure_folder_path(
            db,
            path,
            created_at=created_at or folder_created_at.get(path),
            path_sort_orders=path_sort_orders,
            cache=folder_cache,
        )
        folders_created += created

    tag_cache = {tag.name: tag for tag in db.query(models.Tag).all()}
    bookmark_sort_cache: Dict[Optional[int], int] = {}
    imported_bookmarks = 0
    skipped_duplicates = 0
    tags_created = 0

    for item in bookmarks_payload:
        if not isinstance(item, dict):
            continue

        url = str(item.get("url") or "").strip()
        if not url:
            continue

        existing_bookmark = db.query(models.Bookmark).filter(models.Bookmark.url == url).first()
        if existing_bookmark:
            skipped_duplicates += 1
            continue

        folder_id = None
        folder_path = item.get("folder_path")
        if isinstance(folder_path, str) and folder_path.strip():
            folder, created = _ensure_folder_path(
                db,
                folder_path,
                created_at=folder_created_at.get(folder_path.strip()),
                path_sort_orders=path_sort_orders,
                cache=folder_cache,
            )
            folder_id = folder.id
            folders_created += created

        if folder_id not in bookmark_sort_cache:
            query = db.query(func.max(models.Bookmark.sort_order))
            if folder_id is None:
                query = query.filter(models.Bookmark.folder_id.is_(None))
            else:
                query = query.filter(models.Bookmark.folder_id == folder_id)
            bookmark_sort_cache[folder_id] = (query.scalar() or -1) + 1

        created_at = _parse_datetime(item.get("created_at")) or datetime.utcnow()
        updated_at = _parse_datetime(item.get("updated_at")) or created_at

        bookmark = models.Bookmark(
            url=url,
            title=item.get("title"),
            description=item.get("description"),
            ogp_image_url=item.get("ogp_image_url"),
            favicon_url=item.get("favicon_url"),
            comment=item.get("comment"),
            folder_id=folder_id,
            sort_order=bookmark_sort_cache[folder_id],
            source=item.get("source") or "import",
            created_at=created_at,
            updated_at=updated_at,
        )
        bookmark_sort_cache[folder_id] += 1
        db.add(bookmark)
        db.flush()

        seen_tag_names = set()
        for raw_tag in item.get("tags", []) or []:
            tag_name = raw_tag.get("name") if isinstance(raw_tag, dict) else raw_tag
            if not isinstance(tag_name, str):
                continue
            normalized_tag = tag_name.strip()
            if not normalized_tag or normalized_tag in seen_tag_names:
                continue
            seen_tag_names.add(normalized_tag)
            tag = tag_cache.get(normalized_tag)
            if tag is None:
                tag = models.Tag(name=normalized_tag)
                db.add(tag)
                db.flush()
                tag_cache[normalized_tag] = tag
                tags_created += 1
            db.add(models.BookmarkTag(bookmark_id=bookmark.id, tag_id=tag.id))

        imported_bookmarks += 1

    db.commit()

    return {
        "imported": {
            "bookmarks": imported_bookmarks,
            "folders": folders_created,
            "tags": tags_created,
        },
        "skipped": {
            "bookmarks": skipped_duplicates,
            "reason": "duplicate_url",
        },
    }
