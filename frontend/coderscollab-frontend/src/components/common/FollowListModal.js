import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { followUser, unfollowUser,
    getFollowers, getFollowing } from '../../api/followerApi';
import * as M from '../../styles/mixins';

const BASE = 'http://localhost:8080';

const ConfirmModal = ({ username, onConfirm, onCancel }) => (
    <div style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1100, backdropFilter: 'blur(6px)'
    }} onClick={onCancel}>
        <div style={{
            background: 'var(--modal-bg)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)', padding: '2rem',
            width: '90%', maxWidth: '320px', textAlign: 'center'
        }} onClick={e => e.stopPropagation()}>
            <div style={{
                width: '56px', height: '56px',
                background: 'var(--danger-bg)', borderRadius: '50%',
                margin: '0 auto 1rem', display: 'flex',
                alignItems: 'center', justifyContent: 'center', fontSize: '24px'
            }}>👤</div>
            <h3 style={{ margin: '0 0 8px', fontSize: '17px',
                fontWeight: '700', color: 'var(--text-primary)' }}>
                Unfollow @{username}?
            </h3>
            <p style={{ margin: '0 0 1.5rem', fontSize: '13px',
                color: 'var(--text-muted)', lineHeight: '1.5' }}>
                Their posts will no longer appear in your feed.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button onClick={onConfirm} className="btn-danger btn-full"
                    style={{ fontSize: '14px', fontWeight: '600', padding: '11px' }}>
                    Unfollow
                </button>
                <button onClick={onCancel} className="btn-secondary btn-full"
                    style={{ fontSize: '14px', padding: '11px' }}>
                    Cancel
                </button>
            </div>
        </div>
    </div>
);

/**
 * Props:
 *   type          — 'followers' | 'following'
 *   userId        — numeric id of the profile being viewed
 *   onClose       — close handler
 *   onCountChange — optional (delta) => void
 *                   called with +1 (followed) or -1 (unfollowed)
 *                   so parents can update their counts instantly
 */
