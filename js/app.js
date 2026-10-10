import { client } from "https://cdn.jsdelivr.net/npm/@gradio/client/dist/index.min.js";

// State Management
let currentGender = "male";
let currentCategory = "tshirt";
let selectedPose = "assets/poses/male/pose_1.svg";
let selectedCloth = null;
let faceBlob = null;
let customClosetItems = [];

// Local assets mapping (directly matching your scraped folders)
const LOCAL_CATALOG = {
  male: {
    poses: ["assets/poses/male/pose_1.svg"],
    clothes: {
      tshirt: ["assets/clothes/male/tshirt/item_1.png", "assets/clothes/male/tshirt/item_2.png"],
      shirt: ["assets/clothes/male/shirt/item_1.png", "assets/clothes/male/shirt/item_2.png"],
      kurta: ["assets/clothes/male/kurta/item_1.png"]
    }
  },
  female: {
    poses: ["assets/poses/female/pose_1.svg"],
    clothes: {
      tshirt: ["assets/clothes/female/tshirt/item_1.png", "assets/clothes/female/tshirt/item_2.png"],
      kurta: ["assets/clothes/female/kurta/item_1.png"],
      saree: []
    }
  }
};

// DOM References
const poseGrid = document.getElementById("poseGrid");
const clothesGrid = document.getElementById("clothesGrid");
const poseLayer = document.getElementById("poseLayer");
const garmentLayer = document.getElementById("garmentLayer");
const faceLayer = document.getElementById("faceLayer");
const garmentTag = document.getElementById("garmentTag");
const placeholder = document.getElementById("place");
const statusText = document.getElementById("status");
const generateBtn = document.getElementById("generate");
const closetCount = document.getElementById("closetCount");

// 1. RENDER POSES
function renderPoses() {
  poseGrid.innerHTML = "";
  const poses = LOCAL_CATALOG[currentGender].poses;

  poses.forEach((src, idx) => {
    const btn = document.createElement("button");
    btn.className = `pose-item min-w-[100px] h-[130px] rounded-[16px] border bg-white p-1 flex items-center justify-center ${selectedPose === src ? "selected" : ""}`;
    btn.innerHTML = `<img src="${src}" class="h-full w-full object-contain rounded-[12px]">`;
    
    btn.onclick = () => {
      document.querySelectorAll(".pose-item").forEach(el => el.classList.remove("selected"));
      btn.classList.add("selected");
      selectedPose = src;
      poseLayer.src = src;
      placeholder.classList.add("hidden");
    };

    poseGrid.appendChild(btn);
  });
}

// 2. RENDER CLOTHES GRID
function renderClothes() {
  clothesGrid.innerHTML = "";
  const categoryItems = LOCAL_CATALOG[currentGender].clothes[currentCategory] || [];
  const allItems = [...customClosetItems, ...categoryItems];

  if (allItems.length === 0) {
    clothesGrid.innerHTML = `<p class="col-span-2 text-xs text-gray-400 text-center py-8">No items found in this section.</p>`;
    return;
  }

  allItems.forEach((src) => {
    const btn = document.createElement("button");
    const isSelected = selectedCloth === src;
    btn.className = `cloth-item rounded-[16px] border bg-white p-2.5 flex flex-col items-center justify-center ${isSelected ? "selected" : ""}`;
    btn.innerHTML = `
      <img src="${src}" class="h-[90px] w-full object-contain transition-transform duration-200">
      <span class="text-[9px] uppercase tracking-wider text-gray-500 font-semibold mt-1">${currentCategory}</span>
    `;

    btn.onclick = () => {
      document.querySelectorAll(".cloth-item").forEach(el => el.classList.remove("selected"));
      btn.classList.add("selected");
      selectedCloth = src;

      // Update Live Canvas Layer
      garmentLayer.src = src;
      garmentLayer.dataset.type = currentCategory;
      garmentLayer.classList.remove("hidden");
      garmentTag.innerText = currentCategory.toUpperCase();
      placeholder.classList.add("hidden");
    };

    clothesGrid.appendChild(btn);
  });
}

// 3. GENDER & CATEGORY FILTER TABS
document.querySelectorAll(".gender-btn").forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll(".gender-btn").forEach(b => {
      b.classList.remove("active", "bg-white", "shadow-sm");
      b.classList.add("text-gray-500");
    });
    btn.classList.add("active", "bg-white", "shadow-sm");
    btn.classList.remove("text-gray-500");

    currentGender = btn.dataset.gender;
    selectedPose = LOCAL_CATALOG[currentGender].poses[0];
    poseLayer.src = selectedPose;

    // Toggle Saree button visibility based on gender
    const sareeTab = document.querySelector('[data-category="saree"]');
    if (sareeTab) {
      if (currentGender === "female") sareeTab.classList.remove("hidden");
      else sareeTab.classList.add("hidden");
    }

    renderPoses();
    renderClothes();
  };
});

document.querySelectorAll(".cat-pill").forEach(pill => {
  pill.onclick = () => {
    document.querySelectorAll(".cat-pill").forEach(p => p.classList.remove("active"));
    pill.classList.add("active");
    currentCategory = pill.dataset.category;
    renderClothes();
  };
});

