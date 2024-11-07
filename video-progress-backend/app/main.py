import glob
import os
from typing import List, Optional
from fastapi import Body, FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session, joinedload
from app.database import SessionLocal, engine
from app.models import Base, FolderScanRequest, MainFolder, Folder, Subfolder, SubfolderSchema, TagCreateSchema, Video, Note, NoteCreateSchema, NoteSchema, FolderResponse, UpdateVideoRequest, Tag, TagSchema, folder_tags
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
                ],
                "tags": [
                {"id": tag.id, "name": tag.name} for tag in folder_obj.tags
            ] 
            }
            for folder_obj in main_folder.folders
        ]
    }
    
    return response

@app.get("/api/folders", response_model=List[FolderResponse])
def get_folders(path: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(Folder).options(joinedload(Folder.main_folder))

    # If a path is provided, filter the folders by path
    if path:
        query = query.filter(Folder.main_folder.path.equals(path))

    folders = query.all()
    
    if not folders:
        raise HTTPException(status_code=404, detail="No folders found for the given path")

    return [
        {
            "id": folder.id,
            "name": folder.name,
            "main_folder_name": folder.main_folder.name,
            "path": os.path.join(folder.main_folder.path, folder.name),
            "main_folder_path": folder.main_folder.path,
            "tags": folder.tags
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

@app.get("/api/tags", response_model=List[TagSchema])
def get_tags(db: Session = Depends(get_db)):
    tags = db.query(Tag).order_by(Tag.name).all() # Assuming Tag is defined in your models
    return tags

@app.post("/api/tags", response_model=TagSchema)
def create_tag(tag: TagSchema, db: Session = Depends(get_db)):
    existing_tag = db.query(Tag).filter(Tag.name == tag.name).first()
    if existing_tag:
        raise HTTPException(status_code=400, detail="Tag already exists")
    
    new_tag = Tag(name=tag.name)
    db.add(new_tag)
    db.commit()
    db.refresh(new_tag)
    return new_tag

@app.put("/api/folders/{folder_id}/tags", response_model=TagSchema)
def add_tag_to_folder(folder_id: int, tag_schema: TagCreateSchema, db: Session = Depends(get_db)):
    # Fetch the folder based on folder_id
    folder = db.query(Folder).filter(Folder.id == folder_id).first()
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")
    
    name = tag_schema.name
    
    # Check if the tag already exists in the database
    existing_tag = db.query(Tag).filter(Tag.name == name).first()
    
    # If the tag exists and is not already mapped, map it to the folder
    if existing_tag:
        existing_tag_names = {tag.name for tag in folder.tags}
        if name not in existing_tag_names:
            folder.tags.append(existing_tag)
            db.commit()  # Commit changes if we modified the tags
            db.refresh(folder)
    
        # Return the existing tag
        return existing_tag
    
    # Create a new tag if it doesn't exist
    new_tag = Tag(name=name)
    db.add(new_tag)
    folder.tags.append(new_tag)
    
    db.commit()  # Commit changes to save the new tag
    db.refresh(folder)
    
    # Return the newly created tag
    return new_tag

@app.delete("/api/folders/{folder_id}/tags/{tag_name}", response_model=TagSchema)
def remove_tag_from_folder(folder_id: int, tag_name: str, db: Session = Depends(get_db)):
    # Fetch the folder based on folder_id
    folder = db.query(Folder).filter(Folder.id == folder_id).first()
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")
    
    # Find the tag by name in the folder's tags
    tag_to_remove = next((tag for tag in folder.tags if tag.name == tag_name), None)
    
    if tag_to_remove is None:
        raise HTTPException(status_code=404, detail="Tag not found in the folder")

    # Remove the tag from the folder
    folder.tags.remove(tag_to_remove)
    db.commit()  # Commit changes to save the updated folder

    return tag_to_remove  # Return the removed tag

@app.get("/api/folders/{folder_id}/tags", response_model=List[TagSchema])
def get_tags_of_folder(folder_id: int, db: Session = Depends(get_db)):
    # Fetch the folder based on folder_id
    folder = db.query(Folder).filter(Folder.id == folder_id).first()
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")

    # Retrieve tags associated with the folder
    tags = folder.tags  # Assuming `tags` is a relationship in the Folder model

    return tags

@app.delete("/api/tags/unmapped", response_model=dict)
def delete_unmapped_tags(db: Session = Depends(get_db)):
    # Query for tags that are not linked to any folders
    unmapped_tags = db.query(Tag).outerjoin(folder_tags).filter(folder_tags.c.tag_id.is_(None)).all()

    # Delete unmapped tags
    for tag in unmapped_tags:
        db.delete(tag)

    # Commit the changes
    db.commit()

    return {"detail": f"Deleted {len(unmapped_tags)} unmapped tags."}