const FollowListModal = ({ type, userId, onClose, onCountChange }) => {
    const { token, user } = useAuth();
    const title = type === 'followers' ? 'Followers' : 'Following';

    const [list, setList]                   = useState([]);
    const [loading, setLoading]             = useState(true);
    const [error, setError]                 = useState(null);
    const [search, setSearch]               = useState('');
    const [followStates, setFollowStates]   = useState({});
    const [followLoading, setFollowLoading] = useState({});
    const [confirmUnfollow, setConfirmUnfollow] = useState(null);

    useEffect(() => {
        if (!userId || !token) { setLoading(false); return; }
        const fetchList = async () => {
            setLoading(true);
            setError(null);
            try {
                const data = type === 'followers'
                    ? await getFollowers(token, userId)
                    : await getFollowing(token, userId);
                setList(Array.isArray(data) ? data : []);
            } catch (e) {
                console.error(`Failed to load ${type}:`, e);
                setError(`Could not load ${type}. Please try again.`);
                setList([]);
            } finally {
                setLoading(false);
            }
        };
        fetchList();
    }, [type, userId, token]);

    const filtered = list.filter(u =>
        u.username?.toLowerCase().includes(search.toLowerCase()) ||
        u.fullName?.toLowerCase().includes(search.toLowerCase()));

    const getState = (u) =>
        followStates[u.userId] !== undefined
            ? followStates[u.userId]
            : { following: u.following ?? false, pending: u.pending ?? false };

    const handleFollowClick = (e, u) => {
        e.stopPropagation();
        const state = getState(u);
        if (state.following) setConfirmUnfollow(u);
        else if (!state.pending) doFollow(u);
    };

    const doFollow = async (u) => {
        setFollowLoading(p => ({ ...p, [u.userId]: true }));
        try {
            const data = await followUser(token, u.userId);
            const isNowFollowing = !data?.pending;
            setFollowStates(p => ({ ...p, [u.userId]: {
                following: isNowFollowing,
                pending:   data?.pending ?? false
            }}));
            // Notify parent: following count went up by 1
            if (isNowFollowing) onCountChange?.(+1);
        } catch (e) { console.error('Follow error:', e); }
        finally { setFollowLoading(p => ({ ...p, [u.userId]: false })); }
    };

    const doUnfollow = async () => {
        const u = confirmUnfollow;
        setConfirmUnfollow(null);
        setFollowLoading(p => ({ ...p, [u.userId]: true }));
        try {
            await unfollowUser(token, u.userId);
            setFollowStates(p => ({ ...p, [u.userId]: {
                following: false, pending: false
            }}));
            // Notify parent: following count went down by 1
            onCountChange?.(-1);
        } catch (e) { console.error('Unfollow error:', e); }
        finally { setFollowLoading(p => ({ ...p, [u.userId]: false })); }
    };

    return (
        <>
            <div className="modal-overlay" onClick={onClose}>
                <div className="modal-box"
                    style={{ maxWidth: '400px', maxHeight: '560px' }}
                    onClick={e => e.stopPropagation()}>

                    <div style={{ display: 'flex', justifyContent: 'space-between',
                        alignItems: 'center', marginBottom: '12px' }}>
                        <h3 style={{ margin: 0, fontSize: '16px',
                            fontWeight: '600', color: 'var(--text-primary)' }}>
                            {title}
                        </h3>
                        <button onClick={onClose} className="btn-icon"
                            style={{ fontSize: '20px' }}>×</button>
                    </div>

                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder={`Search ${title.toLowerCase()}...`}
                        className="input"
                        style={{ marginBottom: '12px', fontSize: '13px' }} />

                    <div style={{ overflowY: 'auto', flex: 1 }}>
                        {loading ? (
                            <p style={{ textAlign: 'center',
                                color: 'var(--text-muted)',
                                fontSize: '14px', padding: '2rem 0' }}>
                                Loading {title.toLowerCase()}...
                            </p>
                        ) : error ? (
                            <p style={{ textAlign: 'center',
                                color: 'var(--danger)',
                                fontSize: '14px', padding: '2rem 0' }}>
                                {error}
                            </p>
                        ) : filtered.length === 0 ? (
                            <p style={{ textAlign: 'center',
                                color: 'var(--text-muted)',
                                fontSize: '14px', padding: '1.5rem 0' }}>
                                {search ? 'No results found'
                                    : `No ${title.toLowerCase()} yet`}
                            </p>
                        ) : filtered.map(u => {
                            const avatarUrl = u.profilePictureUrl
                                ? `${BASE}${u.profilePictureUrl}` : null;
                            const initial = u.username?.[0]?.toUpperCase() || 'U';
                            const isOwn   = u.username === user?.username;
                            const state   = getState(u);
                            const busy    = followLoading[u.userId];

                            const btnLabel = busy             ? '...'
                                : state.following ? 'Unfollow'
                                : state.pending   ? 'Requested'
                                : 'Follow';

                            return (
                                <div key={u.userId}
                                    onClick={() =>
                                        window.location.href =
                                        `/user/${u.username}`}
                                    style={{
                                        display: 'flex', alignItems: 'center',
                                        gap: '12px', padding: '10px 8px',
                                        borderRadius: 'var(--radius-md)',
                                        cursor: 'pointer',
                                        transition: 'background 0.15s'
                                    }}
                                    onMouseOver={e =>
                                        e.currentTarget.style.background =
                                        'var(--hover-bg)'}
                                    onMouseOut={e =>
                                        e.currentTarget.style.background =
                                        'transparent'}>

                                    <div style={M.getAvatar(42, avatarUrl)}>
                                        {!avatarUrl && initial}
                                    </div>

                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <p style={{ margin: 0,
                                            fontSize: '14px', fontWeight: '600',
                                            color: 'var(--text-primary)',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap' }}>
                                            @{u.username}
                                        </p>
                                        {u.fullName && (
                                            <p style={{ margin: '2px 0 0',
                                                fontSize: '12px',
                                                color: 'var(--text-muted)',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap' }}>
                                                {u.fullName}
                                            </p>
                                        )}
                                    </div>

                                    {isOwn ? (
                                        <span style={{ fontSize: '11px',
                                            color: 'var(--text-faint)',
                                            flexShrink: 0,
                                            padding: '6px 10px' }}>
                                            You
                                        </span>
                                    ) : (
                                        <button
                                            onClick={e => handleFollowClick(e, u)}
                                            disabled={busy}
                                            style={{
                                                padding: '6px 14px',
                                                background: state.following
                                                    ? 'transparent'
                                                    : state.pending
                                                    ? 'var(--text-muted)'
                                                    : 'var(--btn-gradient)',
                                                color: state.following
                                                    ? 'var(--text-primary)'
                                                    : '#fff',
                                                border: state.following
                                                    ? '1px solid var(--border)'
                                                    : 'none',
                                                borderRadius: 'var(--radius-md)',
                                                fontSize: '12px',
                                                fontWeight: '600',
                                                cursor: busy || state.pending
                                                    ? 'not-allowed' : 'pointer',
                                                flexShrink: 0,
                                                transition: 'all 0.2s',
                                                fontFamily: 'var(--font-main)',
                                                minWidth: '80px'
                                            }}>
                                            {btnLabel}
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {confirmUnfollow && (
                <ConfirmModal
                    username={confirmUnfollow.username}
                    onConfirm={doUnfollow}
                    onCancel={() => setConfirmUnfollow(null)} />
            )}
        </>
    );
};

export default FollowListModal;