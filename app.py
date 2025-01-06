from flask import Flask, request, jsonify, send_from_directory
import os
import cv2
import numpy as np

app = Flask(__name__)

# Upload folder
UPLOAD_FOLDER = 'uploads'
OUTPUT_FOLDER = 'output'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(OUTPUT_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

@app.route('/')
def index():
    return send_from_directory('', 'index.html')

@app.route('/upload', methods=['POST'])
def upload_image():
    if 'image' not in request.files:
        return jsonify({"success": False, "message": "No file uploaded"})

    file = request.files['image']
    if file.filename == '':
        return jsonify({"success": False, "message": "No file selected"})

    file_path = os.path.join(app.config['UPLOAD_FOLDER'], file.filename)
    file.save(file_path)

    # Process the image to extract diagrams
    try:
        output_path = extract_diagram(file_path, file.filename)
        return jsonify({"success": True, "diagramUrl": f"/output/{output_path}"})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)})

@app.route('/output/<filename>')
def get_output(filename):
    return send_from_directory(OUTPUT_FOLDER, filename)

def extract_diagram(image_path, filename):
    # Read the image
    img = cv2.imread(image_path)

    # Convert to grayscale
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # Apply edge detection
    edges = cv2.Canny(gray, 50, 150)

    # Find contours
    contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    # Filter and extract the largest contour (likely the diagram)
    contour_img = np.zeros_like(img)
    cv2.drawContours(contour_img, contours, -1, (255, 255, 255), thickness=cv2.FILLED)

    # Save the extracted diagram
    output_path = os.path.join(OUTPUT_FOLDER, filename)
    cv2.imwrite(output_path, contour_img)

    return filename

if __name__ == '__main__':
    app.run(debug=True)
