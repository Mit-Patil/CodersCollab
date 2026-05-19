import axios from 'axios';

const BASE_URL = 'http://localhost:8080/api/messages';

const getAuthHeader = (token) => ({
    headers: { Authorization: `Bearer ${token}` }
});

export const getOrCreateConversation = async (token, userId) => {
    const response = await axios.post(
        `${BASE_URL}/conversation/${userId}`,
        {}, getAuthHeader(token));
    return response.data;
};

export const getAllConversations = async (token) => {
    const response = await axios.get(
        `${BASE_URL}/conversations`, getAuthHeader(token));
    return response.data;
};

export const getMessages = async (token, conversationId) => {
    const response = await axios.get(
        `${BASE_URL}/${conversationId}`, getAuthHeader(token));
    return response.data;
};

export const sendMessage = async (token, conversationId,
        content, replyToId = null) => {
    const response = await axios.post(
        `${BASE_URL}/${conversationId}`,
        { content, replyToId },
        getAuthHeader(token));
    return response.data;
};

export const sendMedia = async (token, conversationId,
        file, replyToId = null) => {
    const formData = new FormData();
    formData.append('file', file);
    if (replyToId) formData.append('replyToId', replyToId);
    const response = await axios.post(
        `${BASE_URL}/${conversationId}/media`, formData, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'multipart/form-data'
            },
            timeout: 60000
        });
    return response.data;
};

export const forwardMessage = async (token, messageId,
        conversationId) => {
    const response = await axios.post(
        `${BASE_URL}/${messageId}/forward/${conversationId}`,
        {}, getAuthHeader(token));
    return response.data;
};

export const editMessage = async (token, messageId, content) => {
    const response = await axios.put(
        `${BASE_URL}/${messageId}/edit`,
        { content }, getAuthHeader(token));
    return response.data;
};

export const deleteMessage = async (token, messageId,
        forEveryone = false) => {
    const response = await axios.delete(
        `${BASE_URL}/${messageId}?forEveryone=${forEveryone}`,
        getAuthHeader(token));
    return response.data;
};

export const markAsRead = async (token, conversationId) => {
    const response = await axios.put(
        `${BASE_URL}/${conversationId}/read`,
        {}, getAuthHeader(token));
    return response.data;
};