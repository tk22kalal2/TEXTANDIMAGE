const uploadImage = document.getElementById("uploadImage");
const processButton = document.getElementById("processButton");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
let uploadedImage = null;

// Handle image upload
uploadImage.addEventListener("change", (event) => {
  console.log("Image upload event triggered."); // Log upload event

  const file = event.target.files[0];
  if (!file) {
    alert("No file selected. Please upload an image.");
    console.error("No file selected."); // Log error
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.src = e.target.result;

    img.onload = () => {
      console.log("Image successfully loaded."); // Log success
      uploadedImage = img;

      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0); // Draw the image on the canvas

      processButton.disabled = false; // Enable the process button
      console.log("Process button enabled."); // Log button status
      alert("Image uploaded successfully! You can now process the image.");
    };

    img.onerror = () => {
      alert("Failed to load image. Please upload a valid image.");
      console.error("Failed to load image."); // Log error
    };
  };

  reader.onerror = () => {
    alert("Error reading the file. Please try again.");
    console.error("FileReader error:", reader.error); // Log error
  };

  reader.readAsDataURL(file);
});

// Handle process image
processButton.addEventListener("click", async () => {
  if (!uploadedImage) {
    alert("No image uploaded yet. Please upload an image first.");
    console.error("Process button clicked without an uploaded image."); // Log error
    return;
  }

  try {
    const worker = Tesseract.createWorker();
    console.log("Initializing Tesseract worker..."); // Log worker initialization

    await worker.load();
    await worker.loadLanguage("eng");
    await worker.initialize("eng");
    console.log("Tesseract worker initialized."); // Log initialization success

    const { data: { words } } = await worker.recognize(uploadedImage);
    console.log("OCR completed. Words detected:", words); // Log OCR results

    const questionEndY = detectQuestionEnd(words);
    const optionsStartY = detectOptionsStart(words);

    if (questionEndY && optionsStartY) {
      const cropHeight = optionsStartY - questionEndY;

      const croppedCanvas = document.createElement("canvas");
      const croppedCtx = croppedCanvas.getContext("2d");
      croppedCanvas.width = canvas.width;
      croppedCanvas.height = cropHeight;

      croppedCtx.drawImage(
        uploadedImage,
        0, questionEndY, canvas.width, cropHeight,
        0, 0, canvas.width, cropHeight
      );

      const output = document.getElementById("output");
      const croppedImage = new Image();
      croppedImage.src = croppedCanvas.toDataURL("image/png");
      output.appendChild(croppedImage);
      alert("Image processed successfully! Cropped portion displayed.");
      console.log("Cropped image displayed successfully."); // Log success
    } else {
      alert("Could not detect question or options. Make sure the format is correct.");
      console.error("Failed to detect question or options."); // Log error
    }

    await worker.terminate();
    console.log("Tesseract worker terminated."); // Log worker termination
  } catch (error) {
    alert("An error occurred while processing the image. Check the console for details.");
    console.error("Error during image processing:", error); // Log error
  }
});

// Helper functions for detection
function detectQuestionEnd(words) {
  console.log("Detecting question end..."); // Log function start
  for (let i = 0; i < words.length; i++) {
    if (words[i].text.endsWith("?")) {
      console.log("Question end detected at Y-coordinate:", words[i].bbox.y1); // Log detection
      return words[i].bbox.y1; // Bottom Y-coordinate of the question
    }
  }
  console.warn("No question end detected."); // Log warning
  return null;
}

function detectOptionsStart(words) {
  console.log("Detecting options start..."); // Log function start
  for (let i = 0; i < words.length; i++) {
    if (["A.", "B.", "C.", "D."].includes(words[i].text)) {
      console.log("Options start detected at Y-coordinate:", words[i].bbox.y0); // Log detection
      return words[i].bbox.y0; // Top Y-coordinate of the options
    }
  }
  console.warn("No options start detected."); // Log warning
  return null;
}
