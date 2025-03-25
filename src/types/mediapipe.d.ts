declare module "@mediapipe/tasks-vision" {
  export class FilesetResolver {
    static forVisionTasks(wasmFilesPath: string): Promise<any>;
  }

  export class FaceLandmarker {
    static createFromOptions(filesetResolver: any, options: any): Promise<FaceLandmarker>;
    detect(image: HTMLImageElement): FaceLandmarkerResult;
    detectForVideo(video: HTMLVideoElement, timestamp: number): FaceLandmarkerResult;
    setOptions(options: { runningMode: string }): Promise<void>;
    static FACE_LANDMARKS_TESSELATION: any;
    static FACE_LANDMARKS_RIGHT_EYE: any;
    static FACE_LANDMARKS_RIGHT_EYEBROW: any;
    static FACE_LANDMARKS_LEFT_EYE: any;
    static FACE_LANDMARKS_LEFT_EYEBROW: any;
    static FACE_LANDMARKS_FACE_OVAL: any;
    static FACE_LANDMARKS_LIPS: any;
    static FACE_LANDMARKS_RIGHT_IRIS: any;
    static FACE_LANDMARKS_LEFT_IRIS: any;
  }

  export interface FaceLandmarkerResult {
    faceLandmarks: any[];
    faceBlendshapes: any[];
  }

  export class DrawingUtils {
    constructor(ctx: CanvasRenderingContext2D);
    drawConnectors(landmarks: any, connections: any, options: any): void;
  }
}
