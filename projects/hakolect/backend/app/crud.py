import logging
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session, selectinload
from sqlalchemy import func, or_
from . import models, schemas

logger = logging.getLogger(__name__)


def _next_bookmark_sort_order(
    db: Session,
    folder_id: Optional[int],
    exclude_bookmark_id: Optional[int] = None,
) -> int:
    query = db.query(func.max(models.Bookmark.sort_order)).filter(
        models.Bookmark.folder_id.is_(None) if folder_id is None else models.Bookmark.folder_id == folder_id
    )
    if exclude_bookmark_id is not None:
        query = query.filter(models.Bookmark.id != exclude_bookmark_id)

    max_sort_order = query.scalar()
    return 0 if max_sort_order is None else max_sort_order + 1


def _collect_descendant_folder_ids(folders: List[models.Folder], folder_id: int) -> List[int]:
    child_map: Dict[Optional[int], List[models.Folder]] = {}
    for folder in folders:
        child_map.setdefault(folder.parent_id, []).append(folder)

    ids: List[int] = []
    stack = [folder_id]
    while stack:
        current_id = stack.pop()
        ids.append(current_id)
        for child in child_map.get(current_id, []):
            stack.append(child.id)
    return ids


# ── Bookmarks ──────────────────────────────────────────────────────────────────

def get_bookmarks(
    db: Session,
    folder_id: Optional[str] = None,
    tag: Optional[str] = None,
    keyword: Optional[str] = None,
    sort: str = "created_desc",
    skip: int = 0,
    limit: int = 100,
):
    query = db.query(models.Bookmark).options(
        selectinload(models.Bookmark.bookmark_tags).selectinload(models.BookmarkTag.tag)
    )

    if folder_id == "unsorted":
        query = query.filter(models.Bookmark.folder_id.is_(None))
    elif folder_id is not None:
        try:
            fid = int(folder_id)
            query = query.filter(models.Bookmark.folder_id == fid)
        except (ValueError, TypeError):
            pass

    if tag or keyword:
        query = query.outerjoin(models.BookmarkTag).outerjoin(models.Tag)

    if tag:
        query = query.filter(models.Tag.name == tag)

    if keyword:
        kw = f"%{keyword}%"
        query = query.filter(
            or_(
                models.Bookmark.title.ilike(kw),
                models.Bookmark.url.ilike(kw),
                models.Bookmark.description.ilike(kw),
                models.Bookmark.comment.ilike(kw),
                models.Tag.name.ilike(kw),
            )
        )

    query = query.distinct()

    sort_map = {
        "created_desc": models.Bookmark.created_at.desc(),
        "created_asc": models.Bookmark.created_at.asc(),
        "title_asc": models.Bookmark.title.asc(),
        "title_desc": models.Bookmark.title.desc(),
        "sort_order": models.Bookmark.sort_order.asc(),
    }
    order_col = sort_map.get(sort, models.Bookmark.created_at.desc())
    query = query.order_by(order_col)

    total = query.count()
    items = query.offset(skip).limit(limit).all()

    unsorted_count = db.query(func.count(models.Bookmark.id)).filter(
        models.Bookmark.folder_id.is_(None)
    ).scalar()

    return items, total, unsorted_count


def get_bookmark_by_id(db: Session, bookmark_id: int):
    return (
        db.query(models.Bookmark)
        .options(selectinload(models.Bookmark.bookmark_tags).selectinload(models.BookmarkTag.tag))
        .filter(models.Bookmark.id == bookmark_id)
        .first()
    )


def get_bookmark_by_url(db: Session, url: str):
    return db.query(models.Bookmark).filter(models.Bookmark.url == url).first()


def _sync_tags(db: Session, bookmark: models.Bookmark, tag_names: List[str]):
    # Remove existing
    db.query(models.BookmarkTag).filter(
        models.BookmarkTag.bookmark_id == bookmark.id
    ).delete()
    db.flush()

    for name in tag_names:
        name = name.strip()
        if not name:
            continue
        tag = db.query(models.Tag).filter(models.Tag.name == name).first()
        if not tag:
            tag = models.Tag(name=name)
            db.add(tag)
            db.flush()
        bt = models.BookmarkTag(bookmark_id=bookmark.id, tag_id=tag.id)
        db.add(bt)
    db.flush()


def create_bookmark(db: Session, data: schemas.BookmarkCreate):
    existing = get_bookmark_by_url(db, data.url)
    if existing:
        logger.info(
            "Duplicate bookmark skipped",
            extra={
                "bookmark_url": data.url,
                "existing_bookmark_id": existing.id,
                "source": data.source,
            },
        )
        return None, existing  # caller handles 409

    bookmark = models.Bookmark(
        url=data.url,
        title=data.title,
        description=data.description,
        ogp_image_url=data.ogp_image_url,
        favicon_url=data.favicon_url,
        comment=data.comment,
        folder_id=data.folder_id,
        sort_order=data.sort_order,
        source=data.source or "manual",
    )
    db.add(bookmark)
    db.flush()
    _sync_tags(db, bookmark, data.tags)
    db.commit()
    db.refresh(bookmark)
    # reload with tags
    return get_bookmark_by_id(db, bookmark.id), None


