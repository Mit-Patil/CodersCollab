import axios from 'axios';

const BASE_URL = 'http://localhost:8080/api/auth';

export const registerUser = async (data) => {
    const response = await axios.post(`${BASE_URL}/register`, data);
    return response.data;
};

export const loginUser = async (data) => {
    const response = await axios.post(`${BASE_URL}/login`, data);
    return response.data;
};