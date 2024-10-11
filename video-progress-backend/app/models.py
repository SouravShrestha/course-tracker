from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field
from sqlalchemy import Column, DateTime, Float, Integer, String, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.database import Base
import pytz

class MainFolder(Base):
    __tablename__ = "main_folders"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    path = Column(String, unique=True)
    folders = relationship("Folder", back_populates="main_folder")

class Folder(Base):
    __tablename__ = "folders"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    main_folder_id = Column(Integer, ForeignKey("main_folders.id"))
    main_folder = relationship("MainFolder", back_populates="folders")
    subfolders = relationship("Subfolder", back_populates="folder")
    __table_args__ = (UniqueConstraint('main_folder_id', 'name', name='uq_main_folder_name'),)

class Subfolder(Base):
    __tablename__ = "subfolders"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    folder_id = Column(Integer, ForeignKey("folders.id"))
    folder = relationship("Folder", back_populates="subfolders")
    videos = relationship("Video", back_populates="subfolder")
    __table_args__ = (UniqueConstraint('folder_id', 'name', name='uq_main_folder_name'),)

class Video(Base):
    __tablename__ = "videos"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    path = Column(String, unique=True)
    progress = Column(Float, default=0.0)
    duration = Column(String, nullable=True)  
    subfolder_id = Column(Integer, ForeignKey("subfolders.id"))
    subfolder = relationship("Subfolder", back_populates="videos")
    notes = relationship("Note", back_populates="video", cascade="all, delete-orphan")

def current_time_ist():
    return datetime.now(pytz.timezone('Asia/Kolkata'))

class Note(Base):
    __tablename__ = "notes"
    id = Column(Integer, primary_key=True, index=True)
    video_id = Column(Integer, ForeignKey("videos.id"), nullable=False)  # Foreign key to the videos table
    content = Column(String, nullable=False)  # Note content, cannot be empty
    created_at = Column(DateTime, default=current_time_ist)  # Automatically set the current timestamp
    updated_at = Column(DateTime, default=current_time_ist, onupdate=current_time_ist)  # Automatically update on modification

    video = relationship("Video", back_populates="notes")

class UpdateVideoRequest(BaseModel):
    progress: Optional[int] = Field(None, ge=0)  # Progress between 0 and 100
    notes: Optional[str] = None  # Notes can be optional

class FolderResponse(BaseModel):
    id: int
    name: str
    main_folder_name: str  # Include main folder name if needed
    path: str
    main_folder_path: str

class NoteCreateSchema(BaseModel):
    video_id: int
    content: str

    class Config:
        orm_mode = True

class NoteSchema(BaseModel):
    id: int
    video_id: int
    content: str
    created_at: datetime 
    updated_at: datetime

    class Config:
        orm_mode = True

class VideoSchema(BaseModel):
    id: int
    name: str
    path: str
    progress: float
    duration: Optional[str]
    notes: List[NoteSchema]

    class Config:
        orm_mode = True

class SubfolderSchema(BaseModel):
    id: int
    name: str
    videos: List[VideoSchema]  # List of videos inside each subfolder

    class Config:
        orm_mode = True