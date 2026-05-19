import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getFollowRequests, acceptFollowRequest,
    rejectFollowRequest } from '../../api/followerApi';
import Navbar from './Navbar';
import * as M from '../../styles/mixins';

const BASE = 'http://localhost:8080';

const FollowRequests = () => {
    const { token } = useAuth();
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState({});
    const [search, setSearch] = useState('');

    useEffect(() => { fetchRequests(); }, []);

    const fetchRequests = async () => {
        setLoading(true);
        try {
            const data = await getFollowRequests(token);
            setRequests(data);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const handleAction = async (userId, action) => {
        setActionLoading(p => ({ ...p, [userId]: action }));
        try {
            if (action === 'accept') {
                await acceptFollowRequest(token, userId);
            } else {
                await rejectFollowRequest(token, userId);
            }
            setRequests(p => p.filter(r => r.userId !== userId));
        } catch (e) { console.error(e); }
        finally {
            setActionLoading(p => ({ ...p, [userId]: null }));
        }
    };

    const filtered = requests.filter(r =>
        r.username?.toLowerCase().includes(search.toLowerCase()) ||
        r.fullName?.toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="page">
            <Navbar active="" />

            <div style={{ maxWidth: '600px', margin: '2rem auto',
                padding: '0 1rem' }}>
                <div className="card-solid" style={{ padding: '1.5rem' }}>

                    {/* Header */}
                    <div style={{ display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '1rem' }}>
                        <h2 style={{ fontSize: '18px', fontWeight: '600',
                            color: 'var(--text-primary)', margin: 0 }}>
                            Follow Requests
                            {requests.length > 0 && (
                                <span style={{ marginLeft: '8px',
                                    fontSize: '14px',
                                    background: 'var(--danger)',
                                    color: '#fff',
                                    borderRadius: 'var(--radius-xl)',
                                    padding: '2px 8px' }}>
                                    {requests.length}
                                </span>
                            )}
                        </h2>
                    </div>

                    {/* Search */}
                    {requests.length > 0 && (
                        <input value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search requests..."
                            className="input"
                            style={{ marginBottom: '1rem',
                                fontSize: '13px' }} />
                    )}

                    {/* Content */}
                    {loading ? (
                        <p style={{ color: 'var(--text-muted)',
                            textAlign: 'center' }}>
                            Loading requests...
                        </p>
                    ) : filtered.length === 0 ? (
                        <div style={{ textAlign: 'center',
                            padding: '2rem' }}>
                            <p style={{ fontSize: '32px',
                                margin: '0 0 8px' }}>🔔</p>
                            <p style={{ fontSize: '15px',
                                color: 'var(--text-muted)', margin: 0 }}>
                                {search ? 'No results found'
                                    : 'No pending follow requests'}
                            </p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex',
                            flexDirection: 'column', gap: '10px' }}>
                            {filtered.map(req => {
                                const url = req.profilePictureUrl
                                    ? `${BASE}${req.profilePictureUrl}`
                                    : null;
                                const initial =
                                    req.username?.[0]?.toUpperCase()
                                    || 'U';
                                const busy = actionLoading[req.userId];
                                return (
                                    <div key={req.userId}
                                        style={{ display: 'flex',
                                            alignItems: 'center',
                                            gap: '12px', padding: '12px',
                                            background: 'var(--hover-bg)',
                                            borderRadius: '10px',
                                            border: '1px solid var(--border)' }}>

                                        {/* Avatar */}
                                        <div onClick={() =>
                                            window.location.href =
                                            `/user/${req.username}`}
                                            style={M.getAvatar(46, url)}>
                                            {!url && initial}
                                        </div>

                                        {/* Info */}
                                        <div style={{ flex: 1 }}>
                                            <p onClick={() =>
                                                window.location.href =
                                                `/user/${req.username}`}
                                                style={{ fontSize: '14px',
                                                    fontWeight: '600',
                                                    margin: 0,
                                                    color: 'var(--text-primary)',
                                                    cursor: 'pointer' }}>
                                                @{req.username}
                                            </p>
                                            {req.fullName && (
                                                <p style={{ fontSize: '12px',
                                                    color: 'var(--text-muted)',
                                                    margin: '2px 0 0' }}>
                                                    {req.fullName}
                                                </p>
                                            )}
                                        </div>

                                        {/* Actions */}
                                        <div style={{ display: 'flex',
                                            gap: '8px' }}>
                                            <button onClick={() =>
                                                handleAction(
                                                    req.userId, 'accept')}
                                                disabled={!!busy}
                                                className="btn-primary"
                                                style={{ padding: '7px 16px',
                                                    fontSize: '13px' }}>
                                                {busy === 'accept'
                                                    ? '...' : 'Accept'}
                                            </button>
                                            <button onClick={() =>
                                                handleAction(
                                                    req.userId, 'reject')}
                                                disabled={!!busy}
                                                className="btn-danger"
                                                style={{ padding: '7px 16px',
                                                    fontSize: '13px' }}>
                                                {busy === 'reject'
                                                    ? '...' : 'Decline'}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FollowRequests;