// Copyright 2023 The MediaPipe Authors.

// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at

//      http://www.apache.org/licenses/LICENSE-2.0

// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

// Import MediaPipe libraries from npm packages
import * as vision from "@mediapipe/tasks-vision";

// Define result types
interface BlendShape {
  categories: BlendShapeCategory[];
}

interface BlendShapeCategory {
  score: number;
  categoryName: string;
  displayName?: string;
}

// Variables for the application
let faceLandmarker: vision.FaceLandmarker | undefined;
let runningMode: "IMAGE" | "VIDEO" = "IMAGE";
let enableWebcamButton: HTMLButtonElement;
let webcamRunning = false;
const videoWidth = 480;

const demosSection = document.getElementById("demos");
const imageBlendShapes = document.getElementById("image-blend-shapes");
const videoBlendShapes = document.getElementById("video-blend-shapes");

// Wait for DOM to load before initializing
document.addEventListener("DOMContentLoaded", () => {
  initialize();
  initializeWebcam();
});

function initialize() {
  // Create the face landmarker
  createFaceLandmarker();

  // Set up click listeners for images
  setupImageClickListeners();
}

// Before we can use FaceLandmarker class we must wait for it to finish
// loading. Machine Learning models can be large and take a moment to
// get everything needed to run.
async function createFaceLandmarker() {
  try {
    const filesetResolver = await vision.FilesetResolver.forVisionTasks("/node_modules/@mediapipe/tasks-vision/wasm");

    faceLandmarker = await vision.FaceLandmarker.createFromOptions(filesetResolver, {
      baseOptions: {
        modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
        delegate: "GPU",
      },
      outputFaceBlendshapes: true,
      runningMode,
      numFaces: 1,
    });

    if (demosSection) {
      demosSection.classList.remove("invisible");
    }
  } catch (error) {
    console.error("Error creating FaceLandmarker:", error);
  }
}

// Set up click listeners for images
function setupImageClickListeners() {
  // In this demo, we have put all our clickable images in divs with the
  // CSS class 'detectionOnClick'. Lets get all the elements that have
  // this class.
  const imageContainers = document.getElementsByClassName("detectOnClick");

  // Now let's go through all of these and add a click event listener.
  for (let i = 0; i < imageContainers.length; i++) {
    const imageContainer = imageContainers[i];
    // Add event listener to the child element which is the img element.
    if (imageContainer.children[0] instanceof HTMLElement) {
      imageContainer.children[0].addEventListener("click", (event) => {
        handleClick(event as MouseEvent);
      });
    }
  }
}

// When an image is clicked, let's detect it and display results!
async function handleClick(event: MouseEvent) {
  if (!faceLandmarker) {
    console.log("Wait for faceLandmarker to load before clicking!");
    return;
  }

  if (runningMode === "VIDEO") {
    runningMode = "IMAGE";
    await faceLandmarker.setOptions({ runningMode });
  }

  const target = event.target as HTMLImageElement;
  if (!target) return;

  // Remove all landmarks drawn before
  const parentElement = target.parentElement;
  if (!parentElement) return;

  const allCanvas = parentElement.querySelectorAll(".canvas");
  allCanvas.forEach((canvas) => {
    if (canvas.parentNode) {
      canvas.parentNode.removeChild(canvas);
    }
  });

  // We can call faceLandmarker.detect as many times as we like with
  // different image data each time. This returns a promise
  // which we wait to complete and then call a function to
  // print out the results of the prediction.
  const faceLandmarkerResult = faceLandmarker.detect(target);
  const canvas = document.createElement("canvas") as HTMLCanvasElement;
  canvas.setAttribute("class", "canvas");
  canvas.setAttribute("width", target.naturalWidth + "px");
  canvas.setAttribute("height", target.naturalHeight + "px");
  canvas.style.left = "0px";
  canvas.style.top = "0px";
  canvas.style.width = `${target.width}px`;
  canvas.style.height = `${target.height}px`;

  parentElement.appendChild(canvas);

  const ctx = canvas.getContext("2d");
  if (ctx) {
    const drawingUtils = new vision.DrawingUtils(ctx);
    for (const landmarks of faceLandmarkerResult.faceLandmarks) {
      drawingUtils.drawConnectors(landmarks, vision.FaceLandmarker.FACE_LANDMARKS_TESSELATION, {
        color: "#C0C0C070",
        lineWidth: 1,
      });
      drawingUtils.drawConnectors(landmarks, vision.FaceLandmarker.FACE_LANDMARKS_RIGHT_EYE, { color: "#FF3030" });
      drawingUtils.drawConnectors(landmarks, vision.FaceLandmarker.FACE_LANDMARKS_RIGHT_EYEBROW, { color: "#FF3030" });
      drawingUtils.drawConnectors(landmarks, vision.FaceLandmarker.FACE_LANDMARKS_LEFT_EYE, { color: "#30FF30" });
      drawingUtils.drawConnectors(landmarks, vision.FaceLandmarker.FACE_LANDMARKS_LEFT_EYEBROW, { color: "#30FF30" });
      drawingUtils.drawConnectors(landmarks, vision.FaceLandmarker.FACE_LANDMARKS_FACE_OVAL, { color: "#E0E0E0" });
      drawingUtils.drawConnectors(landmarks, vision.FaceLandmarker.FACE_LANDMARKS_LIPS, {
        color: "#E0E0E0",
      });
      drawingUtils.drawConnectors(landmarks, vision.FaceLandmarker.FACE_LANDMARKS_RIGHT_IRIS, { color: "#FF3030" });
      drawingUtils.drawConnectors(landmarks, vision.FaceLandmarker.FACE_LANDMARKS_LEFT_IRIS, { color: "#30FF30" });
    }
  }

  if (imageBlendShapes) {
    drawBlendShapes(imageBlendShapes, faceLandmarkerResult.faceBlendshapes);
  }
}

