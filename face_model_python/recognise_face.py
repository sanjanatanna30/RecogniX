import face_recognition
import os
import sys
import json
import pickle
import numpy as np
from PIL import Image

def get_known_faces_cache(known_faces_dir):
    cache_path = os.path.join(os.path.dirname(__file__), "encodings.pkl")
    
    # Check if cache exists and is newer than all files in known_faces_dir
    cache_valid = False
    if os.path.exists(cache_path):
        cache_mtime = os.path.getmtime(cache_path)
        cache_valid = True
        for filename in os.listdir(known_faces_dir):
            if filename.lower().endswith(('.jpg', '.jpeg', '.png')):
                file_path = os.path.join(known_faces_dir, filename)
                if os.path.getmtime(file_path) > cache_mtime:
                    cache_valid = False
                    break

    if cache_valid:
        try:
            with open(cache_path, "rb") as f:
                data = pickle.load(f)
                return data["encodings"], data["names"]
        except Exception as e:
            sys.stderr.write(f"Warning: Could not read cache: {e}\n")

    # Re-build cache
    known_encodings = []
    known_names = []

    sys.stderr.write("Building face encodings cache...\n")
    for filename in sorted(os.listdir(known_faces_dir)):
        if filename.lower().endswith(('.jpg', '.jpeg', '.png')):
            img_path = os.path.join(known_faces_dir, filename)
            try:
                # Load image with PIL to resize if necessary
                pil_img = Image.open(img_path)
                pil_img.thumbnail((1000, 1000))
                img_np = np.array(pil_img.convert('RGB'))
                
                encodings = face_recognition.face_encodings(img_np)
                if encodings:
                    known_encodings.append(encodings[0])
                    name = os.path.splitext(filename)[0].replace("_", " ")
                    known_names.append(name)
                    sys.stderr.write(f"Encoded: {name}\n")
                else:
                    sys.stderr.write(f"Warning: No face found in {filename}\n")
            except Exception as ex:
                sys.stderr.write(f"Error processing {filename}: {ex}\n")

    # Save to cache
    try:
        with open(cache_path, "wb") as f:
            pickle.dump({"encodings": known_encodings, "names": known_names}, f)
        sys.stderr.write("Cache saved successfully.\n")
    except Exception as e:
        sys.stderr.write(f"Warning: Failed to save cache: {e}\n")

    return known_encodings, known_names

def recognize_faces(image_path, known_encodings, known_names):
    if not os.path.exists(image_path):
        return {"success": False, "error": f"File not found: {image_path}"}

    try:
        pil_img = Image.open(image_path)
        # Resize target image for faster face encoding if large
        pil_img.thumbnail((1200, 1200))
        unknown_image = np.array(pil_img.convert('RGB'))

        unknown_encodings = face_recognition.face_encodings(unknown_image)

        if not unknown_encodings:
            return {"success": True, "detected": [], "unknown_count": 0, "message": "No faces detected in image."}

        detected_names = []
        unknown_count = 0

        for unknown_encoding in unknown_encodings:
            matches = face_recognition.compare_faces(known_encodings, unknown_encoding, tolerance=0.5)
            name = "Unknown"

            if True in matches:
                face_distances = face_recognition.face_distance(known_encodings, unknown_encoding)
                best_match_index = np.argmin(face_distances)
                if matches[best_match_index]:
                    name = known_names[best_match_index]

            if name == "Unknown":
                unknown_count += 1
            else:
                if name not in detected_names:
                    detected_names.append(name)

        return {
            "success": True,
            "detected": detected_names,
            "unknown_count": unknown_count,
            "total_faces": len(unknown_encodings)
        }
    except Exception as e:
        return {"success": False, "error": str(e)}

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"success": False, "error": "Usage: python recognise_face.py <image_path>"}))
        sys.exit(1)

    image_path = sys.argv[1]
    known_faces_dir = os.path.join(os.path.dirname(__file__), "known_faces")

    known_encodings, known_names = get_known_faces_cache(known_faces_dir)
    result = recognize_faces(image_path, known_encodings, known_names)
    print(json.dumps(result))
