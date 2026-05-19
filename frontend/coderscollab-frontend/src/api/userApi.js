import axios from 'axios';

const BASE_URL = 'http://localhost:8080/api';

const getAuthHeader = (token) => ({
    headers: { Authorization: `Bearer ${token}` }
});

export const getUserProfile = async (token, username) => {
    const response = await axios.get(
        `${BASE_URL}/profile/${username}`,
        token ? getAuthHeader(token) : {});
    return response.data;
};

export const getUserPosts = async (token, username) => {
    const response = await axios.get(
        `${BASE_URL}/posts/user/${username}`,
        token ? getAuthHeader(token) : {});
    return response.data;
};