// 4. USER CUSTOM CLOTH UPLOAD
document.getElementById("customCloth").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const url = URL.createObjectURL(file);
  selectedCloth = url;
  customClosetItems.unshift(url);
  closetCount.innerText = customClosetItems.length;

  garmentLayer.src = url;
  garmentLayer.classList.remove("hidden");
  garmentTag.innerText = "CUSTOM";
  placeholder.classList.add("hidden");

  renderClothes();
});

// 5. FACE UPLOAD & CAMERA WEBCAM
const camContainer = document.getElementById("camContainer");
const camVideo = document.getElementById("cam");
const camToggleBtn = document.getElementById("camToggleBtn");
const snapBtn = document.getElementById("snapPhotoBtn");
let videoStream = null;

document.getElementById("faceInput").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  faceBlob = file;
  const url = URL.createObjectURL(file);
  faceLayer.src = url;
  faceLayer.classList.remove("hidden");
});

camToggleBtn.onclick = async () => {
  if (videoStream) {
    videoStream.getTracks().forEach(t => t.stop());
    camContainer.classList.add("hidden");
    videoStream = null;
    return;
  }
  try {
    videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
    camVideo.srcObject = videoStream;
    camContainer.classList.remove("hidden");
  } catch (err) {
    alert("Camera access denied or unavailable.");
  }
};

snapBtn.onclick = () => {
  const canvas = document.createElement("canvas");
  canvas.width = camVideo.videoWidth || 640;
  canvas.height = camVideo.videoHeight || 480;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(camVideo, 0, 0, canvas.width, canvas.height);

  canvas.toBlob((blob) => {
    faceBlob = blob;
    faceLayer.src = URL.createObjectURL(blob);
    faceLayer.classList.remove("hidden");
    
    // Stop camera stream
    if (videoStream) {
      videoStream.getTracks().forEach(t => t.stop());
      videoStream = null;
      camContainer.classList.add("hidden");
    }
  }, "image/jpeg");
};

// 6. CLEAR / RESET BUTTON
document.getElementById("resetFitBtn").onclick = () => {
  selectedCloth = null;
  garmentLayer.classList.add("hidden");
  garmentLayer.src = "";
  garmentTag.innerText = "No Item";
  document.querySelectorAll(".cloth-item").forEach(el => el.classList.remove("selected"));
};

// 7. COMPOSITE & DOWNLOAD CANVAS
document.getElementById("downloadBtn").onclick = () => {
  const canvas = document.getElementById("exportCanvas");
  const ctx = canvas.getContext("2d");
  canvas.width = 600;
  canvas.height = 800;

  ctx.fillStyle = "#fcf8f3";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const drawImg = (src, x, y, w, h) => {
    return new Promise((resolve) => {
      if (!src) return resolve();
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        ctx.drawImage(img, x, y, w, h);
        resolve();
      };
      img.onerror = () => resolve();
      img.src = src;
    });
  };

  Promise.all([
    drawImg(poseLayer.src, 50, 40, 500, 720),
    selectedCloth ? drawImg(selectedCloth, 110, 150, 380, 420) : Promise.resolve(),
    faceLayer.src && !faceLayer.classList.contains("hidden") ? drawImg(faceLayer.src, 250, 70, 100, 100) : Promise.resolve()
  ]).then(() => {
    const link = document.createElement("a");
    link.download = `drip-look-${Date.now()}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  });
};

// 8. AI GENERATE (OOTDiffusion + InsightFace via Gradio)
generateBtn.onclick = async () => {
  if (!selectedCloth) return alert("Please select a garment first!");
  
  try {
    generateBtn.disabled = true;
    generateBtn.innerText = "Step 1/2: Warping Garment (OOTDiffusion)...";
    statusText.innerText = "Connecting to Hugging Face Space...";

    const tryonApp = await client("https://levihsu-OOTDiffusion.hf.space");
    const poseBlob = await fetch(selectedPose).then(r => r.blob());
    const clothBlob = await fetch(selectedCloth).then(r => r.blob());

    const tryonResult = await tryonApp.predict("/predict", [poseBlob, clothBlob]);
    const tryonUrl = tryonResult.data[0].url;

    if (faceBlob) {
      generateBtn.innerText = "Step 2/2: Swapping Face (InsightFace)...";
      statusText.innerText = "Refining facial features...";

      const faceApp = await client("https://felixrosberg-face-swap.hf.space");
      const tryonBlob = await fetch(tryonUrl).then(r => r.blob());
      const faceSwapResult = await faceApp.predict("/predict", [tryonBlob, faceBlob]);
      
      poseLayer.src = faceSwapResult.data[0].url;
    } else {
      poseLayer.src = tryonUrl;
    }

    garmentLayer.classList.add("hidden");
    faceLayer.classList.add("hidden");
    statusText.innerText = "Look generated successfully ✨";
    generateBtn.innerText = "GENERATE AGAIN ↻";

  } catch (err) {
    console.warn("External Hugging Face cluster busy; rendered composite preview directly.", err);
    statusText.innerText = "Preview rendered on canvas (HF servers busy).";
    generateBtn.innerText = "GENERATE MY DRIP ✨";
  } finally {
    generateBtn.disabled = false;
  }
};

// Initialize view
renderPoses();
renderClothes();