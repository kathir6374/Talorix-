function isDeviceNotFoundError(error: unknown) {
    return error instanceof DOMException && (
        error.name === "NotFoundError" ||
        error.name === "DevicesNotFoundError" ||
        error.name === "OverconstrainedError"
    );
}

export function getInterviewMediaErrorMessage(error: unknown) {
    if (isDeviceNotFoundError(error)) {
        return "Camera and microphone are required. Please connect both devices and try again.";
    }

    if (error instanceof DOMException && error.name === "NotAllowedError") {
        return "Camera or microphone permission was denied. Please allow access and try again.";
    }

    if (error instanceof DOMException && error.name === "NotReadableError") {
        return "Camera or microphone is already in use by another app.";
    }

    return error instanceof Error
        ? error.message
        : "Camera or microphone access failed. Please try again.";
}

export async function requestInterviewMediaStream() {
    if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Camera and microphone access is not supported in this browser.");
    }

    const defaultConstraints: MediaStreamConstraints = {
        video: true,
        audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
        },
    };

    try {
        return validateInterviewMediaStream(
            await navigator.mediaDevices.getUserMedia(defaultConstraints)
        );
    } catch (defaultError) {
        if (defaultError instanceof DOMException && defaultError.name === "NotAllowedError") {
            throw defaultError;
        }

        const deviceStream = await requestSeparateInputDeviceStreams(defaultError);
        return validateInterviewMediaStream(deviceStream);
    }
}

function validateInterviewMediaStream(mediaStream: MediaStream) {
    const hasCamera = mediaStream.getVideoTracks().some((track) => track.readyState === "live");
    const hasMicrophone = mediaStream.getAudioTracks().some((track) => track.readyState === "live");

    if (!hasCamera || !hasMicrophone) {
        mediaStream.getTracks().forEach((track) => track.stop());
        throw new Error("Camera and microphone are required to start the interview.");
    }

    return mediaStream;
}

function uniqueDevices(devices: MediaDeviceInfo[]) {
    const seen = new Set<string>();
    return devices.filter((device) => {
        const key = device.deviceId || device.label;
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

function getNormalizedDeviceText(device: MediaDeviceInfo) {
    return `${device.label} ${device.deviceId}`.toLowerCase();
}

function isExternalMicrophone(device: MediaDeviceInfo) {
    const text = getNormalizedDeviceText(device);
    return /bluetooth|wireless|headset|headphone|earbud|airpod|buds|usb|external/i.test(text);
}

function isDefaultOrBuiltInMicrophone(device: MediaDeviceInfo) {
    const text = getNormalizedDeviceText(device);
    return device.deviceId === "default" ||
        /default|communications|system|built.?in|internal|integrated|laptop|microphone array|realtek/i.test(text);
}

function orderAudioInputsForInterview(audioInputs: MediaDeviceInfo[]) {
    const defaultOrBuiltInInputs = audioInputs.filter(isDefaultOrBuiltInMicrophone);
    const externalInputs = audioInputs.filter(isExternalMicrophone);
    const remainingInputs = audioInputs.filter((device) =>
        !defaultOrBuiltInInputs.includes(device) && !externalInputs.includes(device)
    );

    return uniqueDevices([
        ...defaultOrBuiltInInputs,
        ...externalInputs,
        ...remainingInputs,
    ]);
}

function getAudioConstraints(deviceId?: string): MediaTrackConstraints {
    return {
        ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
    };
}

function validateCameraStream(mediaStream: MediaStream) {
    const hasCamera = mediaStream.getVideoTracks().some((track) => track.readyState === "live");
    if (!hasCamera) {
        mediaStream.getTracks().forEach((track) => track.stop());
        throw new Error("A working camera was not detected. Please enable a camera and try again.");
    }
    return mediaStream;
}

function validateMicrophoneStream(mediaStream: MediaStream) {
    const hasMicrophone = mediaStream.getAudioTracks().some((track) => track.readyState === "live");
    if (!hasMicrophone) {
        mediaStream.getTracks().forEach((track) => track.stop());
        throw new Error("A working microphone was not detected. Please enable the built-in microphone or connect an audio input device and try again.");
    }
    return mediaStream;
}

function stopStream(mediaStream: MediaStream | null) {
    mediaStream?.getTracks().forEach((track) => track.stop());
}

async function getAvailableInputDevices(defaultError: unknown) {
    if (!navigator.mediaDevices?.enumerateDevices) {
        throw defaultError;
    }

    const devices = await navigator.mediaDevices.enumerateDevices();
    return {
        videoInputs: devices.filter((device) => device.kind === "videoinput" && device.deviceId),
        audioInputs: orderAudioInputsForInterview(
            devices.filter((device) => device.kind === "audioinput" && device.deviceId)
        ),
    };
}

async function requestCameraStream(defaultError: unknown) {
    try {
        return validateCameraStream(
            await navigator.mediaDevices.getUserMedia({ video: true })
        );
    } catch (cameraDefaultError) {
        if (cameraDefaultError instanceof DOMException && cameraDefaultError.name === "NotAllowedError") {
            throw cameraDefaultError;
        }
    }

    const { videoInputs } = await getAvailableInputDevices(defaultError);
    let lastError: unknown = defaultError;

    if (videoInputs.length === 0) {
        throw new Error("A working camera was not detected. Please enable a camera and try again.");
    }

    for (const videoInput of videoInputs) {
        try {
            return validateCameraStream(
                await navigator.mediaDevices.getUserMedia({
                    video: { deviceId: { exact: videoInput.deviceId } },
                })
            );
        } catch (error) {
            lastError = error;
        }
    }

    throw lastError;
}

async function requestMicrophoneStream(defaultError: unknown) {
    try {
        return validateMicrophoneStream(
            await navigator.mediaDevices.getUserMedia({ audio: getAudioConstraints() })
        );
    } catch (microphoneDefaultError) {
        if (microphoneDefaultError instanceof DOMException && microphoneDefaultError.name === "NotAllowedError") {
            throw microphoneDefaultError;
        }
    }

    const { audioInputs } = await getAvailableInputDevices(defaultError);
    let lastError: unknown = defaultError;

    if (audioInputs.length === 0) {
        throw new Error("A working microphone was not detected. Please enable the built-in microphone or connect an audio input device and try again.");
    }

    for (const audioInput of audioInputs) {
        try {
            return validateMicrophoneStream(
                await navigator.mediaDevices.getUserMedia({
                    audio: getAudioConstraints(audioInput.deviceId),
                })
            );
        } catch (error) {
            lastError = error;
        }
    }

    throw lastError;
}

async function requestSeparateInputDeviceStreams(defaultError: unknown) {
    let cameraStream: MediaStream | null = null;
    let microphoneStream: MediaStream | null = null;

    try {
        cameraStream = await requestCameraStream(defaultError);
        microphoneStream = await requestMicrophoneStream(defaultError);

        return new MediaStream([
            ...cameraStream.getVideoTracks(),
            ...microphoneStream.getAudioTracks(),
        ]);
    } catch (error) {
        stopStream(cameraStream);
        stopStream(microphoneStream);
        throw error;
    }
}
