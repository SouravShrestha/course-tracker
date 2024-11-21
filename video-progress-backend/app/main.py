import glob
import json
import os
from sqlite3 import IntegrityError
import subprocess
from typing import List, Optional
from fastapi import Body, FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session, joinedload, aliased
from app.database import SessionLocal, engine
from app.models import Base, FolderLastPlayed, FolderLastPlayedSchema, FolderScanRequest, MainFolder, Folder, MainFolderRequest, Subfolder, SubfolderSchema, TagCreateSchema, UpdateLastPlayedRequest, Video, Note, NoteCreateSchema, NoteSchema, FolderResponse, UpdateVideoRequest, Tag, TagSchema, VideoSchema, current_time_ist, folder_tags
from pymediainfo import MediaInfo

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

@app.post("/api/mainfolders", response_model=dict)
def add_main_folder(request: MainFolderRequest, db: Session = Depends(get_db)):
    # Check if a folder with the same path already exists
    if db.query(MainFolder).filter_by(path=request.path).first():
        raise HTTPException(
            status_code=404, detail="A MainFolder with this path already exists."
        )

    # Validate that the provided path exists
    if not os.path.exists(request.path):
        raise HTTPException(
            status_code=400, detail="The specified folder path does not exist."
        )

    folder_name = os.path.basename(request.path)

    # Create and insert the new MainFolder
    new_main_folder = MainFolder(name=folder_name, path=request.path)
    db.add(new_main_folder)
    db.commit()
    db.refresh(new_main_folder)

    return {
        "id": new_main_folder.id,
        "name": new_main_folder.name,
        "path": new_main_folder.path,
    }

@app.post("/api/mainfolders/scan", response_model=list)
def scan_all_main_folders(db: Session = Depends(get_db)):
    # Fetch all main folders from the database
    main_folders = db.query(MainFolder).all()
    updated_folders = []  # To store the list of updated or created folders

    for main_folder in main_folders:
        # Check if the folder path exists
        if not os.path.exists(main_folder.path):
            print(f"Path does not exist: {main_folder.path}")
            continue

        # Scan the folder for subfolders
        try:
            subfolders = [f.name for f in os.scandir(main_folder.path) if f.is_dir()]
        except Exception as e:
            print(f"Error scanning {main_folder.path}: {e}")
            continue

        for subfolder_name in subfolders:
            # Check if the folder already exists in the database
            folder = (
                db.query(Folder)
                .filter_by(main_folder_id=main_folder.id, name=subfolder_name)
                .first()
            )
            if not folder:
                # Create a new Folder entry
                folder = Folder(main_folder_id=main_folder.id, name=subfolder_name)
                db.add(folder)
                try:
                    db.commit()
                    db.refresh(folder)
                except IntegrityError:
                    db.rollback()
                    print(f"IntegrityError: Could not insert folder '{subfolder_name}' for main folder {main_folder.name}.")
                    continue
                except Exception as e:
                    db.rollback()
                    print(f"Error adding folder '{subfolder_name}': {e}")
                    continue

            # Add folder details to the updated_folders list
            updated_folders.append({
                "id": folder.id,
                "name": folder.name,
                "main_folder_id": folder.main_folder_id,
                "main_folder_name": main_folder.name,
                "path": os.path.join(main_folder.path, folder.name),
                "tags": [
                {"id": tag.id, "name": tag.name} for tag in folder.tags
                ]
            })

    print("Main folder scanning and folder table update complete.")
    return updated_folders

def get_video_metadata(video_path):
    try:
        media_info = MediaInfo.parse(video_path)
        for track in media_info.tracks:
            if track.track_type == "Video":
                duration = track.duration / 1000 if track.duration else 0 
                return convert_seconds_to_hhmmss(duration)
    except Exception as e:
        print(f"Error extracting metadata for {video_path}: {e}")
        return "00:00"

