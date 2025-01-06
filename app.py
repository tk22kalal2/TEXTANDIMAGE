from flask import Flask, request, jsonify, send_file
import cv2
import numpy as np
import os
from werkzeug.utils import secure_filename

app = Flask(__name__)
UPLOAD_FOLDER = 'uploads'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

@app.route('/upload', methods=['POST'])
def upload_image():
    if 'image' not in request.files:
        return jsonify({'success': False, 'error': 'No image uploaded'}), 400

    file = request.files['image']
    filename = secure_filename(file.filename)
    file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    file.save(file_path)

    extracted_diagram_path = extract_diagrams(file_path)
    if extracted_diagram_path:
        return jsonify({'success': True, 'imageUrl': extracted_diagram_path}), 200
    else:
        return jsonify({'success': False, 'error': 'Failed to extract diagrams'}), 500

def extract_diagrams(file_path):
    try:
        # Read image
        image = cv2.imread(file_path, cv2.IMREAD_GRAYSCALE)
        # Perform edge detection
        edges = cv2.Canny(image, 50, 150, apertureSize=3)
        # Find contours
        contours, _ = cv2.findContours(edges, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)

        # Draw contours
        for contour in contours:
            (x, y, w, h) = cv2.boundingRect(contour)
            if w > 50 and h > 50:  # Filter small contours
                cv2.rectangle(image, (x, y), (x + w, y + h), (0, 255, 0), 2)

        output_path = os.path.join(app.config['UPLOAD_FOLDER'], 'extracted_' + os.path.basename(file_path))
        cv2.imwrite(output_path, image)
        return output_path
    except Exception as e:
        print(f"Error extracting diagrams: {e}")
        return None

if __name__ == '__main__':
    app.run(debug=True)
