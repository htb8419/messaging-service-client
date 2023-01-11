class JwtUtil {
    static getSessionId(accessToken) {
        let userInfo = JwtUtil.getUserInfo(accessToken)
        let {additionalInformation} = userInfo
        return (additionalInformation && additionalInformation['SID']) ?
            additionalInformation['SID'] :
            JwtUtil.getUsername(accessToken);
    }

    static getUsername(accessToken) {
        let userInfo = JwtUtil.getUserInfo(accessToken)
        return userInfo['username'];
    }

    static getUserInfo(accessToken) {
        let tokenClaim = accessToken.split('.');
        return JSON.parse(window.atob(tokenClaim[1]));
    }
}

export default JwtUtil