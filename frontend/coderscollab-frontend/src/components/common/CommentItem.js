import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { addComment, toggleCommentLike,
    deleteComment } from '../../api/likeCommentApi';
import * as M from '../../styles/mixins';

const BASE = 'http://localhost:8080';

const timeAgo = (d) => {
    if (!d) return '';
    const s = Math.floor((new Date() - new Date(d)) / 1000);
    if (s < 60) return `${s}s ago`;
    if (s < 3600) return `${Math.floor(s/60)}m ago`;
    if (s < 86400) return `${Math.floor(s/3600)}h ago`;
    return `${Math.floor(s/86400)}d ago`;
};

const CommentItem = ({ comment, postId, onDelete, isReply = false }) => {
    const { token, user } = useAuth();
    const [liked, setLiked] = useState(comment.liked || false);
    const [likeCount, setLikeCount] = useState(comment.likeCount || 0);
    const [showReplyInput, setShowReplyInput] = useState(false);
    const [replyText, setReplyText] = useState('');
    const [replyLoading, setReplyLoading] = useState(false);
    const [replies, setReplies] = useState(comment.replies || []);
    const [showReplies, setShowReplies] = useState(false);

    const avatarUrl = comment.profilePictureUrl
        ? `${BASE}${comment.profilePictureUrl}` : null;
    const initial = comment.username?.[0]?.toUpperCase() || 'U';
    const isOwner = comment.username === user?.username;

    const handleLike = async () => {
        try {
            const d = await toggleCommentLike(token, comment.id);
            setLiked(d.liked);
            setLikeCount(d.likeCount);
        } catch (e) { console.error(e); }
    };

    const handleReply = async () => {
        if (!replyText.trim() || replyLoading) return;
        setReplyLoading(true);
        try {
            const r = await addComment(
                token, postId, replyText, comment.id);
            setReplies(p => [...p, r]);
            setReplyText('');
            setShowReplyInput(false);
            setShowReplies(true);
        } finally { setReplyLoading(false); }
    };

    const handleDelete = async () => {
        try {
            await deleteComment(token, comment.id);
            onDelete(comment.id);
        } catch (e) { console.error(e); }
    };

    const size = isReply ? 26 : 32;

    return (
        <div style={{ display: 'flex', gap: '8px',
            alignItems: 'flex-start',
            marginLeft: isReply ? '40px' : 0 }}>

            {/* Avatar */}
            <div onClick={() => window.location.href =
                `/user/${comment.username}`}
                style={M.getAvatar(size, avatarUrl)}>
                {!avatarUrl && initial}
            </div>

            <div style={{ flex: 1 }}>

                {/* Bubble */}
                <div style={M.commentBubble()}>

                    {/* Content */}
                    <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex',
                            alignItems: 'center',
                            gap: '6px', flexWrap: 'wrap' }}>
                            <p onClick={() => window.location.href =
                                `/user/${comment.username}`}
                                style={{ fontSize: '12px',
                                    fontWeight: '600', margin: 0,
                                    color: 'var(--text-primary)',
                                    cursor: 'pointer' }}>
                                @{comment.username}
                            </p>
                            {comment.fullName && (
                                <span style={{ fontSize: '12px',
                                    color: 'var(--text-muted)' }}>
                                    {comment.fullName}
                                </span>
                            )}
                            <span style={{ fontSize: '11px',
                                color: 'var(--text-faint)' }}>
                                · {timeAgo(comment.createdAt)}
                            </span>
                        </div>
                        <p style={{ fontSize: '13px',
                            color: 'var(--text-primary)',
                            margin: '4px 0 0', lineHeight: '1.5' }}>
                            {comment.content}
                        </p>
                    </div>

                    {/* Like — right side */}
                    <div style={{ display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '2px', flexShrink: 0 }}>
                        <button onClick={handleLike}
                            className="btn-icon"
                            style={{ fontSize: '14px' }}>
                            {liked ? '❤️' : '🤍'}
                        </button>
                        {likeCount > 0 && (
                            <span style={{ fontSize: '10px',
                                color: liked
                                    ? 'var(--danger)'
                                    : 'var(--text-muted)',
                                fontWeight: liked ? '600' : '400' }}>
                                {likeCount}
                            </span>
                        )}
                    </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '12px',
                    marginTop: '4px', paddingLeft: '4px',
                    alignItems: 'center' }}>
                    {!isReply && (
                        <button
                            onClick={() =>
                                setShowReplyInput(p => !p)}
                            className="btn-icon"
                            style={{ fontSize: '11px',
                                fontWeight: '500' }}>
                            Reply
                        </button>
                    )}
                    {!isReply && replies.length > 0 && (
                        <button
                            onClick={() =>
                                setShowReplies(p => !p)}
                            className="btn-icon"
                            style={{ fontSize: '11px',
                                fontWeight: '500',
                                color: 'var(--primary)' }}>
                            {showReplies ? 'Hide replies'
                                : `View ${replies.length} ${
                                    replies.length === 1
                                        ? 'reply' : 'replies'}`}
                        </button>
                    )}
                    {isOwner && (
                        <button onClick={handleDelete}
                            className="btn-icon"
                            style={{ fontSize: '11px',
                                color: 'var(--danger)',
                                marginLeft: 'auto' }}>
                            delete
                        </button>
                    )}
                </div>

                {/* Reply Input */}
                {showReplyInput && (
                    <div style={{ display: 'flex', gap: '6px',
                        marginTop: '8px' }}>
                        <input value={replyText}
                            onChange={e => setReplyText(e.target.value)}
                            onKeyDown={e => e.key === 'Enter'
                                && handleReply()}
                            placeholder={`Reply to @${comment.username}...`}
                            className="input"
                            style={{ flex: 1, fontSize: '12px',
                                borderRadius: 'var(--radius-xl)',
                                padding: '6px 10px' }} />
                        <button onClick={handleReply}
                            disabled={replyLoading}
                            className="btn-primary"
                            style={{ padding: '6px 12px',
                                fontSize: '12px',
                                borderRadius: 'var(--radius-xl)' }}>
                            {replyLoading ? '...' : 'Reply'}
                        </button>
                    </div>
                )}

                {/* Replies */}
                {showReplies && replies.length > 0 && (
                    <div style={{ display: 'flex',
                        flexDirection: 'column',
                        gap: '8px', marginTop: '8px' }}>
                        {replies.map(r => (
                            <CommentItem key={r.id}
                                comment={r}
                                postId={postId}
                                isReply={true}
                                onDelete={id => setReplies(
                                    p => p.filter(x => x.id !== id)
                                )} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default CommentItem;