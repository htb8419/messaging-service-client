function getMediaDeviceInfo() {
    return navigator.mediaDevices.enumerateDevices()
}

function getConnectedDevices(type) {
    return getMediaDeviceInfo().then(devices => {
        return devices.filter(device => device.kind === type)
    });
}

async function existsConnectedDevices(type) {
    return getConnectedDevices(type).then(connectedDevices=>connectedDevices.length > 0);
}

async function getConnectedMediaDevices(requestMediaStreamConstraint) {
    if ('video' in requestMediaStreamConstraint && requestMediaStreamConstraint.video !== false) {
        let existsDevice = await existsConnectedDevices('videoinput');
        if (!existsDevice) {
            requestMediaStreamConstraint.video = false
        }
    }
    if ('audio' in requestMediaStreamConstraint) {
        if (!(await existsConnectedDevices('audioinput'))) {
            requestMediaStreamConstraint.audio = false
        }
    }
    return requestMediaStreamConstraint
}
/*
async function getUserMediaDevices(mediaStreamConstraints) {
    return getMediaStreamConstraints(mediaStreamConstraints)
        .then((constraints) => navigator.mediaDevices.getUserMedia(constraints))
}*/
async function getUserMediaDevices(mediaStreamConstraints) {
    return navigator.mediaDevices.getUserMedia(mediaStreamConstraints)
}

export {
    getUserMediaDevices,
    getMediaDeviceInfo,
    getConnectedMediaDevices,
    existsConnectedDevices
}