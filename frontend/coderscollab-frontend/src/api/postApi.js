import axios from 'axios';

const BASE_URL = 'http://localhost:8080/api/posts';

const getAuthHeader = (token) => ({
    headers: { Authorization: `Bearer ${token}` }
});

export const createPost = async (token, data) => {
    const response = await axios.post(BASE_URL, data, getAuthHeader(token));
    return response.data;
};

export const createImagePost = async (token, formData) => {
    const response = await axios.post(`${BASE_URL}/image`, formData, {
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
        }
    });
    return response.data;
};

export const getAllPosts = async (token) => {
    const response = await axios.get(BASE_URL, getAuthHeader(token));
    return response.data;
};

export const getUserPosts = async (token) => {
    const response = await axios.get(
        `${BASE_URL}/user`, getAuthHeader(token));
    return response.data;
};

export const getUserPostCount = async (token) => {
    const response = await axios.get(
        `${BASE_URL}/user/count`, getAuthHeader(token));
    return response.data;
};

export const deletePost = async (token, postId) => {
    const response = await axios.delete(
        `${BASE_URL}/${postId}`, getAuthHeader(token));
    return response.data;
};

export const updatePost = async (token, postId, data) => {
    const response = await axios.put(
        `${BASE_URL}/${postId}`, data, getAuthHeader(token));
    return response.data;
};
export const getPostById = async (token, postId) => {
    const response = await axios.get(
        `${BASE_URL}/${postId}`,
        token ? getAuthHeader(token) : {});
    return response.data;
};