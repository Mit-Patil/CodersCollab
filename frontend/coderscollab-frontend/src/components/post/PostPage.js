import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getPostById } from '../../api/postApi';
import { toggleLike, getLikeStatus, addComment,
    getComments, deleteComment } from '../../api/likeCommentApi';
import { getAllConversations } from '../../api/messagingApi';
import Navbar from '../common/Navbar';
import ImageCarousel from '../common/ImageCarousel';
import CommentItem from '../common/CommentItem';
import Portal from '../../utils/Portal';
import * as M from '../../styles/mixins';
import { getMyGroups } from '../../api/groupApi';


const BASE = 'http://localhost:8080';

const timeAgo = (d) => {
    if (!d) return '';
    const s = Math.floor((new Date() - new Date(d)) / 1000);
    if (s < 60) return `${s}s ago`;
    if (s < 3600) return `${Math.floor(s/60)}m ago`;
    if (s < 86400) return `${Math.floor(s/3600)}h ago`;
    return `${Math.floor(s/86400)}d ago`;
};

const PostPage = () => {
    const { token, user } = useAuth();
    const postId = window.location.pathname.split('/').pop();
    const commentBottomRef = useRef(null);

    const [post, setPost] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [liked, setLiked] = useState(false);
    const [likesCount, setLikesCount] = useState(0);
    const [likeLoading, setLikeLoading] = useState(false);
    const [comments, setComments] = useState([]);
    const [commentText, setCommentText] = useState('');
    const [commentLoading, setCommentLoading] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);
    const [conversations, setConversations] = useState([]);
    const [shareLoading, setShareLoading] = useState({});
    const [sharedTo, setSharedTo] = useState({});
    const [copied, setCopied] = useState(false);


    //group Post Sharing
    const [groups, setGroups] = useState([]);
    const [groupSharedTo, setGroupSharedTo] = useState({});
    const [groupShareLoading, setGroupShareLoading] = useState({});

    const [shareSearch, setShareSearch] = useState('');

    useEffect(() => { fetchAll(); }, [postId]);

    useEffect(() => {
        commentBottomRef.current?.scrollIntoView(
            { behavior: 'smooth' });
    }, [comments]);

    const fetchAll = async () => {
        try {
            const [postData, commentsData] = await Promise.all([
                getPostById(token, postId),
                getComments(postId, token)
            ]);
            setPost(postData);
            setComments(commentsData);
            if (token) {
                const d = await getLikeStatus(token, postId);
                setLiked(d.liked);
                setLikesCount(d.likesCount);
            }
        } catch (e) {
            setError('Post not found or access denied.');
        } finally { setLoading(false); }
    };

    const handleLike = async () => {
        if (likeLoading) return;
        setLikeLoading(true);
        try {
            const d = await toggleLike(token, postId);
            setLiked(d.liked);
            setLikesCount(d.likesCount);
        } finally { setLikeLoading(false); }
    };

    const handleAddComment = async () => {
        if (!commentText.trim() || commentLoading) return;
        setCommentLoading(true);
        try {
            const c = await addComment(token, postId, commentText, null);
            setComments(p => [...p, c]);
            setCommentText('');
        } finally { setCommentLoading(false); }
    };

    const handleOpenShare = async () => {
        setShowShareModal(true);
        setShareSearch('');  // ← reset search
        const [convData, groupData] = await Promise.all([
            getAllConversations(token).catch(() => []),
            getMyGroups(token).catch(() => [])
        ]);
        setConversations(convData);
        setGroups(groupData);
    };

    const handleShareTo = async (convId) => {
        setShareLoading(p => ({ ...p, [convId]: true }));
        try {
            const r = await fetch(
                `${BASE}/api/messages/${convId}/share/${postId}`,
                { method: 'POST', headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json' }});
            if (r.ok) setSharedTo(p => ({ ...p, [convId]: true }));
        } finally {
            setShareLoading(p => ({ ...p, [convId]: false }));
        }
    };

    const handleShareToGroup = async (groupId) => {
        setGroupShareLoading(p => ({ ...p, [groupId]: true }));
        try {
            const r = await fetch(
                `${BASE}/api/groups/${groupId}/share/${post.id}`,
                { method: 'POST', headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json' }});
            if (r.ok) {
                const savedMsg = await r.json();  // ← get saved message back
                setGroupSharedTo(p => ({ ...p, [groupId]: true }));

                // ← Notify via REST broadcast endpoint (no WS needed here)
                await fetch(
                    `${BASE}/api/groups/${groupId}/broadcast`,
                    { method: 'POST',
                        headers: {
                            Authorization: `Bearer ${token}`,
                            'Content-Type': 'application/json' },
                        body: JSON.stringify(savedMsg) });
            } else {
                const err = await r.json();
                alert(err.message || 'Failed to share');
            }
        } finally {
            setGroupShareLoading(p => ({ ...p, [groupId]: false }));
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(
            `${window.location.origin}/post/${postId}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (loading) return (
        <div className="page">
            <Navbar active="" />
            <div style={{ display: 'flex', justifyContent: 'center',
                alignItems: 'center', height: '80vh' }}>
                <p style={{ color: 'var(--text-muted)' }}>
                    Loading post...
                </p>
            </div>
        </div>
    );

    if (error || !post) return (
        <div className="page">
            <Navbar active="" />
            <div style={{ display: 'flex', justifyContent: 'center',
                alignItems: 'center', height: '80vh' }}>
                <p style={{ color: 'var(--danger)' }}>
                    {error || 'Post not found'}
                </p>
            </div>
        </div>
    );

    const postAvatar = post.profilePictureUrl
        ? `${BASE}${post.profilePictureUrl}` : null;

    return (
        <div className="page">
            <Navbar active="" />

            <div style={{ maxWidth: '1100px', margin: '0 auto',
                padding: '1rem 1rem 0' }}>
                <button onClick={() => window.history.back()}
                    className="btn-icon"
                    style={{ color: 'var(--text-primary)',
                        fontSize: '14px', marginBottom: '1rem' }}>
                    ← Back
                </button>
            </div>

            {/* Two column layout */}
            <div style={{ maxWidth: '1100px', margin: '0 auto',
                padding: '0 1rem 2rem',
                display: 'grid',
                gridTemplateColumns: '1fr 380px',
                gap: '1rem', alignItems: 'start' }}>

                {/* LEFT — Post Content */}
                <div className="card-solid" style={{ padding: 0,
                    overflow: 'hidden' }}>

                    {/* Header */}
                    <div style={{ padding: '1.25rem',
                        borderBottom: '1px solid var(--border-light)',
                        display: 'flex', alignItems: 'center',
                        gap: '10px' }}>
                        <div onClick={() => window.location.href =
                            `/user/${post.username}`}
                            style={M.getAvatar(44, postAvatar)}>
                            {!postAvatar &&
                                post.username?.[0]?.toUpperCase()}
                        </div>
                        <div style={{ flex: 1 }}>
                            <p onClick={() => window.location.href =
                                `/user/${post.username}`}
                                style={{ fontSize: '15px',
                                    fontWeight: '600', margin: 0,
                                    color: 'var(--text-primary)',
                                    cursor: 'pointer' }}>
                                @{post.username}
                            </p>
                            <p style={{ fontSize: '12px',
                                color: 'var(--text-faint)', margin: 0 }}>
                                {post.fullName &&
                                    <span>{post.fullName} · </span>}
                                {timeAgo(post.createdAt)}
                            </p>
                        </div>
                        <div style={{ display: 'flex', gap: '6px' }}>
                            <span style={M.postTypeBadge(post.postType)}>
                                {post.postType}
                            </span>
                            {post.language && (
                                <span style={{ fontSize: '11px',
                                    padding: '3px 8px',
                                    borderRadius: 'var(--radius-xl)',
                                    background: 'var(--input-bg)',
                                    color: 'var(--text-secondary)' }}>
                                    {post.language}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Content */}
                    <div style={{ padding: '1.25rem' }}>
                        {post.postType === 'CODE' ? (
                            <pre className="code-block"
                                style={{ whiteSpace: 'pre-wrap' }}>
                                {post.content}
                            </pre>
                        ) : (
                            <p style={{ fontSize: '15px',
                                color: 'var(--text-primary)',
                                margin: 0, lineHeight: '1.7' }}>
                                {post.content}
                            </p>
                        )}
                        {post.imageUrls?.length > 0 && (
                            <div style={{ marginTop: '1rem',
                                borderRadius: 'var(--radius-md)',
                                overflow: 'hidden' }}>
                                <ImageCarousel
                                    imageUrls={post.imageUrls}
                                    height="450px" />
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div style={M.postFooter()}>
                        <button onClick={handleLike}
                            disabled={likeLoading}
                            className="btn-icon"
                            style={{ color: liked
                                ? 'var(--danger)' : 'var(--text-muted)',
                                fontWeight: liked ? '600' : '400',
                                fontSize: '14px' }}>
                            <span style={{ fontSize: '18px' }}>
                                {liked ? '❤️' : '🤍'}
                            </span>
                            {likesCount} {likesCount === 1
                                ? 'like' : 'likes'}
                        </button>
                        <span style={{ fontSize: '14px',
                            color: 'var(--text-muted)' }}>
                            💬 {comments.length}{' '}
                            {comments.length === 1
                                ? 'comment' : 'comments'}
                        </span>
                        <button onClick={handleOpenShare}
                            className="btn-icon"
                            style={{ marginLeft: 'auto',
                                fontSize: '14px' }}>
                            <span style={{ fontSize: '18px' }}>↗️</span>
                            Share
                        </button>
                        {post.visibility === 'FOLLOWERS' && (
                            <span style={{ fontSize: '11px',
                                color: 'var(--text-faint)' }}>
                                Followers only
                            </span>
                        )}
                    </div>
                </div>

                {/* RIGHT — Comments */}
                <div className="card-solid"
                    style={{ padding: 0, overflow: 'hidden',
                        display: 'flex', flexDirection: 'column',
                        height: 'calc(100vh - 130px)',
                        position: 'sticky', top: '68px' }}>

                    <div style={{ padding: '1rem 1.25rem',
                        borderBottom: '1px solid var(--border-light)' }}>
                        <h3 style={{ margin: 0, fontSize: '16px',
                            fontWeight: '600',
                            color: 'var(--text-primary)' }}>
                            Comments ({comments.length})
                        </h3>
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto',
                        padding: '1rem' }}>
                        {comments.length === 0 ? (
                            <div style={{ display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center', height: '100%' }}>
                                <p style={{ color: 'var(--text-muted)',
                                    fontSize: '14px',
                                    textAlign: 'center' }}>
                                    No comments yet.<br/>Be the first!
                                </p>
                            </div>
                        ) : (
                            <div style={{ display: 'flex',
                                flexDirection: 'column', gap: '12px' }}>
                                {comments.map(c => (
                                    <CommentItem key={c.id}
                                        comment={c} postId={postId}
                                        onDelete={id => setComments(
                                            p => p.filter(x =>
                                                x.id !== id))} />
                                ))}
                                <div ref={commentBottomRef} />
                            </div>
                        )}
                    </div>

                    <div style={{ padding: '12px',
                        borderTop: '1px solid var(--border-light)',
                        display: 'flex', gap: '8px' }}>
                        <input value={commentText}
                            onChange={e => setCommentText(e.target.value)}
                            onKeyDown={e => e.key === 'Enter'
                                && handleAddComment()}
                            placeholder="Write a comment..."
                            className="input"
                            style={{ flex: 1, fontSize: '13px',
                                borderRadius: 'var(--radius-xl)' }} />
                        <button onClick={handleAddComment}
                            disabled={commentLoading}
                            className="btn-primary"
                            style={{ padding: '8px 16px',
                                borderRadius: 'var(--radius-xl)' }}>
                            {commentLoading ? '...' : 'Post'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Share Modal — via Portal */}
            {showShareModal && (
                <Portal>
                <div className="modal-overlay"
                    onClick={() => setShowShareModal(false)}>
                    <div className="modal-box"
                        onClick={e => e.stopPropagation()}
                        style={{ maxHeight: '85vh', display: 'flex',
                            flexDirection: 'column' }}>

                        {/* Header */}
                        <div style={{ display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '1rem', flexShrink: 0 }}>
                            <h3 style={{ margin: 0, fontSize: '16px',
                                fontWeight: '600',
                                color: 'var(--text-primary)' }}>
                                Share Post
                            </h3>
                            <button className="btn-icon"
                                style={{ fontSize: '20px' }}
                                onClick={() => setShowShareModal(false)}>
                                ×
                            </button>
                        </div>

                        {/* Copy link */}
                        <div style={{ ...M.copyRow(), flexShrink: 0 }}>
                            <span style={{ fontSize: '12px',
                                color: 'var(--text-secondary)',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap', flex: 1 }}>
                                {`${window.location.origin}/post/${postId}`}
                            </span>
                            <button onClick={handleCopy}
                                className="btn-primary"
                                style={{ padding: '5px 12px',
                                    fontSize: '12px', marginLeft: '8px',
                                    flexShrink: 0,
                                    background: copied
                                        ? 'var(--success)' : undefined,
                                    transition: 'background 0.3s' }}>
                                {copied ? 'Copied! ✓' : 'Copy'}
                            </button>
                        </div>

                        {/* Search */}
                        <input
                            value={shareSearch}
                            onChange={e => setShareSearch(e.target.value)}
                            placeholder="Search people or groups..."
                            className="input"
                            style={{ fontSize: '13px',
                                marginBottom: '12px', flexShrink: 0 }} />

                        {/* Scrollable content */}
                        <div style={{ overflowY: 'auto', flex: 1 }}>

                            {/* Groups Section */}
                            {(() => {
                                const filtered = groups.filter(g =>
                                    g.name?.toLowerCase().includes(
                                        shareSearch.toLowerCase()));
                                if (filtered.length === 0) return null;
                                return (
                                    <>
                                        <p style={{ fontSize: '13px',
                                            fontWeight: '600',
                                            color: 'var(--text-secondary)',
                                            margin: '0 0 8px' }}>
                                            Groups
                                        </p>
                                        {filtered.map(g => {
                                            const sent = groupSharedTo[g.id];
                                            return (
                                                <div key={g.id}
                                                    style={{ display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '10px',
                                                        padding: '10px',
                                                        borderRadius: 'var(--radius-md)',
                                                        marginBottom: '4px' }}>
                                                    <div style={{ width: '38px',
                                                        height: '38px',
                                                        borderRadius: '10px',
                                                        background: 'var(--primary-bg)',
                                                        border: '1px solid var(--primary-border)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        fontSize: '18px',
                                                        overflow: 'hidden',
                                                        flexShrink: 0 }}>
                                                        {g.avatarUrl
                                                            ? <img
                                                                src={`${BASE}${g.avatarUrl}`}
                                                                alt="g"
                                                                style={{ width: '100%',
                                                                    height: '100%',
                                                                    objectFit: 'cover' }} />
                                                            : '👥'}
                                                    </div>
                                                    <div style={{ flex: 1,
                                                        minWidth: 0 }}>
                                                        <p style={{ fontSize: '14px',
                                                            fontWeight: '600',
                                                            margin: 0,
                                                            color: 'var(--text-primary)',
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                            whiteSpace: 'nowrap' }}>
                                                            {g.name}
                                                        </p>
                                                        <p style={{ fontSize: '11px',
                                                            color: 'var(--text-muted)',
                                                            margin: 0 }}>
                                                            {g.memberCount} members
                                                        </p>
                                                    </div>
                                                    <div style={{ display: 'flex', flexDirection: 'column',
                                                        alignItems: 'flex-end', gap: '3px' }}>
                                                        <button
                                                            onClick={() => handleShareToGroup(g.id)}
                                                            disabled={groupShareLoading[g.id] || sent
                                                                || (g.onlyAdminsCanSend && !g.isAdmin)}
                                                            className={sent ? 'btn-secondary' : 'btn-primary'}
                                                            style={{ padding: '6px 14px', fontSize: '12px',
                                                                flexShrink: 0,
                                                                background: (g.onlyAdminsCanSend && !g.isAdmin)
                                                                    ? 'var(--border)'
                                                                    : sent ? 'var(--success-bg)' : undefined,
                                                                color: (g.onlyAdminsCanSend && !g.isAdmin)
                                                                    ? 'var(--text-faint)'
                                                                    : sent ? 'var(--success)' : undefined,
                                                                cursor: (g.onlyAdminsCanSend && !g.isAdmin)
                                                                    ? 'not-allowed' : 'pointer' }}>
                                                            {groupShareLoading[g.id] ? '...'
                                                                : sent ? 'Sent ✓' : 'Send'}
                                                        </button>
                                                        {g.onlyAdminsCanSend && !g.isAdmin && (
                                                            <span style={{ fontSize: '10px',
                                                                color: 'var(--text-faint)',
                                                                whiteSpace: 'nowrap' }}>
                                                                Admins only
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        <div style={{ height: '1px',
                                            background: 'var(--border-light)',
                                            margin: '4px 0 12px' }} />
                                    </>
                                );
                            })()}

                            {/* DMs Section */}
                            {(() => {
                                const filtered = conversations.filter(c =>
                                    c.otherUsername?.toLowerCase().includes(
                                        shareSearch.toLowerCase()) ||
                                    c.otherFullName?.toLowerCase().includes(
                                        shareSearch.toLowerCase()));

                                const noGroupResults = groups.filter(g =>
                                    g.name?.toLowerCase().includes(
                                        shareSearch.toLowerCase()))
                                    .length === 0;

                                if (filtered.length === 0
                                        && shareSearch.trim()
                                        && noGroupResults) {
                                    return (
                                        <p style={{ fontSize: '13px',
                                            color: 'var(--text-muted)',
                                            textAlign: 'center',
                                            padding: '1rem' }}>
                                            No results for "{shareSearch}"
                                        </p>
                                    );
                                }

                                if (filtered.length === 0) return null;

                                return (
                                    <>
                                        <p style={{ fontSize: '13px',
                                            fontWeight: '600',
                                            color: 'var(--text-secondary)',
                                            margin: '0 0 8px' }}>
                                            Direct Messages
                                        </p>
                                        {filtered.map(conv => {
                                            const sent = sharedTo[conv.id];
                                            const url = conv.otherProfilePicture
                                                ? `${BASE}${conv.otherProfilePicture}`
                                                : null;
                                            return (
                                                <div key={conv.id}
                                                    style={{ display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '10px',
                                                        padding: '10px',
                                                        borderRadius: 'var(--radius-md)',
                                                        marginBottom: '4px' }}>
                                                    <div style={M.getAvatar(38, url)}>
                                                        {!url && conv.otherUsername
                                                            ?.[0]?.toUpperCase()}
                                                    </div>
                                                    <div style={{ flex: 1,
                                                        minWidth: 0 }}>
                                                        <p style={{ fontSize: '14px',
                                                            fontWeight: '600',
                                                            margin: 0,
                                                            color: 'var(--text-primary)',
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                            whiteSpace: 'nowrap' }}>
                                                            {conv.otherFullName ||
                                                                `@${conv.otherUsername}`}
                                                        </p>
                                                        <p style={{ fontSize: '11px',
                                                            color: 'var(--text-muted)',
                                                            margin: 0 }}>
                                                            @{conv.otherUsername}
                                                        </p>
                                                    </div>
                                                    <button
                                                        onClick={() =>
                                                            handleShareTo(conv.id)}
                                                        disabled={
                                                            shareLoading[conv.id]
                                                            || sent}
                                                        className={sent
                                                            ? 'btn-secondary'
                                                            : 'btn-primary'}
                                                        style={{ padding: '6px 14px',
                                                            fontSize: '12px',
                                                            flexShrink: 0,
                                                            background: sent
                                                                ? 'var(--success-bg)'
                                                                : undefined,
                                                            color: sent
                                                                ? 'var(--success)'
                                                                : undefined }}>
                                                        {shareLoading[conv.id]
                                                            ? '...'
                                                            : sent ? 'Sent ✓' : 'Send'}
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </>
                                );
                            })()}
                        </div>
                    </div>
                </div>
                </Portal>
            )}
        </div>
    );
};

export default PostPage;