import type {
    BoundingBox,
    FaceLandmarkerResult,
    NormalizedLandmark,
    ObjectDetectorResult,
    PoseLandmarkerResult,
} from "@mediapipe/tasks-vision";

type InterviewProctoringOptions = {
    onWarning: (message: string, warningCount: number, highlight?: DetectionHighlight | null) => void;
    onTerminate: (message: string) => void;
};

type DetectionState = {
    count: number;
    lastMessage: string | null;
};

type NormalizedBox = {
    left: number;
    top: number;
    right: number;
    bottom: number;
    width: number;
    height: number;
    centerX: number;
    centerY: number;
};

type Point = {
    x: number;
    y: number;
};

type PoseContext = {
    bodyBox: NormalizedBox | null;
    handPoints: Point[];
};

type MediaPipeVisionModule = typeof import("@mediapipe/tasks-vision");

type MediaPipeEngine = {
    faceLandmarker: {
        detectForVideo(videoFrame: HTMLVideoElement, timestamp: number): FaceLandmarkerResult;
    } | null;
    poseLandmarker: {
        detectForVideo(videoFrame: HTMLVideoElement, timestamp: number): PoseLandmarkerResult;
    } | null;
    objectDetector: {
        detectForVideo(videoFrame: HTMLVideoElement, timestamp: number): ObjectDetectorResult;
    } | null;
};

type ProctoringFinding = {
    kind: "face" | "object";
    message: string;
    terminationMessage: string;
    highlight?: DetectionHighlight | null;
};

export type DetectionHighlight = {
    centerX: number;
    centerY: number;
    radius: number;
};

const WASM_ROOT = "/mediapipe/wasm";
const FACE_MODEL_PATH = "/mediapipe/models/face_landmarker.task";
const POSE_MODEL_PATH = "/mediapipe/models/pose_landmarker_lite.task";
const OBJECT_MODEL_PATH = "/mediapipe/models/efficientdet_lite0_uint8.tflite";

const MAX_WARNINGS = 3;
const CHECK_INTERVAL_MS = 900;
const MIN_FACE_VIOLATION_CHECKS = 2;
const MIN_OBJECT_VIOLATION_CHECKS = 2;
const WARNING_COOLDOWN_MS = 3800;
const TERMINATION_MESSAGE = "You are cheating. The interview/test has been terminated.";
const SUSPICIOUS_ACTIVITY_MESSAGE = "Suspicious activity detected. The interview/test has been terminated.";
const SUSPICIOUS_OBJECT_LABELS = new Set(["cell phone", "book", "laptop", "remote"]);
const SUPPRESSED_MEDIAPIPE_CONSOLE_FRAGMENTS = [
    "Created TensorFlow Lite XNNPACK delegate for CPU.",
    "TensorFlow Lite XNNPACK delegate for CPU",
];

const FACE_CENTER_HORIZONTAL_BOUNDS = { min: 0.22, max: 0.78 };
const FACE_CENTER_VERTICAL_BOUNDS = { min: 0.12, max: 0.88 };

let mediaPipeEnginePromise: Promise<MediaPipeEngine | null> | null = null;
let mediaPipeLoadLogged = false;

function shouldSuppressMediaPipeConsoleMessage(args: unknown[]) {
    return args.some((arg) =>
        typeof arg === "string" &&
        SUPPRESSED_MEDIAPIPE_CONSOLE_FRAGMENTS.some((fragment) => arg.includes(fragment))
    );
}

async function withFilteredMediaPipeConsoleNoise<T>(callback: () => Promise<T> | T): Promise<T> {
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;

    console.error = (...args: Parameters<typeof console.error>) => {
        if (shouldSuppressMediaPipeConsoleMessage(args)) {
            return;
        }

        originalConsoleError(...args);
    };

    console.warn = (...args: Parameters<typeof console.warn>) => {
        if (shouldSuppressMediaPipeConsoleMessage(args)) {
            return;
        }

        originalConsoleWarn(...args);
    };

    try {
        return await callback();
    } finally {
        console.error = originalConsoleError;
        console.warn = originalConsoleWarn;
    }
}

