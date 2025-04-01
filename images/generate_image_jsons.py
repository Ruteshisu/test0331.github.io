import os
import json

# 画像拡張子のリスト
IMAGE_EXTENSIONS = {'.png', '.jpg', '.jpeg', '.gif'}

# imagesディレクトリ（このスクリプトの場所を基準に）
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# viewerディレクトリ（images/ と同じ階層にある想定）
VIEWER_DIR = os.path.join(BASE_DIR, '..', 'viewer')

def is_image_file(filename):
    return os.path.splitext(filename)[1].lower() in IMAGE_EXTENSIONS

def generate_json_for_folder(folder_path):
    files = [f for f in os.listdir(folder_path) if is_image_file(f)]
    files.sort()
    return files

def main():
    image_root = BASE_DIR
    folder_names = []

    for folder_name in os.listdir(image_root):
        folder_path = os.path.join(image_root, folder_name)
        if os.path.isdir(folder_path):
            print(f"処理中: {folder_path}")
            image_list = generate_json_for_folder(folder_path)
            json_path = os.path.join(folder_path, 'images.json')
            with open(json_path, 'w', encoding='utf-8') as f:
                json.dump(image_list, f, ensure_ascii=False, indent=2)
            print(f"  -> {json_path} を作成しました ({len(image_list)} 件)")
            folder_names.append(folder_name)

    # フォルダ一覧を viewer/list.json に書き出し
    list_json_path = os.path.join(VIEWER_DIR, 'list.json')
    folder_names.sort()
    with open(list_json_path, 'w', encoding='utf-8') as f:
        json.dump(folder_names, f, ensure_ascii=False, indent=2)
    print(f"\nviewer/list.json を更新しました ({len(folder_names)} フォルダ)\n")

if __name__ == "__main__":
    main()
