import axios from 'axios';

const BASE_URL = 'http://localhost:8080/api/profile';

const getAuthHeader = (token) => ({
    headers: { Authorization: `Bearer ${token}` }
});

export const getProfile = async (token) => {
    const response = await axios.get(BASE_URL, getAuthHeader(token));
    return response.data;
};

export const updateProfile = async (token, data) => {
    const response = await axios.put(BASE_URL, data, getAuthHeader(token));
    return response.data;
};

export const uploadProfilePicture = async (token, file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await axios.post(`${BASE_URL}/picture`, formData, {
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
        }
    });
    return response.data;
};