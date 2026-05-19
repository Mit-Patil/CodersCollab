import { useEffect, useRef, useCallback } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

const WS_URL = 'http://localhost:8080/ws';

export const USER_INBOX_TOPIC = (uid)   => `/topic/user/${uid}/inbox`;
export const CONV_TOPIC       = (cid)   => `/topic/conversation/${cid}`;
export const CONV_TYPING      = (cid)   => `/topic/conversation/${cid}/typing`;

const useWebSocket = ({
    token,
    userId,
    conversationId,
    groupId, 
    onMessage,
    onConvUpdate,
    onTyping,
}) => {
    const clientRef         = useRef(null);
    const convSubsRef       = useRef([]);
    const userSubRef        = useRef(null);
    const connectedRef      = useRef(false);

    const cbMessage         = useRef(onMessage);
    const cbConvUpdate      = useRef(onConvUpdate);
    const cbTyping          = useRef(onTyping);
    const convIdRef         = useRef(conversationId);
    const userIdRef         = useRef(userId);

    useEffect(() => { cbMessage.current    = onMessage;    });
    useEffect(() => { cbConvUpdate.current = onConvUpdate; });
    useEffect(() => { cbTyping.current     = onTyping;     });

    const currentConvSubRef = useRef(null);

    const resubscribeConv = useCallback((convId) => {
        if (currentConvSubRef.current === convId &&
            convSubsRef.current.length > 0) return;

        convSubsRef.current.forEach(s => {
            try { s.unsubscribe(); } catch (_) {}
        });
        convSubsRef.current = [];

        if (!convId || !clientRef.current?.connected) return;

        const s1 = clientRef.current.subscribe(CONV_TOPIC(convId), frame => {
            try { cbMessage.current?.(JSON.parse(frame.body)); }
            catch (e) { console.error('[WS] conv parse', e); }
        });
        const s2 = clientRef.current.subscribe(CONV_TYPING(convId), frame => {
            try { cbTyping.current?.(JSON.parse(frame.body)); }
            catch (_) {}
        });

        convSubsRef.current = [s1, s2];
        currentConvSubRef.current = convId;
        console.log('[WS] conv subscribed', convId);
    }, []);


    const currentGroupSubRef = useRef(null);
    const groupSubsRef = useRef([]);

    const resubscribeGroup = useCallback((groupId) => {
        if (currentGroupSubRef.current === groupId
            && groupSubsRef.current.length > 0) return;

        groupSubsRef.current.forEach(s => {
            try { s.unsubscribe(); } catch (_) {}
        });
        groupSubsRef.current = [];

        if (!groupId || !clientRef.current?.connected) return;

        const s1 = clientRef.current.subscribe(
            `/topic/group/${groupId}`,
            frame => {
                try {
                    const msg = JSON.parse(frame.body);
                    console.log('[WS] group msg received:', msg.eventType, msg);
                    cbMessage.current?.(msg);
                } catch (e) {
                    console.error('[WS] group parse', e);
                }
            }
        );
        const s2 = clientRef.current.subscribe(
            `/topic/group/${groupId}/typing`,
            frame => {
                try {
                    cbTyping.current?.(JSON.parse(frame.body));
                } catch (_) {}
            }
        );

        groupSubsRef.current = [s1, s2];
        currentGroupSubRef.current = groupId;
        console.log('[WS] group subscribed', groupId);
    }, []);

    const inboxSubscribedRef = useRef(false);

    const subscribeInbox = useCallback((uid) => {
        if (!clientRef.current?.connected || !uid) return;
        if (inboxSubscribedRef.current) return;
        try { userSubRef.current?.unsubscribe(); } catch (_) {}

        userSubRef.current = clientRef.current.subscribe(
            USER_INBOX_TOPIC(uid),
            frame => {
                try { cbConvUpdate.current?.(JSON.parse(frame.body)); }
                catch (e) { console.error('[WS] inbox parse', e); }
            }
        );
        inboxSubscribedRef.current = true;
        console.log('[WS] inbox subscribed', uid);
    }, []);

    useEffect(() => {
        convIdRef.current = conversationId;
        if (connectedRef.current && conversationId) resubscribeConv(conversationId);
    }, [conversationId, resubscribeConv]);

    useEffect(() => {
        if (connectedRef.current && groupId) {
            resubscribeGroup(groupId);
        }
        if (!groupId) {
            groupSubsRef.current.forEach(s => {
                try { s.unsubscribe(); } catch (_) {}
            });
            groupSubsRef.current = [];
            currentGroupSubRef.current = null;
        }
    }, [groupId, resubscribeGroup]);

    useEffect(() => {
        userIdRef.current = userId;
        if (!userId) return;

        if (connectedRef.current) {
            subscribeInbox(userId);
            return;
        }

        const retryInterval = setInterval(() => {
            if (connectedRef.current && userIdRef.current) {
                subscribeInbox(userIdRef.current);
                clearInterval(retryInterval);
            }
        }, 500);

        return () => clearInterval(retryInterval);
    }, [userId, subscribeInbox]);

    useEffect(() => {
        if (!token) return;

        const client = new Client({
            webSocketFactory: () => new SockJS(WS_URL),
            connectHeaders: { token },
            reconnectDelay: 5000,
            heartbeatIncoming: 4000,
            heartbeatOutgoing: 4000,
            onConnect: () => {
                connectedRef.current = true;
                console.log('[WS] connected');
                setTimeout(() => {
                    if (convIdRef.current)
                        resubscribeConv(convIdRef.current);
                    if (userIdRef.current)
                        subscribeInbox(userIdRef.current);
                    if (groupId)
                        resubscribeGroup(groupId);
                }, 100);
            },
            onDisconnect: () => {
                connectedRef.current = false;
                convSubsRef.current  = [];
                userSubRef.current   = null;
                currentConvSubRef.current = null;
                inboxSubscribedRef.current = false;
                console.log('[WS] disconnected');
            },
            onStompError: f => console.error('[WS] STOMP error', f),
        });

        client.activate();
        clientRef.current = client;

        return () => {
            connectedRef.current = false;
            convSubsRef.current.forEach(s => {
                try { s.unsubscribe(); } catch (_) {}
            });
            groupSubsRef.current.forEach(s => {
                try { s.unsubscribe(); } catch (_) {}
            });
            try { userSubRef.current?.unsubscribe(); } catch (_) {}
            client.deactivate();
            clientRef.current = null;
        };
    }, [token]);

    const isReady = useCallback(() =>
        connectedRef.current && clientRef.current?.connected === true, []);

    const sendMessage = useCallback((content, replyToId = null) => {
        if (!isReady()) return false;
        const cid = convIdRef.current;
        if (!cid) return false;
        try {
            clientRef.current.publish({
                destination: `/app/chat/${cid}`,
                headers: { token },
                body: JSON.stringify({ type: 'MESSAGE', content, conversationId: cid, replyToId })
            });
            return true;
        } catch (e) { console.error('[WS] send error', e); return false; }
    }, [token, isReady]);

    const sendGroupMessage = useCallback((content, replyToId = null, gId) => {
        if (!isReady()) return false;
        const targetGroupId = gId || groupId;
        if (!targetGroupId) return false;
        try {
            console.log('[WS] Sending group message:', { targetGroupId, content, replyToId });
            clientRef.current.publish({
                destination: `/app/group/${targetGroupId}`,
                headers: { token },
                body: JSON.stringify({
                    type: 'MESSAGE', content,
                    conversationId: targetGroupId,
                    replyToId
                })
            });
            return true;
        } catch (e) {
            console.error('[WS] group send:', e);
            return false;
        }
    }, [token, isReady, groupId]);

    const sendGroupTyping = useCallback((senderUsername, gId) => {
        if (!isReady()) return;
        const targetGroupId = gId || groupId;
        if (!targetGroupId) return;
        try {
            clientRef.current.publish({
                destination: `/app/group/${targetGroupId}/typing`,
                body: JSON.stringify({
                    type: 'TYPING', senderUsername,
                    conversationId: targetGroupId
                })
            });
        } catch (_) {}
    }, [isReady, groupId]);

    const sendTyping = useCallback((senderUsername) => {
        if (!isReady()) return;
        const cid = convIdRef.current;
        if (!cid) return;
        try {
            clientRef.current.publish({
                destination: `/app/chat/${cid}/typing`,
                body: JSON.stringify({
                    type: 'TYPING', senderUsername,
                    conversationId: cid
                })
            });
        } catch (_) {}
    }, [isReady]);

    const isConnected = useCallback(() => isReady(), [isReady]);

    // ── FIX: Group edit WS ──
    const sendGroupEdit = useCallback((messageId, content, gId) => {
        if (!isReady()) return false;
        const targetGroupId = gId || groupId;
        if (!targetGroupId) return false;
        try {
            console.log('[WS] Sending group edit:', { targetGroupId, messageId, content });
            clientRef.current.publish({
                destination: `/app/group/${targetGroupId}/edit`,
                headers: { token },
                body: JSON.stringify({
                    messageId,
                    content
                })
            });
            return true;
        } catch (e) {
            console.error('[WS] group edit:', e);
            return false;
        }
    }, [token, isReady, groupId]);

    // ── FIX: Group delete WS ──
    const sendGroupDelete = useCallback((messageId, forEveryone, gId) => {
        if (!isReady()) return false;
        const targetGroupId = gId || groupId;
        if (!targetGroupId) return false;
        try {
            console.log('[WS] Sending group delete:', { targetGroupId, messageId, forEveryone });
            clientRef.current.publish({
                destination: `/app/group/${targetGroupId}/delete`,
                headers: { token },
                body: JSON.stringify({
                    messageId,
                    forEveryone
                })
            });
            return true;
        } catch (e) {
            console.error('[WS] group delete:', e);
            return false;
        }
    }, [token, isReady, groupId]);

    const broadcastGroupMessage = useCallback((mediaMsg, gId) => {
        if (!isReady()) return false;
        const targetGroupId = gId || groupId;
        if (!targetGroupId) return false;
        try {
            clientRef.current.publish({
                destination: `/app/group/${targetGroupId}/broadcast`,
                headers: { token },
                body: JSON.stringify(mediaMsg)
            });
            return true;
        } catch (e) {
            console.error('[WS] group broadcast:', e);
            return false;
        }
    }, [token, isReady, groupId]);

    return {
        sendMessage, sendTyping, isConnected,
        sendGroupMessage, sendGroupTyping,
        sendGroupEdit, sendGroupDelete,
        broadcastGroupMessage
    };
};

export default useWebSocket;