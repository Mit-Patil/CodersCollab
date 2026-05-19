import React from 'react';
import * as M from '../../styles/mixins';

const BASE = 'http://localhost:8080';

const UserCard = ({ user, counts, followLoading, onFollow }) => {
    const avatarUrl = user.profilePictureUrl
        ? `${BASE}${user.profilePictureUrl}` : null;
    const initial = user.username?.[0]?.toUpperCase() || 'U';
    const c = counts[user.id] || { followers: 0, following: 0 };

    const followBg = user.isFollowing ? 'transparent'
        : user.isPending ? 'var(--text-muted)'
        : 'var(--btn-gradient)';
    const followLabel = followLoading[user.id] ? '...'
        : user.isFollowing ? 'Unfollow'
        : user.isPending ? 'Requested' : 'Follow';

    return (
        <div style={M.userCard()}>

            {/* Avatar */}
            <div onClick={() => window.location.href =
                `/user/${user.username}`}
                style={{ ...M.getAvatar(64, avatarUrl),
                    border: '2px solid var(--border)' }}>
                {!avatarUrl && initial}
            </div>

            {/* Name */}
            <div>
                <p onClick={() => window.location.href =
                    `/user/${user.username}`}
                    style={{ fontSize: '15px', fontWeight: '600',
                        margin: 0, color: 'var(--text-primary)',
                        cursor: 'pointer' }}>
                    @{user.username}
                </p>
                {user.fullName && (
                    <p style={{ fontSize: '12px',
                        color: 'var(--text-muted)',
                        margin: '2px 0 0' }}>
                        {user.fullName}
                    </p>
                )}
            </div>

            {/* Stats */}
            <div style={{ display: 'flex', gap: '16px' }}>
                {[['Followers', c.followers],
                  ['Following', c.following]].map(([label, val]) => (
                    <div key={label}>
                        <p style={{ fontSize: '14px', fontWeight: '600',
                            margin: 0,
                            color: 'var(--text-primary)' }}>
                            {val}
                        </p>
                        <p style={{ fontSize: '11px',
                            color: 'var(--text-muted)', margin: 0 }}>
                            {label}
                        </p>
                    </div>
                ))}
            </div>

            {/* Stack badge */}
            {user.masterStack && (
                <span style={M.badge('primary')}>
                    {user.masterStack}
                </span>
            )}

            {/* Skills */}
            {user.skills?.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap',
                    gap: '4px', justifyContent: 'center' }}>
                    {user.skills.slice(0, 3).map((s, i) => (
                        <span key={i} style={{ fontSize: '10px',
                            padding: '2px 8px',
                            background: 'var(--input-bg)',
                            color: 'var(--text-secondary)',
                            borderRadius: 'var(--radius-xl)' }}>
                            {s}
                        </span>
                    ))}
                </div>
            )}

            {/* Collab badge */}
            {user.availableForCollab && (
                <span style={M.badge('success')}>
                    Available for Collab
                </span>
            )}

            {/* Follow button */}
            <button onClick={() => onFollow(user.id, user.isFollowing)}
                disabled={followLoading[user.id]}
                style={{ width: '100%', padding: '8px',
                    background: followBg,
                    color: user.isFollowing
                        ? 'var(--text-primary)' : '#fff',
                    border: user.isFollowing
                        ? '1px solid var(--border)' : 'none',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '13px', fontWeight: '600',
                    marginTop: '4px',
                    cursor: followLoading[user.id]
                        ? 'not-allowed' : 'pointer' }}>
                {followLabel}
            </button>
        </div>
    );
};

export default UserCard;