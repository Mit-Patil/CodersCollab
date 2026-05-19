import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Home from './components/home/Home';
import Profile from './components/profile/Profile';
import CreatePost from './components/post/CreatePost';
import Explore from './components/explore/Explore';
import UserProfile from './components/profile/UserProfile';
import FollowRequests from './components/common/FollowRequests';
import PostPage from './components/post/PostPage';
import AuthPage from './components/auth/AuthPage';
import MessagingPage from './components/messaging/MessagingPage';
import GroupJoinPage from './components/messaging/GroupJoinPage';

const ProtectedRoute = ({ children }) => {
    const { token } = useAuth();
    return token ? children : <Navigate to='/login' />;
};


const styles = {
    container:   { minHeight: '100vh', background: '#f0f2f5' },
    navbar:      { background: '#1E3A5F', padding: '1rem 2rem',
                   display: 'flex', justifyContent: 'space-between',
                   alignItems: 'center' },
    brand:       { color: '#fff', margin: 0 },
    navLinks:    { display: 'flex', alignItems: 'center', gap: '1rem' },
    navLink:     { color: '#fff', textDecoration: 'none', fontSize: '15px' },
    logoutBtn:   { background: 'transparent', border: '1px solid #fff',
                   color: '#fff', padding: '6px 14px', borderRadius: '6px',
                   cursor: 'pointer', fontSize: '14px' },
    content:     { maxWidth: '700px', margin: '3rem auto',
                   background: '#fff', padding: '2rem',
                   borderRadius: '12px',
                   boxShadow: '0 4px 20px rgba(0,0,0,0.1)' },
    profileLink: { display: 'inline-block', marginTop: '1rem',
                   color: '#2E75B6', fontWeight: 'bold' },
};

function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <Routes>
                    <Route path='/'         element={<Navigate to='/login' />} />
                    <Route path='/login' element={<AuthPage initialTab="login" />} />
                    <Route path='/register' element={<AuthPage initialTab="register" />} />
                    <Route path='/home'     element={
                        <ProtectedRoute><Home /></ProtectedRoute>
                    } />
                    <Route path='/profile'  element={
                        <ProtectedRoute><Profile /></ProtectedRoute>
                    } />
                    <Route path='/create-post' element={
                    <ProtectedRoute><CreatePost /></ProtectedRoute>
                    } />
                    <Route path='/explore' element={
                    <ProtectedRoute><Explore /></ProtectedRoute>
                    } />
                    <Route path='/user/:username' element={
                    <ProtectedRoute><UserProfile /></ProtectedRoute>
                    } />
                    <Route path='/requests' element={
                        <ProtectedRoute><FollowRequests /></ProtectedRoute>
                    } />
                    <Route path="/groups/join/:inviteCode" element={<GroupJoinPage />} />
                        <Route path='/messages' element={
                            <ProtectedRoute><MessagingPage /></ProtectedRoute>
                        } />
                        <Route path='/messages/:conversationId' element={
                            <ProtectedRoute><MessagingPage /></ProtectedRoute>
                        } />
                    <Route path='/post/:postId' element={
                        <ProtectedRoute><PostPage /></ProtectedRoute>
                    } />
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    );
}

export default App;