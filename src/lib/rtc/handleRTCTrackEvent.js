function handleRTCTrackEvent({streams, track}) {
    console.log('handleRTCTrackEvent >>> ', track.kind,', streams >>',streams)
    if (streams && streams[0]) {
        if (track.kind === 'video') {
            document.querySelector('video#remoteVideo').srcObject = streams[0]
        } else if (track.kind === 'audio') {
            document.querySelector('audio#remoteAudio').srcObject = streams[0]
        }
    }
}

export default handleRTCTrackEvent