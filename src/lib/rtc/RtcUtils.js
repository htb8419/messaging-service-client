function getMediaDeviceInfo() {
    return navigator.mediaDevices.enumerateDevices()
}

function getConnectedDevices(type) {
    return getMediaDeviceInfo().then(devices => {
        return devices.filter(device => device.kind === type)
    });
}

async function existsConnectedDevices(type) {
    return getConnectedDevices(type).then(connectedDevices => connectedDevices.length > 0);
}

async function getConnectedMediaDevices(requestedMedia) {
    let connectedMediaDevices = requestedMedia
    if ('video' in requestedMedia && requestedMedia.video !== false) {
        let existsDevice = await existsConnectedDevices('videoinput');
        if (!existsDevice) {
            connectedMediaDevices.video = false
        }
    }
    if ('audio' in requestedMedia) {
        if (!(await existsConnectedDevices('audioinput'))) {
            connectedMediaDevices.audio = false
        }
    }
    console.debug('requestedMedia:',requestedMedia,'connectedMediaDevices:', connectedMediaDevices)
    return connectedMediaDevices
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