function getRoomInfo(meetingCode) {
    const __TEMP_DEV_ROOM_INFO={
        roomId: '633a7675685d7b6a6d08fdbc',
        welcomeMessage: 'hello',
        agentNickname: 'agent',
        agentProfileImage: 'image'
    }
    const SERVER_URL='https://hdtest.demisco.com'
    //const SERVER_URL='http://192.168.103.127:8082'
    return fetch(`${SERVER_URL}/room/roomInfo/${meetingCode}`)
        .then(response =>response.json())
        .then(responseJson => {
            return responseJson.result
        })
}

export default getRoomInfo