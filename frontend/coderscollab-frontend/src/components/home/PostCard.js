import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { toggleLike, getLikeStatus, addComment,
    getComments, deleteComment } from '../../api/likeCommentApi';
import { getAllConversations } from '../../api/messagingApi';
import ImageCarousel from '../common/ImageCarousel';
import CommentItem from '../common/CommentItem';
import * as M from '../../styles/mixins';
import Portal from '../../utils/Portal'; 
import { getMyGroups } from '../../api/groupApi';


// ── Helpers ────────────────────────────────────────────
const timeAgo = (d) => {
    if (!d) return '';
    const s = Math.floor((new Date() - new Date(d)) / 1000);
    if (s < 60) return `${s}s ago`;
    if (s < 3600) return `${Math.floor(s/60)}m ago`;
    if (s < 86400) return `${Math.floor(s/3600)}h ago`;
    return `${Math.floor(s/86400)}d ago`;
};

const BASE = 'http://localhost:8080';

// ── Sub-components ─────────────────────────────────────
const Avatar = ({ url, initial, size = 38, onClick }) => (
    <div onClick={onClick} style={M.getAvatar(size, url)}>
        {!url && initial}
    </div>
);

const ConvRow = ({ conv, sent, loading, onShare }) => {
    const url = conv.otherProfilePicture
        ? `${BASE}${conv.otherProfilePicture}` : null;
    return (
        <div style={{ display: 'flex', alignItems: 'center',
            gap: '10px', padding: '10px',
            borderRadius: 'var(--radius-md)', marginBottom: '4px' }}>
            <Avatar url={url} size={38}
                initial={conv.otherUsername?.[0]?.toUpperCase()} />
            <div style={{ flex: 1 }}>
                <p style={{ fontSize: '14px', fontWeight: '600',
                    margin: 0, color: 'var(--text-primary)' }}>
                    {conv.otherFullName || `@${conv.otherUsername}`}
                </p>
                <p style={{ fontSize: '11px',
                    color: 'var(--text-muted)', margin: 0 }}>
                    @{conv.otherUsername}
                </p>
            </div>
            <button onClick={onShare} disabled={loading || sent}
                className={sent ? 'btn-secondary' : 'btn-primary'}
                style={{ padding: '6px 14px', fontSize: '12px',
                    flexShrink: 0,
                    background: sent ? 'var(--success-bg)' : undefined,
                    color: sent ? 'var(--success)' : undefined }}>
                {loading ? '...' : sent ? 'Sent ✓' : 'Send'}
            </button>
        </div>
    );
};

