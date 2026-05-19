import axios from 'axios';

const BASE_URL = 'http://localhost:8080/api/groups';

const getAuthHeader = (token) => ({
    headers: { Authorization: `Bearer ${token}` }
});

// ── Group CRUD ─────────────────────────────────────────
export const createGroup = async (token, formData) => {
    const response = await axios.post(BASE_URL, formData, {
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
        }
    });
    return response.data;
};

export const getMyGroups = async (token) => {
    const response = await axios.get(
        `${BASE_URL}/my`, getAuthHeader(token));
    return response.data;
};

export const getGroup = async (token, groupId) => {
    const res = await fetch(`${BASE_URL}/${groupId}`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Failed to get group');
    return res.json();
};

export const searchGroups = async (token, query) => {
    const response = await axios.get(
        `${BASE_URL}/search?query=${query}`,
        getAuthHeader(token));
    return response.data;
};

export const updateGroup = async (token, groupId, formData) => {
    const response = await axios.put(
        `${BASE_URL}/${groupId}`, formData, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'multipart/form-data'
            }
        });
    return response.data;
};

export const deleteGroup = async (token, groupId) => {
    const response = await axios.delete(
        `${BASE_URL}/${groupId}`, getAuthHeader(token));
    return response.data;
};

// ── Membership ─────────────────────────────────────────
export const joinGroup = async (token, groupId) => {
    const response = await axios.post(
        `${BASE_URL}/${groupId}/join`, {},
        getAuthHeader(token));
    return response.data;
};

export const leaveGroup = async (token, groupId) => {
    const response = await axios.post(
        `${BASE_URL}/${groupId}/leave`, {},
        getAuthHeader(token));
    return response.data;
};

export const getMembers = async (token, groupId) => {
    const response = await axios.get(
        `${BASE_URL}/${groupId}/members`,
        getAuthHeader(token));
    return response.data;
};

export const addMember = async (token, groupId, userId) => {
    const response = await axios.post(
        `${BASE_URL}/${groupId}/members/${userId}`, {},
        getAuthHeader(token));
    return response.data;
};

export const removeMember = async (token, groupId, userId) => {
    const response = await axios.delete(
        `${BASE_URL}/${groupId}/members/${userId}`,
        getAuthHeader(token));
    return response.data;
};

export const updateMemberRole = async (
        token, groupId, userId, role) => {
    const response = await axios.put(
        `${BASE_URL}/${groupId}/members/${userId}/role`,
        { role }, getAuthHeader(token));
    return response.data;
};

// ── Join Requests ──────────────────────────────────────
export const getJoinRequests = async (token, groupId) => {
    const response = await axios.get(
        `${BASE_URL}/${groupId}/requests`,
        getAuthHeader(token));
    return response.data;
};

export const acceptJoinRequest = async (
        token, groupId, userId) => {
    const response = await axios.post(
        `${BASE_URL}/${groupId}/requests/${userId}/accept`,
        {}, getAuthHeader(token));
    return response.data;
};

export const rejectJoinRequest = async (
        token, groupId, userId) => {
    const response = await axios.post(
        `${BASE_URL}/${groupId}/requests/${userId}/reject`,
        {}, getAuthHeader(token));
    return response.data;
};

// ── Messages ───────────────────────────────────────────
export const getGroupMessages = async (token, groupId) => {
    const response = await axios.get(
        `${BASE_URL}/${groupId}/messages`,
        getAuthHeader(token));
    return response.data;
};

export const sendGroupMessage = async (
        token, groupId, content, replyToId = null) => {
    const response = await axios.post(
        `${BASE_URL}/${groupId}/messages`,
        { content, replyToId },
        getAuthHeader(token));
    return response.data;
};

export const sendGroupMedia = async (
        token, groupId, file, replyToId = null) => {
    const formData = new FormData();
    formData.append('file', file);
    if (replyToId) formData.append('replyToId', replyToId);
    const response = await axios.post(
        `${BASE_URL}/${groupId}/messages/media`,
        formData, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'multipart/form-data'
            },
            timeout: 60000
        });
    return response.data;
};

export const editGroupMessage = async (
        token, messageId, content) => {
    const response = await axios.put(
        `${BASE_URL}/messages/${messageId}`,
        { content }, getAuthHeader(token));
    return response.data;
};

export const deleteGroupMessage = async (
        token, messageId, forEveryone = false) => {
    const response = await axios.delete(
        `${BASE_URL}/messages/${messageId}`
        + `?forEveryone=${forEveryone}`,
        getAuthHeader(token));
    return response.data;
};

export const markGroupAsRead = async (token, groupId) => {
    const response = await axios.put(
        `${BASE_URL}/${groupId}/read`, {},
        getAuthHeader(token));
    return response.data;
};

