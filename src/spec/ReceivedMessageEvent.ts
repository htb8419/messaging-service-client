interface ReceivedMessageEvent {
    room:string,
    from:string,
    createdAt:string,
    clientMessageId:string,
    text?: string,
    media?: Media
}
interface Media {
    fileId: string,
    name: string,
    mimeType: string,
    size: number
}

export default ReceivedMessageEvent
export type {Media}