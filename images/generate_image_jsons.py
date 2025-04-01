import os
import json

# 対象となる画像の拡張子
IMAGE_EXTENSIONS = {'.png', '.jpg', '.jpeg'}

# 画像フォルダ（相対パス or 絶対パスに変えてOK）
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

def is_image_file(filename):
    return os.path.splitext(filename)[1].lower() in IMAGE_EXTENSIONS

def generate_json_for_folder(folder_path):
    files = [f for f in os.listdir(folder_path) if is_image_file(f)]
    files.sort()  # 名前順に並べる（昇順）
    return files

def main():
    for folder_name in os.listdir(BASE_DIR):
        folder_path = os.path.join(BASE_DIR, folder_name)
        if os.path.isdir(folder_path):
            print(f"処理中: {folder_path}")
            image_list = generate_json_for_folder(folder_path)
            json_path = os.path.join(folder_path, 'images.json')
            with open(json_path, 'w', encoding='utf-8') as f:
                json.dump(image_list, f, ensure_ascii=False, indent=2)
            print(f"  -> {json_path} を作成しました ({len(image_list)} 件)")

if __name__ == "__main__":
    main()
