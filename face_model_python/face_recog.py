import face_recognition
import os
import sys

def load_known_faces(known_faces_dir):
    known_encodings = []
    known_names = []

    for filename in os.listdir(known_faces_dir):
        if filename.endswith(('.jpg', '.jpeg', '.png')):
            img_path = os.path.join(known_faces_dir, filename)
            image = face_recognition.load_image_file(img_path)
            encodings = face_recognition.face_encodings(image)
            if encodings:
                known_encodings.append(encodings[0])
                name = os.path.splitext(filename)[0]  # Remove file extension
                known_names.append(name)
            else:
                print(f"Warning: No face found in {filename}")

    return known_encodings, known_names

def recognize_faces(image_path, known_encodings, known_names):
    unknown_image = face_recognition.load_image_file(image_path)
    unknown_encodings = face_recognition.face_encodings(unknown_image)

    if not unknown_encodings:
        return "No faces detected."

    result = ""
    for unknown_encoding in unknown_encodings:
        matches = face_recognition.compare_faces(known_encodings, unknown_encoding, tolerance=0.5)
        name = "Unknown"

        if True in matches:
            first_match_index = matches.index(True)
            name = known_names[first_match_index]

        result += f"Detected: {name}\n"

    return result.strip()

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python face_recog.py <image_path>")
        sys.exit(1)

    image_path = sys.argv[1]
    known_faces_dir = os.path.join(os.path.dirname(__file__), "known_faces")

    known_encodings, known_names = load_known_faces(known_faces_dir)
    output = recognize_faces(image_path, known_encodings, known_names)
    print(output)