function clamp(value: number, min: number, max: number) {
    return Math.min(Math.max(value, min), max);
}

function distance(a: Point, b: Point) {
    return Math.hypot(a.x - b.x, a.y - b.y);
}

function expandBox(box: NormalizedBox, paddingX: number, paddingY: number): NormalizedBox {
    const left = clamp(box.left - paddingX, 0, 1);
    const right = clamp(box.right + paddingX, 0, 1);
    const top = clamp(box.top - paddingY, 0, 1);
    const bottom = clamp(box.bottom + paddingY, 0, 1);

    return {
        left,
        right,
        top,
        bottom,
        width: right - left,
        height: bottom - top,
        centerX: (left + right) / 2,
        centerY: (top + bottom) / 2,
    };
}

function isPointInsideBox(point: Point, box: NormalizedBox | null) {
    if (!box) return false;

    return (
        point.x >= box.left &&
        point.x <= box.right &&
        point.y >= box.top &&
        point.y <= box.bottom
    );
}

function getBoxFromPoints(points: Point[]) {
    if (!points.length) return null;

    let minX = 1;
    let minY = 1;
    let maxX = 0;
    let maxY = 0;

    for (const point of points) {
        minX = Math.min(minX, point.x);
        minY = Math.min(minY, point.y);
        maxX = Math.max(maxX, point.x);
        maxY = Math.max(maxY, point.y);
    }

    return {
        left: clamp(minX, 0, 1),
        top: clamp(minY, 0, 1),
        right: clamp(maxX, 0, 1),
        bottom: clamp(maxY, 0, 1),
        width: clamp(maxX - minX, 0, 1),
        height: clamp(maxY - minY, 0, 1),
        centerX: clamp((minX + maxX) / 2, 0, 1),
        centerY: clamp((minY + maxY) / 2, 0, 1),
    } satisfies NormalizedBox;
}

function getLandmark(landmarks: NormalizedLandmark[], index: number) {
    return landmarks[index] ?? null;
}

function getFaceBox(landmarks: NormalizedLandmark[]) {
    return getBoxFromPoints(
        landmarks.map((landmark) => ({
            x: landmark.x,
            y: landmark.y,
        }))
    );
}

function getPoseContext(result: PoseLandmarkerResult | null): PoseContext {
    const landmarks = result?.landmarks?.[0] ?? [];
    if (!landmarks.length) {
        return { bodyBox: null, handPoints: [] };
    }

    const visiblePoints = [0, 11, 12, 13, 14, 15, 16, 19, 20, 23, 24]
        .map((index) => landmarks[index])
        .filter((landmark) => landmark && landmark.visibility > 0.35)
        .map((landmark) => ({ x: landmark.x, y: landmark.y }));

    const handPoints = [15, 16, 19, 20]
        .map((index) => landmarks[index])
        .filter((landmark) => landmark && landmark.visibility > 0.4)
        .map((landmark) => ({ x: landmark.x, y: landmark.y }));

    return {
        bodyBox: visiblePoints.length ? expandBox(getBoxFromPoints(visiblePoints)!, 0.08, 0.06) : null,
        handPoints,
    };
}