@app.post("/api/folders/scan", response_model=dict)
def scan_folder_and_store(request: FolderScanRequest, db: Session = Depends(get_db)):
    folder_path = request.folder_path

    # Validate folder path existence
    if not os.path.exists(folder_path):
        raise HTTPException(status_code=400, detail="The specified folder path does not exist.")

    # Validate if it is a directory
    if not os.path.isdir(folder_path):
        raise HTTPException(status_code=400, detail="The specified path is not a directory.")

    folder_name = os.path.basename(folder_path)

    # Check if folder exists in the database
    folder = db.query(Folder).filter_by(name=folder_name).first()
    if not folder:
        folder = Folder(name=folder_name)
        db.add(folder)
        db.commit()
        db.refresh(folder)

    # Process subfolders
    subfolders = [f for f in os.scandir(folder_path) if f.is_dir()]
    for subfolder_entry in subfolders:
        subfolder_name = subfolder_entry.name

        # Check if subfolder exists
        subfolder = db.query(Subfolder).filter_by(folder_id=folder.id, name=subfolder_name).first()
        if not subfolder:
            subfolder = Subfolder(folder_id=folder.id, name=subfolder_name)
            db.add(subfolder)
            db.commit()
            db.refresh(subfolder)

        # Process video files in the subfolder
        video_files = [
            v for v in os.scandir(subfolder_entry.path)
            if v.is_file() and v.name.lower().endswith(('.mp4', '.mkv', '.avi'))
        ]

        for video_entry in video_files:
            video_path = video_entry.path
            video_name = video_entry.name

            # Avoid duplicate video entries
            if not db.query(Video).filter_by(path=video_path).first():
                try:
                    # Extract video metadata
                    duration = get_video_metadata(video_path=video_path)
                except Exception as e:
                    print(f"Error processing video '{video_name}': {e}")
                    duration = "00:00"

                new_video = Video(
                    subfolder_id=subfolder.id,
                    name=video_name,
                    path=video_path,
                    duration=duration,
                    progress=0.0,
                )

                if not db.query(Video).filter_by(path=video_path).first():
                    db.add(new_video)
                    db.commit()

    # Prepare response
    response = {
        "id": folder.id,
        "name": folder.name,
        "path": folder_path,
        "tags": [
                {"id": tag.id, "name": tag.name} for tag in folder.tags
                ],
                "last_played_video": (
                    {
                        "id": folder.last_played_video.video.id,
                        "name": folder.last_played_video.video.name,
                        "path": folder.last_played_video.video.path,
                        "progress": folder.last_played_video.video.progress,
                        "duration": folder.last_played_video.video.duration
                    }
                    if folder.last_played_video else None
                ),
                "last_played_at": folder.last_played_video.last_played_at if folder.last_played_video else None,
        "subfolders": [
            {
                "id": subfolder.id,
                "name": subfolder.name,
                "videos": [
                    {
                        "id": video.id,
                        "name": video.name,
                        "path": video.path,
                        "progress": video.progress,
                        "duration": video.duration,
                    }
                    for video in subfolder.videos
                ],
            }
            for subfolder in folder.subfolders
        ],
    }

    return response