/********************************************************************
// Demo 2: Continuously grab image from webcam stream and detect it.
********************************************************************/

// Set up webcam elements
let video: HTMLVideoElement | null = null;
let canvasElement: HTMLCanvasElement | null = null;
let canvasCtx: CanvasRenderingContext2D | null = null;

// Initialize webcam elements after the script is loaded
function initializeWebcam() {
  video = document.getElementById("webcam") as HTMLVideoElement;
  canvasElement = document.getElementById("output_canvas") as HTMLCanvasElement;
  canvasCtx = canvasElement?.getContext("2d") || null;

  // Check if webcam access is supported.
  if (hasGetUserMedia()) {
    enableWebcamButton = document.getElementById("webcamButton") as HTMLButtonElement;
    if (enableWebcamButton) {
      enableWebcamButton.addEventListener("click", (event) => {
        enableCam(event as MouseEvent);
      });
    }
  } else {
    console.warn("getUserMedia() is not supported by your browser");
  }
}

// Check if webcam access is supported.
function hasGetUserMedia() {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

// Enable the live webcam view and start detection.
function enableCam(event: MouseEvent) {
  if (!faceLandmarker) {
    console.log("Wait! faceLandmarker not loaded yet.");
    return;
  }

  if (!video || !canvasElement) {
    initializeWebcam();
    if (!video) return;
  }

  if (webcamRunning) {
    webcamRunning = false;
    if (enableWebcamButton) {
      enableWebcamButton.innerText = "ENABLE PREDICTIONS";
    }
  } else {
    webcamRunning = true;
    if (enableWebcamButton) {
      enableWebcamButton.innerText = "DISABLE PREDICTIONS";
    }
  }

  // getUsermedia parameters.
  const constraints = {
    video: true,
  };

  // Activate the webcam stream.
  navigator.mediaDevices.getUserMedia(constraints).then((stream) => {
    if (!video) return;
    video.srcObject = stream;
    video.addEventListener("loadeddata", predictWebcam);
  });
}

let lastVideoTime = -1;
let results: vision.FaceLandmarkerResult | undefined;

async function predictWebcam() {
  if (!video || !canvasElement || !canvasCtx || !faceLandmarker) return;

  const drawingUtils = new vision.DrawingUtils(canvasCtx);

  const radio = video.videoHeight / video.videoWidth;
  video.style.width = videoWidth + "px";
  video.style.height = videoWidth * radio + "px";
  canvasElement.style.width = videoWidth + "px";
  canvasElement.style.height = videoWidth * radio + "px";
  canvasElement.width = video.videoWidth;
  canvasElement.height = video.videoHeight;

  // Now let's start detecting the stream.
  if (runningMode === "IMAGE") {
    runningMode = "VIDEO";
    await faceLandmarker.setOptions({ runningMode });
  }

  let startTimeMs = performance.now();
  if (lastVideoTime !== video.currentTime) {
    lastVideoTime = video.currentTime;
    results = faceLandmarker.detectForVideo(video, startTimeMs);
  }

  if (results && results.faceLandmarks) {
    for (const landmarks of results.faceLandmarks) {
      drawingUtils.drawConnectors(landmarks, vision.FaceLandmarker.FACE_LANDMARKS_TESSELATION, {
        color: "#C0C0C070",
        lineWidth: 1,
      });
      drawingUtils.drawConnectors(landmarks, vision.FaceLandmarker.FACE_LANDMARKS_RIGHT_EYE, { color: "#FF3030" });
      drawingUtils.drawConnectors(landmarks, vision.FaceLandmarker.FACE_LANDMARKS_RIGHT_EYEBROW, { color: "#FF3030" });
      drawingUtils.drawConnectors(landmarks, vision.FaceLandmarker.FACE_LANDMARKS_LEFT_EYE, { color: "#30FF30" });
      drawingUtils.drawConnectors(landmarks, vision.FaceLandmarker.FACE_LANDMARKS_LEFT_EYEBROW, { color: "#30FF30" });
      drawingUtils.drawConnectors(landmarks, vision.FaceLandmarker.FACE_LANDMARKS_FACE_OVAL, { color: "#E0E0E0" });
      drawingUtils.drawConnectors(landmarks, vision.FaceLandmarker.FACE_LANDMARKS_LIPS, { color: "#E0E0E0" });
      drawingUtils.drawConnectors(landmarks, vision.FaceLandmarker.FACE_LANDMARKS_RIGHT_IRIS, { color: "#FF3030" });
      drawingUtils.drawConnectors(landmarks, vision.FaceLandmarker.FACE_LANDMARKS_LEFT_IRIS, { color: "#30FF30" });
    }
  }

  if (videoBlendShapes && results?.faceBlendshapes) {
    drawBlendShapes(videoBlendShapes, results.faceBlendshapes);
  }

  // Call this function again to keep predicting when the browser is ready.
  if (webcamRunning) {
    window.requestAnimationFrame(predictWebcam);
  }
}

function drawBlendShapes(el: HTMLElement, blendShapes: BlendShape[]) {
  if (!blendShapes.length) {
    return;
  }

  console.log(blendShapes[0]);

  let htmlMaker = "";
  blendShapes[0].categories.forEach((shape: BlendShapeCategory) => {
    htmlMaker += `
      <li class="blend-shapes-item">
        <span class="blend-shapes-label">${shape.displayName || shape.categoryName}</span>
        <span class="blend-shapes-value" style="width: calc(${+shape.score * 100}% - 120px)">${(+shape.score).toFixed(
      4
    )}</span>
      </li>
    `;
  });

  el.innerHTML = htmlMaker;
}