function getFaceFinding(result: FaceLandmarkerResult | null): { finding: ProctoringFinding | null; faceBox: NormalizedBox | null } {
    const faces = result?.faceLandmarks ?? [];

    if (faces.length > 1) {
        return {
            faceBox: null,
            finding: {
                kind: "face",
                message: "Multiple faces detected. Please stay alone and focused on the screen.",
                terminationMessage: SUSPICIOUS_ACTIVITY_MESSAGE,
            },
        };
    }

    if (!faces.length) {
        return {
            faceBox: null,
            finding: {
                kind: "face",
                message: "Please keep your face visible and look at the screen.",
                terminationMessage: TERMINATION_MESSAGE,
            },
        };
    }

    const landmarks = faces[0];
    const faceBox = getFaceBox(landmarks);
    if (!faceBox) {
        return {
            faceBox: null,
            finding: {
                kind: "face",
                message: "Please keep your face visible and look at the screen.",
                terminationMessage: TERMINATION_MESSAGE,
            },
        };
    }

    if (faceBox.width < 0.12 || faceBox.height < 0.16) {
        return {
            faceBox,
            finding: {
                kind: "face",
                message: "Move closer and keep your face clearly visible.",
                terminationMessage: TERMINATION_MESSAGE,
            },
        };
    }

    if (
        faceBox.centerX < FACE_CENTER_HORIZONTAL_BOUNDS.min ||
        faceBox.centerX > FACE_CENTER_HORIZONTAL_BOUNDS.max ||
        faceBox.centerY < FACE_CENTER_VERTICAL_BOUNDS.min ||
        faceBox.centerY > FACE_CENTER_VERTICAL_BOUNDS.max
    ) {
        return {
            faceBox,
            finding: {
                kind: "face",
                message: "Please keep your face centered and look at the screen.",
                terminationMessage: TERMINATION_MESSAGE,
            },
        };
    }

    const leftCheek = getLandmark(landmarks, 234);
    const rightCheek = getLandmark(landmarks, 454);
    const noseTip = getLandmark(landmarks, 1);

    if (leftCheek && rightCheek && noseTip) {
        const leftDistance = Math.max(0.001, noseTip.x - leftCheek.x);
        const rightDistance = Math.max(0.001, rightCheek.x - noseTip.x);
        const horizontalRatio = leftDistance / rightDistance;
        const cheekDepthDelta = Math.abs(leftCheek.z - rightCheek.z);

        if (horizontalRatio < 0.55 || horizontalRatio > 1.82 || cheekDepthDelta > 0.18) {
            return {
                faceBox,
                finding: {
                    kind: "face",
                    message: "Please face the screen directly and avoid turning sideways.",
                    terminationMessage: TERMINATION_MESSAGE,
                },
            };
        }
    }

    return { faceBox, finding: null };
}

function getObjectFinding(
    result: ObjectDetectorResult | null,
    faceBox: NormalizedBox | null,
    poseContext: PoseContext,
    video: HTMLVideoElement
): ProctoringFinding | null {
    const detections = result?.detections ?? [];
    if (!detections.length || !video.videoWidth || !video.videoHeight) {
        return null;
    }

    const candidateArea = poseContext.bodyBox
        ? expandBox(poseContext.bodyBox, 0.08, 0.06)
        : faceBox
            ? expandBox(faceBox, 0.26, 0.38)
            : null;
    const faceArea = faceBox ? expandBox(faceBox, 0.08, 0.12) : null;

    for (const detection of detections) {
        const topCategory = detection.categories
            .slice()
            .sort((a, b) => b.score - a.score)[0];
        const boundingBox = detection.boundingBox;

        if (!topCategory || !boundingBox || topCategory.score < 0.52) {
            continue;
        }

        const label = topCategory.categoryName.toLowerCase();
        if (!SUSPICIOUS_OBJECT_LABELS.has(label)) {
            continue;
        }

        const normalizedBox = getNormalizedObjectBox(boundingBox, video);
        if (!normalizedBox) {
            continue;
        }

        const center = { x: normalizedBox.centerX, y: normalizedBox.centerY };
        const area = normalizedBox.width * normalizedBox.height;
        const nearFace = isPointInsideBox(center, faceArea);
        const insideCandidateArea = isPointInsideBox(center, candidateArea);
        const nearHand = poseContext.handPoints.some((handPoint) => distance(handPoint, center) < 0.18 + Math.max(normalizedBox.width, normalizedBox.height) * 0.5);

        if (area < 0.004 || area > 0.42) {
            continue;
        }

        if (!insideCandidateArea && !nearFace && !nearHand) {
            continue;
        }

        if (label === "laptop" && center.y > 0.86 && !nearFace) {
            continue;
        }

        return {
            kind: "object",
            message: getObjectMessage(label),
            terminationMessage: SUSPICIOUS_ACTIVITY_MESSAGE,
            highlight: {
                centerX: normalizedBox.centerX,
                centerY: normalizedBox.centerY,
                radius: Math.max(normalizedBox.width, normalizedBox.height) * 0.62,
            },
        };
    }

    return null;
}

