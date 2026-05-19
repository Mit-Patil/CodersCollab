import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import Navbar from '../common/Navbar';

const BASE = 'http://localhost:8080';

const GroupJoinPage = () => {
    const { token } = useAuth();
    const inviteCode = window.location.pathname.split('/').pop();
    const [status, setStatus] = useState('loading');
    const [group, setGroup] = useState(null);
    const [message, setMessage] = useState('');
    const [joining, setJoining] = useState(false);

    useEffect(() => {
        if (!token) {
            const timer = setTimeout(() => {
                if (!token) {
                    sessionStorage.setItem('redirectAfterLogin',
                        window.location.pathname);
                    window.location.href = '/login';
                }
            }, 500);
            return () => clearTimeout(timer);
        }
        fetchGroupInfo();
    }, [token]);

    // ── Step 1: just fetch group info, don't join yet ──
    const fetchGroupInfo = async () => {
        try {
            const res = await fetch(
                `${BASE}/api/groups/invite-info/${inviteCode}`,
                { headers: {
                    'Authorization': `Bearer ${token}` }});

            if (res.status === 401) {
                window.location.href = '/login';
                return;
            }

            const text = await res.text();
            let data = {};
            try { data = JSON.parse(text); } catch (_) {}

            if (!res.ok) {
                const msg = data.message || '';
                if (msg.toLowerCase().includes('invalid')) {
                    setStatus('error');
                    setMessage('This invite link is invalid or expired.');
                } else {
                    setStatus('error');
                    setMessage(msg || 'Something went wrong.');
                }
                return;
            }

            setGroup(data);

            // Already a member — redirect
            if (data.isMember) {
                setStatus('already');
                setTimeout(() => {
                    window.location.href = '/messages';
                }, 2000);
                return;
            }

            // Has pending request
            if (data.hasPendingRequest) {
                setStatus('pending');
                return;
            }

            // Show preview — let user decide to join
            setStatus('preview');

        } catch (e) {
            console.error('[GroupJoin] Error:', e);
            setStatus('error');
            setMessage('Something went wrong. Please try again.');
        }
    };

    // ── Step 2: user clicks button, NOW join ──
    const handleJoin = async () => {
        if (joining) return;
        setJoining(true);
        try {
            const res = await fetch(
                `${BASE}/api/groups/invite/${inviteCode}`,
                { method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json' }});

            const text = await res.text();
            let data = {};
            try { data = JSON.parse(text); } catch (_) {}

            if (!res.ok) {
                const msg = data.message || '';
                if (msg.toLowerCase().includes('already')) {
                    setStatus('already');
                    setTimeout(() => {
                        window.location.href = '/messages';
                    }, 2000);
                } else {
                    setMessage(msg || 'Something went wrong.');
                }
                return;
            }

            if (data.isMember) {
                setStatus('already');
                setTimeout(() => {
                    window.location.href = '/messages';
                }, 2000);
            } else if (data.hasPendingRequest) {
                setGroup(data);
                setStatus('pending');
            } else {
                setGroup(data);
                setStatus('success');
            }
        } catch (e) {
            setMessage('Something went wrong. Please try again.');
        } finally {
            setJoining(false);
        }
    };

    const goToMessages = () => {
        window.location.href = '/messages';
    };

    return (
        <div className="page">
            <Navbar active="" />
            <div style={{ display: 'flex', alignItems: 'center',
                justifyContent: 'center',
                minHeight: 'calc(100vh - 64px)',
                padding: '2rem' }}>
                <div style={{
                    background: 'var(--card-bg-solid)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '2.5rem',
                    maxWidth: '400px', width: '100%',
                    textAlign: 'center',
                    boxShadow: '0 4px 24px rgba(0,0,0,0.15)' }}>

                    {/* Loading */}
                    {status === 'loading' && (
                        <>
                            <div style={{ fontSize: '48px',
                                marginBottom: '1rem' }}>⏳</div>
                            <p style={{ color: 'var(--text-muted)',
                                fontSize: '15px', margin: 0 }}>
                                Loading group info...
                            </p>
                        </>
                    )}

                    {/* Preview — show group, let user decide */}
                    {status === 'preview' && group && (
                        <>
                            <div style={{ width: '80px', height: '80px',
                                borderRadius: '20px',
                                background: 'var(--primary-bg)',
                                border: '2px solid var(--primary-border)',
                                display: 'flex', alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '36px', overflow: 'hidden',
                                margin: '0 auto 16px' }}>
                                {group.avatarUrl ? (
                                    <img src={`${BASE}${group.avatarUrl}`}
                                        alt="group"
                                        style={{ width: '100%',
                                            height: '100%',
                                            objectFit: 'cover' }} />
                                ) : '👥'}
                            </div>
                            <h2 style={{ margin: '0 0 6px',
                                fontSize: '22px', fontWeight: '700',
                                color: 'var(--text-primary)' }}>
                                {group.name}
                            </h2>
                            {group.description && (
                                <p style={{ color: 'var(--text-muted)',
                                    fontSize: '13px',
                                    margin: '0 0 12px',
                                    lineHeight: '1.5' }}>
                                    {group.description}
                                </p>
                            )}
                            <div style={{ display: 'flex', gap: '8px',
                                justifyContent: 'center',
                                flexWrap: 'wrap',
                                marginBottom: '20px' }}>
                                <span style={{ fontSize: '12px',
                                    padding: '4px 10px',
                                    borderRadius: 'var(--radius-xl)',
                                    background: 'var(--input-bg)',
                                    color: 'var(--text-secondary)' }}>
                                    👥 {group.memberCount} members
                                </span>
                                {group.isPrivate ? (
                                    <span style={{ fontSize: '12px',
                                        padding: '4px 10px',
                                        borderRadius: 'var(--radius-xl)',
                                        background: 'var(--primary-bg)',
                                        color: 'var(--primary)' }}>
                                        🔒 Private
                                    </span>
                                ) : (
                                    <span style={{ fontSize: '12px',
                                        padding: '4px 10px',
                                        borderRadius: 'var(--radius-xl)',
                                        background: 'var(--hover-bg)',
                                        color: 'var(--text-secondary)' }}>
                                        🌐 Public
                                    </span>
                                )}
                            </div>
                            {message && (
                                <p style={{ fontSize: '12px',
                                    color: 'var(--danger)',
                                    background: 'var(--danger-bg)',
                                    padding: '8px 12px',
                                    borderRadius: 'var(--radius-md)',
                                    margin: '0 0 12px' }}>
                                    {message}
                                </p>
                            )}
                            <button onClick={handleJoin}
                                disabled={joining}
                                className="btn-primary btn-full"
                                style={{ fontSize: '15px',
                                    padding: '12px',
                                    fontWeight: '600',
                                    marginBottom: '8px' }}>
                                {joining ? 'Processing...'
                                    : group.isPrivate
                                    ? '📨 Request to Join'
                                    : '➕ Join Group'}
                            </button>
                            <button onClick={goToMessages}
                                className="btn-secondary btn-full"
                                style={{ fontSize: '14px',
                                    padding: '10px' }}>
                                Cancel
                            </button>
                            <p style={{ fontSize: '12px',
                                color: 'var(--text-faint)',
                                margin: '10px 0 0' }}>
                                {group.isPrivate
                                    ? 'An admin will review your request'
                                    : 'You\'ll join instantly'}
                            </p>
                        </>
                    )}

                    {/* Success */}
                    {status === 'success' && group && (
                        <>
                            <div style={{ width: '48px', height: '48px',
                                background: 'var(--success-bg)',
                                borderRadius: '50%',
                                display: 'flex', alignItems: 'center',
                                justifyContent: 'center',
                                margin: '0 auto 16px',
                                fontSize: '24px' }}>
                                ✅
                            </div>
                            <h2 style={{ margin: '0 0 8px',
                                fontSize: '22px', fontWeight: '700',
                                color: 'var(--text-primary)' }}>
                                You joined!
                            </h2>
                            <p style={{ color: 'var(--text-primary)',
                                fontSize: '18px', fontWeight: '700',
                                margin: '0 0 6px' }}>
                                {group.name}
                            </p>
                            <p style={{ fontSize: '12px',
                                color: 'var(--text-faint)',
                                margin: '0 0 1.5rem' }}>
                                👥 {group.memberCount} members
                            </p>
                            <button onClick={goToMessages}
                                className="btn-primary btn-full"
                                style={{ fontSize: '14px',
                                    padding: '12px',
                                    fontWeight: '600' }}>
                                Open Group Chat →
                            </button>
                        </>
                    )}

                    {/* Pending */}
                    {status === 'pending' && (
                        <>
                            <div style={{ width: '72px', height: '72px',
                                background: 'var(--primary-bg)',
                                borderRadius: '50%',
                                display: 'flex', alignItems: 'center',
                                justifyContent: 'center',
                                margin: '0 auto 16px',
                                fontSize: '32px',
                                border: '2px solid var(--primary-border)' }}>
                                ⏳
                            </div>
                            <h2 style={{ margin: '0 0 8px',
                                fontSize: '22px', fontWeight: '700',
                                color: 'var(--text-primary)' }}>
                                Request Sent
                            </h2>
                            <p style={{ color: 'var(--text-muted)',
                                fontSize: '14px',
                                margin: '0 0 4px',
                                lineHeight: '1.5' }}>
                                {group?.name
                                    ? `Your request to join "${group.name}" is pending.`
                                    : 'Your join request is pending.'}
                            </p>
                            <p style={{ color: 'var(--text-faint)',
                                fontSize: '12px',
                                margin: '0 0 1.5rem' }}>
                                Waiting for admin approval.
                            </p>
                            <button onClick={goToMessages}
                                className="btn-secondary btn-full"
                                style={{ fontSize: '14px',
                                    padding: '12px' }}>
                                Back to Messages
                            </button>
                        </>
                    )}

                    {/* Already member */}
                    {status === 'already' && (
                        <>
                            <div style={{ width: '72px', height: '72px',
                                background: 'var(--primary-bg)',
                                borderRadius: '50%',
                                display: 'flex', alignItems: 'center',
                                justifyContent: 'center',
                                margin: '0 auto 16px',
                                fontSize: '32px',
                                border: '2px solid var(--primary-border)' }}>
                                👥
                            </div>
                            <h2 style={{ margin: '0 0 8px',
                                fontSize: '22px', fontWeight: '700',
                                color: 'var(--text-primary)' }}>
                                Already a Member
                            </h2>
                            <p style={{ color: 'var(--text-muted)',
                                fontSize: '14px',
                                margin: '0 0 4px' }}>
                                You're already in this group.
                            </p>
                            <p style={{ color: 'var(--text-faint)',
                                fontSize: '12px',
                                margin: '0 0 1.5rem' }}>
                                Redirecting to messages...
                            </p>
                            <button onClick={goToMessages}
                                className="btn-primary btn-full"
                                style={{ fontSize: '14px',
                                    padding: '12px',
                                    fontWeight: '600' }}>
                                Open Group Chat →
                            </button>
                        </>
                    )}

                    {/* Error */}
                    {status === 'error' && (
                        <>
                            <div style={{ width: '64px', height: '64px',
                                background: 'var(--danger-bg)',
                                borderRadius: '50%',
                                display: 'flex', alignItems: 'center',
                                justifyContent: 'center',
                                margin: '0 auto 16px',
                                fontSize: '28px' }}>
                                ❌
                            </div>
                            <h2 style={{ margin: '0 0 8px',
                                fontSize: '22px', fontWeight: '700',
                                color: 'var(--text-primary)' }}>
                                Can't Join Group
                            </h2>
                            <p style={{ color: 'var(--text-muted)',
                                fontSize: '14px',
                                margin: '0 0 1.5rem',
                                lineHeight: '1.5' }}>
                                {message ||
                                    'This invite link is invalid or has expired.'}
                            </p>
                            <button onClick={goToMessages}
                                className="btn-secondary btn-full"
                                style={{ fontSize: '14px',
                                    padding: '12px' }}>
                                Go to Messages
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default GroupJoinPage;