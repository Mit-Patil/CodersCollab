import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { getPendingRequestCount } from '../../api/followerApi';
import * as M from '../../styles/mixins';

const Navbar = ({ active }) => {
    const { user, token } = useAuth();
    const { isDark, toggleTheme } = useTheme();
    const [requestCount, setRequestCount] = useState(0);
    const initials = user?.username?.[0]?.toUpperCase() || 'U';

    useEffect(() => {
        if (!token) return;
        getPendingRequestCount(token)
            .then(count => setRequestCount(count))
            .catch(() => {});
        const interval = setInterval(() => {
            getPendingRequestCount(token)
                .then(count => setRequestCount(count))
                .catch(() => {});
        }, 30000);
        return () => clearInterval(interval);
    }, [token]);

    const navItems = [
        { label: 'Home', path: '/home' },
        { label: 'Explore', path: '/explore' },
        { label: 'Messages', path: '/messages' },
    ];

    return (
        <div style={M.navbar()}>
            <span onClick={() => window.location.href = '/home'}
                style={{ fontSize: '17px', fontWeight: 700,
                    color: '#fff', cursor: 'pointer',
                    letterSpacing: '-0.3px',
                    fontFamily: 'var(--font-main)' }}>
                CodersCollab
            </span>

            <div style={{ display: 'flex', alignItems: 'center',
                gap: '20px' }}>
                {navItems.map(item => (
                    <span key={item.label}
                        onClick={() =>
                            window.location.href = item.path}
                        style={{ fontSize: '13px', cursor: 'pointer',
                            color: active === item.label
                                ? '#fff' : 'rgba(255,255,255,0.6)',
                            fontWeight: active === item.label
                                ? '600' : '400',
                            borderBottom: active === item.label
                                ? '2px solid #fff' : 'none',
                            paddingBottom: '2px',
                            fontFamily: 'var(--font-main)' }}>
                        {item.label}
                    </span>
                ))}

                {/* Theme Toggle */}
                <div style={{ display: 'flex', alignItems: 'center',
                    gap: '6px' }}>
                    <span style={{ fontSize: '12px',
                        color: 'rgba(255,255,255,0.5)' }}>
                        {isDark ? '🌙' : '☀️'}
                    </span>
                    <button
                        className={`theme-toggle ${!isDark ? 'active' : ''}`}
                        onClick={toggleTheme}
                        title={isDark
                            ? 'Switch to light mode'
                            : 'Switch to dark mode'}
                    />
                </div>

                {/* Notifications */}
                <div onClick={() =>
                    window.location.href = '/requests'}
                    style={{ position: 'relative',
                        cursor: 'pointer' }}>
                    <span style={{ fontSize: '18px' }}>🔔</span>
                    {requestCount > 0 && (
                        <div style={{ position: 'absolute',
                            top: '-6px', right: '-6px',
                            background: 'var(--danger)',
                            color: '#fff', borderRadius: '50%',
                            width: '16px', height: '16px',
                            fontSize: '10px', display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: '600' }}>
                            {requestCount > 9 ? '9+' : requestCount}
                        </div>
                    )}
                </div>

                {/* Avatar */}
                <div onClick={() =>
                    window.location.href = '/profile'}
                    style={{ ...M.avatarBase(32),
                        border: '2px solid rgba(255,255,255,0.3)',
                        fontSize: '13px' }}>
                    {initials}
                </div>
            </div>
        </div>
    );
};

export default Navbar;