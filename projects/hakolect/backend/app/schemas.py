from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, HttpUrl


# Tag schemas
class TagBase(BaseModel):
    name: str


class TagCreate(TagBase):
    pass


class TagOut(TagBase):
    id: int

    class Config:
        from_attributes = True


class TagWithCount(TagOut):
    usage_count: int


# Folder schemas
class FolderBase(BaseModel):
    name: str
    parent_id: Optional[int] = None
    sort_order: int = 0


class FolderCreate(FolderBase):
    pass


class FolderUpdate(BaseModel):
    name: Optional[str] = None
    parent_id: Optional[int] = None
    sort_order: Optional[int] = None


class FolderOut(FolderBase):
    id: int
    created_at: datetime
    children: List["FolderOut"] = []

    class Config:
        from_attributes = True


FolderOut.model_rebuild()


# Bookmark schemas
class BookmarkBase(BaseModel):
    url: str
    title: Optional[str] = None
    description: Optional[str] = None
    ogp_image_url: Optional[str] = None
    favicon_url: Optional[str] = None
    comment: Optional[str] = None
    folder_id: Optional[int] = None
    sort_order: int = 0
    source: Optional[str] = None


class BookmarkCreate(BookmarkBase):
    tags: List[str] = []


class BookmarkUpdate(BaseModel):
    url: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    ogp_image_url: Optional[str] = None
    favicon_url: Optional[str] = None
    comment: Optional[str] = None
    folder_id: Optional[int] = None
    sort_order: Optional[int] = None
    source: Optional[str] = None
    tags: Optional[List[str]] = None


class BookmarkOut(BookmarkBase):
    id: int
    tags: List[TagOut] = []
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class BookmarkListResponse(BaseModel):
    items: List[BookmarkOut]
    total: int
    unsorted_count: int


# Meta fetch schemas
class FetchMetaRequest(BaseModel):
    url: str


class FetchMetaResponse(BaseModel):
    url: str
    title: Optional[str] = None
    description: Optional[str] = None
    ogp_image_url: Optional[str] = None
    favicon_url: Optional[str] = None


# Reorder schemas
class ReorderItem(BaseModel):
    id: int
    sort_order: int


class ReorderRequest(BaseModel):
    items: List[ReorderItem]


class DeleteFolderResponse(BaseModel):
    deleted_folder_id: int
    moved_bookmarks_count: int


# Duplicate error response
class DuplicateBookmarkError(BaseModel):
    detail: str
    existing_bookmark_id: int
