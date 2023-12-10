import XhrRequest from "./XhrRequest.js"

function getParticipantsState(roomId) {
    return XhrRequest.GET(`/room/participantStates/${roomId}`)
}

export default getParticipantsState