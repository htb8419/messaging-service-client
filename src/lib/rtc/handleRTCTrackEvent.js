function handleRTCTrackEvent(event) {
    let {streams, track}=event
    if (streams && streams[0]) {
        streams.forEach(stream=>{
            if (track.kind === 'video') {
                document.querySelector('video#remoteVideo').srcObject = stream
            } else if (track.kind === 'audio') {
                document.querySelector('audio#remoteAudio').srcObject = stream
            }
        })
        //document.querySelector('video#remoteVideo').srcObject = streams[0]
    }
}

export default handleRTCTrackEvent