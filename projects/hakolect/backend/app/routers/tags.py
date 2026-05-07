from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from .. import crud, schemas
from ..database import get_db
from ..auth import optional_api_key

router = APIRouter(prefix="/tags", tags=["tags"])


@router.get("", response_model=List[schemas.TagWithCount])
def list_tags(
    db: Session = Depends(get_db),
    _: Optional[str] = Depends(optional_api_key),
):
    return crud.get_all_tags_with_count(db)


@router.delete("/{tag_id}", status_code=204)
def delete_tag(
    tag_id: int,
    db: Session = Depends(get_db),
    _: Optional[str] = Depends(optional_api_key),
):
    ok = crud.delete_tag(db, tag_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Tag not found")
