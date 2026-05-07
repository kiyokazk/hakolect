from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from .database import Base


class Folder(Base):
    __tablename__ = "folders"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    parent_id = Column(Integer, ForeignKey("folders.id", ondelete="SET NULL"), nullable=True)
    sort_order = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    parent = relationship("Folder", remote_side=[id], backref="children")
    bookmarks = relationship("Bookmark", back_populates="folder")


class Bookmark(Base):
    __tablename__ = "bookmarks"

    id = Column(Integer, primary_key=True, index=True)
    url = Column(String(2048), unique=True, nullable=False, index=True)
    title = Column(String(512), nullable=True)
    description = Column(Text, nullable=True)
    ogp_image_url = Column(String(2048), nullable=True)
    favicon_url = Column(String(2048), nullable=True)
    comment = Column(Text, nullable=True)
    folder_id = Column(Integer, ForeignKey("folders.id", ondelete="SET NULL"), nullable=True)
    sort_order = Column(Integer, default=0, nullable=False)
    source = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    folder = relationship("Folder", back_populates="bookmarks")
    bookmark_tags = relationship("BookmarkTag", back_populates="bookmark", cascade="all, delete-orphan")

    @property
    def tags(self):
        return [bt.tag for bt in self.bookmark_tags]


class Tag(Base):
    __tablename__ = "tags"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False, index=True)

    bookmark_tags = relationship("BookmarkTag", back_populates="tag", cascade="all, delete-orphan")


class BookmarkTag(Base):
    __tablename__ = "bookmark_tags"

    bookmark_id = Column(Integer, ForeignKey("bookmarks.id", ondelete="CASCADE"), primary_key=True)
    tag_id = Column(Integer, ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True)

    __table_args__ = (UniqueConstraint("bookmark_id", "tag_id"),)

    bookmark = relationship("Bookmark", back_populates="bookmark_tags")
    tag = relationship("Tag", back_populates="bookmark_tags")
