const uploadImage = document.getElementById("uploadImage");
const processButton = document.getElementById("processButton");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
let uploadedImage = null;

// Handle image upload
uploadImage.addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target.result;
      img.onload = () => {
        uploadedImage = img; // Save the uploaded image for cropping
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0); // Draw the uploaded image on the canvas
        processButton.disabled = false; // Enable the process button
      };
    };
    reader.readAsDataURL(file);
  }
});

// Handle process image
processButton.addEventListener("click", async () => {
  if (uploadedImage) {
    const worker = Tesseract.createWorker();

    // Initialize Tesseract.js OCR worker
    await worker.load();
    await worker.loadLanguage("eng");
    await worker.initialize("eng");

    // Perform OCR on the uploaded image
    const { data: { words } } = await worker.recognize(uploadedImage);

    // Detect question and options positions
    const questionEndY = detectQuestionEnd(words);
    const optionsStartY = detectOptionsStart(words);

    if (questionEndY && optionsStartY) {
      const cropHeight = optionsStartY - questionEndY;

      // Cropping the region between question and options
      const croppedCanvas = document.createElement("canvas");
      const croppedCtx = croppedCanvas.getContext("2d");
      croppedCanvas.width = canvas.width;
      croppedCanvas.height = cropHeight;

      croppedCtx.drawImage(
        uploadedImage,
        0, questionEndY, canvas.width, cropHeight,
        0, 0, canvas.width, cropHeight
      );

      // Display cropped image
      const output = document.getElementById("output");
      const croppedImage = new Image();
      croppedImage.src = croppedCanvas.toDataURL("image/png");
      output.appendChild(croppedImage);
    } else {
      alert("Could not detect question or options.");
    }

    // Terminate the OCR worker
    await worker.terminate();
  }
});

// Helper functions for detection
function detectQuestionEnd(words) {
  // Find the last word of the question (e.g., ending with `?`)
  for (let i = 0; i < words.length; i++) {
    if (words[i].text.endsWith("?")) {
      return words[i].bbox.y1; // Bottom Y-coordinate of the question
    }
  }
  return null;
}

function detectOptionsStart(words) {
  // Find the first word of the options (e.g., starting with "A.", "B.", "C.", or "D.")
  for (let i = 0; i < words.length; i++) {
    if (["A.", "B.", "C.", "D."].includes(words[i].text)) {
      return words[i].bbox.y0; // Top Y-coordinate of the options
    }
  }
  return null;
}
