import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(
        JSON.parse(localStorage.getItem('cc_user')) || null
    );
    const [token, setToken] = useState(
        localStorage.getItem('cc_token') || null
    );

    /**
     * FIX: Old sessions stored in localStorage are missing the `id` field
     * because the login call previously only saved { username, email }.
     *
     * On mount, if we have a token but user.id is missing, fetch the
     * current user's profile to get their id and patch localStorage.
     *
     * Users never need to log out and back in — this runs transparently.
     */
    useEffect(() => {
        if (!token || !user || user.id) return; // already has id — nothing to do

        const fetchUserId = async () => {
            try {
                const res = await axios.get(
                    'http://localhost:8080/api/profile/me',
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                // Profile endpoint returns at minimum { id, username, email }
                const id = res.data?.id || res.data?.userId;
                if (id) {
                    const patched = { ...user, id };
                    setUser(patched);
                    localStorage.setItem('cc_user', JSON.stringify(patched));
                    console.log('[Auth] Patched missing user id:', id);
                }
            } catch (e) {
                console.warn('[Auth] Could not fetch user id for session patch:', e);
            }
        };

        fetchUserId();
    }, [token]); // run once when token is available

    const login = (userData, jwtToken) => {
        setUser(userData);
        setToken(jwtToken);
        localStorage.setItem('cc_user', JSON.stringify(userData));
        localStorage.setItem('cc_token', jwtToken);
    };

    const logout = () => {
        setUser(null);
        setToken(null);
        localStorage.removeItem('cc_user');
        localStorage.removeItem('cc_token');
        window.location.href = '/login';
    };

    return (
        <AuthContext.Provider value={{ user, token, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);