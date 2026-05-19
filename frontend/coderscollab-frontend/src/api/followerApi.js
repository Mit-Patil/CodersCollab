import axios from 'axios';

const BASE_URL = 'http://localhost:8080/api/follow';

const getAuthHeader = (token) => ({
    headers: { Authorization: `Bearer ${token}` }
});

export const followUser = async (token, userId) => {
    const response = await axios.post(
        `${BASE_URL}/${userId}`, {}, getAuthHeader(token));
    return response.data;
};

export const unfollowUser = async (token, userId) => {
    const response = await axios.delete(
        `${BASE_URL}/${userId}`, getAuthHeader(token));
    return response.data;
};

export const getFollowStatus = async (token, userId) => {
    const response = await axios.get(
        `${BASE_URL}/status/${userId}`, getAuthHeader(token));
    return response.data;
};

export const getFollowerCount = async (userId) => {
    const response = await axios.get(`${BASE_URL}/count/${userId}`);
    return response.data; // { followers: N, following: N }
};

// ── FIX: URL was /api/follow/followers/{id} — wrong.
//         Backend expects /api/follow/{id}/followers
export const getFollowers = async (token, userId) => {
    const response = await axios.get(
        `${BASE_URL}/${userId}/followers`, getAuthHeader(token));
    return response.data;
};

export const getFollowing = async (token, userId) => {
    const response = await axios.get(
        `${BASE_URL}/${userId}/following`, getAuthHeader(token));
    return response.data;
};

export const getFollowRequests = async (token) => {
    const response = await axios.get(
        `${BASE_URL}/requests`, getAuthHeader(token));
    return response.data;
};

export const acceptFollowRequest = async (token, followerId) => {
    const response = await axios.post(
        `${BASE_URL}/requests/${followerId}/accept`,
        {}, getAuthHeader(token));
    return response.data;
};

export const rejectFollowRequest = async (token, followerId) => {
    const response = await axios.post(
        `${BASE_URL}/requests/${followerId}/reject`,
        {}, getAuthHeader(token));
    return response.data;
};

export const getPendingRequestCount = async (token) => {
    const response = await axios.get(
        `${BASE_URL}/requests/count`, getAuthHeader(token));
    return response.data;
};