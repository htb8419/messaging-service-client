import SecurityContextHolder from './SecurityContextHolder'
import ApplicationConfig from "../ApplicationConfig";
import XhrRequest from "./XhrRequest.js";

function _getRoomInfo(roomCode) {
    return XhrRequest.GET(`/room/roomInfo/${roomCode}`)
        .then(roomInfo => {
            if (!roomInfo) {
                return roomInfo
            }
            window.$imRoomInfo = roomInfo
            SecurityContextHolder.initialContext(roomInfo['currentParticipant']['token'])
            return roomInfo

        })
        .catch(ex => {
            if (ex.code && ex.code === 'NO_LINK_FOUND') {
                throw new Error('INVALID_ROOM_CODE')
            }
            return ex
        })
}

function getRoomInfo(roomCode) {
    const {serverUrl} = ApplicationConfig.getConfig()
    return fetch(`${serverUrl}/room/roomInfo/${roomCode}`)
        .then(response => response.json())
        .then(responseJson => {
            let {result, payload, messages: errors} = responseJson
            if (result) {
                return result
            }
            if (errors && errors.length > 0) {
                let error = errors[0]
                if (error.code === 'NO_LINK_FOUND') {
                    //let {callback} = ApplicationConfig.getConfig();
                    //callback(MessagingEnums.ApplicationEvents.THROW_EXCEPTION,error)
                    throw new Error('INVALID_ROOM_CODE')
                }
            }
            return payload
        }).then(roomInfo => {
            if (!roomInfo) {
                return roomInfo
            }
            window.$imRoomInfo = roomInfo
            SecurityContextHolder.initialContext(roomInfo['currentParticipant']['token'])
            return roomInfo
        })
}

export default getRoomInfo