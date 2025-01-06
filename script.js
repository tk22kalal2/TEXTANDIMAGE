const uploadImage = document.getElementById("uploadImage");
const cropButton = document.getElementById("cropButton");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
let uploadedImage = null;

uploadImage.addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target.result;
      img.onload = () => {
        uploadedImage = img;
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        cropButton.disabled = false;
      };
    };
    reader.readAsDataURL(file);
  }
});

cropButton.addEventListener("click", () => {
  if (uploadedImage) {
    // Assuming question starts at 20% height and options end at 80% height
    const startY = canvas.height * 0.2; // 20% height
    const endY = canvas.height * 0.8; // 80% height
    const cropHeight = endY - startY;

    // Cropping the portion between question and options
    const croppedCanvas = document.createElement("canvas");
    const croppedCtx = croppedCanvas.getContext("2d");
    croppedCanvas.width = canvas.width;
    croppedCanvas.height = cropHeight;
    croppedCtx.drawImage(
      uploadedImage,
      0, startY, canvas.width, cropHeight,
      0, 0, canvas.width, cropHeight
    );

    // Display cropped image
    const output = document.getElementById("output");
    const croppedImage = new Image();
    croppedImage.src = croppedCanvas.toDataURL("image/png");
    output.appendChild(croppedImage);
  }
});
