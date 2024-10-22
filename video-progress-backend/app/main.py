import glob
import os
from typing import List
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session, joinedload
from app.database import SessionLocal, engine
from app.models import Base, FolderScanRequest, MainFolder, Folder, Subfolder, SubfolderSchema, Video, Note, NoteCreateSchema, NoteSchema, FolderResponse, UpdateVideoRequest
from app.utils import scan_folder
from moviepy.editor import VideoFileClip

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create the database tables
Base.metadata.create_all(bind=engine)

# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Helper Functions
def contains_videos(folder_path):
    video_extensions = ('*.mp4', '*.mkv', '*.avi')
    return any(glob.glob(os.path.join(folder_path, '**', ext), recursive=True) for ext in video_extensions)

def convert_seconds_to_hhmmss(seconds):
    minutes, seconds = divmod(seconds, 60)
    hours, minutes = divmod(minutes, 60)
    return f"{int(hours):02}:{int(minutes):02}:{int(seconds):02}" if hours > 0 else f"{int(minutes):02}:{int(seconds):02}"

def clean_up_db(session: Session):
    # Step 1: Retrieve all main folders, subfolders, and videos from the DB
    main_folders = session.query(MainFolder).all()

    for main_folder in main_folders:
        # Step 2: Check if the main folder exists on the filesystem
        if not os.path.exists(main_folder.path):
            print(f"Main folder '{main_folder.name}' not found on disk. Removing from DB.")
            session.delete(main_folder)
            continue

        for folder in main_folder.folders:
            folder_path = os.path.join(main_folder.path, folder.name)

            # Step 3: Check if the folder exists
            if not os.path.exists(folder_path):
                print(f"Folder '{folder.name}' in '{main_folder.name}' not found on disk. Removing from DB.")
                session.delete(folder)
                continue

            for subfolder in folder.subfolders:
                subfolder_path = os.path.join(folder_path, subfolder.name)

                # Step 4: Check if the subfolder exists
                if not os.path.exists(subfolder_path):
                    print(f"Subfolder '{subfolder.name}' in '{folder.name}' not found on disk. Removing from DB.")
                    session.delete(subfolder)
                    continue

                for video in subfolder.videos:
                    # Step 5: Check if the video exists
                    if not os.path.exists(video.path):
                        print(f"Video '{video.name}' in '{subfolder.name}' not found on disk. Removing from DB.")
                        session.delete(video)

    # Commit the changes after the cleanup
    session.commit()

@app.post("/api/folders/scan", response_model=dict)
def scan_and_insert_folder_structure(request: FolderScanRequest, db: Session = Depends(get_db)):
    main_folder_path = request.main_folder_path
    if not os.path.exists(main_folder_path):
        raise HTTPException(status_code=400, detail="Folder path does not exist.")

    main_folder = db.query(MainFolder).filter_by(path=main_folder_path).first()
    if not main_folder:
        main_folder = MainFolder(name=os.path.basename(main_folder_path), path=main_folder_path)
        db.add(main_folder)
        db.commit()
        db.refresh(main_folder)

    folder_structure = scan_folder(main_folder_path)
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
                if not db.query(Video).filter_by(path=video['path']).first():
                    try:
                        with VideoFileClip(video['path']) as clip:
                            duration = convert_seconds_to_hhmmss(clip.duration)
                    except Exception as e:
                        print(f"Error processing video '{video['name']}': {e}")
                        duration = "00:00"

                    new_video = Video(subfolder_id=subfolder_obj.id, name=video['name'], path=video['path'], progress=0.0, duration=duration)
                    db.add(new_video)

    db.commit()
    clean_up_db(session=db)
    
    # Prepare the comprehensive response
    response = {
        "id": main_folder.id,
        "name": main_folder.name,
        "path": main_folder.path,
        "folders": [
            {
                "id": folder_obj.id,
                "name": folder_obj.name,
                "path": os.path.join(main_folder.path, folder_obj.name),
                "subfolders": [
                    {
                        "id": subfolder_obj.id,
                        "name": subfolder_obj.name,
                        "videos": [
                            {
                                "id": video.id,
                                "name": video.name,
                                "path": video.path,
                                "progress": video.progress,
                                "duration": video.duration
                            }
                            for video in subfolder_obj.videos
                        ]
                    }
                    for subfolder_obj in folder_obj.subfolders
                ]
            }
            for folder_obj in main_folder.folders
        ]
    }
    
    return response

@app.get("/api/folders", response_model=List[FolderResponse])
def get_folders(db: Session = Depends(get_db)):
    folders = db.query(Folder).options(joinedload(Folder.main_folder)).all()
    return [
        {
            "id": folder.id,
            "name": folder.name,
            "main_folder_name": folder.main_folder.name,
            "path": os.path.join(folder.main_folder.path, folder.name),
            "main_folder_path": folder.main_folder.path
        }
        for folder in folders
    ]

@app.get("/api/folder-exists/")
def folder_exists(folder_path: str):
    if os.path.exists(folder_path) and contains_videos(folder_path):
        return {"exists": True}
    else:
        raise HTTPException(status_code=404, detail="Folder does not exist.")

@app.get("/api/folders/{folder_id}/subfolders", response_model=List[SubfolderSchema])
def get_subfolders_with_videos(folder_id: int, db: Session = Depends(get_db)):
    subfolders = db.query(Subfolder).filter(Subfolder.folder_id == folder_id).all()
    if not subfolders:
        raise HTTPException(status_code=404, detail="Subfolders not found for this folder_id")
    return subfolders

# Serve video files
@app.get("/videos/")
async def get_video_file(video_path: str):
    if not os.path.exists(video_path):
        raise HTTPException(status_code=404, detail="Video not found")
    return FileResponse(video_path, media_type="video/mp4")

@app.put("/api/videos/{video_id}", response_model=dict)
def update_video(video_id: int, request: UpdateVideoRequest, db: Session = Depends(get_db)):
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found.")

    if request.progress is not None:
        video.progress = request.progress

    db.commit()
    db.refresh(video)
    return {"message": "Video updated successfully.", "video": {"id": video.id, "progress": video.progress}}

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

@app.delete("/api/notes/{note_id}", response_model=dict)
def delete_note(note_id: int, db: Session = Depends(get_db)):
    existing_note = db.query(Note).filter(Note.id == note_id).first()
    if not existing_note:
        raise HTTPException(status_code=404, detail="Note not found.")
    
    db.delete(existing_note)
    db.commit()
    return {"detail": "Note deleted successfully."}

@app.put("/api/notes/{note_id}", response_model=NoteSchema)
def update_note(note_id: int, note: NoteSchema, db: Session = Depends(get_db)):
    existing_note = db.query(Note).filter(Note.id == note_id).first()
    if not existing_note:
        raise HTTPException(status_code=404, detail="Note not found.")
    
    existing_note.content = note.content
    db.commit()
    db.refresh(existing_note)
    return existing_note