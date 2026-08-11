import face_recognition
import os
import cv2
import numpy as np

# === Step 1: Load known face encodings from images ===
known_face_encodings = []
known_face_names = []

known_faces_dir = "known_faces"

for filename in os.listdir(known_faces_dir):
    if filename.lower().endswith((".jpg", ".jpeg", ".png")):
        path = os.path.join(known_faces_dir, filename)
        image = face_recognition.load_image_file(path)
        encoding = face_recognition.face_encodings(image)

        if encoding:
            known_face_encodings.append(encoding[0])
            name = os.path.splitext(filename)[0].replace("_", " ")
            known_face_names.append(name)
        else:
            print(f"[Warning] No face found in {filename}")

# === Step 2: Load the group image ===
group_image_path = "group_photos/group3.jpg"  # Change path if needed
group_image = face_recognition.load_image_file(group_image_path)
face_locations = face_recognition.face_locations(group_image)
face_encodings = face_recognition.face_encodings(group_image, face_locations)

# === Step 3: Compare each face in group image with known faces ===
for (top, right, bottom, left), face_encoding in zip(face_locations, face_encodings):
    # Compare with a strict tolerance
    matches = face_recognition.compare_faces(known_face_encodings, face_encoding, tolerance=0.5)
    face_distances = face_recognition.face_distance(known_face_encodings, face_encoding)

    name = "Unknown"
    if matches:
        best_match_index = np.argmin(face_distances)
        if matches[best_match_index]:
            name = known_face_names[best_match_index]

    print(f"Detected: {name}")

    # Optional: Draw rectangle around the face
    cv2.rectangle(group_image, (left, top), (right, bottom), (0, 255, 0), 2)
    cv2.putText(group_image, name, (left, top - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2)

# === Step 4: Show the result image ===
group_image = cv2.cvtColor(group_image, cv2.COLOR_RGB2BGR)
cv2.imshow("Attendance Result", group_image)
cv2.waitKey(0)
cv2.destroyAllWindows()
