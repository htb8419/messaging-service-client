function getMediaDeviceInfo() {
    return navigator.mediaDevices.enumerateDevices()
}

function getConnectedDevices(type) {
    return getMediaDeviceInfo().then(devices => {
        return devices.filter(device => device.kind === type)
    });
}

function existsConnectedDevices(type) {
    return getConnectedDevices(type).then(connectedDevices => connectedDevices.length > 0)
}

async function getMediaStreamConstraints(requestMediaStreamConstraint) {
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

//getConnectedDevices('videoinput', cameras => console.log('Cameras found', cameras));
export {
    getMediaDeviceInfo,
    getMediaStreamConstraints
}