import axios from 'axios';

const BASE_URL = 'http://localhost:8080/api/profile';

const getAuthHeader = (token) => ({
    headers: { Authorization: `Bearer ${token}` }
});

export const exploreUsers = async (token, filters = {}) => {
    const params = new URLSearchParams();
    if (filters.search) params.append('search', filters.search);
    if (filters.stack) params.append('stack', filters.stack);
    if (filters.skill) params.append('skill', filters.skill);
    if (filters.availableForCollab !== undefined && filters.availableForCollab !== null)
        params.append('availableForCollab', filters.availableForCollab);

    const response = await axios.get(
        `${BASE_URL}/explore?${params.toString()}`,
        getAuthHeader(token));
    return response.data;
};