import os

def scan_folder(main_folder_path):
    folder_structure = []
    for folder_name in os.listdir(main_folder_path):
        folder_path = os.path.join(main_folder_path, folder_name)
        if os.path.isdir(folder_path):
            folder_data = {'name': folder_name, 'subfolders': []}
            for subfolder_name in os.listdir(folder_path):
                subfolder_path = os.path.join(folder_path, subfolder_name)
                if os.path.isdir(subfolder_path):
                    videos = [file for file in os.listdir(subfolder_path) if file.endswith(".mp4")]
                    folder_data['subfolders'].append({
                        'name': subfolder_name,
                        'videos': [{'name': video, 'path': os.path.join(subfolder_path, video)} for video in videos]
                    })
            folder_structure.append(folder_data)
    return folder_structure