function getNormalizedObjectBox(boundingBox: BoundingBox, video: HTMLVideoElement) {
    if (!video.videoWidth || !video.videoHeight) {
        return null;
    }

    const left = clamp(boundingBox.originX / video.videoWidth, 0, 1);
    const top = clamp(boundingBox.originY / video.videoHeight, 0, 1);
    const right = clamp((boundingBox.originX + boundingBox.width) / video.videoWidth, 0, 1);
    const bottom = clamp((boundingBox.originY + boundingBox.height) / video.videoHeight, 0, 1);

    return {
        left,
        top,
        right,
        bottom,
        width: clamp(right - left, 0, 1),
        height: clamp(bottom - top, 0, 1),
        centerX: clamp((left + right) / 2, 0, 1),
        centerY: clamp((top + bottom) / 2, 0, 1),
    } satisfies NormalizedBox;
}

function getObjectMessage(label: string) {
    switch (label) {
        case "cell phone":
            return "A mobile phone was detected near the interview area.";
        case "book":
            return "A book or note-like object was detected near the interview area.";
        case "laptop":
            return "An external device was detected near the interview area.";
        case "remote":
            return "A handheld device was detected near the interview area.";
        default:
            return "A suspicious object was detected near the interview area.";
    }
}

async function getMediaPipeEngine(): Promise<MediaPipeEngine | null> {
    if (typeof window === "undefined") {
        return null;
    }

    if (!mediaPipeEnginePromise) {
        mediaPipeEnginePromise = createMediaPipeEngine();
    }

    return mediaPipeEnginePromise;
}

async function createMediaPipeEngine(): Promise<MediaPipeEngine | null> {
    try {
        const visionModule: MediaPipeVisionModule = await import("@mediapipe/tasks-vision");
        const vision = await visionModule.FilesetResolver.forVisionTasks(WASM_ROOT);

        const [faceLandmarkerResult, poseLandmarkerResult, objectDetectorResult] = await withFilteredMediaPipeConsoleNoise(() =>
            Promise.allSettled([
                visionModule.FaceLandmarker.createFromOptions(vision, {
                    baseOptions: { modelAssetPath: FACE_MODEL_PATH },
                    runningMode: "VIDEO",
                    numFaces: 2,
                    minFaceDetectionConfidence: 0.58,
                    minFacePresenceConfidence: 0.58,
                    minTrackingConfidence: 0.55,
                    outputFaceBlendshapes: false,
                    outputFacialTransformationMatrixes: false,
                }),
                visionModule.PoseLandmarker.createFromOptions(vision, {
                    baseOptions: { modelAssetPath: POSE_MODEL_PATH },
                    runningMode: "VIDEO",
                    numPoses: 1,
                    minPoseDetectionConfidence: 0.55,
                    minPosePresenceConfidence: 0.55,
                    minTrackingConfidence: 0.52,
                    outputSegmentationMasks: false,
                }),
                visionModule.ObjectDetector.createFromOptions(vision, {
                    baseOptions: { modelAssetPath: OBJECT_MODEL_PATH },
                    runningMode: "VIDEO",
                    displayNamesLocale: "en",
                    maxResults: 4,
                    scoreThreshold: 0.5,
                    categoryAllowlist: ["cell phone", "book", "laptop", "remote"],
                }),
            ])
        );

        const engine: MediaPipeEngine = {
            faceLandmarker: faceLandmarkerResult.status === "fulfilled" ? faceLandmarkerResult.value : null,
            poseLandmarker: poseLandmarkerResult.status === "fulfilled" ? poseLandmarkerResult.value : null,
            objectDetector: objectDetectorResult.status === "fulfilled" ? objectDetectorResult.value : null,
        };

        if (!engine.faceLandmarker && !engine.poseLandmarker && !engine.objectDetector) {
            throw new Error("No MediaPipe detectors could be initialized.");
        }

        mediaPipeLoadLogged = false;
        return engine;
    } catch (error) {
        if (!mediaPipeLoadLogged) {
            console.error("Failed to initialize MediaPipe interview proctoring:", error);
            mediaPipeLoadLogged = true;
        }
        mediaPipeEnginePromise = null;
        return null;
    }
}

