import axios from 'axios';

const BASE_URL = 'http://localhost:8080/api/posts';

const getAuthHeader = (token) => ({
    headers: { Authorization: `Bearer ${token}` }
});

export const toggleLike = async (token, postId) => {
    const response = await axios.post(
        `${BASE_URL}/${postId}/like`, {}, getAuthHeader(token));
    return response.data;
};

export const getLikeStatus = async (token, postId) => {
    const response = await axios.get(
        `${BASE_URL}/${postId}/like/status`, getAuthHeader(token));
    return response.data;
};

export const addComment = async (token, postId, content,
        parentId = null) => {
    const response = await axios.post(
        `${BASE_URL}/${postId}/comments`,
        { content, parentId },
        getAuthHeader(token));
    return response.data;
};

export const getComments = async (postId, token = null) => {
    const config = token ? getAuthHeader(token) : {};
    const response = await axios.get(
        `${BASE_URL}/${postId}/comments`, config);
    return response.data;
};

export const deleteComment = async (token, commentId) => {
    const response = await axios.delete(
        `${BASE_URL}/comments/${commentId}`,
        getAuthHeader(token));
    return response.data;
};

export const toggleCommentLike = async (token, commentId) => {
    const response = await axios.post(
        `${BASE_URL}/comments/${commentId}/like`,
        {}, getAuthHeader(token));
    return response.data;
};