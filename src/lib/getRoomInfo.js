import SecurityContextHolder from './SecurityContextHolder'
import ApplicationConfig from "../ApplicationConfig";

function getRoomInfo(meetingCode) {
    const __TEMP_DEV_ROOM_INFO = {
        roomId: '633a7675685d7b6a6d08fdbc',
        welcomeMessage: 'hello',
        agentNickname: 'agent',
        agentProfileImage: 'image'
    }

    const {serverUrl}=ApplicationConfig.getConfig()
    return fetch(`${serverUrl}/room/roomInfo/${meetingCode}`)
        .then(response => response.json())
        .then(responseJson => {
            return responseJson.result
        }).then(roomInfo => {
            SecurityContextHolder.initialContext(roomInfo['currentParticipant']['token'])
            return roomInfo
        })
        .catch(ex => {
            console.error('getRoomInfo >', ex)
            //alert('server error')
        })
}

export default getRoomInfo