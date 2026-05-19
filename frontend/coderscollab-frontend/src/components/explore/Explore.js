import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { exploreUsers } from '../../api/exploreApi';
import { followUser, unfollowUser,
    getFollowerCount, getFollowStatus } from '../../api/followerApi';
import Navbar from '../common/Navbar';
import SearchBar from './SearchBar';
import UserCard from './UserCard';

const Explore = () => {
    const { token } = useAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [stack, setStack] = useState('');
    const [skill, setSkill] = useState('');
    const [collabOnly, setCollabOnly] = useState(false);
    const [followLoading, setFollowLoading] = useState({});
    const [counts, setCounts] = useState({});

    useEffect(() => { fetchUsers({}); }, []);

    const fetchUsers = async (filters) => {
        setLoading(true);
        try {
            const data = await exploreUsers(token, filters);
            const countMap = {};
            const enriched = await Promise.all(data.map(async (u) => {
                try {
                    const [c, status] = await Promise.all([
                        getFollowerCount(u.id),
                        getFollowStatus(token, u.id)
                    ]);
                    countMap[u.id] = c;
                    return { ...u,
                        isFollowing: status?.following ?? false,
                        isPending: status?.pending ?? false };
                } catch {
                    countMap[u.id] = { followers: 0, following: 0 };
                    return { ...u, isFollowing: false, isPending: false };
                }
            }));
            setUsers(enriched);
            setCounts(countMap);
        } catch (e) {
            console.error('Explore error:', e);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = () => fetchUsers({
        search, stack, skill,
        availableForCollab: collabOnly ? true : null
    });

    const handleReset = () => {
        setSearch(''); setStack('');
        setSkill(''); setCollabOnly(false);
        fetchUsers({});
    };

    const handleFollow = async (userId, isFollowing) => {
        setFollowLoading(p => ({ ...p, [userId]: true }));
        try {
            if (isFollowing) {
                await unfollowUser(token, userId);
                setUsers(p => p.map(u => u.id === userId
                    ? { ...u, isFollowing: false, isPending: false } : u));
            } else {
                const data = await followUser(token, userId);
                setUsers(p => p.map(u => u.id === userId
                    ? { ...u,
                        isFollowing: !data?.pending,
                        isPending: data?.pending ?? false } : u));
            }
            const c = await getFollowerCount(userId);
            setCounts(p => ({ ...p, [userId]: c }));
        } catch (e) {
            console.error('Follow error:', e);
        } finally {
            setFollowLoading(p => ({ ...p, [userId]: false }));
        }
    };

    return (
        <div className="page">
            <Navbar active="Explore" />

            <div style={{ maxWidth: '1000px', margin: '0 auto',
                padding: '1.5rem 1rem' }}>

                <SearchBar
                    search={search} setSearch={setSearch}
                    stack={stack} setStack={setStack}
                    skill={skill} setSkill={setSkill}
                    collabOnly={collabOnly} setCollabOnly={setCollabOnly}
                    onSearch={handleSearch} onReset={handleReset} />

                {!loading && (
                    <p style={{ fontSize: '13px',
                        color: 'var(--text-muted)',
                        marginBottom: '1rem' }}>
                        {users.length} developer
                        {users.length !== 1 ? 's' : ''} found
                    </p>
                )}

                {loading ? (
                    <div className="empty-state">
                        Loading developers...
                    </div>
                ) : users.length === 0 ? (
                    <div className="empty-state">
                        No developers found. Try different filters!
                    </div>
                ) : (
                    <div style={{ display: 'grid',
                        gridTemplateColumns:
                            'repeat(auto-fill, minmax(220px, 1fr))',
                        gap: '1rem' }}>
                        {users.map(u => (
                            <UserCard key={u.id} user={u}
                                counts={counts}
                                followLoading={followLoading}
                                onFollow={handleFollow} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Explore;