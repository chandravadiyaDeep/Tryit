import { client } from "https://cdn.jsdelivr.net/npm/@gradio/client/dist/index.min.js";

let selectedPose = null;
let selectedCloth = null;
let faceFile = null;
const REPO = "YOUR_GITHUB_USERNAME/YOUR_REPO_NAME"; // <--- CHANGE THIS

// 1. AUTO LOAD POSES AND CLOTHES FROM GITHUB FOLDER - NO CODE EDIT NEEDED
async function loadFromGitHub(path, gridId, type){
  const res = await fetch(`https://api.github.com/repos/${REPO}/contents/${path}`);
  const files = await res.json();
  const grid = document.getElementById(gridId);

  files.forEach(file=>{
    if(file.name.match(/\.(jpg|png|webp)$/)){
      const div = document.createElement('button');
      div.className = type=='pose'? 'pose-item min-w-[120px] rounded-[18px] border p-1 bg-white' : 'cloth-item rounded-[16px] border bg-white p-1';
      div.innerHTML = `<img src="${file.download_url}" class="rounded-[14px] ${type=='pose'?'h-[160px]':'h-[110px]'} w-full object-cover">`;
      div.onclick = ()=>{
        document.querySelectorAll('.'+div.className.split(' ')[0]).forEach(e=>e.classList.remove('selected'));
        div.classList.add('selected');
        if(type=='pose') selectedPose = file.download_url;
        else selectedCloth = file.download_url;
      };
      grid.appendChild(div);
    }
  });
  // auto select first
  if(grid.firstChild) grid.firstChild.click();
}

// Load all - you can add more folders
loadFromGitHub("assets/poses/female", "poseGrid", "pose");
loadFromGitHub("assets/clothes/female/tshirt", "clothesGrid", "cloth");
loadFromGitHub("assets/clothes/male/tshirt", "clothesGrid", "cloth");

// 2. CUSTOM CLOTHES (User Upload)
document.getElementById('customCloth').addEventListener('change', e=>{
  const file = e.target.files[0];
  const url = URL.createObjectURL(file);
  selectedCloth = url;
  const grid = document.getElementById('clothesGrid');
  const div = document.createElement('button');
  div.className = 'cloth-item selected rounded-[16px] border-2 border-black bg-white p-1';
  div.innerHTML = `<img src="${url}" class="rounded-[14px] h-[110px] w-full object-contain"><p class="text-[9px]">MY UPLOAD</p>`;
  grid.prepend(div);
});

// 3. FACE
document.getElementById('faceInput').addEventListener('change', e=> faceFile = e.target.files[0]);

// 4. GENERATE - TRY-ON + FACE SWAP (2 FREE MODELS)
document.getElementById('generate').onclick = async ()=>{
  if(!selectedPose ||!selectedCloth ||!faceFile) return alert("Select pose, cloth and face");
  const status = document.getElementById('status');
  const btn = document.getElementById('generate');

  try{
    btn.innerText="Step 1/2: Trying outfit...";
    status.innerText="Using OOTDiffusion (free Apache 2.0)...";

    const tryonApp = await client("https://levihsu-OOTDiffusion.hf.space");
    const poseBlob = await fetch(selectedPose).then(r=>r.blob());
    const clothBlob = await fetch(selectedCloth).then(r=>r.blob());
    const tryonResult = await tryonApp.predict("/predict", [poseBlob, clothBlob]);
    const tryonUrl = tryonResult.data[0].url;
    const tryonBlob = await fetch(tryonUrl).then(r=>r.blob());

    btn.innerText="Step 2/2: Swapping your face...";
    status.innerText="Using InsightFace - free model...";

    const faceApp = await client("https://felixrosberg-face-swap.hf.space");
    const faceSwapResult = await faceApp.predict("/predict", [tryonBlob, faceFile]);
    const finalUrl = faceSwapResult.data[0].url;

    document.getElementById('output').src = finalUrl;
    document.getElementById('output').classList.remove('hidden');
    document.getElementById('place').classList.add('hidden');
    document.getElementById('download').classList.remove('hidden');
    document.getElementById('download').onclick = ()=>{ window.open(finalUrl); };

    btn.innerText="GENERATE AGAIN ↻";
    status.innerText="Done ✨";

  }catch(err){
    console.error(err);
    status.innerText="Free server busy, retry in 20s";
    btn.innerText="GENERATE MY DRIP ✨";
  }
};

window.openCam = ()=>{
  navigator.mediaDevices.getUserMedia({video:true}).then(s=>{
    const v=document.getElementById('cam'); v.classList.remove('hidden'); v.srcObject=s;
  });
};