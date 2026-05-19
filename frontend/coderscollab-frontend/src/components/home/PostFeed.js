import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import PostCard from './PostCard';

const PostFeed = ({ posts, loading, onDeleted, onUpdated }) => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('All Posts');

    const filtered = activeTab === 'My Posts'
        ? posts.filter(p => p.username === user?.username)
        : posts;

    return (
        <div>
            {/* Tabs */}
            <div style={{ display: 'flex', gap: '8px',
                marginBottom: '1rem' }}>
                {['All Posts', 'My Posts'].map(tab => (
                    <button key={tab} onClick={() => setActiveTab(tab)}
                        className={activeTab === tab
                            ? 'btn-primary' : 'btn-secondary'}
                        style={{ flex: 1, padding: '8px',
                            fontSize: '12px' }}>
                        {tab}
                    </button>
                ))}
            </div>

            {/* Content */}
            {loading ? (
                <div className="empty-state">Loading posts...</div>
            ) : filtered.length === 0 ? (
                <div className="empty-state">
                    No posts yet. Be the first to post!
                </div>
            ) : (
                <div style={{ display: 'flex',
                    flexDirection: 'column', gap: '1rem' }}>
                    {filtered.map(post => (
                        <PostCard key={post.id} post={post}
                            onDeleted={onDeleted}
                            onUpdated={onUpdated} />
                    ))}
                </div>
            )}
        </div>
    );
};

export default PostFeed;