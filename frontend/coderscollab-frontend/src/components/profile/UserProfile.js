import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getUserProfile, getUserPosts } from '../../api/userApi';
import { followUser, unfollowUser, getFollowerCount,
    getFollowStatus } from '../../api/followerApi';
import Navbar from '../common/Navbar';
import PostCard from '../home/PostCard';
import FollowListModal from '../common/FollowListModal';
import * as M from '../../styles/mixins';

const BASE = 'http://localhost:8080';
const toUrl = (url) => url?.startsWith('http') ? url : `https://${url}`;

const FollowBtn = ({ isFollowing, isPending, loading, onClick }) => {
    const label = loading ? '...'
        : isFollowing     ? 'Unfollow'
        : isPending       ? 'Requested'
        : 'Follow';
    return (
        <button onClick={onClick} disabled={loading}
            style={{
                padding: '7px 20px',
                background: isFollowing ? 'transparent'
                    : isPending         ? 'var(--text-muted)'
                    : 'var(--btn-gradient)',
                color: isFollowing ? 'var(--text-primary)' : '#fff',
                border: isFollowing ? '1px solid var(--border)' : 'none',
                borderRadius: 'var(--radius-md)',
                fontSize: '13px', fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s'
            }}>
            {label}
        </button>
    );
};

const UserProfile = () => {
    const { token, user } = useAuth();
    const username     = window.location.pathname.split('/').pop();
    const isOwnProfile = user?.username === username;

    const [profile, setProfile]             = useState(null);
    const [posts, setPosts]                 = useState([]);
    // Single source of truth for counts — UI reads from here, modal updates here
    const [counts, setCounts]               = useState({ followers: 0, following: 0 });
    const [postCount, setPostCount]         = useState(0);
    const [isFollowing, setIsFollowing]     = useState(false);
    const [isPending, setIsPending]         = useState(false);
    const [followLoading, setFollowLoading] = useState(false);
    const [loading, setLoading]             = useState(true);
    const [modal, setModal]                 = useState(null);

    useEffect(() => { fetchAll(); }, [username]);

    const fetchAll = async () => {
        setLoading(true);
        try {
            const [profileData, postsData] = await Promise.all([
                getUserProfile(token, username),
                getUserPosts(token, username)
            ]);
            setProfile(profileData);
            setPosts(postsData);
            setPostCount(postsData.length);

            const countData = await getFollowerCount(profileData.id);
            // Store in the ONE state object that the UI reads
            setCounts({ followers: countData.followers, following: countData.following });

            if (token && !isOwnProfile) {
                const s = await getFollowStatus(token, profileData.id);
                setIsFollowing(s.following);
                setIsPending(s.pending);
            }
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const handleFollow = async () => {
        if (followLoading) return;
        setFollowLoading(true);
        try {
            if (isFollowing) {
                await unfollowUser(token, profile.id);
                setIsFollowing(false);
                setIsPending(false);
                // Viewer unfollowed this profile → this profile's followerCount -1
                setCounts(p => ({ ...p,
                    followers: Math.max(0, p.followers - 1) }));
            } else {
                const data = await followUser(token, profile.id);
                if (data.pending) {
                    setIsPending(true);
                    setIsFollowing(false);
                } else {
                    setIsFollowing(true);
                    setIsPending(false);
                    // Viewer followed this profile → this profile's followerCount +1
                    setCounts(p => ({ ...p, followers: p.followers + 1 }));
                }
            }
        } catch (e) { console.error(e); }
        finally { setFollowLoading(false); }
    };

    const openModal = (type) => {
        if (!profile?.id) return;
        setModal(type);
    };

    /**
     * Called by FollowListModal with +1 or -1.
     *
     * What this means depends on whose profile we're viewing:
     *
     * OWN profile: you follow/unfollow someone from your list
     *   → your FOLLOWING count changes (not followers)
     *
     * OTHER profile: you follow/unfollow someone from THEIR list
     *   → your own following count changes, but we can't show that here.
     *   The profile we're viewing doesn't change, so we do nothing.
     *   (Their follower count only changes if someone follows/unfollows THEM,
     *    not when the viewer follows random people in their followers list.)
     */
    const handleCountChange = (delta) => {
        if (isOwnProfile) {
            // Only update following count — you can't change your own follower
            // count by following/unfollowing others
            setCounts(p => ({
                ...p,
                following: Math.max(0, p.following + delta)
            }));
        }
        // For other profiles: their counts don't change when you follow
        // someone from their list, so no update needed
    };

    const avatarUrl = profile?.profilePictureUrl
        ? `${BASE}${profile.profilePictureUrl}` : null;
    const initials  = profile?.username?.[0]?.toUpperCase() || 'U';
    const isPrivateLocked = (profile?.privateAccount ?? profile?.isPrivate)
        && !isOwnProfile && !isFollowing;

    if (loading) return (
        <div className="page">
            <Navbar active="" />
            <div style={{ display: 'flex', justifyContent: 'center',
                alignItems: 'center', height: '80vh' }}>
                <p style={{ color: 'var(--text-muted)' }}>Loading profile...</p>
            </div>
        </div>
    );

    if (!profile) return (
        <div className="page">
            <Navbar active="" />
            <div style={{ display: 'flex', justifyContent: 'center',
                alignItems: 'center', height: '80vh' }}>
                <p style={{ color: 'var(--text-muted)' }}>User not found.</p>
            </div>
        </div>
    );

    return (
        <div className="page">
            <Navbar active="" />

            {modal && profile?.id && (
                <FollowListModal
                    type={modal}
                    userId={profile.id}
                    onClose={() => setModal(null)}
                    onCountChange={handleCountChange} />
            )}

            <div style={{ maxWidth: '700px', margin: '2rem auto',
                padding: '0 1rem' }}>

                {isPrivateLocked ? (
                    <div className="card-solid"
                        style={{ textAlign: 'center', padding: '2.5rem' }}>
                        <div style={{ ...M.getAvatar(90, avatarUrl),
                            margin: '0 auto 1rem', fontSize: '28px',
                            border: '3px solid var(--border)' }}>
                            {!avatarUrl && initials}
                        </div>
                        <h2 style={{ color: 'var(--text-primary)',
                            margin: '0 0 4px', fontSize: '20px' }}>
                            @{profile.username}
                        </h2>
                        {profile.fullName && (
                            <p style={{ color: 'var(--text-secondary)',
                                fontSize: '14px', margin: '0 0 12px' }}>
                                {profile.fullName}
                            </p>
                        )}
                        <div style={{ display: 'flex', gap: '20px',
                            justifyContent: 'center', margin: '1rem 0' }}>
                            {[['Followers', counts.followers],
                              ['Following', counts.following]
                            ].map(([label, val]) => (
                                <div key={label}>
                                    <span style={{ fontWeight: '600',
                                        color: 'var(--text-primary)',
                                        fontSize: '15px' }}>{val}</span>
                                    <span style={{ color: 'var(--text-muted)',
                                        fontSize: '13px',
                                        marginLeft: '4px' }}>{label}</span>
                                </div>
                            ))}
                        </div>
                        <div style={{ padding: '1rem',
                            background: 'var(--hover-bg)',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--border)',
                            marginBottom: '1.5rem' }}>
                            <p style={{ fontSize: '14px',
                                color: 'var(--text-primary)',
                                margin: '0 0 4px', fontWeight: '600' }}>
                                This account is private
                            </p>
                            <p style={{ fontSize: '13px',
                                color: 'var(--text-muted)', margin: 0 }}>
                                Follow to see their posts and profile
                            </p>
                        </div>
                        <FollowBtn isFollowing={isFollowing}
                            isPending={isPending}
                            loading={followLoading}
                            onClick={handleFollow} />
                    </div>
                ) : (
                    <div>
                        <div className="card-solid"
                            style={{ padding: '1.5rem', marginBottom: '1rem' }}>

                            <div style={{ display: 'flex', gap: '1.5rem',
                                alignItems: 'flex-start',
                                marginBottom: '1.25rem' }}>

                                <div style={{ ...M.getAvatar(90, avatarUrl),
                                    fontSize: '28px', flexShrink: 0,
                                    border: '3px solid var(--border)' }}>
                                    {!avatarUrl && initials}
                                </div>

                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex',
                                        alignItems: 'center', gap: '12px',
                                        marginBottom: '8px', flexWrap: 'wrap' }}>
                                        <h2 style={{ margin: 0,
                                            fontSize: '20px', fontWeight: '600',
                                            color: 'var(--text-primary)' }}>
                                            @{profile.username}
                                        </h2>
                                        {isOwnProfile ? (
                                            <button onClick={() =>
                                                window.location.href = '/profile'}
                                                className="btn-secondary"
                                                style={{ padding: '7px 16px',
                                                    fontSize: '13px' }}>
                                                Edit Profile
                                            </button>
                                        ) : (
                                            <div style={{ display: 'flex',
                                                gap: '8px' }}>
                                                <FollowBtn
                                                    isFollowing={isFollowing}
                                                    isPending={isPending}
                                                    loading={followLoading}
                                                    onClick={handleFollow} />
                                                <button onClick={async () => {
                                                    const { getOrCreateConversation }
                                                        = await import(
                                                            '../../api/messagingApi');
                                                    const conv =
                                                        await getOrCreateConversation(
                                                            token, profile.id);
                                                    window.location.href =
                                                        `/messages/${conv.id}`;
                                                }} className="btn-secondary"
                                                    style={{ padding: '7px 16px',
                                                        fontSize: '13px' }}>
                                                    Message
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {profile.fullName && (
                                        <p style={{ margin: '0 0 8px',
                                            fontSize: '15px',
                                            color: 'var(--text-secondary)' }}>
                                            {profile.fullName}
                                        </p>
                                    )}

                                    {/* Stats — reads from counts, updated by both
                                        handleFollow and handleCountChange */}
                                    <div style={{ display: 'flex', gap: '20px' }}>
                                        {[
                                            [postCount,         'Posts',     null],
                                            [counts.followers,  'Followers', 'followers'],
                                            [counts.following,  'Following', 'following'],
                                        ].map(([count, label, type]) => (
                                            <div key={label}
                                                onClick={() =>
                                                    type && openModal(type)}
                                                style={{ cursor: type
                                                    ? 'pointer' : 'default' }}>
                                                <span style={{ fontWeight: '600',
                                                    color: 'var(--text-primary)',
                                                    fontSize: '15px' }}>
                                                    {count}
                                                </span>
                                                <span style={{
                                                    color: 'var(--text-muted)',
                                                    fontSize: '13px',
                                                    marginLeft: '4px',
                                                    textDecoration: type
                                                        ? 'underline' : 'none' }}>
                                                    {label}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {profile.bio && (
                                <p style={{ fontSize: '14px',
                                    color: 'var(--text-secondary)',
                                    margin: '0 0 12px', lineHeight: '1.6' }}>
                                    {profile.bio}
                                </p>
                            )}

                            <div style={{ display: 'flex', flexWrap: 'wrap',
                                gap: '8px', marginBottom: '10px' }}>
                                {profile.masterStack && (
                                    <span style={M.badge('primary')}>
                                        💻 {profile.masterStack}
                                    </span>
                                )}
                                {profile.location && (
                                    <span style={{ fontSize: '12px',
                                        color: 'var(--text-muted)' }}>
                                        📍 {profile.location}
                                    </span>
                                )}
                                {profile.availableForCollab && (
                                    <span style={M.badge('success')}>
                                        Available for Collab
                                    </span>
                                )}
                                {profile.isPrivate && (
                                    <span style={M.badge('danger')}>
                                        Private
                                    </span>
                                )}
                            </div>

                            {profile.skills?.length > 0 && (
                                <div style={{ display: 'flex',
                                    flexWrap: 'wrap', gap: '6px',
                                    marginBottom: '10px' }}>
                                    {profile.skills.map((s, i) => (
                                        <span key={i} style={{ fontSize: '11px',
                                            padding: '2px 8px',
                                            background: 'var(--input-bg)',
                                            color: 'var(--text-secondary)',
                                            borderRadius: 'var(--radius-xl)' }}>
                                            {s}
                                        </span>
                                    ))}
                                </div>
                            )}

                            {(profile.githubUrl || profile.linkedinUrl
                                || profile.websiteUrl) && (
                                <div style={{ display: 'flex',
                                    gap: '12px', flexWrap: 'wrap' }}>
                                    {[['GitHub', profile.githubUrl],
                                      ['LinkedIn', profile.linkedinUrl],
                                      ['Website', profile.websiteUrl]]
                                        .filter(([, u]) => u)
                                        .map(([label, url]) => (
                                            <a key={label} href={toUrl(url)}
                                                target="_blank" rel="noreferrer"
                                                style={{ fontSize: '13px',
                                                    color: 'var(--primary)',
                                                    textDecoration: 'none' }}>
                                                {label}
                                            </a>
                                        ))}
                                </div>
                            )}
                        </div>

                        {posts.length === 0 ? (
                            <div className="empty-state">No posts yet.</div>
                        ) : (
                            <div style={{ display: 'flex',
                                flexDirection: 'column', gap: '1rem' }}>
                                {posts.map(post => (
                                    <PostCard key={post.id} post={post}
                                        onDeleted={id => setPosts(p =>
                                            p.filter(x => x.id !== id))}
                                        onUpdated={u => setPosts(p =>
                                            p.map(x =>
                                                x.id === u.id ? u : x))} />
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default UserProfile;