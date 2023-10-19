class JwtUtil {
    static getSessionId(accessToken) {
        return JwtUtil.getUsername(accessToken);
    }

    static getUsername(accessToken) {
        let userInfo = JwtUtil.getUserInfo(accessToken)
        return  userInfo['user_name'];
    }

    static getUserInfo(accessToken) {
        let tokenClaim = accessToken.split('.');
        return JSON.parse(window.atob(tokenClaim[1]));
    }
}

export default JwtUtil