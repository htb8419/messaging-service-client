import JwtUtil from "./JwtUtil";

class SecurityContextHolder {
    static initialContext = (accessToken) => {
        let username = JwtUtil.getUsername(accessToken)
        let sessionId = JwtUtil.getSessionId(accessToken)
        window.__messagingSecurityContext = {
            accessToken,
            username,
            sessionId
        }
    }

    static getAccessToken() {
        return SecurityContextHolder.getCurrentContext().accessToken
    }

    static getUsername() {
        return SecurityContextHolder.getCurrentContext().username
    }

    static getCurrentContext() {
        if (!window.__messagingSecurityContext) {
            throw new Error('security context did not initialized !')
        }
        return window.__messagingSecurityContext
    }
}

export default SecurityContextHolder