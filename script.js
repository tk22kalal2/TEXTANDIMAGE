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
    if (questionEndY >= optionsStartY) {
      alert(
        `Invalid cropping dimensions detected. Question End (Y: ${questionEndY}) is greater than or equal to Options Start (Y: ${optionsStartY}). Please check the image formatting.`
      );
      console.error(
        "Invalid cropping dimensions:",
        { questionEndY, optionsStartY }
      );
      return;
    }

    const cropHeight = optionsStartY - questionEndY;

    if (cropHeight <= 0) {
      alert("Invalid cropping dimensions. Crop height is zero or negative.");
      console.error("Invalid crop height:", cropHeight);
      return;
    }

    alert("Question and options detected. Cropping image...");
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

  let lastTextY = 0;
  let largeGapDetected = false;

  // Iterate through words and find continuous blocks
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const currentY = word.bbox.y1;

    // Check for large gap (indicating a break between question and options)
    if (currentY > optionsStartY) break; // We've already passed the options

    // Check for a large vertical gap
    if (lastTextY > 0 && (currentY - lastTextY) > 20) {
      largeGapDetected = true;
      break; // If a large gap is found, we stop and assume the question ends here
    }

    lastTextY = currentY;
  }

  if (largeGapDetected) {
    alert("Large vertical gap detected, assuming question end.");
    console.log("Question end detected due to large vertical gap.");
    return lastTextY; // Return the last Y-coordinate before the gap
  }

  console.warn("No clear question end detected.");
  return null;
}