export function startInterviewProctoring(video: HTMLVideoElement, options: InterviewProctoringOptions) {
    let warningCount = 0;
    let lastWarningAt = 0;
    let isChecking = false;
    let isStopped = false;

    const faceState: DetectionState = { count: 0, lastMessage: null };
    const objectState: DetectionState = { count: 0, lastMessage: null };

    const terminate = (message: string) => {
        if (isStopped) return;
        isStopped = true;
        options.onTerminate(message);
    };

    const resetState = (state: DetectionState) => {
        state.count = 0;
        state.lastMessage = null;
    };

    const registerFinding = (finding: ProctoringFinding) => {
        const state = finding.kind === "object" ? objectState : faceState;
        const minimumChecks = finding.kind === "object" ? MIN_OBJECT_VIOLATION_CHECKS : MIN_FACE_VIOLATION_CHECKS;

        if (state.lastMessage === finding.message) {
            state.count += 1;
        } else {
            state.lastMessage = finding.message;
            state.count = 1;
        }

        if (state.count < minimumChecks) {
            return;
        }

        if (Date.now() - lastWarningAt < WARNING_COOLDOWN_MS) {
            return;
        }

        resetState(state);
        lastWarningAt = Date.now();

        if (warningCount >= MAX_WARNINGS) {
            terminate(finding.terminationMessage);
            return;
        }

        warningCount += 1;
        options.onWarning(finding.message, warningCount, finding.highlight || null);
    };

    const checkAttention = async () => {
        if (isStopped || isChecking || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
            return;
        }

        isChecking = true;

        try {
            const engine = await getMediaPipeEngine();
            if (!engine) {
                return;
            }

            const timestamp = performance.now();
            const { faceResult, poseResult, objectResult } = await withFilteredMediaPipeConsoleNoise(() => ({
                faceResult: engine.faceLandmarker?.detectForVideo(video, timestamp) ?? null,
                poseResult: engine.poseLandmarker?.detectForVideo(video, timestamp) ?? null,
                objectResult: engine.objectDetector?.detectForVideo(video, timestamp) ?? null,
            }));

            const poseContext = getPoseContext(poseResult);
            const { finding: faceFinding, faceBox } = engine.faceLandmarker
                ? getFaceFinding(faceResult)
                : { finding: null, faceBox: null };
            const objectFinding = getObjectFinding(objectResult, faceBox, poseContext, video);

            if (objectFinding) {
                registerFinding(objectFinding);
                resetState(faceState);
                return;
            }

            resetState(objectState);

            if (faceFinding) {
                registerFinding(faceFinding);
                return;
            }

            resetState(faceState);
        } catch (error) {
            console.error("Interview proctoring check failed:", error);
        } finally {
            isChecking = false;
        }
    };

    void getMediaPipeEngine();
    const intervalId = window.setInterval(() => {
        void checkAttention();
    }, CHECK_INTERVAL_MS);

    void checkAttention();

    return () => {
        isStopped = true;
        window.clearInterval(intervalId);
    };
}
