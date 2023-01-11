interface MessageDeliveryEvent {
    room:string,
    clientMessageId: string,
    deliveryState: 'SERVER' | 'CLIENT'
}

export default MessageDeliveryEvent