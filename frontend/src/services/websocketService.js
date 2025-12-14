import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
class WebSocketService {
    constructor() {
        Object.defineProperty(this, "client", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        Object.defineProperty(this, "isConnected", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: false
        });
        Object.defineProperty(this, "token", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        Object.defineProperty(this, "userId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        Object.defineProperty(this, "reconnectAttempts", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0
        });
        Object.defineProperty(this, "maxReconnectAttempts", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 5
        });
        Object.defineProperty(this, "reconnectDelay", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 3000
        });
        // Callback handlers
        Object.defineProperty(this, "messageCallbacks", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
        Object.defineProperty(this, "notificationCallbacks", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
        Object.defineProperty(this, "typingCallbacks", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
        Object.defineProperty(this, "statusCallbacks", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
        Object.defineProperty(this, "purchaseCallbacks", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
        Object.defineProperty(this, "connectionCallbacks", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
        this.setupClient();
    }
    setupClient() {
        const RAW_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8888';
        const base = RAW_BASE.replace(/\/+$/, '');
        // Ensure SockJS endpoint points to server root, not /api
        const serverBase = base.endsWith('/api') ? base.slice(0, -4) : base;
        // SockJS must use an HTTP(S) URL, not WS(S). It will handle transports internally.
        const sockUrl = serverBase + '/ws';
        this.client = new Client({
            webSocketFactory: () => new SockJS(sockUrl),
            debug: (str) => {
                console.log('[WebSocket Debug]:', str);
            },
            reconnectDelay: this.reconnectDelay,
            heartbeatIncoming: 4000,
            heartbeatOutgoing: 4000,
            onConnect: () => {
                console.log('[WebSocket] Connected successfully');
                this.isConnected = true;
                this.reconnectAttempts = 0;
                this.subscribeToUserQueues();
                this.notifyConnectionChange(true);
            },
            onDisconnect: () => {
                console.log('[WebSocket] Disconnected');
                this.isConnected = false;
                this.notifyConnectionChange(false);
            },
            onStompError: (frame) => {
                console.error('[WebSocket] STOMP error:', frame.headers['message']);
                console.error('[WebSocket] Error details:', frame.body);
                this.handleReconnect();
            },
            onWebSocketError: (event) => {
                console.error('[WebSocket] WebSocket error:', event);
                this.handleReconnect();
            }
        });
    }
    connect(token, userId) {
        if (this.isConnected && this.token === token && this.userId === userId) {
            console.log('[WebSocket] Already connected with same credentials');
            return Promise.resolve();
        }
        this.token = token;
        this.userId = userId;
        // Add authorization header
        this.client.configure({
            connectHeaders: {
                'Authorization': `Bearer ${token}`
            }
        });
        console.log('[WebSocket] Attempting to connect...');
        this.client.activate();
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('WebSocket connection timeout'));
            }, 10000);
            const checkConnection = () => {
                if (this.isConnected) {
                    clearTimeout(timeout);
                    resolve();
                }
                else {
                    setTimeout(checkConnection, 100);
                }
            };
            checkConnection();
        });
    }
    disconnect() {
        if (this.client) {
            console.log('[WebSocket] Disconnecting...');
            this.client.deactivate();
            this.isConnected = false;
            this.token = null;
            this.userId = null;
        }
    }
    subscribeToUserQueues() {
        if (!this.client || !this.userId)
            return;
        // Subscribe to messages (Spring user destinations)
        this.client.subscribe(`/user/queue/messages`, (message) => {
            try {
                const data = JSON.parse(message.body);
                console.log('[WebSocket] Received message:', data);
                this.notifyMessageCallbacks(data);
            }
            catch (error) {
                console.error('[WebSocket] Error parsing message:', error);
            }
        });
        // Subscribe to notifications
        this.client.subscribe(`/user/queue/notifications`, (message) => {
            try {
                const data = JSON.parse(message.body);
                console.log('[WebSocket] Received notification:', data);
                this.notifyNotificationCallbacks(data);
            }
            catch (error) {
                console.error('[WebSocket] Error parsing notification:', error);
            }
        });
        // Subscribe to typing indicators
        this.client.subscribe(`/user/queue/typing`, (message) => {
            try {
                const data = JSON.parse(message.body);
                console.log('[WebSocket] Received typing indicator:', data);
                this.notifyTypingCallbacks(data);
            }
            catch (error) {
                console.error('[WebSocket] Error parsing typing indicator:', error);
            }
        });
        // Subscribe to status updates
        this.client.subscribe(`/user/queue/status`, (message) => {
            try {
                const data = JSON.parse(message.body);
                console.log('[WebSocket] Received status update:', data);
                this.notifyStatusCallbacks(data);
            }
            catch (error) {
                console.error('[WebSocket] Error parsing status update:', error);
            }
        });
        // Subscribe to purchase updates
        this.client.subscribe(`/user/queue/purchase`, (message) => {
            try {
                const data = JSON.parse(message.body);
                console.log('[WebSocket] Received purchase update:', data);
                this.notifyPurchaseCallbacks(data);
            }
            catch (error) {
                console.error('[WebSocket] Error parsing purchase update:', error);
            }
        });
        console.log('[WebSocket] Subscribed to all user queues for user:', this.userId);
    }
    // Send message via WebSocket
    sendMessage(inquiryId, content, messageType = 'TEXT', priceAmount) {
        if (!this.isConnected || !this.client) {
            console.error('[WebSocket] Cannot send message - not connected');
            return false;
        }
        const message = {
            type: 'CHAT_MESSAGE',
            inquiryId,
            content,
            messageType,
            priceAmount
        };
        try {
            this.client.publish({
                destination: `/app/chat.send/${inquiryId}`,
                body: JSON.stringify(message)
            });
            console.log('[WebSocket] Sent message:', message);
            return true;
        }
        catch (error) {
            console.error('[WebSocket] Error sending message:', error);
            return false;
        }
    }
    // Send typing indicator
    sendTypingIndicator(inquiryId, isTyping) {
        if (!this.isConnected || !this.client)
            return false;
        const message = {
            inquiryId,
            isTyping
        };
        try {
            this.client.publish({
                destination: `/app/chat.typing/${inquiryId}`,
                body: JSON.stringify(message)
            });
            return true;
        }
        catch (error) {
            console.error('[WebSocket] Error sending typing indicator:', error);
            return false;
        }
    }
    // Send purchase request
    sendPurchaseRequest(inquiryId, finalPrice, message) {
        if (!this.isConnected || !this.client)
            return false;
        const purchaseRequest = {
            inquiryId,
            finalPrice,
            message
        };
        try {
            this.client.publish({
                destination: `/app/chat.purchase/${inquiryId}`,
                body: JSON.stringify(purchaseRequest)
            });
            console.log('[WebSocket] Sent purchase request:', purchaseRequest);
            return true;
        }
        catch (error) {
            console.error('[WebSocket] Error sending purchase request:', error);
            return false;
        }
    }
    // Confirm purchase (owner)
    confirmPurchase(inquiryId, message) {
        if (!this.isConnected || !this.client)
            return false;
        const confirmation = {
            inquiryId,
            message
        };
        try {
            this.client.publish({
                destination: `/app/chat.confirmPurchase/${inquiryId}`,
                body: JSON.stringify(confirmation)
            });
            console.log('[WebSocket] Sent purchase confirmation:', confirmation);
            return true;
        }
        catch (error) {
            console.error('[WebSocket] Error sending purchase confirmation:', error);
            return false;
        }
    }
    // Mark messages as read
    markMessagesAsRead(inquiryId) {
        if (!this.isConnected || !this.client)
            return false;
        try {
            this.client.publish({
                destination: `/app/chat.markRead/${inquiryId}`,
                body: JSON.stringify({ inquiryId })
            });
            return true;
        }
        catch (error) {
            console.error('[WebSocket] Error marking messages as read:', error);
            return false;
        }
    }
    // Event handlers
    onMessage(callback) {
        this.messageCallbacks.push(callback);
        return () => {
            const index = this.messageCallbacks.indexOf(callback);
            if (index > -1)
                this.messageCallbacks.splice(index, 1);
        };
    }
    onNotification(callback) {
        this.notificationCallbacks.push(callback);
        return () => {
            const index = this.notificationCallbacks.indexOf(callback);
            if (index > -1)
                this.notificationCallbacks.splice(index, 1);
        };
    }
    onTyping(callback) {
        this.typingCallbacks.push(callback);
        return () => {
            const index = this.typingCallbacks.indexOf(callback);
            if (index > -1)
                this.typingCallbacks.splice(index, 1);
        };
    }
    onStatus(callback) {
        this.statusCallbacks.push(callback);
        return () => {
            const index = this.statusCallbacks.indexOf(callback);
            if (index > -1)
                this.statusCallbacks.splice(index, 1);
        };
    }
    onPurchase(callback) {
        this.purchaseCallbacks.push(callback);
        return () => {
            const index = this.purchaseCallbacks.indexOf(callback);
            if (index > -1)
                this.purchaseCallbacks.splice(index, 1);
        };
    }
    onConnectionChange(callback) {
        this.connectionCallbacks.push(callback);
        return () => {
            const index = this.connectionCallbacks.indexOf(callback);
            if (index > -1)
                this.connectionCallbacks.splice(index, 1);
        };
    }
    // Notify callbacks
    notifyMessageCallbacks(message) {
        this.messageCallbacks.forEach(callback => {
            try {
                callback(message);
            }
            catch (error) {
                console.error('[WebSocket] Error in message callback:', error);
            }
        });
    }
    notifyNotificationCallbacks(notification) {
        this.notificationCallbacks.forEach(callback => {
            try {
                callback(notification);
            }
            catch (error) {
                console.error('[WebSocket] Error in notification callback:', error);
            }
        });
    }
    notifyTypingCallbacks(typing) {
        this.typingCallbacks.forEach(callback => {
            try {
                callback(typing);
            }
            catch (error) {
                console.error('[WebSocket] Error in typing callback:', error);
            }
        });
    }
    notifyStatusCallbacks(status) {
        this.statusCallbacks.forEach(callback => {
            try {
                callback(status);
            }
            catch (error) {
                console.error('[WebSocket] Error in status callback:', error);
            }
        });
    }
    notifyPurchaseCallbacks(purchase) {
        this.purchaseCallbacks.forEach(callback => {
            try {
                callback(purchase);
            }
            catch (error) {
                console.error('[WebSocket] Error in purchase callback:', error);
            }
        });
    }
    notifyConnectionChange(connected) {
        this.connectionCallbacks.forEach(callback => {
            try {
                callback(connected);
            }
            catch (error) {
                console.error('[WebSocket] Error in connection callback:', error);
            }
        });
    }
    handleReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`[WebSocket] Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
            setTimeout(() => {
                if (this.token && this.userId) {
                    this.connect(this.token, this.userId).catch(console.error);
                }
            }, this.reconnectDelay * this.reconnectAttempts);
        }
        else {
            console.error('[WebSocket] Max reconnection attempts reached');
        }
    }
    // Getters
    get connected() {
        return this.isConnected;
    }
}
// Export singleton instance
export const webSocketService = new WebSocketService();
export default webSocketService;
