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

    // Then, detect the end of the question based on continuous text or large gaps
    const questionEndY = detectQuestionEnd(words, optionsStartY);

    if (questionEndY === null) {
      alert("No question end detected. Ensure the question text ends before the options.");
      return;
    }

    // Validate cropping dimensions
    if (questionEndY >= optionsStartY || questionEndY < 0 || optionsStartY > canvas.height) {
      alert("Invalid cropping dimensions detected! Adjusting...");
      console.error("Invalid cropping dimensions. QuestionEndY:", questionEndY, "OptionsStartY:", optionsStartY);

      // Apply fallback logic to ensure valid cropping
      const cropStartY = Math.max(0, questionEndY - 20); // Start slightly above detected question end
      const cropEndY = Math.min(canvas.height, optionsStartY + 20); // End slightly below detected options start
      if (cropEndY <= cropStartY) {
        alert("Unable to determine valid cropping area. Please check the image.");
        console.error("Fallback cropping dimensions are invalid.");
        return;
      }
      alert("Fallback cropping applied!");
      performCropping(cropStartY, cropEndY);
    } else {
      alert("Cropping with detected dimensions...");
      performCropping(questionEndY, optionsStartY);
    }

    await worker.terminate();
    alert("OCR worker terminated successfully!");
    console.log("Tesseract worker terminated.");
  } catch (error) {
    alert("An error occurred while processing the image. Check the console for details.");
    console.error("Error during image processing:", error);
  }
});

// Helper function: Perform cropping
function performCropping(startY, endY) {
  const cropHeight = endY - startY;
  if (cropHeight <= 0) {
    alert("Invalid cropping height! Ensure the image has correct question and options.");
    console.error("Invalid crop height:", cropHeight);
    return;
  }

  const croppedCanvas = document.createElement("canvas");
  const croppedCtx = croppedCanvas.getContext("2d");
  croppedCanvas.width = canvas.width;
  croppedCanvas.height = cropHeight;

  croppedCtx.drawImage(
    uploadedImage,
    0, startY, canvas.width, cropHeight,
    0, 0, canvas.width, cropHeight
  );

  const output = document.getElementById("output");
  const croppedImage = new Image();
  croppedImage.src = croppedCanvas.toDataURL("image/png");
  output.appendChild(croppedImage);

  alert("Image cropped successfully! Showing cropped portion...");
  console.log("Cropped image displayed successfully.");
}

// Helper function: Detect options start
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

// Helper function: Detect question end
function detectQuestionEnd(words, optionsStartY) {
  alert("Detecting the end of the question...");
  console.log("Detecting question end...");

  let lastTextY = 0;
  let largeGapDetected = false;

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const currentY = word.bbox.y1;

    if (currentY >= optionsStartY) break; // Stop when we reach the options

    if (lastTextY > 0 && (currentY - lastTextY) > 20) {
      largeGapDetected = true;
      break; // Assume question ends when a large vertical gap is detected
    }

    lastTextY = currentY;
  }

  if (largeGapDetected) {
    alert("Large vertical gap detected, assuming question end.");
    console.log("Question end detected due to large vertical gap.");
    return lastTextY;
  }

  console.warn("No clear question end detected.");
  return lastTextY;
}
