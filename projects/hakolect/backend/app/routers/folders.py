from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from .. import crud, schemas
from ..database import get_db
from ..auth import optional_api_key

router = APIRouter(prefix="/folders", tags=["folders"])


@router.get("", response_model=List[schemas.FolderOut])
def list_folders(
    db: Session = Depends(get_db),
    _: Optional[str] = Depends(optional_api_key),
):
    return crud.get_all_folders_tree(db)


@router.post("", response_model=schemas.FolderOut, status_code=201)
def create_folder(
    data: schemas.FolderCreate,
    db: Session = Depends(get_db),
    _: Optional[str] = Depends(optional_api_key),
):
    return crud.create_folder(db, data)


@router.put("/reorder", status_code=204)
def reorder_folders(
    data: schemas.ReorderRequest,
    db: Session = Depends(get_db),
    _: Optional[str] = Depends(optional_api_key),
):
    crud.reorder_folders(db, data.items)


@router.put("/{folder_id}", response_model=schemas.FolderOut)
def update_folder(
    folder_id: int,
    data: schemas.FolderUpdate,
    db: Session = Depends(get_db),
    _: Optional[str] = Depends(optional_api_key),
):
    try:
        folder = crud.update_folder(db, folder_id, data)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")
    return folder


@router.delete("/{folder_id}", response_model=schemas.DeleteFolderResponse)
def delete_folder(
    folder_id: int,
    db: Session = Depends(get_db),
    _: Optional[str] = Depends(optional_api_key),
):
    result = crud.delete_folder(db, folder_id)
    if not result:
        raise HTTPException(status_code=404, detail="Folder not found")
    return result
