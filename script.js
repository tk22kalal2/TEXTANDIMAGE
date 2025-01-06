const uploadImage = document.getElementById("uploadImage");
const processButton = document.getElementById("processButton");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
let uploadedImage = null;

// Handle image upload
uploadImage.addEventListener("change", (event) => {
  alert("Uploading image...");

  const file = event.target.files[0];
  if (!file) {
    alert("No file selected. Please upload an image.");
    console.error("No file selected.");
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.src = e.target.result;

    img.onload = () => {
      alert("Image uploaded successfully! Rendering on canvas...");
      console.log("Image successfully loaded.");
      uploadedImage = img;

      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      processButton.disabled = false;
      alert("Process button enabled. Ready to process the image.");
    };

    img.onerror = () => {
      alert("Failed to load image. Please upload a valid image.");
      console.error("Failed to load image.");
    };
  };

  reader.onerror = () => {
    alert("Error reading the file. Please try again.");
    console.error("FileReader error:", reader.error);
  };

  reader.readAsDataURL(file);
});

// Handle process image
processButton.addEventListener("click", async () => {
  if (!uploadedImage) {
    alert("No image uploaded yet. Please upload an image first.");
    console.error("Process button clicked without an uploaded image.");
    return;
  }

  try {
    alert("Starting OCR process...");
    const worker = Tesseract.createWorker();

    console.log("Initializing Tesseract worker...");
    await worker.load();
    await worker.loadLanguage("eng");
    await worker.initialize("eng");
    alert("OCR initialized successfully! Reading image text...");

    const { data: { words } } = await worker.recognize(uploadedImage);

    if (!words || words.length === 0) {
      alert("No text detected. Ensure the image contains readable text.");
      console.error("OCR detected no words.");
      return;
    }

    alert("OCR completed successfully! Detecting options and question...");
    console.log("OCR completed. Words detected:", words);

    // First, detect the start of the options
    const optionsStartY = detectOptionsStart(words);

    if (optionsStartY === null) {
      alert("No options start detected. Ensure options are labeled correctly (e.g., A., B., C., D.).");
      return;
    }

    // Then, detect the end of the question based on the options start
    const questionEndY = detectQuestionEnd(words, optionsStartY);

    if (questionEndY === null) {
      alert("No question end detected. Ensure the question text ends before the options.");
      return;
    }

    alert("Question and options detected. Cropping image...");
    const cropHeight = optionsStartY - questionEndY;

    if (cropHeight <= 0) {
      alert("Invalid cropping dimensions. Ensure the image is formatted correctly.");
      console.error("Invalid crop height:", cropHeight);
      return;
    }

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

    alert("Image cropped successfully! Showing cropped portion...");
    console.log("Cropped image displayed successfully.");

    await worker.terminate();
    alert("OCR worker terminated successfully!");
    console.log("Tesseract worker terminated.");
  } catch (error) {
    alert("An error occurred while processing the image. Check the console for details.");
    console.error("Error during image processing:", error);
  }
});

// Helper functions for detection

function detectOptionsStart(words) {
  alert("Detecting the start of options...");
  console.log("Detecting options start...");
  for (let i = 0; i < words.length; i++) {
    if (["A.", "B.", "C.", "D."].includes(words[i].text.trim())) {
      alert("Options start detected!");
      console.log("Options start detected at Y-coordinate:", words[i].bbox.y0);
      return words[i].bbox.y0; // Top Y-coordinate of the options
    }
  }
  alert("No options start detected. Format may be incorrect.");
  console.warn("No options start detected.");
  return null;
}

function detectQuestionEnd(words, optionsStartY) {
  alert("Detecting the end of the question...");
  console.log("Detecting question end...");
  // We go backward through the words to find the last line of the question
  for (let i = words.length - 1; i >= 0; i--) {
    // Ensure we're looking for text before the options start
    if (words[i].bbox.y1 < optionsStartY) {
      alert("Question end detected!");
      console.log("Question end detected at Y-coordinate:", words[i].bbox.y1);
      return words[i].bbox.y1; // Bottom Y-coordinate of the last word of the question
    }
  }
  alert("No question end detected. Format may be incorrect.");
  console.warn("No question end detected.");
  return null;
}
