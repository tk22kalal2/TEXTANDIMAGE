document.getElementById("extractButton").addEventListener("click", extractTextAndImage);

function extractTextAndImage() {
  const imageInput = document.getElementById("imageInput").files[0];
  if (!imageInput) {
    alert("Please upload an image first.");
    return;
  }

  const canvas = document.getElementById("imageCanvas");
  const context = canvas.getContext("2d");
  const textOutput = document.getElementById("textOutput");
  
  const img = new Image();
  const reader = new FileReader();

  reader.onload = function (e) {
    img.src = e.target.result;
    img.onload = function () {
      // Draw image onto the canvas
      canvas.width = img.width;
      canvas.height = img.height;
      context.drawImage(img, 0, 0);

      // Use Tesseract.js to extract text from the image
      Tesseract.recognize(img.src, 'eng', {
        logger: (info) => console.log(info), // Logs progress
      }).then(({ data: { text } }) => {
        textOutput.value = text.trim();
        console.log("Extracted Text:", text);
      }).catch((error) => {
        console.error("Error extracting text:", error);
        alert("Error extracting text. Please try again.");
      });
    };
  };

  reader.readAsDataURL(imageInput);
}