def update_bookmark(db: Session, bookmark_id: int, data: schemas.BookmarkUpdate):
    bookmark = get_bookmark_by_id(db, bookmark_id)
    if not bookmark:
        return None

    update_data = data.model_dump(exclude_unset=True)
    tags = update_data.pop("tags", None)

    next_folder_id = update_data.get("folder_id", bookmark.folder_id)
    folder_changed = "folder_id" in update_data and next_folder_id != bookmark.folder_id
    sort_order_explicitly_set = "sort_order" in update_data
    if folder_changed and not sort_order_explicitly_set:
        update_data["sort_order"] = _next_bookmark_sort_order(
            db,
            next_folder_id,
            exclude_bookmark_id=bookmark.id,
        )

    for key, value in update_data.items():
        setattr(bookmark, key, value)

    if tags is not None:
        _sync_tags(db, bookmark, tags)

    db.commit()
    db.refresh(bookmark)
    return get_bookmark_by_id(db, bookmark_id)


def delete_bookmark(db: Session, bookmark_id: int) -> bool:
    bookmark = db.query(models.Bookmark).filter(models.Bookmark.id == bookmark_id).first()
    if not bookmark:
        return False
    db.delete(bookmark)
    db.commit()
    return True


def reorder_bookmarks(db: Session, items: List[schemas.ReorderItem]):
    for item in items:
        db.query(models.Bookmark).filter(models.Bookmark.id == item.id).update(
            {"sort_order": item.sort_order}
        )
    db.commit()


# ── Folders ───────────────────────────────────────────────────────────────────

def _build_folder_tree(
    folders: List[models.Folder],
    bookmark_counts: Dict[int, int],
    parent_id: Optional[int] = None,
):
    result = []
    for f in folders:
        if f.parent_id == parent_id:
            children = _build_folder_tree(folders, bookmark_counts, f.id)
            folder_dict = {
                "id": f.id,
                "name": f.name,
                "parent_id": f.parent_id,
                "sort_order": f.sort_order,
                "bookmark_count": bookmark_counts.get(f.id, 0),
                "created_at": f.created_at,
                "children": children,
            }
            result.append(folder_dict)
    return sorted(result, key=lambda x: x["sort_order"])


def get_all_folders_tree(db: Session):
    folders = db.query(models.Folder).all()
    bookmark_rows = (
        db.query(models.Bookmark.folder_id, func.count(models.Bookmark.id))
        .filter(models.Bookmark.folder_id.isnot(None))
        .group_by(models.Bookmark.folder_id)
        .all()
    )
    bookmark_counts = {folder_id: count for folder_id, count in bookmark_rows if folder_id is not None}
    return _build_folder_tree(folders, bookmark_counts)


def get_folder_by_id(db: Session, folder_id: int):
    return db.query(models.Folder).filter(models.Folder.id == folder_id).first()


def create_folder(db: Session, data: schemas.FolderCreate):
    folder = models.Folder(
        name=data.name,
        parent_id=data.parent_id,
        sort_order=data.sort_order,
    )
    db.add(folder)
    db.commit()
    db.refresh(folder)
    return folder


def update_folder(db: Session, folder_id: int, data: schemas.FolderUpdate):
    folder = get_folder_by_id(db, folder_id)
    if not folder:
        return None

    update_data = data.model_dump(exclude_unset=True)
    next_parent_id = update_data.get("parent_id", folder.parent_id)
    if next_parent_id == folder_id:
        raise ValueError("Folder cannot be moved into itself")

    if next_parent_id is not None:
        folders = db.query(models.Folder).all()
        subtree_ids = set(_collect_descendant_folder_ids(folders, folder_id))
        if next_parent_id in subtree_ids:
            raise ValueError("Folder cannot be moved into its descendant")

    for key, value in update_data.items():
        setattr(folder, key, value)
    db.commit()
    db.refresh(folder)
    return folder


def delete_folder(db: Session, folder_id: int):
    folder = get_folder_by_id(db, folder_id)
    if not folder:
        return None

    folders = db.query(models.Folder).all()
    subtree_ids = _collect_descendant_folder_ids(folders, folder_id)

    moved_bookmarks_count = (
        db.query(models.Bookmark)
        .filter(models.Bookmark.folder_id.in_(subtree_ids))
        .count()
    )
    if moved_bookmarks_count:
        db.query(models.Bookmark).filter(models.Bookmark.folder_id.in_(subtree_ids)).update(
            {"folder_id": None}, synchronize_session=False
        )

    db.query(models.Folder).filter(models.Folder.id.in_(subtree_ids)).delete(
        synchronize_session=False
    )
    db.commit()
    return {
        "deleted_folder_id": folder_id,
        "moved_bookmarks_count": moved_bookmarks_count,
    }


def reorder_folders(db: Session, items: List[schemas.ReorderItem]):
    for item in items:
        db.query(models.Folder).filter(models.Folder.id == item.id).update(
            {"sort_order": item.sort_order}
        )
    db.commit()


# ── Tags ──────────────────────────────────────────────────────────────────────

def get_all_tags_with_count(db: Session):
    rows = (
        db.query(models.Tag, func.count(models.BookmarkTag.bookmark_id).label("usage_count"))
        .outerjoin(models.BookmarkTag)
        .group_by(models.Tag.id)
        .order_by(models.Tag.name)
        .all()
    )
    result = []
    for tag, count in rows:
        result.append({"id": tag.id, "name": tag.name, "usage_count": count})
    return result


def delete_tag(db: Session, tag_id: int) -> bool:
    tag = db.query(models.Tag).filter(models.Tag.id == tag_id).first()
    if not tag:
        return False
    db.delete(tag)
    db.commit()
    return True


def cleanup_unused_tags(db: Session):
    unused = (
        db.query(models.Tag)
        .outerjoin(models.BookmarkTag)
        .filter(models.BookmarkTag.tag_id.is_(None))
        .all()
    )
    for tag in unused:
        db.delete(tag)
    db.commit()
