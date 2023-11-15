function handleRTCTrackEvent(event) {
    let {streams, track} = event
    let mediaStream = new MediaStream();
    mediaStream.addTrack(track);
    let audioElement = document.querySelector('audio#remoteAudio')
    audioElement.srcObject = mediaStream;
  /*  if (streams && streams[0]) {
        const stream = streams[0]
        if (track.kind === 'video') {
            const remoteVideo=document.querySelector('video#remoteVideo')
            if(remoteVideo.srcObject!==stream){
                remoteVideo.srcObject = stream
            }
        } else if (track.kind === 'audio') {
            let remoteAudio = document.querySelector('audio#remoteAudio')
            if (remoteAudio.srcObject !== stream) {
                remoteAudio.srcObject = stream
            }
        }

        //document.querySelector('video#remoteVideo').srcObject = streams[0]
    }*/
}

export default handleRTCTrackEvent