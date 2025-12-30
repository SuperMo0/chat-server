import { WebSocketServer } from 'ws'
export const webSocket = new WebSocketServer({
    noServer: true,
    clientTracking: false,
})