// ── Main Component ─────────────────────────────────────
const PostCard = ({ post }) => {
    const { token, user } = useAuth();

    // Like
    const [liked, setLiked] = useState(false);
    const [likesCount, setLikesCount] = useState(post.likesCount || 0);
    const [likeLoading, setLikeLoading] = useState(false);

    // Comments
    const [showComments, setShowComments] = useState(false);
    const [comments, setComments] = useState([]);
    const [commentText, setCommentText] = useState('');
    const [commentLoading, setCommentLoading] = useState(false);
    const [commentsLoaded, setCommentsLoaded] = useState(false);
    const [commentCount, setCommentCount] = useState(0);

    // Share
    const [showShareModal, setShowShareModal] = useState(false);
    const [conversations, setConversations] = useState([]);
    const [shareLoading, setShareLoading] = useState({});
    const [sharedTo, setSharedTo] = useState({});
    const [copied, setCopied] = useState(false);

    // Edit / Delete
    const [showPostMenu, setShowPostMenu] = useState(false);
    const [editingPost, setEditingPost] = useState(false);
    const [editPostContent, setEditPostContent] = useState('');
    const [editPostLoading, setEditPostLoading] = useState(false);
    const [removedImageIds, setRemovedImageIds] = useState([]);
    const [newImageFiles, setNewImageFiles] = useState([]);
    const [newImagePreviews, setNewImagePreviews] = useState([]);
    const [imageOrder, setImageOrder] = useState([]);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);


    //group Post Sharing
    const [groups, setGroups] = useState([]);
    const [groupSharedTo, setGroupSharedTo] = useState({});
    const [groupShareLoading, setGroupShareLoading] = useState({});

    const [shareSearch, setShareSearch] = useState('');


    const postAvatar = post.profilePictureUrl
        ? `${BASE}${post.profilePictureUrl}` : null;
    const postInitial = post.username?.[0]?.toUpperCase() || 'U';
    const isOwner = post.username === user?.username;

    useEffect(() => {
        if (!token) return;
        getLikeStatus(token, post.id)
            .then(d => { setLiked(d.liked); setLikesCount(d.likesCount); })
            .catch(() => {});
        getComments(post.id)
            .then(d => setCommentCount(d.length))
            .catch(() => {});
    }, [token, post.id]);

    // ── Handlers ───────────────────────────────────────
    const handleLike = async () => {
        if (likeLoading) return;
        setLikeLoading(true);
        try {
            const d = await toggleLike(token, post.id);
            setLiked(d.liked);
            setLikesCount(d.likesCount);
        } finally { setLikeLoading(false); }
    };

    const handleShowComments = async () => {
        setShowComments(p => !p);
        if (commentsLoaded) return;
        try {
            const d = await getComments(post.id, token);
            setComments(d);
            setCommentCount(d.length);
            setCommentsLoaded(true);
        } catch (e) { console.error(e); }
    };

    const handleAddComment = async () => {
        if (!commentText.trim() || commentLoading) return;
        setCommentLoading(true);
        try {
            const c = await addComment(token, post.id, commentText, null);
            setComments(p => [...p, c]);
            setCommentCount(p => p + 1);
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
                `${BASE}/api/messages/${convId}/share/${post.id}`,
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
            `${window.location.origin}/post/${post.id}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const openEdit = () => {
        setEditingPost(true);
        setEditPostContent(post.content);
        setRemovedImageIds([]);
        setNewImageFiles([]);
        setNewImagePreviews([]);
        setImageOrder(post.imageIds?.map((id, i) => ({
            id, url: post.imageUrls[i], order: i })) || []);
        setShowPostMenu(false);
    };

    const closeEdit = () => {
        setEditingPost(false);
        setRemovedImageIds([]);
        setNewImageFiles([]);
        setNewImagePreviews([]);
    };

    const handleEditPost = async () => {
        if (!editPostContent.trim()) return;
        setEditPostLoading(true);
        try {
            const fd = new FormData();
            fd.append('content', editPostContent);
            removedImageIds.forEach(id => fd.append('removeImageIds', id));
            newImageFiles.forEach(f => fd.append('newImages', f));
            imageOrder.forEach(item => fd.append('imageOrderIds', item.id));
            const r = await fetch(`${BASE}/api/posts/${post.id}`,
                { method: 'PUT',
                    headers: { Authorization: `Bearer ${token}` },
                    body: fd });
            if (r.ok) window.location.reload();
        } finally { setEditPostLoading(false); }
    };

    const handleDelete = async () => {
        setShowPostMenu(false);
        setShowDeleteConfirm(true);
    };

    const confirmDelete = async () => {
        try {
            await fetch(`${BASE}/api/posts/${post.id}`,
                { method: 'DELETE',
                    headers: { Authorization: `Bearer ${token}` }});
            window.location.reload();
        } catch (e) { console.error(e); }
        finally { setShowDeleteConfirm(false); }
    };

    const reorder = (i, dir) => {
        const a = [...imageOrder];
        const j = dir === 'up' ? i - 1 : i + 1;
        [a[i], a[j]] = [a[j], a[i]];
        setImageOrder(a);
    };

    // ── Render ─────────────────────────────────────────
    return (
        <div style={M.postCard()}>

            {/* ── Header ── */}
            <div style={{ display: 'flex', alignItems: 'center',
                gap: '10px', padding: '12px 14px' }}>
                <Avatar url={postAvatar} initial={postInitial} size={38}
                    onClick={() => window.location.href =
                        `/user/${post.username}`} />

                <div style={{ flex: 1 }}>
                    <p onClick={() => window.location.href =
                        `/user/${post.username}`}
                        style={{ fontSize: '14px', fontWeight: '600',
                            margin: 0, color: 'var(--text-primary)',
                            cursor: 'pointer' }}>
                        @{post.username}
                    </p>
                    <p style={{ fontSize: '11px',
                        color: 'var(--text-faint)', margin: 0 }}>
                        {post.fullName && <span>{post.fullName} · </span>}
                        <span onClick={() => window.location.href =
                            `/post/${post.id}`}
                            style={{ cursor: 'pointer' }}>
                            {timeAgo(post.createdAt)}
                        </span>
                    </p>
                </div>

                <div style={{ display: 'flex',
                    alignItems: 'center', gap: '6px' }}>
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

                    {/* 3-dot menu */}
                    {isOwner && (
                        <div style={{ position: 'relative' }}>
                            <button onClick={e => {
                                e.stopPropagation();
                                setShowPostMenu(p => !p);
                            }} className="btn-icon"
                                style={{ fontSize: '18px',
                                    padding: '0 4px' }}>
                                ⋯
                            </button>
                            {showPostMenu && (
                                <div style={M.dropdownMenu()}>
                                    {[
                                        { label: '✏️ Edit Post',
                                            action: openEdit },
                                        { label: '🗑️ Delete Post',
                                            action: handleDelete,
                                            danger: true },
                                    ].map(item => (
                                        <div key={item.label}
                                            onClick={item.action}
                                            style={M.dropdownItem(
                                                item.danger)}
                                            onMouseOver={e =>
                                                e.currentTarget.style
                                                .background =
                                                'var(--hover-bg)'}
                                            onMouseOut={e =>
                                                e.currentTarget.style
                                                .background = 'transparent'}>
                                            {item.label}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Content ── */}
            <div onClick={() => window.location.href =
                `/post/${post.id}`}
                style={{ cursor: 'pointer' }}>
                {post.content && (
                    <div style={{ padding: '0 14px 12px' }}>
                        {post.postType === 'CODE' ? (
                            <pre className="code-block"
                                style={{ maxHeight: '300px' }}>
                                {post.content}
                            </pre>
                        ) : (
                            <p style={{ fontSize: '14px',
                                color: 'var(--text-primary)',
                                margin: 0, lineHeight: '1.6' }}>
                                {post.content}
                            </p>
                        )}
                    </div>
                )}
                {post.imageUrls?.length > 0 && (
                    <ImageCarousel imageUrls={post.imageUrls}
                        height="400px" />
                )}
            </div>

            {/* ── Footer ── */}
            <div style={M.postFooter()}>
                <button onClick={handleLike} disabled={likeLoading}
                    className="btn-icon"
                    style={{ color: liked ? 'var(--danger)'
                        : 'var(--text-muted)',
                        fontWeight: liked ? '600' : '400' }}>
                    <span style={{ fontSize: '16px' }}>
                        {liked ? '❤️' : '🤍'}
                    </span>
                    {likesCount}
                </button>

                <button onClick={handleShowComments}
                    className="btn-icon"
                    style={{ color: showComments
                        ? 'var(--primary)' : 'var(--text-muted)' }}>
                    <span style={{ fontSize: '16px' }}>💬</span>
                    {commentCount}
                </button>

                <button onClick={handleOpenShare}
                    className="btn-icon"
                    style={{ marginLeft: 'auto',
                        color: 'var(--text-muted)' }}>
                    <span style={{ fontSize: '16px' }}>↗️</span>
                    Share
                </button>

                {post.visibility === 'FOLLOWERS' && (
                    <span style={{ fontSize: '11px',
                        color: 'var(--text-faint)' }}>
                        Followers only
                    </span>
                )}
            </div>

            {/* ── Comments ── */}
            {showComments && (
                <div style={{ borderTop: '1px solid var(--border-light)',
                    padding: '12px 14px' }}>
                    {comments.length === 0 ? (
                        <p style={{ fontSize: '13px',
                            color: 'var(--text-faint)',
                            margin: '0 0 12px' }}>
                            No comments yet. Be the first!
                        </p>
                    ) : (
                        <div style={{ display: 'flex',
                            flexDirection: 'column', gap: '12px',
                            marginBottom: '12px' }}>
                            {comments.map(c => (
                                <CommentItem key={c.id} comment={c}
                                    postId={post.id}
                                    onDelete={id => {
                                        setComments(p =>
                                            p.filter(x => x.id !== id));
                                        setCommentCount(p => p - 1);
                                    }} />
                            ))}
                        </div>
                    )}
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <input value={commentText}
                            onChange={e => setCommentText(e.target.value)}
                            onKeyDown={e => e.key === 'Enter'
                                && handleAddComment()}
                            placeholder="Write a comment..."
                            className="input"
                            style={{ flex: 1,
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
            )}

            {/* ── Edit Modal ── */}
            {editingPost && (
                    <Portal>
                <div className="modal-overlay" onClick={closeEdit}>
                    <div className="modal-box"
                        style={{ maxWidth: '560px',
                            maxHeight: '88vh', overflowY: 'auto' }}
                        onClick={e => e.stopPropagation()}>

                        <div style={{ display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '1rem' }}>
                            <h3 style={{ margin: 0,
                                fontSize: '16px', fontWeight: '600',
                                color: 'var(--text-primary)' }}>
                                Edit Post
                            </h3>
                            <button onClick={closeEdit}
                                className="btn-icon"
                                style={{ fontSize: '20px' }}>×</button>
                        </div>

                        <label style={{ fontSize: '13px',
                            fontWeight: '600',
                            color: 'var(--text-secondary)',
                            display: 'block', marginBottom: '6px' }}>
                            {post.postType === 'CODE' ? 'Code'
                                : post.postType === 'IMAGE' ? 'Caption'
                                : 'Content'}
                        </label>
                        <textarea value={editPostContent}
                            onChange={e =>
                                setEditPostContent(e.target.value)}
                            rows={post.postType === 'CODE' ? 12 : 5}
                            className="input"
                            style={{ fontFamily: post.postType === 'CODE'
                                    ? 'var(--font-mono)' : 'inherit',
                                background: post.postType === 'CODE'
                                    ? '#0d1117' : 'var(--input-bg)',
                                color: post.postType === 'CODE'
                                    ? '#d4d4d4'
                                    : 'var(--text-primary)',
                                resize: 'vertical',
                                marginBottom: '1.25rem' }} />

                        {/* Image editing */}
                        {post.postType === 'IMAGE' && (
                            <div>
                                {imageOrder.length > 0 && (
                                    <div style={{ marginBottom: '1rem' }}>
                                        <p style={{ fontSize: '13px',
                                            fontWeight: '600',
                                            color: 'var(--text-secondary)',
                                            margin: '0 0 8px' }}>
                                            Current Images
                                            <span style={{ fontSize: '11px',
                                                color: 'var(--text-faint)',
                                                fontWeight: '400',
                                                marginLeft: '6px' }}>
                                                (arrows to reorder, × remove)
                                            </span>
                                        </p>
                                        <div style={{ display: 'flex',
                                            flexDirection: 'column',
                                            gap: '8px' }}>
                                            {imageOrder.map((item, i) => {
                                                const removed =
                                                    removedImageIds
                                                    .includes(item.id);
                                                return (
                                                    <div key={item.id}
                                                        style={{ display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '10px',
                                                            opacity: removed
                                                                ? 0.4 : 1,
                                                            background: removed
                                                                ? 'var(--danger-bg)'
                                                                : 'var(--hover-bg)',
                                                            padding: '8px',
                                                            borderRadius: '10px',
                                                            border: `1px solid ${removed ? 'var(--danger)' : 'var(--border)'}` }}>
                                                        <img src={`${BASE}${item.url}`}
                                                            alt={`img-${i}`}
                                                            style={{ width: '70px',
                                                                height: '70px',
                                                                objectFit: 'cover',
                                                                borderRadius: '8px',
                                                                flexShrink: 0 }} />
                                                        <div style={{ flex: 1 }}>
                                                            <p style={{
                                                                fontSize: '12px',
                                                                color: 'var(--text-secondary)',
                                                                margin: 0 }}>
                                                                Image {i + 1}
                                                                {removed && (
                                                                    <span style={{
                                                                        color: 'var(--danger)',
                                                                        marginLeft: '6px',
                                                                        fontWeight: '600' }}>
                                                                        — Will be removed
                                                                    </span>
                                                                )}
                                                            </p>
                                                        </div>
                                                        {!removed && (
                                                            <div style={{ display: 'flex',
                                                                flexDirection: 'column',
                                                                gap: '2px' }}>
                                                                {['up','down'].map(dir => {
                                                                    const disabled = dir === 'up'
                                                                        ? i === 0
                                                                        : i === imageOrder.length - 1;
                                                                    return (
                                                                        <button key={dir}
                                                                            disabled={disabled}
                                                                            onClick={() =>
                                                                                reorder(i, dir)}
                                                                            style={{ background: disabled
                                                                                ? 'var(--border)'
                                                                                : 'var(--primary)',
                                                                                color: disabled
                                                                                    ? 'var(--text-faint)'
                                                                                    : '#fff',
                                                                                border: 'none',
                                                                                borderRadius: '4px',
                                                                                width: '24px',
                                                                                height: '24px',
                                                                                fontSize: '12px',
                                                                                cursor: disabled
                                                                                    ? 'not-allowed'
                                                                                    : 'pointer',
                                                                                display: 'flex',
                                                                                alignItems: 'center',
                                                                                justifyContent: 'center' }}>
                                                                            {dir === 'up' ? '↑' : '↓'}
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}
                                                        <button onClick={() =>
                                                            removed
                                                                ? setRemovedImageIds(p =>
                                                                    p.filter(id =>
                                                                        id !== item.id))
                                                                : setRemovedImageIds(p =>
                                                                    [...p, item.id])}
                                                            style={{ background: removed
                                                                ? 'var(--success-bg)'
                                                                : 'var(--danger-bg)',
                                                                color: removed
                                                                    ? 'var(--success)'
                                                                    : 'var(--danger)',
                                                                border: 'none',
                                                                borderRadius: '8px',
                                                                padding: '6px 10px',
                                                                fontSize: '12px',
                                                                cursor: 'pointer',
                                                                fontWeight: '500',
                                                                flexShrink: 0 }}>
                                                            {removed ? '↩ Restore' : '× Remove'}
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Add new images */}
                                <div style={{ marginBottom: '1.25rem' }}>
                                    <p style={{ fontSize: '13px',
                                        fontWeight: '600',
                                        color: 'var(--text-secondary)',
                                        margin: '0 0 8px' }}>
                                        Add New Images
                                    </p>
                                    <label style={{ display: 'block',
                                        border: '2px dashed var(--border)',
                                        borderRadius: 'var(--radius-md)',
                                        padding: '1rem', textAlign: 'center',
                                        cursor: 'pointer',
                                        background: 'var(--hover-bg)' }}>
                                        <p style={{ margin: 0,
                                            fontSize: '13px',
                                            color: 'var(--text-muted)' }}>
                                            Click to add more images
                                        </p>
                                        <p style={{ margin: '4px 0 0',
                                            fontSize: '11px',
                                            color: 'var(--text-faint)' }}>
                                            JPG, PNG, GIF up to 5MB
                                        </p>
                                        <input type="file" accept="image/*"
                                            multiple
                                            onChange={e => {
                                                const files = Array.from(
                                                    e.target.files);
                                                setNewImageFiles(p =>
                                                    [...p, ...files]);
                                                setNewImagePreviews(p =>
                                                    [...p, ...files.map(f =>
                                                        URL.createObjectURL(f))]);
                                            }}
                                            style={{ display: 'none' }} />
                                    </label>

                                    {newImagePreviews.map((src, i) => (
                                        <div key={i} style={{ display: 'flex',
                                            alignItems: 'center', gap: '10px',
                                            background: 'var(--success-bg)',
                                            padding: '8px', marginTop: '8px',
                                            borderRadius: '10px',
                                            border: '1px solid var(--success)' }}>
                                            <img src={src} alt={`new-${i}`}
                                                style={{ width: '70px',
                                                    height: '70px',
                                                    objectFit: 'cover',
                                                    borderRadius: '8px',
                                                    flexShrink: 0 }} />
                                            <div style={{ flex: 1 }}>
                                                <p style={{ fontSize: '12px',
                                                    color: 'var(--success)',
                                                    fontWeight: '600',
                                                    margin: 0 }}>
                                                    New Image {i + 1}
                                                </p>
                                                <p style={{ fontSize: '11px',
                                                    color: 'var(--text-secondary)',
                                                    margin: 0 }}>
                                                    {newImageFiles[i]?.name}
                                                </p>
                                            </div>
                                            <button onClick={() => {
                                                setNewImageFiles(p =>
                                                    p.filter((_,j) => j!==i));
                                                setNewImagePreviews(p =>
                                                    p.filter((_,j) => j!==i));
                                            }}
                                                className="btn-danger"
                                                style={{ padding: '6px 10px',
                                                    fontSize: '12px',
                                                    flexShrink: 0 }}>
                                                × Remove
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Summary */}
                        {(removedImageIds.length > 0 ||
                            newImageFiles.length > 0) && (
                            <div style={{ background: 'var(--primary-bg)',
                                border: '1px solid var(--primary-border)',
                                borderRadius: 'var(--radius-md)',
                                padding: '10px 14px',
                                marginBottom: '1rem',
                                fontSize: '12px',
                                color: 'var(--primary)' }}>
                                {removedImageIds.length > 0 && (
                                    <p style={{ margin: '0 0 2px' }}>
                                        🗑 {removedImageIds.length} image
                                        {removedImageIds.length > 1
                                            ? 's' : ''} will be removed
                                    </p>
                                )}
                                {newImageFiles.length > 0 && (
                                    <p style={{ margin: 0 }}>
                                        ➕ {newImageFiles.length} new image
                                        {newImageFiles.length > 1
                                            ? 's' : ''} will be added
                                    </p>
                                )}
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button onClick={handleEditPost}
                                disabled={editPostLoading}
                                className="btn-primary btn-full"
                                style={{ flex: 1 }}>
                                {editPostLoading ? 'Saving...' : 'Save Changes'}
                            </button>
                            <button onClick={closeEdit}
                                className="btn-secondary btn-full"
                                style={{ flex: 1 }}>
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
                </Portal>
            )}

            {/* ── Share Modal ── */}
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
                                {`${window.location.origin}/post/${post.id}`}
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

            {/* ── Delete Confirm Modal ── */}
            {showDeleteConfirm && (
                <Portal>
                    <div style={{ position: 'fixed', inset: 0,
                        background: 'rgba(0,0,0,0.7)',
                        display: 'flex', alignItems: 'center',
                        justifyContent: 'center', zIndex: 1100,
                        backdropFilter: 'blur(6px)' }}
                        onClick={() => setShowDeleteConfirm(false)}>
                        <div style={{ background: 'var(--modal-bg)',
                            border: '1px solid var(--border)',
                            borderRadius: 'var(--radius-lg)',
                            padding: '2rem', width: '90%', maxWidth: '320px',
                            textAlign: 'center',
                            animation: 'modalIn 0.2s ease forwards' }}
                            onClick={e => e.stopPropagation()}>

                            {/* Icon */}
                            <div style={{ width: '56px', height: '56px',
                                background: 'var(--danger-bg)',
                                borderRadius: '50%', margin: '0 auto 1rem',
                                display: 'flex', alignItems: 'center',
                                justifyContent: 'center', fontSize: '24px' }}>
                                🗑️
                            </div>

                            <h3 style={{ margin: '0 0 8px',
                                fontSize: '17px', fontWeight: '700',
                                color: 'var(--text-primary)' }}>
                                Delete Post?
                            </h3>
                            <p style={{ margin: '0 0 1.5rem',
                                fontSize: '13px',
                                color: 'var(--text-muted)',
                                lineHeight: '1.5' }}>
                                This will permanently delete your post
                                and all its comments. This action
                                cannot be undone.
                            </p>

                            <div style={{ display: 'flex',
                                flexDirection: 'column', gap: '8px' }}>
                                <button onClick={confirmDelete}
                                    className="btn-danger btn-full"
                                    style={{ fontSize: '14px',
                                        fontWeight: '600', padding: '11px' }}>
                                    Yes, Delete Post
                                </button>
                                <button onClick={() =>
                                    setShowDeleteConfirm(false)}
                                    className="btn-secondary btn-full"
                                    style={{ fontSize: '14px', padding: '11px' }}>
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </Portal>
            )}
        </div>
    );
};

export default PostCard;