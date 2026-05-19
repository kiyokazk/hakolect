from datetime import datetime
from typing import Optional, List
from urllib.parse import urlparse
from pydantic import BaseModel, ConfigDict, field_validator


def normalize_http_url(value: str) -> str:
    value = value.strip()
    if not value:
        raise ValueError("URL is required")

    parsed = urlparse(value)
    if parsed.scheme not in {"http", "https"}:
        raise ValueError("URL must start with http:// or https://")
    if not parsed.netloc:
        raise ValueError("URL must include a valid host")
    return value


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
    sort_order: Optional[int] = None

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Folder name is required")
        return value


class FolderCreate(FolderBase):
    pass


class FolderUpdate(BaseModel):
    name: Optional[str] = None
    parent_id: Optional[int] = None
    sort_order: Optional[int] = None

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return value
        value = value.strip()
        if not value:
            raise ValueError("Folder name is required")
        return value


class FolderOut(FolderBase):
    id: int
    bookmark_count: int = 0
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
    source: Optional[str] = "manual"


class BookmarkCreate(BookmarkBase):
    sort_order: Optional[int] = None
    tags: List[str] = []

    @field_validator("url")
    @classmethod
    def validate_url(cls, value: str) -> str:
        return normalize_http_url(value)


class BookmarkUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

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
    folder_path: Optional[str] = None
    tags: List[str] = []
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class BookmarkListResponse(BaseModel):
    items: List[BookmarkOut]
    bookmarks: List[BookmarkOut]
    total: int
    unsorted_count: int


# Meta fetch schemas
class FetchMetaRequest(BaseModel):
    url: str

    @field_validator("url")
    @classmethod
    def validate_url(cls, value: str) -> str:
        return normalize_http_url(value)


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
