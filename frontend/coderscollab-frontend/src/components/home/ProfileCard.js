import React from 'react';
import * as M from '../../styles/mixins';

const BASE = 'http://localhost:8080';

const toUrl = (url) => url?.startsWith('http') ? url : `https://${url}`;

const ProfileCard = ({ user, profile, postCount,
    followerCount, followingCount, onOpenModal }) => {

    const avatarUrl = profile?.profilePictureUrl
        ? `${BASE}${profile.profilePictureUrl}` : null;
    const initials = user?.username?.[0]?.toUpperCase() || 'U';

    return (
        <div className="card-solid" style={{ marginBottom: '1rem' }}>

            {/* Avatar + Name */}
            <div style={{ display: 'flex', alignItems: 'center',
                gap: '12px', marginBottom: '1rem' }}>
                <div onClick={() => window.location.href = '/profile'}
                    style={{ ...M.getAvatar(56, avatarUrl),
                        border: '2px solid var(--border)' }}>
                    {!avatarUrl && initials}
                </div>
                <div>
                    <p style={{ fontSize: '15px', fontWeight: '600',
                        margin: 0, color: 'var(--text-primary)' }}>
                        @{user?.username}
                    </p>
                    <p style={{ fontSize: '13px',
                        color: 'var(--text-muted)', margin: '2px 0 0' }}>
                        {profile?.fullName || '—'}
                    </p>
                </div>
            </div>

            {/* Stats */}
            <div style={M.statBox()}>
                {[[postCount, 'Posts', null],
                  [followerCount, 'Followers', 'followers'],
                  [followingCount, 'Following', 'following']
                ].map(([count, label, type]) => (
                    <div key={label}
                        onClick={() => type && onOpenModal?.(type)}
                        style={{ cursor: type ? 'pointer' : 'default' }}>
                        <p style={{ fontSize: '16px', fontWeight: '600',
                            margin: 0,
                            color: 'var(--text-primary)' }}>
                            {count}
                        </p>
                        <p style={{ fontSize: '11px',
                            color: 'var(--text-muted)',
                            margin: '2px 0 0',
                            textDecoration: type ? 'underline' : 'none' }}>
                            {label}
                        </p>
                    </div>
                ))}
            </div>

            {/* Bio */}
            {profile?.bio && (
                <p style={{ fontSize: '13px',
                    color: 'var(--text-secondary)',
                    margin: '0 0 0.75rem', lineHeight: '1.5' }}>
                    {profile.bio}
                </p>
            )}

            {/* Stack + Location */}
            <div style={{ display: 'flex', flexDirection: 'column',
                gap: '4px', marginBottom: '0.75rem' }}>
                {profile?.masterStack && (
                    <span style={{ fontSize: '12px',
                        color: 'var(--text-muted)' }}>
                        💻 {profile.masterStack}
                    </span>
                )}
                {profile?.location && (
                    <span style={{ fontSize: '12px',
                        color: 'var(--text-muted)' }}>
                        📍 {profile.location}
                    </span>
                )}
            </div>

            {/* Social Links */}
            {(profile?.githubUrl || profile?.linkedinUrl
                || profile?.websiteUrl) && (
                <div style={{ display: 'flex', gap: '8px',
                    marginBottom: '1rem', flexWrap: 'wrap' }}>
                    {[['GitHub', profile?.githubUrl],
                      ['LinkedIn', profile?.linkedinUrl],
                      ['Website', profile?.websiteUrl]
                    ].filter(([, url]) => url).map(([label, url]) => (
                        <a key={label} href={toUrl(url)}
                            target="_blank" rel="noreferrer"
                            style={{ fontSize: '12px',
                                color: 'var(--primary)',
                                textDecoration: 'none' }}>
                            {label}
                        </a>
                    ))}
                </div>
            )}

            {/* Collab Badge */}
            <div style={{ marginBottom: '1rem' }}>
                <span style={M.badge(
                    profile?.availableForCollab ? 'success' : 'danger')}>
                    {profile?.availableForCollab
                        ? 'Available for Collab' : 'Not Available'}
                </span>
            </div>

            {/* Edit Button */}
            <button onClick={() => window.location.href = '/profile'}
                className="btn-primary btn-full">
                Edit Profile
            </button>
        </div>
    );
};

export default ProfileCard;