@app.get("/api/folders", response_model=List[FolderResponse])
def get_folders(path: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(Folder).options(
        joinedload(Folder.main_folder),
        joinedload(Folder.last_played_video)
    )

    # If a path is provided, filter the folders by path
    if path:
        query = query.filter(Folder.main_folder.path.equals(path))

    folders = query.all()

    if not folders:
        raise HTTPException(status_code=404, detail="No folders found for the given path")

    return [
        FolderResponse(
            id=folder.id,
            name=folder.name,
            main_folder_name=folder.main_folder.name,
            path=os.path.join(folder.main_folder.path, folder.name),
            main_folder_path=folder.main_folder.path,
            tags=[{"id": tag.id, "name": tag.name} for tag in folder.tags],
            last_played_video=(
                VideoSchema.from_orm(folder.last_played_video.video) if folder.last_played_video else None
            ),
            last_played_at=(
                folder.last_played_video.last_played_at if folder.last_played_video else None
            )
        )
        for folder in folders
    ]

@app.get("/api/folders/{folder_id}", response_model=FolderResponse)
def get_folder_by_id(folder_id: int, db: Session = Depends(get_db)):
    # Query the folder by its ID, with necessary relationships loaded
    folder = db.query(Folder).options(
        joinedload(Folder.main_folder),
        joinedload(Folder.last_played_video)
    ).filter(Folder.id == folder_id).first()

    # If the folder does not exist, raise an HTTP 404 error
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")

    # Return the folder response
    return FolderResponse(
        id=folder.id,
        name=folder.name,
        main_folder_name=folder.main_folder.name,
        path=os.path.join(folder.main_folder.path, folder.name),
        main_folder_path=folder.main_folder.path,
        tags=folder.tags,
        last_played_video=(
            VideoSchema.from_orm(folder.last_played_video.video) if folder.last_played_video else None
        ),
        last_played_at=(
            folder.last_played_video.last_played_at if folder.last_played_video else None
        )
    )

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

    if(video.progress != 0):

        # Now update the FolderLastPlayed table to reflect this video's progress
        folder = video.subfolder.folder  # Get the folder related to the video

        # Check if there is an existing FolderLastPlayed entry for this folder
        last_played = db.query(FolderLastPlayed).filter(FolderLastPlayed.folder_id == folder.id).first()

        if last_played:
            # If a FolderLastPlayed record exists, update the video_id and the last_played_at timestamp
            last_played.video_id = video.id
            last_played.last_played_at = current_time_ist()  # Update the last played time
        else:
            # If no FolderLastPlayed record exists, create a new one
            new_last_played = FolderLastPlayed(
                folder_id=folder.id,
                video_id=video.id,
                last_played_at=current_time_ist()  # Set current timestamp for the first time the video is played
            )
            db.merge(new_last_played)

        # Commit the changes to the FolderLastPlayed table
        db.commit()

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
def search_tags(query: str = Query(None), db: Session = Depends(get_db)):
    # Query tags based on the provided query parameter
    if query:
        print(query)
        tags = db.query(Tag).filter(Tag.name.ilike(f"%{query}%")).order_by(Tag.name).all()
    else:
        tags = db.query(Tag).order_by(Tag.name).all()  # Return all tags if no query
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

@app.put("/api/folders/{folder_id}/last_played", response_model=FolderLastPlayedSchema)
def update_last_played_video(folder_id: int, update_request: UpdateLastPlayedRequest, db: Session = Depends(get_db)):
    video_id = update_request.video_id
    # Check if the folder exists
    folder = db.query(Folder).filter(Folder.id == folder_id).first()
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")
    
    # Check if the video exists
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    
    # Update or create the FolderLastPlayed record
    last_played = db.query(FolderLastPlayed).filter(FolderLastPlayed.folder_id == folder_id).first()
    if last_played:
        last_played.video_id = video_id
        last_played.last_played_at = current_time_ist()
    else:
        last_played = FolderLastPlayed(folder_id=folder_id, video_id=video_id, last_played_at=current_time_ist())
        db.add(last_played)

    db.commit()
    db.refresh(last_played)
    
    return last_played

@app.get("/api/folders/{folder_id}/last_played", response_model=FolderLastPlayedSchema)
def get_last_played_video(folder_id: int, db: Session = Depends(get_db)):
    # Retrieve the last played video record for the folder
    last_played = db.query(FolderLastPlayed).filter(FolderLastPlayed.folder_id == folder_id).first()
    if not last_played:
        raise HTTPException(status_code=404, detail="Last played video not found for this folder")
    
    return last_played

@app.get("/api/folder", response_model=List[dict])
def search_folders(query: str = Query(None), db: Session = Depends(get_db)):
    # Create an alias for MainFolder to select its path explicitly
    main_folder_alias = aliased(MainFolder)
    
    # Query folders with a proper alias for MainFolder to include its path
    if query:
        print(query)  # Optional: log the query for debugging purposes
        folders = db.query(Folder.id, Folder.name, main_folder_alias.path).\
            join(main_folder_alias, Folder.main_folder_id == main_folder_alias.id).\
            filter(Folder.name.ilike(f"%{query}%")).order_by(Folder.name).all()
    else:
        folders = db.query(Folder.id, Folder.name, main_folder_alias.path).\
            join(main_folder_alias, Folder.main_folder_id == main_folder_alias.id).\
            order_by(Folder.name).all()  # Return all folders if no query
    
    # Return the result as a list of dictionaries with id, name, and main_folder path
    return [{"id": folder.id, "name": folder.name, "path": os.path.join(folder.path, folder.name)} for folder in folders]

@app.get("/api/video", response_model=List[dict])
def search_videos(query: str = Query(None), db: Session = Depends(get_db)):
    if query:
        # Search for videos by name using a case-insensitive search, and join Subfolder to get folder_id
        videos = db.query(Video.id, Video.name, Subfolder.folder_id).\
            join(Subfolder, Subfolder.id == Video.subfolder_id).\
            filter(Video.name.ilike(f"%{query}%")).\
            order_by(Video.name).all()
    else:
        # If no query is provided, return all videos with folder_id
        videos = db.query(Video.id, Video.name, Subfolder.folder_id).\
            join(Subfolder, Subfolder.id == Video.subfolder_id).\
            order_by(Video.name).all()

    # Return a list of dictionaries containing the video id, name, and folder_id
    return [{"id": video.id, "name": video.name, "folder_id": video.folder_id} for video in videos]