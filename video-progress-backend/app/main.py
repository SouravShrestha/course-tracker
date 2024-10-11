from typing import List
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from sqlalchemy import Integer, cast
from sqlalchemy.orm import Session, joinedload
from app.database import SessionLocal, engine
from app.models import Base, FolderResponse, MainFolder, Folder, Note, NoteCreateSchema, NoteSchema, Subfolder, SubfolderSchema, UpdateVideoRequest, Video, VideoSchema
from app.utils import scan_folder
from pydantic import BaseModel
from moviepy.editor import VideoFileClip 
import os

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # List of allowed origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods (GET, POST, etc.)
    allow_headers=["*"],  # Allows all headers
)

# Create the database tables
Base.metadata.create_all(bind=engine)

class FolderScanRequest(BaseModel):
    main_folder_path: str

# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.post("/api/scan-folder")
def scan_and_insert_folder_structure(request: FolderScanRequest, db: Session = Depends(get_db)):
    main_folder_path = request.main_folder_path

    # Check if folder exists
    if not os.path.exists(main_folder_path):
        raise HTTPException(status_code=400, detail="Folder path does not exist.")

    # Check for existing main folder or create new one
    main_folder = db.query(MainFolder).filter_by(path=main_folder_path).first()
    if not main_folder:
        main_folder = MainFolder(name=os.path.basename(main_folder_path), path=main_folder_path)
        db.add(main_folder)
        db.commit()
        db.refresh(main_folder)

    # Scan the folder structure
    folder_structure = scan_folder(main_folder_path)

    # Insert folder structure into the database
    for folder in folder_structure:
        folder_obj = db.query(Folder).filter_by(name=folder['name'], main_folder_id=main_folder.id).first() or Folder(main_folder_id=main_folder.id, name=folder['name'])
        db.add(folder_obj)
        db.commit()
        db.refresh(folder_obj)

        for subfolder in folder['subfolders']:
            subfolder_obj = db.query(Subfolder).filter_by(name=subfolder['name'], folder_id=folder_obj.id).first() or Subfolder(folder_id=folder_obj.id, name=subfolder['name'])
            db.add(subfolder_obj)
            db.commit()
            db.refresh(subfolder_obj)

            for video in subfolder['videos']:
                video_obj = db.query(Video).filter_by(path=video['path']).first()
                
                if not video_obj:
                    # Calculate video duration using moviepy
                    try:
                        clip = VideoFileClip(video['path'])
                        duration_in_seconds = clip.duration
                        formatted_duration = convert_seconds_to_hhmmss(duration_in_seconds)
                    except Exception as e:
                        print(f"Error loading video duration for {video['path']}: {e}")
                        formatted_duration = "00:00"

                    video_obj = Video(subfolder_id=subfolder_obj.id, name=video['name'], path=video['path'], progress=0.0, duration=formatted_duration) 
                    db.add(video_obj)

    db.commit()
    return {"message": "Folder structure scanned and data inserted successfully."}

@app.put("/api/update-video/{video_id}")
def update_video(video_id: int, request: UpdateVideoRequest, db: Session = Depends(get_db)):
    # Find the video by ID
    video = db.query(Video).filter(Video.id == video_id).first()

    if not video:
        raise HTTPException(status_code=404, detail="Video not found.")

    # Update the progress and notes if provided
    if request.progress is not None:
        video.progress = request.progress
        
    if request.notes is not None:
        video.notes = request.notes

    db.commit()
    db.refresh(video)
    
    return {"message": "Video updated successfully.", "video": {"id": video.id, "progress": video.progress, "notes": video.notes, "duration": video.duration}}

@app.get("/api/folders", response_model=list[FolderResponse])
def get_folders(db: Session = Depends(get_db)):
    folders = db.query(Folder).options(joinedload(Folder.main_folder)).all()
    return [
        {
            "id": folder.id,
            "name": folder.name,
            "main_folder_name": folder.main_folder.name,  # Include main folder name
            "path": os.path.join(folder.main_folder.path, folder.name),  # Include path if needed
            "main_folder_path": folder.main_folder.path
        }
        for folder in folders
    ]

@app.get("/api/folder-exists/")
def folder_exists(folder_path: str):
    if os.path.exists(folder_path):
        return {"exists": True}
    else:
        raise HTTPException(status_code=404, detail="Folder does not exist.")
    
@app.get("/api/folders/{folder_id}/subfolders", response_model=List[SubfolderSchema])
def get_subfolders_with_videos(folder_id: int, db: Session = Depends(get_db)):
    subfolders = db.query(Subfolder).filter(Subfolder.folder_id == folder_id).order_by(cast(Subfolder.name, Integer)).all()
    
    if not subfolders:
        raise HTTPException(status_code=404, detail="Subfolders not found for this folder_id")
    
    return subfolders

def convert_seconds_to_hhmmss(seconds):
    minutes, seconds = divmod(seconds, 60)
    hours, minutes = divmod(minutes, 60)
    if hours > 0:
        return f"{int(hours):02}:{int(minutes):02}:{int(seconds):02}"
    else:
        return f"{int(minutes):02}:{int(seconds):02}"

# Serve video files
@app.get("/videos/")
async def get_video_file(video_path: str):
    if not os.path.exists(video_path):
        raise HTTPException(status_code=404, detail="Video not found")
    return FileResponse(video_path, media_type="video/mp4")

@app.post("/api/videos/{video_id}/notes", response_model=NoteCreateSchema)
def create_note_for_video(video_id: int, note: NoteCreateSchema, db: Session = Depends(get_db)):
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found.")
    
    new_note = Note(video_id=video_id, content=note.content)
    db.add(new_note)
    db.commit()
    db.refresh(new_note)
    return new_note

@app.get("/api/videos/{video_id}/notes", response_model=List[NoteSchema])
def get_notes_for_video(video_id: int, db: Session = Depends(get_db)):
    notes = db.query(Note).filter(Note.video_id == video_id).all()
    return notes

@app.put("/api/notes/{note_id}", response_model=NoteSchema)
def update_note(note_id: int, note: NoteSchema, db: Session = Depends(get_db)):
    existing_note = db.query(Note).filter(Note.id == note_id).first()
    if not existing_note:
        raise HTTPException(status_code=404, detail="Note not found.")
    
    existing_note.content = note.content
    db.commit()
    db.refresh(existing_note)
    return existing_note

@app.delete("/api/notes/{note_id}")
def delete_note(note_id: int, db: Session = Depends(get_db)):
    existing_note = db.query(Note).filter(Note.id == note_id).first()
    if not existing_note:
        raise HTTPException(status_code=404, detail="Note not found.")
    
    db.delete(existing_note)
    db.commit()
    return {"detail": "Note deleted successfully."}
