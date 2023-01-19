function handleRTCTrackEvent({streams, track}) {
    if (streams && streams[0]) {
        if (track.kind === 'video') {
            document.querySelector('video#remoteVideo').srcObject = streams[0]
        } else {
            //audioElement.srcObject = streams[0]
        }
    }
}

export default handleRTCTrackEvent