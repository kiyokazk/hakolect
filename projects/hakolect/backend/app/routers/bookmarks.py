from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from .. import crud, schemas
from ..database import get_db
from ..auth import optional_api_key
from ..meta_fetch import fetch_meta

router = APIRouter(prefix="/bookmarks", tags=["bookmarks"])


@router.get("", response_model=schemas.BookmarkListResponse)
def list_bookmarks(
    folder_id: Optional[str] = Query(default=None),
    tag: Optional[str] = Query(default=None),
    keyword: Optional[str] = Query(default=None),
    sort: str = Query(default="created_desc"),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=500),
    db: Session = Depends(get_db),
    _: Optional[str] = Depends(optional_api_key),
):
    items, total, unsorted_count = crud.get_bookmarks(
        db, folder_id=folder_id, tag=tag, keyword=keyword, sort=sort, skip=skip, limit=limit
    )
    return {"items": items, "total": total, "unsorted_count": unsorted_count}


@router.post("", response_model=schemas.BookmarkOut, status_code=201)
def create_bookmark(
    data: schemas.BookmarkCreate,
    db: Session = Depends(get_db),
    _: Optional[str] = Depends(optional_api_key),
):
    bookmark, existing = crud.create_bookmark(db, data)
    if existing:
        raise HTTPException(
            status_code=409,
            detail={
                "message": "URL already exists",
                "existing_bookmark_id": existing.id,
            },
        )
    return bookmark


@router.post("/fetch-meta", response_model=schemas.FetchMetaResponse)
async def fetch_bookmark_meta(
    data: schemas.FetchMetaRequest,
    _: Optional[str] = Depends(optional_api_key),
):
    result = await fetch_meta(data.url)
    return result


@router.put("/reorder", status_code=204)
def reorder_bookmarks(
    data: schemas.ReorderRequest,
    db: Session = Depends(get_db),
    _: Optional[str] = Depends(optional_api_key),
):
    crud.reorder_bookmarks(db, data.items)


@router.get("/{bookmark_id}", response_model=schemas.BookmarkOut)
def get_bookmark(
    bookmark_id: int,
    db: Session = Depends(get_db),
    _: Optional[str] = Depends(optional_api_key),
):
    bookmark = crud.get_bookmark_by_id(db, bookmark_id)
    if not bookmark:
        raise HTTPException(status_code=404, detail="Bookmark not found")
    return bookmark


@router.put("/{bookmark_id}", response_model=schemas.BookmarkOut)
def update_bookmark(
    bookmark_id: int,
    data: schemas.BookmarkUpdate,
    db: Session = Depends(get_db),
    _: Optional[str] = Depends(optional_api_key),
):
    bookmark = crud.update_bookmark(db, bookmark_id, data)
    if not bookmark:
        raise HTTPException(status_code=404, detail="Bookmark not found")
    return bookmark


@router.delete("/{bookmark_id}", status_code=204)
def delete_bookmark(
    bookmark_id: int,
    db: Session = Depends(get_db),
    _: Optional[str] = Depends(optional_api_key),
):
    ok = crud.delete_bookmark(db, bookmark_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Bookmark not found")
