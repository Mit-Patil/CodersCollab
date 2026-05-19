import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getProfile } from '../../api/profileApi';
import { getAllPosts, getUserPostCount } from '../../api/postApi';
import { getFollowerCount } from '../../api/followerApi';
import Navbar from '../common/Navbar';
import ProfileCard from './ProfileCard';
import CreatePostBtn from './CreatePostBtn';
import PostFeed from './PostFeed';
import FollowListModal from '../common/FollowListModal';

const NAV_ITEMS = [
    { label: 'Feed',         path: '/home' },
    { label: 'Explore Devs', path: '/explore' },
    { label: 'Messages',     path: '/messages' },
];

const Home = () => {
    const { user, token, logout } = useAuth();
    const [profile, setProfile]               = useState(null);
    const [posts, setPosts]                   = useState([]);
    const [postCount, setPostCount]           = useState(0);
    const [followerCount, setFollowerCount]   = useState(0);
    const [followingCount, setFollowingCount] = useState(0);
    const [loading, setLoading]               = useState(true);
    const [modal, setModal]                   = useState(null);

    const avatarUrl = profile?.profilePictureUrl
        ? `http://localhost:8080${profile.profilePictureUrl}` : null;
    const initials = user?.username?.[0]?.toUpperCase() || 'U';

    useEffect(() => {
        if (!token) return;
        const loadAll = async () => {
            try {
                const [profileData, postsData, count] = await Promise.all([
                    getProfile(token),
                    getAllPosts(token),
                    getUserPostCount(token)
                ]);
                setProfile(profileData);
                setPosts(postsData);
                setPostCount(count);
                const c = await getFollowerCount(profileData.id);
                setFollowerCount(c.followers);
                setFollowingCount(c.following);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        loadAll();
        const interval = setInterval(() => {
            getAllPosts(token).then(setPosts).catch(() => {});
        }, 30000);
        return () => clearInterval(interval);
    }, [token]);

    const openModal = (type) => {
        if (!profile?.id) return;
        setModal(type);
    };

    /**
     * Called by FollowListModal with +1 (followed) or -1 (unfollowed).
     *
     * When viewing your OWN followers/following list:
     *   - You follow someone from your followers list → your followingCount +1
     *   - You unfollow someone from your following list → your followingCount -1
     *
     * The modal always shows the logged-in user's own list here (profile.id
     * is the logged-in user's profile on the Home page), so delta always
     * applies to followingCount — you can't change your own followerCount
     * by following/unfollowing others.
     */
    const handleCountChange = (delta) => {
        setFollowingCount(prev => Math.max(0, prev + delta));
    };

    return (
        <div className="page">
            <Navbar active="Home" />

            {modal && profile?.id && (
                <FollowListModal
                    type={modal}
                    userId={profile.id}
                    onClose={() => setModal(null)}
                    onCountChange={handleCountChange} />
            )}

            <div className="feed-layout">

                {/* Sidebar */}
                <div style={{ position: 'sticky', top: '68px' }}>
                    <ProfileCard
                        user={user}
                        profile={profile}
                        postCount={postCount}
                        followerCount={followerCount}
                        followingCount={followingCount}
                        onOpenModal={openModal} />

                    <div className="card-solid" style={{ padding: '1rem' }}>
                        {NAV_ITEMS.map(item => (
                            <div key={item.label}
                                onClick={() =>
                                    window.location.href = item.path}
                                style={{ padding: '8px 10px',
                                    borderRadius: 'var(--radius-md)',
                                    fontSize: '13px',
                                    color: 'var(--text-secondary)',
                                    cursor: 'pointer',
                                    marginBottom: '2px' }}
                                onMouseOver={e =>
                                    e.currentTarget.style.background =
                                    'var(--hover-bg)'}
                                onMouseOut={e =>
                                    e.currentTarget.style.background =
                                    'transparent'}>
                                {item.label}
                            </div>
                        ))}
                        <div onClick={logout}
                            style={{ padding: '8px 10px',
                                borderRadius: 'var(--radius-md)',
                                fontSize: '13px',
                                color: 'var(--danger)',
                                cursor: 'pointer' }}
                            onMouseOver={e =>
                                e.currentTarget.style.background =
                                'var(--hover-bg)'}
                            onMouseOut={e =>
                                e.currentTarget.style.background =
                                'transparent'}>
                            Logout
                        </div>
                    </div>
                </div>

                {/* Feed */}
                <div>
                    <CreatePostBtn avatarUrl={avatarUrl} initials={initials} />
                    <PostFeed
                        posts={posts}
                        loading={loading}
                        onDeleted={id => setPosts(p =>
                            p.filter(x => x.id !== id))}
                        onUpdated={updated => setPosts(p =>
                            p.map(x => x.id === updated.id ? updated : x))} />
                </div>
            </div>
        </div>
    );
};

export default Home;