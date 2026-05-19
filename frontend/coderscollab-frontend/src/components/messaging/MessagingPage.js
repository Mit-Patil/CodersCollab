import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getMessages, sendMedia, markAsRead, getAllConversations,
    forwardMessage, deleteMessage, editMessage }
    from '../../api/messagingApi';
import Navbar from '../common/Navbar';
import * as M from '../../styles/mixins';
import useWebSocket from '../../hooks/useWebSocket';

import { getMyGroups, getGroupMessages, sendGroupMessage,
    sendGroupMedia, editGroupMessage, deleteGroupMessage,
    markGroupAsRead, joinGroup, searchGroups, getGroup }
    from '../../api/groupApi';
import CreateGroupModal from './CreateGroupModal';
import GroupInfoPanel from './GroupInfoPanel';

const BASE = 'http://localhost:8080';

const timeAgo = (d) => {
    if (!d) return '';
    const s = Math.floor((new Date() - new Date(d)) / 1000);
    if (s < 60) return `${s}s ago`;
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return `${Math.floor(s / 86400)}d ago`;
};

const convLastMsgText = (msg) => {
    if (!msg) return '';
    if (msg.deletedForEveryone) return 'This message was deleted';
    if (msg.messageType === 'SYSTEM') {
        return (
            <div key={msg.id} style={{ textAlign: 'center',
                margin: '8px 0' }}>
                <span style={{ fontSize: '11px',
                    color: 'var(--text-faint)',
                    background: 'var(--hover-bg)',
                    padding: '4px 12px',
                    borderRadius: '20px',
                    display: 'inline-block' }}>
                    {msg.content}
                </span>
            </div>
        );
    }
    if (msg.messageType === 'IMAGE') return '📷 Image';
    if (msg.messageType === 'VIDEO') return '🎥 Video';
    if (msg.messageType === 'FILE')  return '📎 File';
    if (msg.messageType === 'POST')  return 'Shared a post';
    return msg.content || '';
};

// ── Sub-components ──────────────────────────────────────────────────────────

const GroupListItem = ({ group, active, onClick }) => {
    const hasUnread = (group.unreadCount || 0) > 0;
    return (
        <div onClick={onClick} style={{
            display: 'flex', alignItems: 'center',
            gap: '12px', padding: '12px 16px',
            cursor: 'pointer',
            background: active ? 'var(--primary-bg)'
                : hasUnread ? 'rgba(74,158,255,0.05)' : 'transparent',
            borderLeft: active
                ? '3px solid var(--primary)'
                : '3px solid transparent',
            transition: 'background 0.15s' }}
            onMouseOver={e => !active &&
                (e.currentTarget.style.background = 'var(--hover-bg)')}
            onMouseOut={e => !active &&
                (e.currentTarget.style.background =
                hasUnread ? 'rgba(74,158,255,0.05)' : 'transparent')}>

            <div style={{ position: 'relative', flexShrink: 0 }}>
                <div style={{ width: '46px', height: '46px',
                    borderRadius: '14px',
                    background: 'var(--primary-bg)',
                    border: '1px solid var(--primary-border)',
                    display: 'flex', alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '20px', overflow: 'hidden' }}>
                    {group.avatarUrl ? (
                        <img src={`${BASE}${group.avatarUrl}`}
                            alt="g"
                            style={{ width: '100%', height: '100%',
                                objectFit: 'cover' }} />
                    ) : '👥'}
                </div>
                {hasUnread && (
                    <div style={{ position: 'absolute',
                        top: 0, right: 0, width: '10px', height: '10px',
                        background: 'var(--primary)',
                        borderRadius: '50%',
                        border: '2px solid var(--card-bg-solid)' }} />
                )}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center' }}>
                    <p style={{ fontSize: '13px',
                        fontWeight: hasUnread ? '700' : '600',
                        margin: 0, color: 'var(--text-primary)',
                        overflow: 'hidden', textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap', maxWidth: '130px' }}>
                        {group.name}
                    </p>
                    <span style={{ fontSize: '10px',
                        color: 'var(--text-faint)', flexShrink: 0 }}>
                        {timeAgo(group.lastMessageTime)}
                    </span>
                </div>
                <div style={{ display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center', marginTop: '2px' }}>
                    <p style={{ fontSize: '11px',
                        color: hasUnread
                            ? 'var(--text-primary)' : 'var(--text-muted)',
                        margin: 0,
                        fontWeight: hasUnread ? '500' : '400',
                        overflow: 'hidden', textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap', maxWidth: '150px' }}>
                        {group.lastMessage || 'No messages yet'}
                    </p>
                    {hasUnread && (
                        <div style={{ background: 'var(--primary)',
                            color: '#fff', borderRadius: '50%',
                            width: '17px', height: '17px',
                            fontSize: '10px', display: 'flex',
                            alignItems: 'center', justifyContent: 'center',
                            fontWeight: '600', flexShrink: 0 }}>
                            {group.unreadCount > 9 ? '9+' : group.unreadCount}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const MediaPanel = ({ messages, onClose, initialTab = 'media' }) => {
    const [tab, setTab] = useState(initialTab);

    // Reset tab when initialTab changes (e.g. opened from "Shared Posts")
    useEffect(() => { setTab(initialTab); }, [initialTab]);

    const mediaItems = messages.filter(m =>
        !m.deletedForEveryone &&
        ['IMAGE', 'VIDEO'].includes(m.messageType));

    const fileItems = messages.filter(m =>
        !m.deletedForEveryone && m.messageType === 'FILE');

    const postItems = messages.filter(m =>
        !m.deletedForEveryone &&
        m.messageType === 'POST' && m.sharedPostId);

    const linkItems = messages.filter(m =>
        !m.deletedForEveryone &&
        m.messageType === 'TEXT' &&
        m.content?.match(/https?:\/\/[^\s]+/));

    const tabs = [
        { key: 'media',  label: `Media`,  count: mediaItems.length },
        { key: 'files',  label: `Files`,  count: fileItems.length },
        { key: 'posts',  label: `Posts`,  count: postItems.length },
        { key: 'links',  label: `Links`,  count: linkItems.length },
    ];

    return (
        <div style={{ width: '280px', flexShrink: 0,
            background: 'var(--card-bg-solid)',
            borderLeft: '1px solid var(--border)',
            display: 'flex', flexDirection: 'column',
            overflow: 'hidden' }}>

            {/* Header */}
            <div style={{ padding: '14px 16px',
                borderBottom: '1px solid var(--border)',
                display: 'flex', alignItems: 'center',
                justifyContent: 'space-between', flexShrink: 0 }}>
                <p style={{ margin: 0, fontSize: '14px',
                    fontWeight: '700',
                    color: 'var(--text-primary)' }}>
                    Shared Content
                </p>
                <button onClick={onClose} className="btn-icon"
                    style={{ fontSize: '18px' }}>×</button>
            </div>

            {/* Tabs — 2 row layout since 4 tabs */}
            <div style={{ display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                borderBottom: '1px solid var(--border)',
                flexShrink: 0 }}>
                {tabs.map(t => (
                    <button key={t.key}
                        onClick={() => setTab(t.key)}
                        style={{ padding: '9px 4px',
                            fontSize: '11px',
                            fontWeight: tab === t.key ? '700' : '500',
                            color: tab === t.key
                                ? 'var(--primary)' : 'var(--text-muted)',
                            background: tab === t.key
                                ? 'var(--primary-bg)' : 'transparent',
                            border: 'none',
                            borderBottom: tab === t.key
                                ? '2px solid var(--primary)'
                                : '2px solid transparent',
                            cursor: 'pointer',
                            transition: 'all 0.15s' }}>
                        {t.label}
                        {t.count > 0 && (
                            <span style={{ marginLeft: '4px',
                                background: tab === t.key
                                    ? 'var(--primary)' : 'var(--border)',
                                color: tab === t.key
                                    ? '#fff' : 'var(--text-muted)',
                                borderRadius: '10px',
                                padding: '1px 5px',
                                fontSize: '10px' }}>
                                {t.count}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>

                {/* Media grid */}
                {tab === 'media' && (
                    mediaItems.length === 0 ? (
                        <EmptyState icon="🖼️" text="No media shared yet" />
                    ) : (
                        <div style={{ display: 'grid',
                            gridTemplateColumns: 'repeat(3, 1fr)',
                            gap: '3px' }}>
                            {mediaItems.map(m => (
                                <div key={m.id}
                                    onClick={() => window.open(
                                        `${BASE}${m.mediaUrl}`, '_blank')}
                                    style={{ aspectRatio: '1',
                                        borderRadius: '6px',
                                        overflow: 'hidden',
                                        cursor: 'pointer',
                                        background: 'var(--input-bg)',
                                        position: 'relative' }}>
                                    {m.messageType === 'IMAGE' ? (
                                        <img src={`${BASE}${m.mediaUrl}`}
                                            alt="media"
                                            style={{ width: '100%',
                                                height: '100%',
                                                objectFit: 'cover' }} />
                                    ) : (
                                        <div style={{ width: '100%',
                                            height: '100%', display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center' }}>
                                            <span style={{ fontSize: '20px' }}>🎥</span>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )
                )}

                {/* Files */}
                {tab === 'files' && (
                    fileItems.length === 0 ? (
                        <EmptyState icon="📎" text="No files shared yet" />
                    ) : (
                        <div style={{ display: 'flex',
                            flexDirection: 'column', gap: '6px' }}>
                            {fileItems.map(m => {
                                const ext = m.content?.split('.')
                                    .pop()?.toLowerCase();
                                const icon = ext === 'pdf' ? '📄'
                                    : ext === 'zip' ? '🗜️'
                                    : (ext === 'doc' || ext === 'docx')
                                    ? '📝' : '📎';
                                return (
                                    <a key={m.id}
                                        href={`${BASE}${m.mediaUrl}`}
                                        target="_blank" rel="noreferrer"
                                        style={{ display: 'flex',
                                            alignItems: 'center', gap: '10px',
                                            padding: '10px',
                                            background: 'var(--input-bg)',
                                            border: '1px solid var(--border)',
                                            borderRadius: 'var(--radius-md)',
                                            textDecoration: 'none',
                                            transition: 'background 0.15s' }}
                                        onMouseOver={e =>
                                            e.currentTarget.style.background =
                                            'var(--hover-bg)'}
                                        onMouseOut={e =>
                                            e.currentTarget.style.background =
                                            'var(--input-bg)'}>
                                        <span style={{ fontSize: '22px',
                                            flexShrink: 0 }}>{icon}</span>
                                        <div style={{ minWidth: 0 }}>
                                            <p style={{ margin: 0,
                                                fontSize: '12px',
                                                fontWeight: '600',
                                                color: 'var(--text-primary)',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap' }}>
                                                {m.content}
                                            </p>
                                            <p style={{ margin: '2px 0 0',
                                                fontSize: '10px',
                                                color: 'var(--text-faint)' }}>
                                                {ext?.toUpperCase()} · {timeAgo(m.timestamp)}
                                            </p>
                                        </div>
                                    </a>
                                );
                            })}
                        </div>
                    )
                )}

                {/* Posts */}
                {tab === 'posts' && (
                    postItems.length === 0 ? (
                        <EmptyState icon="📄" text="No posts shared yet" />
                    ) : (
                        <div style={{ display: 'flex',
                            flexDirection: 'column', gap: '8px' }}>
                            {postItems.map(m => (
                                <div key={m.id}
                                    onClick={() => window.location.href =
                                        `/post/${m.sharedPostId}`}
                                    style={{ background: 'var(--input-bg)',
                                        border: '1px solid var(--border)',
                                        borderRadius: 'var(--radius-md)',
                                        overflow: 'hidden',
                                        cursor: 'pointer',
                                        transition: 'background 0.15s' }}
                                    onMouseOver={e =>
                                        e.currentTarget.style.background =
                                        'var(--hover-bg)'}
                                    onMouseOut={e =>
                                        e.currentTarget.style.background =
                                        'var(--input-bg)'}>
                                    {m.sharedPostImageUrls?.length > 0 && (
                                        <img
                                            src={`${BASE}${m.sharedPostImageUrls[0]}`}
                                            alt="post"
                                            style={{ width: '100%',
                                                height: '100px',
                                                objectFit: 'cover',
                                                display: 'block' }} />
                                    )}
                                    <div style={{ padding: '8px 10px' }}>
                                        <div style={{ display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            marginBottom: '4px' }}>
                                            <span style={{ fontSize: '10px',
                                                padding: '1px 6px',
                                                background: 'var(--primary-bg)',
                                                color: 'var(--primary)',
                                                borderRadius: '10px' }}>
                                                {m.sharedPostType}
                                            </span>
                                            <span style={{ fontSize: '10px',
                                                color: 'var(--text-faint)' }}>
                                                @{m.sharedPostUsername}
                                            </span>
                                        </div>
                                        {m.sharedPostContent && (
                                            <p style={{ margin: 0,
                                                fontSize: '11px',
                                                color: 'var(--text-primary)',
                                                overflow: 'hidden',
                                                display: '-webkit-box',
                                                WebkitLineClamp: 2,
                                                WebkitBoxOrient: 'vertical',
                                                lineHeight: '1.4' }}>
                                                {m.sharedPostContent}
                                            </p>
                                        )}
                                        <p style={{ margin: '4px 0 0',
                                            fontSize: '10px',
                                            color: 'var(--primary)',
                                            fontWeight: '500' }}>
                                            View Post →
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )
                )}

                {/* Links */}
                {tab === 'links' && (
                    linkItems.length === 0 ? (
                        <EmptyState icon="🔗" text="No links shared yet" />
                    ) : (
                        <div style={{ display: 'flex',
                            flexDirection: 'column', gap: '6px' }}>
                            {linkItems.map(m => {
                                const url = m.content.match(
                                    /https?:\/\/[^\s]+/)?.[0];
                                return (
                                    <a key={m.id} href={url}
                                        target="_blank" rel="noreferrer"
                                        style={{ display: 'block',
                                            padding: '10px',
                                            background: 'var(--input-bg)',
                                            border: '1px solid var(--border)',
                                            borderRadius: 'var(--radius-md)',
                                            textDecoration: 'none',
                                            transition: 'background 0.15s' }}
                                        onMouseOver={e =>
                                            e.currentTarget.style.background =
                                            'var(--hover-bg)'}
                                        onMouseOut={e =>
                                            e.currentTarget.style.background =
                                            'var(--input-bg)'}>
                                        <p style={{ margin: 0,
                                            fontSize: '11px',
                                            color: 'var(--primary)',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                            fontWeight: '500' }}>
                                            🔗 {url}
                                        </p>
                                        <p style={{ margin: '4px 0 0',
                                            fontSize: '10px',
                                            color: 'var(--text-faint)' }}>
                                            {timeAgo(m.timestamp)} · @{m.senderUsername}
                                        </p>
                                    </a>
                                );
                            })}
                        </div>
                    )
                )}
            </div>
        </div>
    );
};

// Small helper used in MediaPanel
const EmptyState = ({ icon, text }) => (
    <div style={{ textAlign: 'center', padding: '2rem 0' }}>
        <div style={{ fontSize: '32px', marginBottom: '8px' }}>{icon}</div>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
            {text}
        </p>
    </div>
);

const Avatar = ({ url, initial, size = 40 }) => (
    <div style={M.getAvatar(size, url ? `${BASE}${url}` : null)}>
        {!url && initial}
    </div>
);

const ConvItem = ({ conv, active, onClick }) => {
    const hasUnread = (conv.unreadCount || 0) > 0;
    return (
        <div onClick={onClick} style={{
            display: 'flex', alignItems: 'center', gap: '12px',
            padding: '12px 16px', cursor: 'pointer',
            background: active ? 'var(--primary-bg)'
                : hasUnread ? 'rgba(74,158,255,0.05)' : 'transparent',
            borderLeft: active
                ? '3px solid var(--primary)'
                : '3px solid transparent',
            transition: 'background 0.15s' }}
            onMouseOver={e => !active &&
                (e.currentTarget.style.background = 'var(--hover-bg)')}
            onMouseOut={e => !active &&
                (e.currentTarget.style.background =
                hasUnread ? 'rgba(74,158,255,0.05)' : 'transparent')}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
                <Avatar url={conv.otherProfilePicture} size={46}
                    initial={conv.otherUsername?.[0]?.toUpperCase()} />
                {hasUnread && (
                    <div style={{ position: 'absolute', top: 0, right: 0,
                        width: '10px', height: '10px',
                        background: 'var(--primary)', borderRadius: '50%',
                        border: '2px solid var(--card-bg-solid)' }} />
                )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center' }}>
                    <p style={{ fontSize: '14px',
                        fontWeight: hasUnread ? '700' : '600',
                        margin: 0, color: 'var(--text-primary)',
                        overflow: 'hidden', textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap', maxWidth: '140px' }}>
                        {conv.otherFullName || `@${conv.otherUsername}`}
                    </p>
                    <span style={{ fontSize: '11px',
                        color: 'var(--text-faint)', flexShrink: 0 }}>
                        {timeAgo(conv.lastMessageTime)}
                    </span>
                </div>
                <div style={{ display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center', marginTop: '2px' }}>
                    <p style={{ fontSize: '12px',
                        color: hasUnread
                            ? 'var(--text-primary)' : 'var(--text-muted)',
                        margin: 0, fontWeight: hasUnread ? '500' : '400',
                        overflow: 'hidden', textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap', maxWidth: '160px' }}>
                        {conv.lastMessage}
                    </p>
                    {hasUnread && (
                        <div style={{ background: 'var(--primary)',
                            color: '#fff', borderRadius: '50%',
                            width: '18px', height: '18px',
                            fontSize: '10px', display: 'flex',
                            alignItems: 'center', justifyContent: 'center',
                            fontWeight: '600', flexShrink: 0 }}>
                            {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const SharedPostCard = ({ msg }) => (
    <div onClick={() => window.location.href = `/post/${msg.sharedPostId}`}
        style={{ background: 'var(--card-bg-solid)',
            border: '1px solid var(--border)',
            borderRadius: '12px', overflow: 'hidden',
            width: '260px', cursor: 'pointer' }}>
        <div style={{ padding: '10px 12px',
            borderBottom: '1px solid var(--border-light)',
            display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={M.getAvatar(26, null)}>
                {msg.sharedPostUsername?.[0]?.toUpperCase()}
            </div>
            <p style={{ fontSize: '12px', fontWeight: '600',
                margin: 0, color: 'var(--text-primary)' }}>
                @{msg.sharedPostUsername}
            </p>
            <span style={{ fontSize: '10px', padding: '2px 6px',
                background: 'var(--input-bg)',
                color: 'var(--text-secondary)',
                borderRadius: '10px', marginLeft: 'auto' }}>
                {msg.sharedPostType}
            </span>
        </div>
        {msg.sharedPostImageUrls?.length > 0 && (
            <img src={`${BASE}${msg.sharedPostImageUrls[0]}`}
                alt="shared"
                style={{ width: '100%', height: '160px',
                    objectFit: 'cover', display: 'block' }} />
        )}
        {msg.sharedPostContent && (
            <div style={{ padding: '10px 12px' }}>
                {msg.sharedPostType === 'CODE' ? (
                    <pre style={{ background: '#0d1117', color: '#d4d4d4',
                        padding: '8px', borderRadius: '6px',
                        fontSize: '11px', margin: 0,
                        fontFamily: 'var(--font-mono)',
                        overflow: 'hidden', maxHeight: '60px' }}>
                        {msg.sharedPostContent}
                    </pre>
                ) : (
                    <p style={{ fontSize: '12px',
                        color: 'var(--text-primary)',
                        margin: 0, lineHeight: '1.5',
                        overflow: 'hidden',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical' }}>
                        {msg.sharedPostContent}
                    </p>
                )}
            </div>
        )}
        <div style={{ padding: '8px 12px',
            borderTop: '1px solid var(--border-light)',
            textAlign: 'center' }}>
            <p style={{ fontSize: '12px', color: 'var(--primary)',
                margin: 0, fontWeight: '500' }}>
                View Post →
            </p>
        </div>
    </div>
);

// ── Main Component ──────────────────────────────────────────────────────────
const MessagingPage = () => {
    const { token, user } = useAuth();
    const [showHeaderMenu, setShowHeaderMenu] = useState(false);

    const urlConvId = window.location.pathname.includes('/messages/')
        ? window.location.pathname.split('/').pop() : null;

    // ── 1-1 Chat States ────────────────────────────────────────────────────
    const [conversations, setConversations]   = useState([]);
    const [activeConvId, setActiveConvId]     = useState(
        urlConvId ? parseInt(urlConvId, 10) : null);
    const [messages, setMessages]             = useState([]);
    const [content, setContent]               = useState('');
    const [convLoading, setConvLoading]       = useState(true);
    const [msgLoading, setMsgLoading]         = useState(false);
    const [sending, setSending]               = useState(false);
    const [search, setSearch]                 = useState('');
    const [replyTo, setReplyTo]               = useState(null);
    const [editingMsg, setEditingMsg]         = useState(null);
    const [contextMenu, setContextMenu]       = useState(null);
    const [showForwardModal, setShowForwardModal] = useState(false);
    const [forwardingMsg, setForwardingMsg]   = useState(null);
    const [forwardLoading, setForwardLoading] = useState({});
    const [forwardedTo, setForwardedTo]       = useState({});
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deletingMsg, setDeletingMsg]       = useState(null);
    const [highlightedId, setHighlightedId]   = useState(null);
    const [isAtBottom, setIsAtBottom]         = useState(true);
    const [typingUser, setTypingUser]         = useState(null);

    // ── Refs ───────────────────────────────────────────────────────────────
    const bottomRef        = useRef(null);
    const msgAreaRef       = useRef(null);
    const inputRef         = useRef(null);
    const fileInputRef     = useRef(null);
    const typingTimeoutRef = useRef(null);
    const activeConvIdRef  = useRef(activeConvId);

    // ── Group States ───────────────────────────────────────────────────────
    const [activeTab, setActiveTab]           = useState('chats');
    const [groups, setGroups]                 = useState([]);
    const [activeGroupId, setActiveGroupId]   = useState(null);
    const [groupMessages, setGroupMessages]   = useState([]);
    const [groupMsgLoading, setGroupMsgLoading] = useState(false);
    const [showCreateGroup, setShowCreateGroup] = useState(false);
    const [showGroupInfo, setShowGroupInfo]   = useState(false);
    const [groupSearch, setGroupSearch]       = useState('');
    const [searchResults, setSearchResults]   = useState([]);
    const [searching, setSearching]           = useState(false);
    const [groupContent, setGroupContent]     = useState('');
    const [groupSending, setGroupSending]     = useState(false);
    const [groupReplyTo, setGroupReplyTo]     = useState(null);
    const [groupEditingMsg, setGroupEditingMsg] = useState(null);
    const [groupContextMenu, setGroupContextMenu] = useState(null);
    const [showGroupDeleteModal, setShowGroupDeleteModal] = useState(false);
    const [deletingGroupMsg, setDeletingGroupMsg] = useState(null);
    const [groupTypingUser, setGroupTypingUser] = useState(null);
    const [previewGroup, setPreviewGroup]     = useState(null);
    const [groupWsEvent, setGroupWsEvent] = useState(null);

    // ── Group Invite States ────────────────────────────────────────────────
    const [showGroupMenu, setShowGroupMenu]     = useState(false);
    const [showInviteInput, setShowInviteInput] = useState(false);
    const [inviteCodeInput, setInviteCodeInput] = useState('');
    const [inviteLoading, setInviteLoading]     = useState(false);
    const [inviteError, setInviteError]         = useState('');
    const [infoModal, setInfoModal] = useState(null);


    // ── Refs ───────────────────────────────────────────────────────────────
    const groupTypingTimeoutRef = useRef(null);
    const activeGroupIdRef      = useRef(null);
    const groupBottomRef        = useRef(null);
    const groupInputRef         = useRef(null);
    const groupFileInputRef     = useRef(null);


    //Search States
    const [showMsgSearch, setShowMsgSearch] = useState(false);
    const [msgSearchQuery, setMsgSearchQuery] = useState('');
    const [msgSearchResults, setMsgSearchResults] = useState([]);
    const msgSearchRef = useRef(null);

    const [showMediaPanel, setShowMediaPanel] = useState(false);
    const [mediaTab, setMediaTab] = useState('media');


    // ── Group Media Upload ─────────────────────────────────────────────────
    const handleGroupFileSelect = async (e) => {
        const files = Array.from(e.target.files);
        if (!files.length) return;
        setGroupSending(true);
        try {
            for (const file of files) {
                const msg = await sendGroupMedia(
                    token, activeGroupId, file,
                    groupReplyTo?.id || null);
                setGroupMessages(p =>
                    p.find(m => m.id === msg.id) ? p : [...p, msg]);
                broadcastGroupMessage(msg, activeGroupId);
                setGroups(prev => {
                    const idx = prev.findIndex(
                        g => g.id === activeGroupId);
                    if (idx === -1) return prev;
                    const updated = {
                        ...prev[idx],
                        lastMessage: msg.messageType === 'IMAGE'
                            ? '📷 Image'
                            : msg.messageType === 'VIDEO'
                            ? '🎥 Video' : '📎 File',
                        lastMessageTime: msg.timestamp
                    };
                    return [updated,
                        ...prev.filter((_, i) => i !== idx)];
                });
            }
            setGroupReplyTo(null);
            setTimeout(() => groupBottomRef.current
                ?.scrollIntoView({ behavior: 'smooth' }), 100);
        } catch (err) {
            console.error('Group file send:', err);
        } finally {
            setGroupSending(false);
            e.target.value = '';
        }
    };

    useEffect(() => {
        activeConvIdRef.current =
            activeConvId ? Number(activeConvId) : null;
    }, [activeConvId]);

    useEffect(() => {
        if (!showHeaderMenu) return;
        const close = () => setShowHeaderMenu(false);
        document.addEventListener('click', close);
        return () => document.removeEventListener('click', close);
    }, [showHeaderMenu]);

    const scrollToBottom = useCallback((force = false) => {
        if (force || isAtBottom) {
            bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [isAtBottom]);

    const handleMsgScroll = () => {
        const el = msgAreaRef.current;
        if (!el) return;
        setIsAtBottom(
            el.scrollHeight - el.scrollTop - el.clientHeight < 50);
    };

    // ── onMessage ──────────────────────────────────────────────────────────
    const onMessage = useCallback((msg) => {
        const type = msg.eventType;

        // ── Member join/leave system messages ──
        if (type === 'MEMBER_JOINED' || type === 'MEMBER_LEFT') {
            if (Number(msg.groupId) === Number(activeGroupIdRef.current)) {
                const sysMsg = {
                    id: `sys-${Date.now()}-${Math.random()}`,
                    messageType: 'SYSTEM',
                    content: type === 'MEMBER_JOINED'
                        ? `@${msg.username} joined the group`
                        : `@${msg.username} left the group`,
                    timestamp: new Date().toISOString(),
                    senderUsername: '__system__',
                };
                setGroupMessages(prev => [...prev, sysMsg]);
            }
            return;
        }

        if (msg.groupId) {
            if (type === 'EDIT') {
                setGroupMessages(prev => prev.map(m =>
                    m.id === msg.id
                        ? { ...m, content: msg.content,
                            isEdited: true, editedAt: msg.editedAt }
                        : m));
                return;
            }
            if (type === 'DELETE') {
                if (msg.deletedForEveryone) {
                    setGroupMessages(prev => prev.map(m =>
                        m.id === msg.id
                            ? { ...m, deletedForEveryone: true,
                                content: 'This message was deleted' }
                            : m));
                } else {
                    setGroupMessages(prev =>
                        prev.filter(m => m.id !== msg.id));
                }
                return;
            }
            setGroupMessages(prev => {
                if (prev.find(m => m.id === msg.id)) return prev;
                return [...prev, msg];
            });
            setTimeout(() => groupBottomRef.current
                ?.scrollIntoView({ behavior: 'smooth' }), 100);
            markGroupAsRead(token, msg.groupId).catch(() => {});
            return;
        }

        if (type === 'READ') {
            const convId = Number(msg.conversationId);
            if (convId === Number(activeConvIdRef.current)) {
                setMessages(prev => prev.map(m =>
                    m.senderUsername === user?.username
                        ? { ...m, isRead: true } : m));
            }
            return;
        }
        if (type === 'EDIT') {
            setMessages(prev => prev.map(m =>
                m.id === msg.id
                    ? { ...m, content: msg.content,
                        isEdited: true, editedAt: msg.editedAt }
                    : m));
            return;
        }
        if (type === 'DELETE') {
            if (msg.deletedForEveryone) {
                setMessages(prev => prev.map(m =>
                    m.id === msg.id
                        ? { ...m, deletedForEveryone: true,
                            content: 'This message was deleted' }
                        : m));
            } else {
                setMessages(prev => prev.filter(m => m.id !== msg.id));
            }
            return;
        }
        setMessages(prev => {
            if (prev.find(m => m.id === msg.id)) return prev;
            return [...prev, msg];
        });
        setTimeout(() => scrollToBottom(), 100);
        if (msg.senderUsername !== user?.username) {
            markAsRead(token, activeConvIdRef.current).catch(() => {});
        }
    }, [user?.username, token, scrollToBottom]);

    // ── onConvUpdate ───────────────────────────────────────────────────────
    const onConvUpdate = useCallback((msg) => {
    const type = msg.eventType;
    const msgConvId = Number(msg.conversationId);
    const isOwn = msg.senderUsername === user?.username;

    // ── Member events FIRST ──
    if (type === 'MEMBER_JOINED' ||
        type === 'MEMBER_LEFT' ||
        type === 'MEMBER_ROLE_CHANGED') {
        const gId = Number(msg.groupId);

        // Show system message in active group chat
        if (gId && gId === Number(activeGroupIdRef.current)
            && (type === 'MEMBER_JOINED' || type === 'MEMBER_LEFT')) {
            const sysMsg = {
                id: `sys-${Date.now()}-${Math.random()}`,
                messageType: 'SYSTEM',
                content: type === 'MEMBER_JOINED'
                    ? `@${msg.username} joined the group`
                    : `@${msg.username} left the group`,
                timestamp: new Date().toISOString(),
                senderUsername: '__system__',
            };
            setGroupMessages(prev => [...prev, sysMsg]);
            setTimeout(() => groupBottomRef.current
                ?.scrollIntoView({ behavior: 'smooth' }), 100);
        }

        // Update member count in groups list
        setGroups(prev => prev.map(g => {
            if (Number(g.id) !== gId) return g;
            if (type === 'MEMBER_JOINED')
                return { ...g, memberCount: (g.memberCount || 0) + 1 };
            if (type === 'MEMBER_LEFT')
                return { ...g,
                    memberCount: Math.max(0, (g.memberCount || 0) - 1) };
            return g;
        }));

        // Refresh full group data if this is active group
        if (gId && gId === Number(activeGroupIdRef.current)) {
            setGroupWsEvent({ type, groupId: gId,
            username: msg.username, ts: Date.now() });
            getGroup(token, gId).then(updated => {
                setGroups(prev => prev.map(g =>
                    g.id === updated.id ? updated : g));
            }).catch(() => {});
        }
        return;
    }

    if (type === 'GROUP_UPDATED') {
        const gId = Number(msg.groupId);
        setGroups(prev => prev.map(g => {
            if (Number(g.id) !== gId) return g;
            return {
                ...g,
                name: msg.name || g.name,
                description: msg.description ?? g.description,
                isPrivate: msg.isPrivate ?? g.isPrivate,
                onlyAdminsCanSend: msg.onlyAdminsCanSend ?? g.onlyAdminsCanSend,
                onlyAdminsCanAdd: msg.onlyAdminsCanAdd ?? g.onlyAdminsCanAdd,
                avatarUrl: msg.avatarUrl || g.avatarUrl,
            };
        }));
        // Also set wsEvent so GroupInfoPanel refreshes if open
        if (gId === Number(activeGroupIdRef.current)) {
            setGroupWsEvent({ type: 'GROUP_UPDATED',
                groupId: gId, ts: Date.now() });
        }
        return;
    }

        // ── Group message ──
        if (msg.groupId) {
            const msgGroupId = Number(msg.groupId);
            const isActiveGroup = msgGroupId === Number(activeGroupIdRef.current);
            setGroups(prev => {
                const idx = prev.findIndex(g => Number(g.id) === msgGroupId);
                if (idx === -1) return prev;
                const g = prev[idx];
                const updated = {
                    ...g,
                    lastMessage: msg.deletedForEveryone
                        ? 'This message was deleted'
                        : msg.messageType === 'IMAGE' ? '📷 Image'
                        : msg.messageType === 'VIDEO' ? '🎥 Video'
                        : msg.messageType === 'FILE'  ? '📎 File'
                        : msg.messageType === 'POST'  ? 'Shared a post'
                        : msg.content,
                    lastMessageTime: msg.timestamp,
                    unreadCount: (isActiveGroup || isOwn)
                        ? 0 : (g.unreadCount || 0) + 1
                };
                return [updated, ...prev.filter((_, i) => i !== idx)];
            });
            return;
        }

        // ── 1-1 conversation ──
        if (type === 'READ') {
            setConversations(prev => prev.map(c =>
                Number(c.id) === msgConvId
                    ? { ...c, unreadCount: 0 } : c));
            return;
        }
        if (type === 'EDIT' || type === 'DELETE') return;
        setConversations(prev => {
            const idx = prev.findIndex(c => Number(c.id) === msgConvId);
            if (idx === -1) return prev;
            const conv = prev[idx];
            const isActive = msgConvId === Number(activeConvIdRef.current);
            const updated = {
                ...conv,
                lastMessage: convLastMsgText(msg),
                lastMessageTime: msg.timestamp || new Date().toISOString(),
                unreadCount: (isActive || isOwn) ? 0 : (conv.unreadCount || 0) + 1
            };
            return [updated, ...prev.filter((_, i) => i !== idx)];
        });
    }, [user?.username, token]);

    // ── WebSocket ──────────────────────────────────────────────────────────
    const { sendMessage: wsSend, sendTyping,
        sendGroupMessage: wsGroupSend,
        sendGroupTyping, sendGroupEdit: wsGroupEdit,
        sendGroupDelete: wsGroupDelete,
        broadcastGroupMessage,
        isConnected } = useWebSocket({
        token,
        userId: user?.id,
        conversationId: activeTab === 'chats' ? activeConvId : null,
        groupId: activeTab === 'groups' ? activeGroupId : null,
        onMessage,
        onConvUpdate,
        onTyping: useCallback((data) => {
            if (activeTab === 'groups') {
                if (data.senderUsername === user?.username) return;
                setGroupTypingUser(data.senderUsername);
                clearTimeout(groupTypingTimeoutRef.current);
                groupTypingTimeoutRef.current = setTimeout(
                    () => setGroupTypingUser(null), 2000);
            } else {
                if (data.senderUsername === user?.username) return;
                setTypingUser(data.senderUsername);
                clearTimeout(typingTimeoutRef.current);
                typingTimeoutRef.current = setTimeout(
                    () => setTypingUser(null), 2000);
            }
        }, [user?.username, activeTab]),
    });

    const activeConv = conversations.find(c => c.id === activeConvId);
    const sortedConvs = [...conversations].sort((a, b) =>
        new Date(b.lastMessageTime || 0) -
        new Date(a.lastMessageTime || 0));

    const sortedGroups = [...groups].sort((a, b) =>
        new Date(b.lastMessageTime || b.createdAt || 0) -
        new Date(a.lastMessageTime || a.createdAt || 0));

    const filteredConvs = sortedConvs.filter(c =>
        c.otherUsername?.toLowerCase().includes(search.toLowerCase()) ||
        c.otherFullName?.toLowerCase().includes(search.toLowerCase()));
    const totalUnread = conversations.reduce(
        (s, c) => s + (c.unreadCount || 0), 0);

    // ── Load data ──────────────────────────────────────────────────────────
    useEffect(() => {
        loadConversations();
        const i = setInterval(loadConversations, 30000);
        return () => clearInterval(i);
    }, []);

    const loadConversations = useCallback(async () => {
        try {
            const data = await getAllConversations(token);
            setConversations(data);
        } catch (e) { console.error('loadConversations:', e); }
        finally { setConvLoading(false); }
    }, [token]);

    const loadGroups = useCallback(async () => {
        try {
            const data = await getMyGroups(token);
            setGroups(data);
        } catch (e) { console.error('loadGroups:', e); }
    }, [token]);

    useEffect(() => {
        loadGroups();
        const i = setInterval(loadGroups, 30000);
        return () => clearInterval(i);
    }, [loadGroups]);

    const loadGroupMessages = async (groupId) => {
        setGroupMsgLoading(true);
        try {
            const data = await getGroupMessages(token, groupId);
            setGroupMessages(data);
            setTimeout(() => groupBottomRef.current
                ?.scrollIntoView({ behavior: 'smooth' }), 100);
            await markGroupAsRead(token, groupId);
            setGroups(prev => prev.map(g =>
                g.id === groupId ? { ...g, unreadCount: 0 } : g));
        } catch (e) { console.error(e); }
        finally { setGroupMsgLoading(false); }
    };

    // ── Group actions ──────────────────────────────────────────────────────
    const selectGroup = (groupId) => {
        if (groupId === activeGroupId) return;
        setPreviewGroup(null);
        setActiveGroupId(groupId);
        activeGroupIdRef.current = groupId;
        setGroupMessages([]);
        setGroupContent('');
        setGroupReplyTo(null);
        setGroupEditingMsg(null);
        setShowGroupInfo(false);   
        setShowMediaPanel(false);   
        setGroupWsEvent(null);      
        loadGroupMessages(groupId);
    };

    const handleGroupSearch = async (q) => {
        setGroupSearch(q);
        if (!q.trim()) { setSearchResults([]); return; }
        setSearching(true);
        try {
            const data = await searchGroups(token, q);
            setSearchResults(data);
        } catch (e) {} finally { setSearching(false); }
    };

    const handleGroupSend = async () => {
        if (!groupContent.trim() || groupSending) return;
        setGroupSending(true);
        const msgContent = groupContent;
        const msgReplyTo = groupReplyTo;
        setGroupContent('');
        setGroupReplyTo(null);
        try {
            if (groupEditingMsg) {
                const sent = wsGroupEdit(
                    groupEditingMsg.id, msgContent, activeGroupId);
                if (!sent) {
                    const updated = await editGroupMessage(
                        token, groupEditingMsg.id, msgContent);
                    setGroupMessages(p => p.map(m =>
                        m.id === updated.id
                            ? { ...m, content: updated.content,
                                isEdited: true } : m));
                }
                setGroupEditingMsg(null);
                return;
            }
            const sent = wsGroupSend(
                msgContent, msgReplyTo?.id || null, activeGroupId);
            if (!sent) {
                const msg = await sendGroupMessage(
                    token, activeGroupId, msgContent,
                    msgReplyTo?.id || null);
                setGroupMessages(p =>
                    p.find(m => m.id === msg.id) ? p : [...p, msg]);
            }
            setTimeout(() => groupBottomRef.current
                ?.scrollIntoView({ behavior: 'smooth' }), 100);
        } catch (e) {
            console.error(e);
            setGroupContent(msgContent);
        } finally { setGroupSending(false); }
    };

    const handleGroupDeleteConfirm = async (forEveryone) => {
        try {
            const sent = wsGroupDelete(
                deletingGroupMsg.id, forEveryone, activeGroupId);
            if (!sent) {
                await deleteGroupMessage(
                    token, deletingGroupMsg.id, forEveryone);
                if (forEveryone) {
                    setGroupMessages(p => p.map(m =>
                        m.id === deletingGroupMsg.id
                            ? { ...m, deletedForEveryone: true,
                                content: 'This message was deleted' } : m));
                } else {
                    setGroupMessages(p =>
                        p.filter(m => m.id !== deletingGroupMsg.id));
                }
            }
        } finally {
            setShowGroupDeleteModal(false);
            setDeletingGroupMsg(null);
        }
    };

    // Add state for invite preview
    const [invitePreview, setInvitePreview] = useState(null);

    const handleFetchInviteInfo = async () => {
        if (!inviteCodeInput.trim() || inviteLoading) return;
        setInviteLoading(true);
        setInviteError('');
        try {
            const res = await fetch(
                `${BASE}/api/groups/invite-info/${inviteCodeInput.trim().toUpperCase()}`,
                { headers: { Authorization: `Bearer ${token}` }});

            const text = await res.text();
            let data = {};
            try { data = JSON.parse(text); } catch (_) {}

            if (!res.ok) {
                setInviteError(
                    data.message || 'Invalid invite code.');
                return;
            }

            // Already a member
            if (data.isMember) {
                setShowInviteInput(false);
                setInviteCodeInput('');
                setActiveTab('groups');
                await loadGroups();
                selectGroup(data.id);
                return;
            }

            // Show preview inside modal
            setInvitePreview(data);

        } catch (e) {
            setInviteError('Something went wrong.');
        } finally {
            setInviteLoading(false);
        }
    };

    const handleJoinByInviteCode = async () => {
        if (!invitePreview || inviteLoading) return;
        setInviteLoading(true);
        setInviteError('');
        try {
            const res = await fetch(
                `${BASE}/api/groups/invite/${inviteCodeInput.trim().toUpperCase()}`,
                { method: 'POST',
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json' }});

            const text = await res.text();
            let data = {};
            try { data = JSON.parse(text); } catch (_) {}

            if (!res.ok) {
                setInviteError(data.message || 'Something went wrong.');
                return;
            }

            setShowInviteInput(false);
            setInviteCodeInput('');
            setInvitePreview(null);
            await loadGroups();
            setActiveTab('groups');

            if (data.isMember) {
                selectGroup(data.id);
            } else if (data.hasPendingRequest) {
                setPreviewGroup(data);
                setActiveGroupId(data.id);
                activeGroupIdRef.current = data.id;
            } else {
                selectGroup(data.id);
            }
        } catch (e) {
            setInviteError('Something went wrong.');
        } finally {
            setInviteLoading(false);
        }
    };

    const activeGroup = groups.find(g => g.id === activeGroupId);
    const totalGroupUnread = groups.reduce(
        (s, g) => s + (g.unreadCount || 0), 0);

    // ── Conv actions ───────────────────────────────────────────────────────
    useEffect(() => {
        if (!activeConvId) return;
        loadMessages();
    }, [activeConvId]);

    useEffect(() => {
        activeGroupIdRef.current = activeGroupId;
    }, [activeGroupId]);

    useEffect(() => () =>
        clearTimeout(typingTimeoutRef.current), []);

    useEffect(() => {
        if (!contextMenu) return;
        const close = () => setContextMenu(null);
        document.addEventListener('click', close);
        return () => document.removeEventListener('click', close);
    }, [contextMenu]);

    useEffect(() => {
        if (!groupContextMenu) return;
        const close = () => setGroupContextMenu(null);
        document.addEventListener('click', close);
        return () => document.removeEventListener('click', close);
    }, [groupContextMenu]);

    useEffect(() => {
        if (!showGroupMenu) return;
        const close = () => setShowGroupMenu(false);
        document.addEventListener('click', close);
        return () => document.removeEventListener('click', close);
    }, [showGroupMenu]);

    const loadMessages = async () => {
        setMsgLoading(true);
        try {
            const data = await getMessages(token, activeConvId);
            setMessages(data);
            setTimeout(() => scrollToBottom(true), 100);
            setConversations(prev => prev.map(c =>
                c.id === activeConvId ? { ...c, unreadCount: 0 } : c));
            const hasUnread = data.some(m =>
                m.senderUsername !== user?.username && !m.isRead);
            if (hasUnread) {
                setTimeout(async () => {
                    try { await markAsRead(token, activeConvId); }
                    catch (e) { console.error('markAsRead:', e); }
                }, 800);
            }
        } catch (e) { console.error('loadMessages:', e); }
        finally { setMsgLoading(false); }
    };

    const selectConv = (convId) => {
        if (convId === activeConvId) return;
        setPreviewGroup(null);
        setActiveConvId(convId);
        setMessages([]);
        setContent('');
        setReplyTo(null);
        setEditingMsg(null);
        setShowMediaPanel(false);
        window.history.replaceState(null, '', `/messages/${convId}`);
    };

    const handleSend = async () => {
        if (!content.trim() || sending) return;
        setSending(true);
        const msgContent = content;
        const msgReplyTo = replyTo;
        setContent('');
        setReplyTo(null);
        try {
            if (editingMsg) {
                const updated = await editMessage(
                    token, editingMsg.id, msgContent);
                setMessages(p => p.map(m => m.id === updated.id
                    ? { ...m, content: updated.content,
                        isEdited: true, editedAt: updated.editedAt }
                    : m));
                setEditingMsg(null);
                return;
            }
            const sent = wsSend(msgContent, msgReplyTo?.id || null);
            if (!sent) {
                const { sendMessage } = await import(
                    '../../api/messagingApi');
                const msg = await sendMessage(
                    token, activeConvId, msgContent,
                    msgReplyTo?.id || null);
                setMessages(p =>
                    p.find(m => m.id === msg.id) ? p : [...p, msg]);
                onConvUpdate({ ...msg, senderUsername: user?.username });
            }
            setTimeout(() => scrollToBottom(true), 100);
        } catch (e) {
            console.error('Send error:', e);
            setContent(msgContent);
        } finally { setSending(false); }
    };

    const handleFileSelect = async (e) => {
        const files = Array.from(e.target.files);
        if (!files.length) return;
        setSending(true);
        try {
            for (const file of files) {
                const msg = await sendMedia(
                    token, activeConvId, file, replyTo?.id || null);
                setMessages(p =>
                    p.find(m => m.id === msg.id) ? p : [...p, msg]);
                onConvUpdate({ ...msg, senderUsername: user?.username });
            }
            setReplyTo(null);
            setTimeout(() => scrollToBottom(true), 100);
        } catch (e) { console.error('File send:', e); }
        finally { setSending(false); e.target.value = ''; }
    };

    const handleReply = (msg) => {
        setReplyTo(msg); setEditingMsg(null);
        setContent(''); setContextMenu(null);
        setTimeout(() => inputRef.current?.focus(), 100);
    };

    const handleEdit = (msg) => {
        setEditingMsg(msg); setContent(msg.content);
        setReplyTo(null); setContextMenu(null);
        setTimeout(() => inputRef.current?.focus(), 100);
    };

    const handleDeleteConfirm = async (forEveryone) => {
        try {
            await deleteMessage(token, deletingMsg.id, forEveryone);
            if (forEveryone) {
                setMessages(p => p.map(m => m.id === deletingMsg.id
                    ? { ...m, deletedForEveryone: true,
                        content: 'This message was deleted' } : m));
            } else {
                setMessages(p =>
                    p.filter(m => m.id !== deletingMsg.id));
            }
        } finally {
            setShowDeleteModal(false);
            setDeletingMsg(null);
        }
    };

    const handleForwardTo = async (convId) => {
        setForwardLoading(p => ({ ...p, [convId]: true }));
        try {
            await forwardMessage(token, forwardingMsg.id, convId);
            setForwardedTo(p => ({ ...p, [convId]: true }));
        } finally {
            setForwardLoading(p => ({ ...p, [convId]: false }));
        }
    };

    const handleMsgSearch = (q) => {
        setMsgSearchQuery(q);
        if (!q.trim()) {
            setMsgSearchResults([]);
            return;
        }
        const source = activeTab === 'groups'
            ? groupMessages : messages;
        const results = source.filter(m => {
            if (m.deletedForEveryone) return false;
            // Search text messages
            if (m.messageType === 'TEXT' &&
                m.content?.toLowerCase()
                .includes(q.toLowerCase())) return true;
            // Search file names
            if (m.messageType === 'FILE' &&
                m.content?.toLowerCase()
                .includes(q.toLowerCase())) return true;
            return false;
        });
        setMsgSearchResults(results);
    };

    const jumpToMessage = (msgId) => {
        const el = document.getElementById(`msg-${msgId}`);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setHighlightedId(msgId);
            setTimeout(() => setHighlightedId(null), 3000); // 3s
        }
        setShowMsgSearch(false);
        setMsgSearchQuery('');
        setMsgSearchResults([]);
    };

    const scrollToMessage = (msgId) => {
        const el = document.getElementById(`msg-${msgId}`);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setHighlightedId(msgId);
            setTimeout(() => setHighlightedId(null), 2500);
        }
    };

    const getMenuPosition = (x, y, itemCount) => {
        const menuH = itemCount * 44 + 8;
        const menuW = 180;
        const top  = (window.innerHeight - y) < menuH ? y - menuH : y;
        const left = (window.innerWidth  - x) < menuW ? x - menuW : x;
        return { position: 'fixed',
            top: Math.max(8, top), left: Math.max(8, left) };
    };

    const renderMedia = (msg, isOwn) => {
        const url  = msg.mediaUrl ? `${BASE}${msg.mediaUrl}` : null;
        const type = msg.messageType || msg.mediaType;
        if (!url) return (
            <div style={M.msgBubble(isOwn)}>
                📎 {msg.content || 'Media'}
            </div>
        );
        if (type === 'IMAGE') return (
            <img src={url} alt="media"
                style={{ maxWidth: '240px', maxHeight: '280px',
                    borderRadius: '10px', display: 'block',
                    cursor: 'pointer',
                    border: '1px solid var(--border)' }}
                onClick={() => window.open(url, '_blank')} />
        );
        if (type === 'VIDEO') return (
            <video controls preload="metadata"
                style={{ maxWidth: '240px', borderRadius: '10px',
                    display: 'block' }}>
                <source src={url} />
            </video>
        );
        if (type === 'FILE') {
            const ext = msg.content?.split('.').pop()?.toLowerCase();
            const icon = ext === 'pdf' ? '📄'
                : ext === 'zip' ? '🗜️'
                : (ext === 'doc' || ext === 'docx') ? '📝' : '📎';
            return (
                <a href={url} target="_blank" rel="noreferrer"
                    style={{ display: 'flex', alignItems: 'center',
                        gap: '10px', padding: '12px 16px',
                        background: isOwn
                            ? 'var(--msg-own-bg)' : 'var(--input-bg)',
                        borderRadius: '12px', textDecoration: 'none',
                        color: isOwn ? '#fff' : 'var(--text-primary)',
                        maxWidth: '240px',
                        border: '1px solid var(--border)' }}>
                    <span style={{ fontSize: '28px',
                        flexShrink: 0 }}>{icon}</span>
                    <div style={{ minWidth: 0 }}>
                        <p style={{ fontSize: '13px', fontWeight: '600',
                            margin: 0, overflow: 'hidden',
                            textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            color: isOwn ? '#fff' : 'var(--text-primary)' }}>
                            {msg.content}
                        </p>
                        <p style={{ fontSize: '11px', margin: '3px 0 0',
                            color: isOwn
                                ? 'rgba(255,255,255,0.7)'
                                : 'var(--text-muted)' }}>
                            {ext?.toUpperCase()} · Tap to open
                        </p>
                    </div>
                </a>
            );
        }
        return <div style={M.msgBubble(isOwn)}>{msg.content}</div>;
    };

    const buildMenuItems = (msg) => [
        { label: '↩️ Reply', action: () => handleReply(msg) },
        ...(msg.senderUsername === user?.username
            && msg.messageType === 'TEXT'
            ? [{ label: '✏️ Edit',
                action: () => handleEdit(msg) }] : []),
        { label: '↗️ Forward', action: () => {
            setForwardingMsg(msg);
            setShowForwardModal(true);
            setForwardedTo({});
            setContextMenu(null);
        }},
        ...(msg.senderUsername === user?.username
            ? [{ label: '🗑️ Delete', danger: true,
                action: () => {
                    setDeletingMsg(msg);
                    setShowDeleteModal(true);
                    setContextMenu(null);
                }}] : []),
    ];

    // ── Render ─────────────────────────────────────────────────────────────
    return (
        <div className="page" style={{ display: 'flex',
            flexDirection: 'column', height: '100vh',
            overflow: 'hidden' }}>
            <Navbar active="Messages" />

            <div style={{ display: 'flex', flex: 1, overflow: 'hidden',
                maxWidth: '1200px', width: '100%',
                margin: '0 auto', padding: '1rem', gap: '1rem' }}>

                {/* ── LEFT PANEL ── */}
                <div style={{ width: '320px', flexShrink: 0,
                    display: 'flex', flexDirection: 'column',
                    background: 'var(--card-bg-solid)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-lg)',
                    overflow: 'hidden' }}>

                    {/* Header */}
                    <div style={{ padding: '12px 16px',
                        borderBottom: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '10px' }}>
                            <h2 style={{ margin: 0, fontSize: '17px',
                                fontWeight: '700',
                                color: 'var(--text-primary)' }}>
                                Messages
                            </h2>

                            {/* + Group dropdown */}
                            <div style={{ position: 'relative' }}>
                                <button
                                    onClick={e => {
                                        e.stopPropagation();
                                        setShowGroupMenu(p => !p);
                                    }}
                                    className="btn-primary"
                                    style={{ padding: '5px 10px',
                                        fontSize: '12px' }}>
                                    + Group
                                </button>
                                {showGroupMenu && (
                                    <div style={{
                                        position: 'absolute',
                                        top: '32px', right: 0,
                                        background: 'var(--modal-bg)',
                                        border: '1px solid var(--border)',
                                        borderRadius: '10px',
                                        boxShadow:
                                            '0 8px 24px rgba(0,0,0,0.25)',
                                        zIndex: 200, overflow: 'hidden',
                                        minWidth: '180px' }}>
                                        <div
                                            onClick={e => {
                                                e.stopPropagation();
                                                setShowGroupMenu(false);
                                                setShowCreateGroup(true);
                                            }}
                                            style={{ padding: '11px 16px',
                                                fontSize: '13px',
                                                color: 'var(--text-primary)',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px' }}
                                            onMouseOver={e =>
                                                e.currentTarget.style
                                                .background =
                                                'var(--hover-bg)'}
                                            onMouseOut={e =>
                                                e.currentTarget.style
                                                .background = 'transparent'}>
                                            👥 Create Group
                                        </div>
                                        <div style={{ height: '1px',
                                            background:
                                                'var(--border-light)' }} />
                                        <div
                                            onClick={e => {
                                                e.stopPropagation();
                                                setShowGroupMenu(false);
                                                setShowInviteInput(true);
                                                setInviteError('');
                                                setInviteCodeInput('');
                                            }}
                                            style={{ padding: '11px 16px',
                                                fontSize: '13px',
                                                color: 'var(--text-primary)',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px' }}
                                            onMouseOver={e =>
                                                e.currentTarget.style
                                                .background =
                                                'var(--hover-bg)'}
                                            onMouseOut={e =>
                                                e.currentTarget.style
                                                .background = 'transparent'}>
                                            🔗 Join by Invite Code
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Tabs */}
                        <div style={{ display: 'flex',
                            background: 'var(--input-bg)',
                            borderRadius: 'var(--radius-md)',
                            padding: '2px', marginBottom: '10px' }}>
                            {[
                                { key: 'chats', label: 'Chats',
                                    unread: totalUnread },
                                { key: 'groups', label: 'Groups',
                                    unread: totalGroupUnread }
                            ].map(t => (
                                <button key={t.key}
                                    onClick={() => {
                                        setActiveTab(t.key);
                                        setPreviewGroup(null);
                                    }}
                                    style={{ flex: 1, padding: '7px 0',
                                        fontSize: '12px', fontWeight: '600',
                                        background: activeTab === t.key
                                            ? 'var(--card-bg-solid)'
                                            : 'transparent',
                                        border: 'none',
                                        borderRadius: 'var(--radius-sm)',
                                        color: activeTab === t.key
                                            ? 'var(--text-primary)'
                                            : 'var(--text-muted)',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s' }}>
                                    {t.label}
                                    {t.unread > 0 && (
                                        <span style={{ marginLeft: '4px',
                                            background: 'var(--danger)',
                                            color: '#fff',
                                            borderRadius: 'var(--radius-xl)',
                                            padding: '0 5px',
                                            fontSize: '10px' }}>
                                            {t.unread}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>

                        {/* Search */}
                        <input
                            value={activeTab === 'chats'
                                ? search : groupSearch}
                            onChange={e => activeTab === 'chats'
                                ? setSearch(e.target.value)
                                : handleGroupSearch(e.target.value)}
                            placeholder={activeTab === 'chats'
                                ? 'Search conversations...'
                                : 'Search groups...'}
                            className="input"
                            style={{ fontSize: '13px' }} />
                    </div>

                    {/* List */}
                    <div style={{ flex: 1, overflowY: 'auto' }}>
                        {activeTab === 'chats' ? (
                            convLoading ? (
                                <div className="empty-state"
                                    style={{ padding: '2rem' }}>
                                    Loading...
                                </div>
                            ) : filteredConvs.length === 0 ? (
                                <div style={{ padding: '2rem',
                                    textAlign: 'center' }}>
                                    <p style={{
                                        color: 'var(--text-muted)',
                                        fontSize: '14px',
                                        margin: '0 0 12px' }}>
                                        {search ? 'No results'
                                            : 'No conversations yet'}
                                    </p>
                                    {!search && (
                                        <button onClick={() =>
                                            window.location.href =
                                            '/explore'}
                                            className="btn-primary"
                                            style={{ padding: '8px 16px',
                                                fontSize: '13px' }}>
                                            Find Developers
                                        </button>
                                    )}
                                </div>
                            ) : filteredConvs.map(conv => (
                                <ConvItem key={conv.id} conv={conv}
                                    active={conv.id === activeConvId}
                                    onClick={() => {
                                        setActiveTab('chats');
                                        setPreviewGroup(null);
                                        selectConv(conv.id);
                                    }} />
                            ))
                        ) : (
                            groupSearch.trim() ? (
                                searching ? (
                                    <div className="empty-state"
                                        style={{ padding: '1rem' }}>
                                        Searching...
                                    </div>
                                ) : searchResults.length === 0 ? (
                                    <div style={{ padding: '2rem',
                                        textAlign: 'center' }}>
                                        <p style={{
                                            color: 'var(--text-muted)',
                                            fontSize: '13px' }}>
                                            No groups found
                                        </p>
                                    </div>
                                ) : searchResults.map(g => (
                                    <GroupListItem key={g.id} group={g}
                                        active={g.id === activeGroupId}
                                        onClick={() => {
                                            if (g.isMember) {
                                                selectGroup(g.id);
                                            } else {
                                                setPreviewGroup(g);
                                                setActiveGroupId(g.id);
                                                activeGroupIdRef.current =
                                                    g.id;
                                                setGroupMessages([]);
                                                setShowGroupInfo(false);
                                            }
                                        }} />
                                ))
                            ) : groups.length === 0 ? (
                                <div style={{ padding: '2rem',
                                    textAlign: 'center' }}>
                                    <p style={{
                                        color: 'var(--text-muted)',
                                        fontSize: '13px',
                                        margin: '0 0 12px' }}>
                                        No groups yet
                                    </p>
                                    <button onClick={() =>
                                        setShowCreateGroup(true)}
                                        className="btn-primary"
                                        style={{ padding: '8px 16px',
                                            fontSize: '13px' }}>
                                        Create a Group
                                    </button>
                                </div>
                            ) : sortedGroups.map(g => (
                                <GroupListItem key={g.id} group={g}
                                    active={g.id === activeGroupId}
                                    onClick={() => selectGroup(g.id)} />
                            ))
                        )}
                    </div>
                </div>

                {/* ── RIGHT PANEL ── */}
                <div style={{ flex: 1, display: 'flex',
                    gap: '0', overflow: 'hidden' }}>

                    <div style={{ flex: 1, display: 'flex',
                        flexDirection: 'column', overflow: 'hidden',
                        background: 'var(--card-bg-solid)',
                        border: '1px solid var(--border)',
                        borderRadius: showGroupInfo
                            ? 'var(--radius-lg) 0 0 var(--radius-lg)'
                            : 'var(--radius-lg)' }}>

                        {activeTab === 'groups' && activeGroupId ? (

                            // ── NON-MEMBER PREVIEW ──
                            previewGroup && !previewGroup.isMember ? (
                                <div style={{ flex: 1, display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '20px', padding: '2rem',
                                    textAlign: 'center' }}>

                                    <div style={{ width: '88px',
                                        height: '88px',
                                        borderRadius: '22px',
                                        background: 'var(--primary-bg)',
                                        border: '2px solid var(--primary-border)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '40px',
                                        overflow: 'hidden',
                                        flexShrink: 0 }}>
                                        {previewGroup.avatarUrl ? (
                                            <img
                                                src={`${BASE}${previewGroup.avatarUrl}`}
                                                alt="g"
                                                style={{ width: '100%',
                                                    height: '100%',
                                                    objectFit: 'cover' }} />
                                        ) : '👥'}
                                    </div>

                                    <div>
                                        <p style={{ fontSize: '22px',
                                            fontWeight: '700',
                                            margin: '0 0 6px',
                                            color: 'var(--text-primary)' }}>
                                            {previewGroup.name}
                                        </p>
                                        {previewGroup.description && (
                                            <p style={{ fontSize: '13px',
                                                color: 'var(--text-muted)',
                                                margin: '0 0 12px',
                                                maxWidth: '320px',
                                                lineHeight: '1.5' }}>
                                                {previewGroup.description}
                                            </p>
                                        )}
                                        <div style={{ display: 'flex',
                                            gap: '8px',
                                            justifyContent: 'center',
                                            flexWrap: 'wrap' }}>
                                            <span style={{ fontSize: '12px',
                                                padding: '4px 10px',
                                                borderRadius:
                                                    'var(--radius-xl)',
                                                background: 'var(--input-bg)',
                                                color:
                                                    'var(--text-secondary)' }}>
                                                👥 {previewGroup.memberCount}
                                                {' '}members
                                            </span>
                                            {previewGroup.isPrivate ? (
                                                <span style={{
                                                    fontSize: '12px',
                                                    padding: '4px 10px',
                                                    borderRadius:
                                                        'var(--radius-xl)',
                                                    background:
                                                        'var(--primary-bg)',
                                                    color: 'var(--primary)' }}>
                                                    🔒 Private Group
                                                </span>
                                            ) : (
                                                <span style={{
                                                    fontSize: '12px',
                                                    padding: '4px 10px',
                                                    borderRadius:
                                                        'var(--radius-xl)',
                                                    background:
                                                        'var(--hover-bg)',
                                                    color:
                                                        'var(--text-secondary)' }}>
                                                    🌐 Public Group
                                                </span>
                                            )}
                                            {previewGroup.onlyAdminsCanSend && (
                                                <span style={{
                                                    fontSize: '12px',
                                                    padding: '4px 10px',
                                                    borderRadius:
                                                        'var(--radius-xl)',
                                                    background:
                                                        'var(--hover-bg)',
                                                    color:
                                                        'var(--text-secondary)' }}>
                                                    ✍️ Admins Only
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {previewGroup.hasPendingRequest ? (
                                        <div style={{ textAlign: 'center' }}>
                                            <div style={{ padding: '14px 28px',
                                                background: 'var(--hover-bg)',
                                                border: '1px solid var(--border)',
                                                borderRadius: 'var(--radius-lg)',
                                                fontSize: '14px',
                                                color: 'var(--text-muted)' }}>
                                                ⏳ Join request pending...
                                            </div>
                                            <p style={{ fontSize: '12px',
                                                color: 'var(--text-faint)', marginTop: '8px' }}>
                                                Waiting for admin approval
                                            </p>
                                        </div>
                                    ) : previewGroup.isRejected ? (
                                        // ← NEW: rejected state
                                        <div style={{ textAlign: 'center' }}>
                                            <div style={{ padding: '14px 28px',
                                                background: 'var(--danger-bg)',
                                                border: '1px solid var(--danger)',
                                                borderRadius: 'var(--radius-lg)',
                                                fontSize: '14px',
                                                color: 'var(--danger)',
                                                marginBottom: '12px' }}>
                                                ❌ Your request was declined
                                            </div>
                                            <button
                                                className="btn-secondary"
                                                style={{ padding: '10px 28px',
                                                    fontSize: '14px', fontWeight: '600' }}
                                                onClick={async () => {
                                                    try {
                                                        await joinGroup(token, previewGroup.id);
                                                        setPreviewGroup(p => ({
                                                            ...p,
                                                            isRejected: false,
                                                            hasPendingRequest: true
                                                        }));
                                                    } catch (e) {
                                                        alert(e.response?.data?.message || e.message);
                                                    }
                                                }}>
                                                📨 Send Request Again
                                            </button>
                                            <p style={{ fontSize: '12px',
                                                color: 'var(--text-faint)', margin: '8px 0 0' }}>
                                                You can request to join again
                                            </p>
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center', gap: '8px' }}>
                                            <button
                                                className="btn-primary"
                                                style={{ padding: '12px 36px',
                                                    fontSize: '15px', fontWeight: '600',
                                                    borderRadius: 'var(--radius-xl)' }}
                                                    onClick={async () => {
                                                        try {
                                                            await joinGroup(token, previewGroup.id);
                                                            if (previewGroup.isPrivate) {
                                                                setPreviewGroup(p => ({
                                                                    ...p, hasPendingRequest: true }));
                                                            } else {
                                                                setPreviewGroup(null);
                                                                await loadGroups();
                                                                selectGroup(previewGroup.id);
                                                            }
                                                        } catch (e) {
                                                            // Handle both Axios errors and plain errors
                                                            const msg = e.response?.data?.message
                                                                || e.response?.data
                                                                || e.message
                                                                || 'Something went wrong.';

                                                            if (typeof msg === 'string'
                                                                && msg.toLowerCase().includes('full')) {
                                                                setInfoModal({
                                                                    icon: '🚫',
                                                                    iconBg: 'var(--danger-bg)',
                                                                    title: 'Group is Full',
                                                                    message: 'This group has reached its maximum member limit.'
                                                                });
                                                            } else if (typeof msg === 'string'&& msg.toLowerCase().includes('private')) {
                                                                setInfoModal({
                                                                    icon: '🔒',
                                                                    iconBg: 'var(--primary-bg)',
                                                                    title: 'Private Group',
                                                                    message: 'This group is private. Search for it to send a join request.'
                                                                });
                                                            } else {
                                                                setInfoModal({
                                                                    icon: '⚠️',
                                                                    iconBg: 'var(--danger-bg)',
                                                                    title: 'Could Not Join',
                                                                    message: typeof msg === 'string'
                                                                        ? msg : 'Something went wrong. Please try again.'
                                                                });
                                                            }
                                                        }
                                                    }}> 
                                                {previewGroup.isPrivate
                                                    ? '📨 Request to Join'
                                                    : '➕ Join Group'}
                                            </button>
                                            <p style={{ fontSize: '12px',
                                                color: 'var(--text-faint)', margin: 0 }}>
                                                {previewGroup.isPrivate
                                                    ? 'An admin will review your request'
                                                    : 'Join instantly and start chatting'}
                                            </p>
                                        </div>
                                    )}
                                </div>

                            ) : (
                                // ── GROUP CHAT ──
                                <>
                                    {/* Group Header */}
                                    <div style={{ padding: '14px 20px',
                                        borderBottom: '1px solid var(--border)',
                                        display: 'flex', alignItems: 'center',
                                        gap: '12px', flexShrink: 0 }}>

                                        <div onClick={() => setShowGroupInfo(p => !p)}
                                            style={{ width: '40px', height: '40px',
                                                borderRadius: '12px',
                                                background: 'var(--primary-bg)',
                                                display: 'flex', alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: '20px', overflow: 'hidden',
                                                flexShrink: 0, cursor: 'pointer' }}>
                                            {activeGroup?.avatarUrl ? (
                                                <img src={`${BASE}${activeGroup.avatarUrl}`}
                                                    alt="g" style={{ width: '100%',
                                                        height: '100%', objectFit: 'cover' }} />
                                            ) : '👥'}
                                        </div>

                                        <div style={{ flex: 1, cursor: 'pointer' }}
                                            onClick={() => setShowGroupInfo(p => !p)}>
                                            <p style={{ fontSize: '15px', fontWeight: '600',
                                                margin: 0, color: 'var(--text-primary)' }}>
                                                {activeGroup?.name}
                                            </p>
                                            <p style={{ fontSize: '11px',
                                                color: 'var(--text-muted)', margin: 0 }}>
                                                {activeGroup?.memberCount} members
                                                {activeGroup?.onlyAdminsCanSend
                                                    && ' · Admins only'}
                                            </p>
                                        </div>

                                        {/* 3-dot menu — horizontal design */}
                                        <div style={{ position: 'relative' }}>
                                            <button
                                                onClick={e => {
                                                    e.stopPropagation();
                                                    setShowHeaderMenu(p => !p);
                                                }}
                                                style={{ width: '36px', height: '36px',
                                                    borderRadius: '8px', border: 'none',
                                                    background: showHeaderMenu
                                                        ? 'var(--hover-bg)' : 'transparent',
                                                    cursor: 'pointer', display: 'flex',
                                                    alignItems: 'center', justifyContent: 'center',
                                                    gap: '3px', transition: 'background 0.15s',
                                                    flexShrink: 0 }}
                                                title="Options">
                                                {[0,1,2].map(i => (
                                                    <div key={i} style={{ width: '4px', height: '4px',
                                                        borderRadius: '50%',
                                                        background: 'var(--text-muted)' }} />
                                                ))}
                                            </button>
                                            {showHeaderMenu && (
                                                <div style={{
                                                    position: 'absolute',
                                                    right: 0, top: '40px',
                                                    background: 'var(--modal-bg)',
                                                    border: '1px solid var(--border)',
                                                    borderRadius: '10px',
                                                    boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
                                                    zIndex: 200, overflow: 'hidden',
                                                    minWidth: '200px' }}
                                                    onClick={e => e.stopPropagation()}>

                                                {/* Group Info */}
                                                <div onClick={() => {
                                                        setShowHeaderMenu(false);
                                                        setShowGroupInfo(p => !p);
                                                        setShowMediaPanel(false);
                                                    }}
                                                    style={{ padding: '11px 16px', fontSize: '13px',
                                                        color: 'var(--text-primary)', cursor: 'pointer',
                                                        display: 'flex', alignItems: 'center', gap: '10px' }}
                                                    onMouseOver={e => e.currentTarget.style.background = 'var(--hover-bg)'}
                                                    onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                                                    <span style={{ fontSize: '15px' }}>ℹ️</span>
                                                    Group Info
                                                </div>

                                                <div style={{ height: '1px', background: 'var(--border-light)' }} />

                                                {/* Search Messages */}
                                                <div onClick={() => {
                                                        setShowHeaderMenu(false);
                                                        setShowMsgSearch(p => !p);
                                                        setMsgSearchQuery('');
                                                        setMsgSearchResults([]);
                                                        setTimeout(() => msgSearchRef.current?.focus(), 150);
                                                    }}
                                                    style={{ padding: '11px 16px', fontSize: '13px',
                                                        color: 'var(--text-primary)', cursor: 'pointer',
                                                        display: 'flex', alignItems: 'center', gap: '10px' }}
                                                    onMouseOver={e => e.currentTarget.style.background = 'var(--hover-bg)'}
                                                    onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                                                        stroke="currentColor" strokeWidth="2.5"
                                                        strokeLinecap="round" strokeLinejoin="round">
                                                        <circle cx="11" cy="11" r="8"/>
                                                        <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                                                    </svg>
                                                    Search Messages
                                                </div>

                                                <div style={{ height: '1px', background: 'var(--border-light)' }} />

                                                {/* Shared Media */}
                                                <div onClick={() => {
                                                        setShowHeaderMenu(false);
                                                        setShowMediaPanel(p => !p);
                                                        setShowGroupInfo(false);
                                                        setMediaTab('media');
                                                    }}
                                                    style={{ padding: '11px 16px', fontSize: '13px',
                                                        color: 'var(--text-primary)', cursor: 'pointer',
                                                        display: 'flex', alignItems: 'center', gap: '10px' }}
                                                    onMouseOver={e => e.currentTarget.style.background = 'var(--hover-bg)'}
                                                    onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                                                        stroke="currentColor" strokeWidth="2.5"
                                                        strokeLinecap="round" strokeLinejoin="round">
                                                        <rect x="3" y="3" width="18" height="18" rx="2"/>
                                                        <circle cx="8.5" cy="8.5" r="1.5"/>
                                                        <polyline points="21 15 16 10 5 21"/>
                                                    </svg>
                                                    Shared Media
                                                </div>

                                                <div style={{ height: '1px', background: 'var(--border-light)' }} />

                                                {/* Shared Posts */}
                                                <div onClick={() => {
                                                        setShowHeaderMenu(false);
                                                        setShowMediaPanel(p => !p);
                                                        setShowGroupInfo(false);
                                                        setMediaTab('posts');
                                                    }}
                                                    style={{ padding: '11px 16px', fontSize: '13px',
                                                        color: 'var(--text-primary)', cursor: 'pointer',
                                                        display: 'flex', alignItems: 'center', gap: '10px' }}
                                                    onMouseOver={e => e.currentTarget.style.background = 'var(--hover-bg)'}
                                                    onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                                                        stroke="currentColor" strokeWidth="2.5"
                                                        strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                                        <polyline points="14 2 14 8 20 8"/>
                                                    </svg>
                                                    Shared Posts
                                                </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Message Search Bar */}
                                    {showMsgSearch && (
                                        <div style={{ padding: '8px 16px',
                                            borderBottom: '1px solid var(--border)',
                                            background: 'var(--primary-bg)',
                                            flexShrink: 0 }}>
                                            <div style={{ position: 'relative' }}>
                                                <input
                                                    ref={msgSearchRef}
                                                    value={msgSearchQuery}
                                                    onChange={e =>
                                                        handleMsgSearch(e.target.value)}
                                                    placeholder="Search in this chat..."
                                                    className="input"
                                                    style={{ fontSize: '13px',
                                                        paddingRight: '80px' }} />
                                                <div style={{ position: 'absolute',
                                                    right: '8px', top: '50%',
                                                    transform: 'translateY(-50%)',
                                                    display: 'flex', alignItems: 'center',
                                                    gap: '6px' }}>
                                                    {msgSearchQuery && (
                                                        <span style={{ fontSize: '11px',
                                                            color: 'var(--text-muted)' }}>
                                                            {msgSearchResults.length} found
                                                        </span>
                                                    )}
                                                    <button
                                                        onClick={() => {
                                                            setShowMsgSearch(false);
                                                            setMsgSearchQuery('');
                                                            setMsgSearchResults([]);
                                                        }}
                                                        className="btn-icon"
                                                        style={{ fontSize: '16px' }}>
                                                        ×
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Search results dropdown */}
                                            {msgSearchQuery && msgSearchResults.length > 0 && (
                                                <div style={{ marginTop: '6px',
                                                    maxHeight: '200px', overflowY: 'auto',
                                                    background: 'var(--card-bg-solid)',
                                                    border: '1px solid var(--border)',
                                                    borderRadius: 'var(--radius-md)',
                                                    boxShadow: '0 4px 16px rgba(0,0,0,0.15)' }}>
                                                    {msgSearchResults.map(msg => (
                                                        <div key={msg.id}
                                                            onClick={() => jumpToMessage(msg.id)}
                                                            style={{ padding: '10px 14px',
                                                                cursor: 'pointer',
                                                                borderBottom:
                                                                    '1px solid var(--border-light)',
                                                                transition: 'background 0.15s' }}
                                                            onMouseOver={e =>
                                                                e.currentTarget.style.background =
                                                                'var(--hover-bg)'}
                                                            onMouseOut={e =>
                                                                e.currentTarget.style.background =
                                                                'transparent'}>
                                                            <p style={{ margin: '0 0 2px',
                                                                fontSize: '11px',
                                                                color: 'var(--primary)',
                                                                fontWeight: '600' }}>
                                                                @{msg.senderUsername}
                                                            </p>
                                                            {/* In search results map: */}
                                                            <p style={{ margin: '0 0 2px',
                                                                fontSize: '11px',
                                                                color: 'var(--primary)',
                                                                fontWeight: '600' }}>
                                                                {msg.messageType === 'FILE' ? '📎 File' : ''}
                                                                @{msg.senderUsername}
                                                            </p>
                                                            <p style={{ margin: 0, fontSize: '12px',
                                                                color: 'var(--text-primary)',
                                                                overflow: 'hidden',
                                                                textOverflow: 'ellipsis',
                                                                whiteSpace: 'nowrap' }}>
                                                                {msg.messageType === 'FILE'
                                                                    ? `📎 ${msg.content}`
                                                                    : (() => {
                                                                        const content = msg.content || '';
                                                                        const idx = content.toLowerCase()
                                                                            .indexOf(msgSearchQuery.toLowerCase());
                                                                        if (idx === -1) return content;
                                                                        return (
                                                                            <>
                                                                                {content.slice(0, idx)}
                                                                                <mark style={{
                                                                                    background: 'var(--primary-bg)',
                                                                                    color: 'var(--primary)',
                                                                                    borderRadius: '2px',
                                                                                    padding: '0 2px',
                                                                                    fontWeight: '600' }}>
                                                                                    {content.slice(idx,
                                                                                        idx + msgSearchQuery.length)}
                                                                                </mark>
                                                                                {content.slice(
                                                                                    idx + msgSearchQuery.length)}
                                                                            </>
                                                                        );
                                                                    })()
                                                                }
                                                            </p>
                                                            <p style={{ margin: '2px 0 0',
                                                                fontSize: '10px',
                                                                color: 'var(--text-faint)' }}>
                                                                {new Date(msg.timestamp)
                                                                    .toLocaleString()}
                                                            </p>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {msgSearchQuery
                                                && msgSearchResults.length === 0 && (
                                                <p style={{ margin: '6px 0 0',
                                                    fontSize: '12px',
                                                    color: 'var(--text-muted)',
                                                    textAlign: 'center' }}>
                                                    No messages found for "{msgSearchQuery}"
                                                </p>
                                            )}
                                        </div>
                                    )}

                                    {/* Group Messages */}
                                    <div style={{ flex: 1,
                                        overflowY: 'auto',
                                        padding: '16px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '4px' }}>
                                        {groupMsgLoading ? (
                                            <div style={{ display: 'flex',
                                                justifyContent: 'center',
                                                alignItems: 'center',
                                                flex: 1 }}>
                                                <p style={{
                                                    color:
                                                        'var(--text-muted)' }}>
                                                    Loading messages...
                                                </p>
                                            </div>
                                        ) : groupMessages.length === 0 ? (
                                            <div style={{ display: 'flex',
                                                justifyContent: 'center',
                                                alignItems: 'center',
                                                flex: 1 }}>
                                                <p style={{
                                                    color: 'var(--text-muted)',
                                                    fontSize: '14px' }}>
                                                    No messages yet.
                                                    Say hello! 👋
                                                </p>
                                            </div>
                                        ) : groupMessages.map((msg, idx) => {
                                            const isOwn = msg.senderUsername === user?.username;
                                            const isDeleted = msg.deletedForEveryone;
                                            const showTime = idx === 0 || Math.abs(
                                                new Date(msg.timestamp) -
                                                new Date(groupMessages[idx-1].timestamp)) > 300000;

                                            // ── System message ──
                                            if (msg.messageType === 'SYSTEM') {
                                                return (
                                                    <div key={msg.id} style={{ textAlign: 'center',
                                                        margin: '8px 0' }}>
                                                        <span style={{ fontSize: '11px',
                                                            color: 'var(--text-faint)',
                                                            background: 'var(--hover-bg)',
                                                            padding: '4px 12px',
                                                            borderRadius: '20px',
                                                            display: 'inline-block' }}>
                                                            {msg.content}
                                                        </span>
                                                    </div>
                                                );
                                            }
  

                                            return (
                                                <div key={msg.id} id={`msg-${msg.id}`}
                                                    style={{
                                                        borderRadius: '10px',
                                                        transition: 'background 0.3s',
                                                        background: highlightedId === msg.id
                                                            ? 'var(--primary-bg)' : 'transparent',
                                                        outline: highlightedId === msg.id
                                                            ? '2px solid var(--primary-border)' : 'none',
                                                    }}>
                                                    {showTime && (
                                                        <p style={{
                                                            textAlign: 'center',
                                                            fontSize: '11px',
                                                            color:
                                                                'var(--text-faint)',
                                                            margin: '8px 0' }}>
                                                            {timeAgo(
                                                                msg.timestamp)}
                                                        </p>
                                                    )}
                                                    {!isOwn && (idx === 0 ||
                                                        groupMessages[idx-1]
                                                        .senderUsername !==
                                                        msg.senderUsername) && (
                                                        <p style={{
                                                            fontSize: '11px',
                                                            color:
                                                                'var(--primary)',
                                                            fontWeight: '600',
                                                            margin:
                                                                '4px 0 2px 36px' }}>
                                                            @{msg.senderUsername}
                                                        </p>
                                                    )}
                                                    <div
                                                        onContextMenu={e => {
                                                            if (isDeleted)
                                                                return;
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            setGroupContextMenu(
                                                                { x: e.clientX,
                                                                  y: e.clientY,
                                                                  msg });
                                                        }}
                                                        style={{ display: 'flex',
                                                            justifyContent:
                                                                isOwn
                                                                ? 'flex-end'
                                                                : 'flex-start',
                                                            alignItems:
                                                                'flex-end',
                                                            gap: '8px',
                                                            marginBottom: '2px',
                                                            padding: '2px 4px' }}>

                                                        {!isOwn && (
                                                            <div style={
                                                                M.avatarBase(28)}>
                                                                {msg.senderUsername
                                                                    ?.[0]
                                                                    ?.toUpperCase()}
                                                            </div>
                                                        )}

                                                        <div style={{
                                                            maxWidth: '65%' }}>
                                                            {msg.replyToId
                                                                && !isDeleted && (
                                                                <div style={
                                                                    M.replyPreview()}>
                                                                    <p style={{
                                                                        fontSize:
                                                                            '11px',
                                                                        fontWeight:
                                                                            '600',
                                                                        margin:
                                                                            '0 0 2px',
                                                                        color:
                                                                            'var(--primary)' }}>
                                                                        @{msg.replyToSenderUsername}
                                                                    </p>
                                                                    <p style={{
                                                                        fontSize:
                                                                            '11px',
                                                                        color:
                                                                            'var(--text-muted)',
                                                                        margin: 0,
                                                                        overflow:
                                                                            'hidden',
                                                                        textOverflow:
                                                                            'ellipsis',
                                                                        whiteSpace:
                                                                            'nowrap',
                                                                        maxWidth:
                                                                            '200px' }}>
                                                                        {msg.replyToContent}
                                                                    </p>
                                                                </div>
                                                            )}

                                                            {isDeleted ? (
                                                                <div style={{
                                                                    padding:
                                                                        '8px 12px',
                                                                    background:
                                                                        'var(--input-bg)',
                                                                    borderRadius:
                                                                        '12px',
                                                                    fontSize:
                                                                        '13px',
                                                                    color:
                                                                        'var(--text-faint)',
                                                                    fontStyle:
                                                                        'italic',
                                                                    border:
                                                                        '1px solid var(--border)' }}>
                                                                    🚫 This message was deleted
                                                                </div>
                                                            ) : msg.messageType
                                                                === 'POST' &&
                                                                msg.sharedPostId
                                                                ? (
                                                                <SharedPostCard
                                                                    msg={msg} />
                                                            ) : ['IMAGE',
                                                                'VIDEO',
                                                                'FILE'].includes(
                                                                msg.messageType)
                                                                ? (
                                                                renderMedia(
                                                                    msg, isOwn)
                                                            ) : (
                                                                <div style={
                                                                    M.msgBubble(
                                                                        isOwn)}>
                                                                    {msg.content}
                                                                </div>
                                                            )}

                                                            {!isDeleted
                                                                && msg.isEdited && (
                                                                <div style={{
                                                                    display:
                                                                        'flex',
                                                                    justifyContent:
                                                                        isOwn
                                                                        ? 'flex-end'
                                                                        : 'flex-start',
                                                                    marginTop:
                                                                        '2px' }}>
                                                                    <span style={{
                                                                        fontSize:
                                                                            '10px',
                                                                        color:
                                                                            'var(--text-faint)',
                                                                        fontStyle:
                                                                            'italic' }}>
                                                                        edited
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}

                                        {groupTypingUser && (
                                            <div style={{ display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                                padding: '4px 8px' }}>
                                                <div style={{ display: 'flex',
                                                    gap: '3px',
                                                    alignItems: 'center' }}>
                                                    {[0,1,2].map(i => (
                                                        <div key={i} style={{
                                                            width: '6px',
                                                            height: '6px',
                                                            borderRadius: '50%',
                                                            background:
                                                                'var(--text-muted)',
                                                            animation:
                                                                'pulse 1.2s ease-in-out infinite',
                                                            animationDelay:
                                                                `${i*0.2}s` }} />
                                                    ))}
                                                </div>
                                                <span style={{ fontSize: '12px',
                                                    color: 'var(--text-muted)',
                                                    fontStyle: 'italic' }}>
                                                    {groupTypingUser}
                                                    {' '}is typing...
                                                </span>
                                            </div>
                                        )}
                                        <div ref={groupBottomRef} />
                                    </div>

                                    {/* Group Reply/Edit Bar */}
                                    {(groupReplyTo || groupEditingMsg) && (
                                        <div style={{
                                            background: 'var(--primary-bg)',
                                            borderTop:
                                                '1px solid var(--border)',
                                            padding: '8px 16px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '10px', flexShrink: 0 }}>
                                            <div style={{ flex: 1 }}>
                                                <p style={{ fontSize: '12px',
                                                    fontWeight: '600',
                                                    margin: 0,
                                                    color: 'var(--primary)' }}>
                                                    {groupReplyTo
                                                        ? `↩️ Replying to @${groupReplyTo.senderUsername}`
                                                        : '✏️ Editing message'}
                                                </p>
                                                <p style={{ fontSize: '12px',
                                                    color: 'var(--text-muted)',
                                                    margin: '2px 0 0',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap',
                                                    maxWidth: '80%' }}>
                                                    {groupReplyTo?.content
                                                        || groupEditingMsg
                                                            ?.content}
                                                </p>
                                            </div>
                                            <button onClick={() => {
                                                setGroupReplyTo(null);
                                                setGroupEditingMsg(null);
                                                setGroupContent('');
                                            }} className="btn-icon"
                                                style={{ fontSize: '18px' }}>
                                                ×
                                            </button>
                                        </div>
                                    )}

                                    {/* Group Input */}
                                    {activeGroup && (
                                        activeGroup.onlyAdminsCanSend
                                        && !activeGroup.isAdmin ? (
                                            <div style={{
                                                padding: '12px 16px',
                                                borderTop:
                                                    '1px solid var(--border)',
                                                textAlign: 'center' }}>
                                                <p style={{
                                                    textAlign: 'center',
                                                    padding: '1rem',
                                                    color: 'var(--text-muted)',
                                                    fontSize: '13px' }}>
                                                    Only admins can send messages
                                                </p>
                                            </div>
                                        ) : (
                                            <div style={M.chatInputArea()}>
                                                {!groupEditingMsg && (
                                                    <button onClick={() =>
                                                        groupFileInputRef
                                                        .current?.click()}
                                                        className="btn-icon"
                                                        style={{ fontSize: '20px',
                                                            flexShrink: 0 }}>
                                                        📎
                                                    </button>
                                                )}
                                                <input type="file"
                                                    ref={groupFileInputRef}
                                                    onChange={
                                                        handleGroupFileSelect}
                                                    multiple
                                                    accept="image/*,video/*,.pdf,.zip,.doc,.docx,.txt"
                                                    style={{ display: 'none' }} />
                                                <input ref={groupInputRef}
                                                    value={groupContent}
                                                    onChange={e => {
                                                        setGroupContent(
                                                            e.target.value);
                                                        if (e.target.value
                                                            .trim() &&
                                                            activeGroupId &&
                                                            isConnected()) {
                                                            sendGroupTyping(
                                                                user?.username,
                                                                activeGroupId);
                                                        }
                                                    }}
                                                    onKeyDown={e =>
                                                        e.key === 'Enter' &&
                                                        !e.shiftKey &&
                                                        handleGroupSend()}
                                                    placeholder=
                                                        "Message group..."
                                                    className="input"
                                                    style={{ flex: 1,
                                                        fontSize: '14px',
                                                        borderRadius:
                                                            'var(--radius-xl)',
                                                        padding: '10px 16px' }} />
                                                <button
                                                    onClick={handleGroupSend}
                                                    disabled={groupSending}
                                                    style={{ width: '40px',
                                                        height: '40px',
                                                        background:
                                                            groupContent.trim()
                                                            ? 'var(--btn-gradient)'
                                                            : 'var(--border)',
                                                        border: 'none',
                                                        borderRadius: '50%',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent:
                                                            'center',
                                                        cursor:
                                                            groupContent.trim()
                                                            ? 'pointer'
                                                            : 'not-allowed',
                                                        fontSize: '16px',
                                                        flexShrink: 0 }}>
                                                    {groupSending ? '⏳' : '➤'}
                                                </button>
                                            </div>
                                        )
                                    )}
                                </>
                            )

                        ) : activeTab === 'groups' && !activeGroupId ? (
                            <div style={{ flex: 1, display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center', gap: '12px' }}>
                                <div style={{ fontSize: '48px' }}>👥</div>
                                <p style={{ fontSize: '18px',
                                    fontWeight: '600',
                                    color: 'var(--text-primary)', margin: 0 }}>
                                    Group Chats
                                </p>
                                <p style={{ fontSize: '14px',
                                    color: 'var(--text-muted)', margin: 0 }}>
                                    Select a group or create one
                                </p>
                                <button onClick={() =>
                                    setShowCreateGroup(true)}
                                    className="btn-primary"
                                    style={{ padding: '10px 24px',
                                        marginTop: '8px' }}>
                                    Create Group
                                </button>
                            </div>

                        ) : (
                            !activeConvId ? (
                                <div style={{ flex: 1, display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '12px' }}>
                                    <div style={{ fontSize: '48px' }}>💬</div>
                                    <p style={{ fontSize: '18px',
                                        fontWeight: '600',
                                        color: 'var(--text-primary)',
                                        margin: 0 }}>
                                        Your Messages
                                    </p>
                                    <p style={{ fontSize: '14px',
                                        color: 'var(--text-muted)',
                                        margin: 0 }}>
                                        Select a conversation to start chatting
                                    </p>
                                    <button onClick={() =>
                                        window.location.href = '/explore'}
                                        className="btn-primary"
                                        style={{ padding: '10px 24px',
                                            marginTop: '8px' }}>
                                        Start a New Chat
                                    </button>
                                </div>
                            ) : (
                                <>
                                {/* 1-1 Chat Header */}
                                <div style={{ padding: '14px 20px',
                                    borderBottom: '1px solid var(--border)',
                                    display: 'flex', alignItems: 'center',
                                    gap: '12px', flexShrink: 0 }}>
                                    <Avatar url={activeConv?.otherProfilePicture}
                                        size={40}
                                        initial={activeConv?.otherUsername
                                            ?.[0]?.toUpperCase()} />
                                    <div style={{ flex: 1 }}
                                        onClick={() => window.location.href =
                                            `/user/${activeConv?.otherUsername}`}
                                        style={{ flex: 1, cursor: 'pointer' }}>
                                        <p style={{ fontSize: '15px', fontWeight: '600',
                                            margin: 0, color: 'var(--text-primary)' }}>
                                            {activeConv?.otherFullName ||
                                                `@${activeConv?.otherUsername}`}
                                        </p>
                                        <p style={{ fontSize: '11px',
                                            color: 'var(--text-muted)', margin: 0 }}>
                                            @{activeConv?.otherUsername}
                                        </p>
                                    </div>

                                    {/* 1-1 chat 3-dot menu */}
                                    <div style={{ position: 'relative' }}>
                                        <button
                                            onClick={e => {
                                                e.stopPropagation();
                                                setShowHeaderMenu(p => !p);
                                            }}
                                            style={{ width: '36px', height: '36px',
                                                borderRadius: '8px', border: 'none',
                                                background: showHeaderMenu
                                                    ? 'var(--hover-bg)' : 'transparent',
                                                cursor: 'pointer', display: 'flex',
                                                alignItems: 'center', justifyContent: 'center',
                                                gap: '3px', transition: 'background 0.15s',
                                                flexShrink: 0 }}
                                            title="Options">
                                            {[0,1,2].map(i => (
                                                <div key={i} style={{ width: '4px', height: '4px',
                                                    borderRadius: '50%',
                                                    background: 'var(--text-muted)' }} />
                                            ))}
                                        </button>
                                        {showHeaderMenu && (
                                            <div style={{
                                                position: 'absolute', right: 0, top: '40px',
                                                background: 'var(--modal-bg)',
                                                border: '1px solid var(--border)',
                                                borderRadius: '10px',
                                                boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
                                                zIndex: 200, overflow: 'hidden',
                                                minWidth: '200px' }}
                                                onClick={e => e.stopPropagation()}>

                                            {/* Search Messages */}
                                            <div onClick={() => {
                                                    setShowHeaderMenu(false);
                                                    setShowMsgSearch(p => !p);
                                                    setMsgSearchQuery('');
                                                    setMsgSearchResults([]);
                                                    setTimeout(() => msgSearchRef.current?.focus(), 150);
                                                }}
                                                style={{ padding: '11px 16px', fontSize: '13px',
                                                    color: 'var(--text-primary)', cursor: 'pointer',
                                                    display: 'flex', alignItems: 'center', gap: '10px' }}
                                                onMouseOver={e => e.currentTarget.style.background = 'var(--hover-bg)'}
                                                onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                                                    stroke="currentColor" strokeWidth="2.5"
                                                    strokeLinecap="round" strokeLinejoin="round">
                                                    <circle cx="11" cy="11" r="8"/>
                                                    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                                                </svg>
                                                Search Messages
                                            </div>

                                            <div style={{ height: '1px', background: 'var(--border-light)' }} />

                                            {/* Shared Media */}
                                            <div onClick={() => {
                                                    setShowHeaderMenu(false);
                                                    setShowMediaPanel(p => !p);
                                                    setMediaTab('media');
                                                }}
                                                style={{ padding: '11px 16px', fontSize: '13px',
                                                    color: 'var(--text-primary)', cursor: 'pointer',
                                                    display: 'flex', alignItems: 'center', gap: '10px' }}
                                                onMouseOver={e => e.currentTarget.style.background = 'var(--hover-bg)'}
                                                onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                                                    stroke="currentColor" strokeWidth="2.5"
                                                    strokeLinecap="round" strokeLinejoin="round">
                                                    <rect x="3" y="3" width="18" height="18" rx="2"/>
                                                    <circle cx="8.5" cy="8.5" r="1.5"/>
                                                    <polyline points="21 15 16 10 5 21"/>
                                                </svg>
                                                Shared Media
                                            </div>

                                            <div style={{ height: '1px', background: 'var(--border-light)' }} />

                                            {/* Shared Posts */}
                                            <div onClick={() => {
                                                    setShowHeaderMenu(false);
                                                    setShowMediaPanel(p => !p);
                                                    setMediaTab('posts');
                                                }}
                                                style={{ padding: '11px 16px', fontSize: '13px',
                                                    color: 'var(--text-primary)', cursor: 'pointer',
                                                    display: 'flex', alignItems: 'center', gap: '10px' }}
                                                onMouseOver={e => e.currentTarget.style.background = 'var(--hover-bg)'}
                                                onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                                                    stroke="currentColor" strokeWidth="2.5"
                                                    strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                                    <polyline points="14 2 14 8 20 8"/>
                                                </svg>
                                                Shared Posts
                                            </div>
                                            </div>
                                        )}
                                    </div>
                                </div>



                                        {/* Message Search Bar */}
                                        {showMsgSearch && (
                                            <div style={{ padding: '8px 16px',
                                                borderBottom: '1px solid var(--border)',
                                                background: 'var(--primary-bg)',
                                                flexShrink: 0 }}>
                                                <div style={{ position: 'relative' }}>
                                                    <input
                                                        ref={msgSearchRef}
                                                        value={msgSearchQuery}
                                                        onChange={e =>
                                                            handleMsgSearch(e.target.value)}
                                                        placeholder="Search in this chat..."
                                                        className="input"
                                                        style={{ fontSize: '13px',
                                                            paddingRight: '80px' }} />
                                                    <div style={{ position: 'absolute',
                                                        right: '8px', top: '50%',
                                                        transform: 'translateY(-50%)',
                                                        display: 'flex', alignItems: 'center',
                                                        gap: '6px' }}>
                                                        {msgSearchQuery && (
                                                            <span style={{ fontSize: '11px',
                                                                color: 'var(--text-muted)' }}>
                                                                {msgSearchResults.length} found
                                                            </span>
                                                        )}
                                                        <button
                                                            onClick={() => {
                                                                setShowMsgSearch(false);
                                                                setMsgSearchQuery('');
                                                                setMsgSearchResults([]);
                                                            }}
                                                            className="btn-icon"
                                                            style={{ fontSize: '16px' }}>
                                                            ×
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Search results dropdown */}
                                                {msgSearchQuery && msgSearchResults.length > 0 && (
                                                    <div style={{ marginTop: '6px',
                                                        maxHeight: '200px', overflowY: 'auto',
                                                        background: 'var(--card-bg-solid)',
                                                        border: '1px solid var(--border)',
                                                        borderRadius: 'var(--radius-md)',
                                                        boxShadow: '0 4px 16px rgba(0,0,0,0.15)' }}>
                                                        {msgSearchResults.map(msg => (
                                                            <div key={msg.id}
                                                                onClick={() => jumpToMessage(msg.id)}
                                                                style={{ padding: '10px 14px',
                                                                    cursor: 'pointer',
                                                                    borderBottom:
                                                                        '1px solid var(--border-light)',
                                                                    transition: 'background 0.15s' }}
                                                                onMouseOver={e =>
                                                                    e.currentTarget.style.background =
                                                                    'var(--hover-bg)'}
                                                                onMouseOut={e =>
                                                                    e.currentTarget.style.background =
                                                                    'transparent'}>
                                                                <p style={{ margin: '0 0 2px',
                                                                    fontSize: '11px',
                                                                    color: 'var(--primary)',
                                                                    fontWeight: '600' }}>
                                                                    @{msg.senderUsername}
                                                                </p>
                                                                <p style={{ margin: 0,
                                                                    fontSize: '12px',
                                                                    color: 'var(--text-primary)',
                                                                    overflow: 'hidden',
                                                                    textOverflow: 'ellipsis',
                                                                    whiteSpace: 'nowrap' }}>
                                                                    {/* Highlight the search term */}
                                                                    {msg.content}
                                                                </p>
                                                                <p style={{ margin: '2px 0 0',
                                                                    fontSize: '10px',
                                                                    color: 'var(--text-faint)' }}>
                                                                    {new Date(msg.timestamp)
                                                                        .toLocaleString()}
                                                                </p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                {msgSearchQuery
                                                    && msgSearchResults.length === 0 && (
                                                    <p style={{ margin: '6px 0 0',
                                                        fontSize: '12px',
                                                        color: 'var(--text-muted)',
                                                        textAlign: 'center' }}>
                                                        No messages found for "{msgSearchQuery}"
                                                    </p>
                                                )}
                                            </div>
                                        )}

                                    {/* Messages */}
                                    <div ref={msgAreaRef}
                                        onScroll={handleMsgScroll}
                                        style={{ flex: 1, overflowY: 'auto',
                                            padding: '16px', display: 'flex',
                                            flexDirection: 'column',
                                            gap: '4px' }}>
                                        {msgLoading ? (
                                            <div style={{ display: 'flex',
                                                justifyContent: 'center',
                                                alignItems: 'center',
                                                flex: 1 }}>
                                                <p style={{ color:
                                                    'var(--text-muted)' }}>
                                                    Loading messages...
                                                </p>
                                            </div>
                                        ) : messages.length === 0 ? (
                                            <div style={{ display: 'flex',
                                                justifyContent: 'center',
                                                alignItems: 'center',
                                                flex: 1 }}>
                                                <p style={{
                                                    color: 'var(--text-muted)',
                                                    fontSize: '14px' }}>
                                                    No messages yet.
                                                    Say hello! 👋
                                                </p>
                                            </div>
                                        ) : messages.map((msg, idx) => {
                                            const isOwn =
                                                msg.senderUsername ===
                                                user?.username;
                                            const isDeleted =
                                                msg.deletedForEveryone;
                                            const isHighlighted =
                                                highlightedId === msg.id;
                                            const showTime = idx === 0 ||
                                                Math.abs(
                                                    new Date(msg.timestamp) -
                                                    new Date(messages[
                                                        idx-1].timestamp))
                                                > 300000;

                                            return (
                                                <div key={msg.id} id={`msg-${msg.id}`}
                                                    style={{
                                                        borderRadius: '10px',
                                                        transition: 'background 0.3s',
                                                        background: highlightedId === msg.id
                                                            ? 'var(--primary-bg)' : 'transparent',
                                                        outline: highlightedId === msg.id
                                                            ? '2px solid var(--primary-border)' : 'none',
                                                    }}>
                                                    {showTime && (
                                                        <p style={{
                                                            textAlign: 'center',
                                                            fontSize: '11px',
                                                            color:
                                                                'var(--text-faint)',
                                                            margin: '8px 0' }}>
                                                            {timeAgo(
                                                                msg.timestamp)}
                                                        </p>
                                                    )}
                                                    <div id={`msg-${msg.id}`}
                                                        onContextMenu={e => {
                                                            if (isDeleted)
                                                                return;
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            setContextMenu({
                                                                x: e.clientX,
                                                                y: e.clientY,
                                                                msg });
                                                        }}
                                                        className={isHighlighted
                                                            ? 'highlight-msg'
                                                            : ''}
                                                        style={{ display: 'flex',
                                                            justifyContent:
                                                                isOwn
                                                                ? 'flex-end'
                                                                : 'flex-start',
                                                            alignItems:
                                                                'flex-end',
                                                            gap: '8px',
                                                            marginBottom: '2px',
                                                            padding: '2px 4px',
                                                            borderRadius:
                                                                '10px' }}>

                                                        {!isOwn && (
                                                            <div style={
                                                                M.avatarBase(28)}>
                                                                {msg.senderUsername
                                                                    ?.[0]
                                                                    ?.toUpperCase()}
                                                            </div>
                                                        )}

                                                        <div style={{
                                                            maxWidth: '65%' }}>
                                                            {msg.replyToId &&
                                                                !isDeleted && (
                                                                <div onClick={
                                                                    () =>
                                                                    scrollToMessage(
                                                                        msg.replyToId)}
                                                                    style={
                                                                        M.replyPreview()}>
                                                                    <p style={{
                                                                        fontSize:
                                                                            '11px',
                                                                        fontWeight:
                                                                            '600',
                                                                        margin:
                                                                            '0 0 2px',
                                                                        color:
                                                                            'var(--primary)' }}>
                                                                        @{msg.replyToSenderUsername}
                                                                    </p>
                                                                    <p style={{
                                                                        fontSize:
                                                                            '11px',
                                                                        color:
                                                                            'var(--text-muted)',
                                                                        margin: 0,
                                                                        overflow:
                                                                            'hidden',
                                                                        textOverflow:
                                                                            'ellipsis',
                                                                        whiteSpace:
                                                                            'nowrap',
                                                                        maxWidth:
                                                                            '200px' }}>
                                                                        {msg.replyToContent}
                                                                    </p>
                                                                </div>
                                                            )}

                                                            {isDeleted ? (
                                                                <div style={{
                                                                    padding:
                                                                        '8px 12px',
                                                                    background:
                                                                        'var(--input-bg)',
                                                                    borderRadius:
                                                                        '12px',
                                                                    fontSize:
                                                                        '13px',
                                                                    color:
                                                                        'var(--text-faint)',
                                                                    fontStyle:
                                                                        'italic',
                                                                    border:
                                                                        '1px solid var(--border)' }}>
                                                                    🚫 This message was deleted
                                                                </div>
                                                            ) : msg.messageType
                                                                === 'POST' &&
                                                                msg.sharedPostId
                                                                ? (
                                                                <SharedPostCard
                                                                    msg={msg} />
                                                            ) : ['IMAGE',
                                                                'VIDEO',
                                                                'FILE'].includes(
                                                                msg.messageType)
                                                                ? (
                                                                renderMedia(
                                                                    msg, isOwn)
                                                            ) : (
                                                                <div style={
                                                                    M.msgBubble(
                                                                        isOwn)}>
                                                                    {msg.content}
                                                                </div>
                                                            )}

                                                            {!isDeleted && (
                                                                <div style={{
                                                                    display:
                                                                        'flex',
                                                                    justifyContent:
                                                                        isOwn
                                                                        ? 'flex-end'
                                                                        : 'flex-start',
                                                                    gap: '6px',
                                                                    marginTop:
                                                                        '2px' }}>
                                                                    {msg.isEdited && (
                                                                        <span style={{
                                                                            fontSize:
                                                                                '10px',
                                                                            color:
                                                                                'var(--text-faint)',
                                                                            fontStyle:
                                                                                'italic' }}>
                                                                            edited
                                                                        </span>
                                                                    )}
                                                                    {isOwn && (
                                                                        <span style={{
                                                                            fontSize:
                                                                                '10px',
                                                                            color:
                                                                                'var(--text-faint)' }}>
                                                                            {msg.isRead
                                                                                ? '✓✓'
                                                                                : '✓'}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}

                                        {typingUser && (
                                            <div style={{ display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                                padding: '4px 8px' }}>
                                                <div style={{ display: 'flex',
                                                    gap: '3px',
                                                    alignItems: 'center' }}>
                                                    {[0,1,2].map(i => (
                                                        <div key={i} style={{
                                                            width: '6px',
                                                            height: '6px',
                                                            borderRadius: '50%',
                                                            background:
                                                                'var(--text-muted)',
                                                            animation:
                                                                'pulse 1.2s ease-in-out infinite',
                                                            animationDelay:
                                                                `${i*0.2}s` }} />
                                                    ))}
                                                </div>
                                                <span style={{ fontSize: '12px',
                                                    color: 'var(--text-muted)',
                                                    fontStyle: 'italic' }}>
                                                    {typingUser} is typing...
                                                </span>
                                            </div>
                                        )}
                                        <div ref={bottomRef} />
                                    </div>

                                    {/* Reply/Edit Bar */}
                                    {(replyTo || editingMsg) && (
                                        <div style={{
                                            background: 'var(--primary-bg)',
                                            borderTop:
                                                '1px solid var(--border)',
                                            padding: '8px 16px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '10px', flexShrink: 0 }}>
                                            <div style={{ flex: 1 }}>
                                                <p style={{ fontSize: '12px',
                                                    fontWeight: '600',
                                                    margin: 0,
                                                    color: 'var(--primary)' }}>
                                                    {replyTo
                                                        ? `↩️ Replying to @${replyTo.senderUsername}`
                                                        : '✏️ Editing message'}
                                                </p>
                                                <p style={{ fontSize: '12px',
                                                    color: 'var(--text-muted)',
                                                    margin: '2px 0 0',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap',
                                                    maxWidth: '80%' }}>
                                                    {replyTo?.content
                                                        || editingMsg?.content}
                                                </p>
                                            </div>
                                            <button onClick={() => {
                                                setReplyTo(null);
                                                setEditingMsg(null);
                                                setContent('');
                                            }} className="btn-icon"
                                                style={{ fontSize: '18px' }}>
                                                ×
                                            </button>
                                        </div>
                                    )}

                                    {/* Input */}
                                    <div style={M.chatInputArea()}>
                                        {!editingMsg && (
                                            <button onClick={() =>
                                                fileInputRef.current?.click()}
                                                className="btn-icon"
                                                style={{ fontSize: '20px',
                                                    flexShrink: 0 }}>
                                                📎
                                            </button>
                                        )}
                                        <input type="file"
                                            ref={fileInputRef}
                                            onChange={handleFileSelect}
                                            multiple
                                            accept="image/*,video/*,.pdf,.zip,.doc,.docx,.txt"
                                            style={{ display: 'none' }} />
                                        <input ref={inputRef}
                                            value={content}
                                            onChange={e => {
                                                setContent(e.target.value);
                                                if (e.target.value.trim() &&
                                                    activeConvId &&
                                                    isConnected()) {
                                                    sendTyping(
                                                        user?.username);
                                                }
                                            }}
                                            onKeyDown={e =>
                                                e.key === 'Enter' &&
                                                !e.shiftKey && handleSend()}
                                            placeholder={editingMsg
                                                ? 'Edit message...'
                                                : 'Type a message...'}
                                            className="input"
                                            style={{ flex: 1,
                                                fontSize: '14px',
                                                borderRadius:
                                                    'var(--radius-xl)',
                                                padding: '10px 16px' }} />
                                        <button onClick={handleSend}
                                            disabled={sending}
                                            style={{ width: '40px',
                                                height: '40px',
                                                background: content.trim()
                                                    ? 'var(--btn-gradient)'
                                                    : 'var(--border)',
                                                border: 'none',
                                                borderRadius: '50%',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                cursor: content.trim()
                                                    ? 'pointer'
                                                    : 'not-allowed',
                                                fontSize: '16px',
                                                flexShrink: 0 }}>
                                            {sending ? '⏳' : '➤'}
                                        </button>
                                    </div>
                                </>
                            )
                        )}
                    </div>

                    {/* Group Info Panel */}
                    {showGroupInfo && activeGroup && (
                        // In MessagingPage, add callback for GroupInfoPanel
                        <GroupInfoPanel
                            key={activeGroup.id}
                            group={activeGroup}
                            wsEvent={groupWsEvent}
                            onClose={() => setShowGroupInfo(false)}
                            onGroupUpdated={(updated) => {
                                setGroups(prev => prev.map(g =>
                                    g.id === updated.id ? updated : g));
                            }}
                            onMembersChanged={() => {
                                // Refresh the active group data from API
                                getGroup(token, activeGroupId)
                                    .then(updated => {
                                        setGroups(prev => prev.map(g =>
                                            g.id === updated.id ? updated : g));
                                    }).catch(() => {});
                            }}
                            onGroupDeleted={() => {
                                setGroups(prev => prev.filter(
                                    g => g.id !== activeGroupId));
                                setActiveGroupId(null);
                                setShowGroupInfo(false);
                            }}
                            onLeft={() => {
                                setGroups(prev => prev.filter(
                                    g => g.id !== activeGroupId));
                                setActiveGroupId(null);
                                setShowGroupInfo(false);
                            }} />
                    )}

                    {/* Media Panel */}
                    {showMediaPanel && (
                        <MediaPanel
                            messages={activeTab === 'groups' ? groupMessages : messages}
                            onClose={() => setShowMediaPanel(false)}
                            initialTab={mediaTab} />
                    )}

                </div>

                {/* Group Context Menu */}
                {groupContextMenu && (() => {
                    const items = [
                        { label: '↩️ Reply', action: () => {
                            setGroupReplyTo(groupContextMenu.msg);
                            setGroupContextMenu(null);
                            setTimeout(() =>
                                groupInputRef.current?.focus(), 100);
                        }},
                        ...(groupContextMenu.msg.senderUsername ===
                            user?.username &&
                            groupContextMenu.msg.messageType === 'TEXT'
                            ? [{ label: '✏️ Edit', action: () => {
                                setGroupEditingMsg(groupContextMenu.msg);
                                setGroupContent(
                                    groupContextMenu.msg.content);
                                setGroupContextMenu(null);
                                setTimeout(() =>
                                    groupInputRef.current?.focus(), 100);
                            }}] : []),
                        ...(groupContextMenu.msg.senderUsername ===
                            user?.username || activeGroup?.isAdmin
                            ? [{ label: '🗑️ Delete', danger: true,
                                action: () => {
                                    setDeletingGroupMsg(
                                        groupContextMenu.msg);
                                    setShowGroupDeleteModal(true);
                                    setGroupContextMenu(null);
                                }}] : []),
                    ];
                    const pos = getMenuPosition(
                        groupContextMenu.x, groupContextMenu.y,
                        items.length);
                    return (
                        <div style={{ ...pos,
                            background: 'var(--modal-bg)',
                            border: '1px solid var(--border)',
                            borderRadius: '10px',
                            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                            zIndex: 1000, overflow: 'hidden',
                            minWidth: '160px' }}
                            onClick={e => e.stopPropagation()}>
                            {items.map(item => (
                                <div key={item.label}
                                    onClick={item.action}
                                    style={M.dropdownItem(item.danger)}
                                    onMouseOver={e =>
                                        e.currentTarget.style.background =
                                        'var(--hover-bg)'}
                                    onMouseOut={e =>
                                        e.currentTarget.style.background =
                                        'transparent'}>
                                    {item.label}
                                </div>
                            ))}
                        </div>
                    );
                })()}

                {/* Group Delete Modal */}
                {showGroupDeleteModal && (
                    <div className="modal-overlay">
                        <div className="modal-box"
                            style={{ maxWidth: '360px' }}>
                            <h3 style={{ margin: '0 0 8px',
                                color: 'var(--text-primary)',
                                fontSize: '16px' }}>
                                Delete Message
                            </h3>
                            <p style={{ color: 'var(--text-muted)',
                                fontSize: '13px',
                                margin: '0 0 1.5rem' }}>
                                Who do you want to delete this for?
                            </p>
                            <div style={{ display: 'flex',
                                flexDirection: 'column', gap: '8px' }}>
                                <button onClick={() =>
                                    handleGroupDeleteConfirm(false)}
                                    className="btn-secondary btn-full"
                                    style={{ textAlign: 'left' }}>
                                    Delete for me only
                                </button>
                                {(deletingGroupMsg?.senderUsername ===
                                    user?.username ||
                                    activeGroup?.isAdmin) && (
                                    <button onClick={() =>
                                        handleGroupDeleteConfirm(true)}
                                        className="btn-danger btn-full"
                                        style={{ textAlign: 'left' }}>
                                        Delete for everyone
                                    </button>
                                )}
                                <button onClick={() => {
                                    setShowGroupDeleteModal(false);
                                    setDeletingGroupMsg(null);
                                }} className="btn-secondary btn-full">
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Info / Error Modal */}
                {infoModal && (
                    <div className="modal-overlay"
                        onClick={() => setInfoModal(null)}>
                        <div className="modal-box"
                            style={{ maxWidth: '340px' }}
                            onClick={e => e.stopPropagation()}>
                            <div style={{ width: '56px', height: '56px',
                                background: infoModal.iconBg,
                                borderRadius: '50%',
                                display: 'flex', alignItems: 'center',
                                justifyContent: 'center',
                                margin: '0 auto 16px',
                                fontSize: '24px' }}>
                                {infoModal.icon}
                            </div>
                            <h3 style={{ margin: '0 0 8px',
                                fontSize: '17px', fontWeight: '700',
                                color: 'var(--text-primary)',
                                textAlign: 'center' }}>
                                {infoModal.title}
                            </h3>
                            <p style={{ color: 'var(--text-muted)',
                                fontSize: '13px',
                                margin: '0 0 20px',
                                textAlign: 'center',
                                lineHeight: '1.6' }}>
                                {infoModal.message}
                            </p>
                            <button
                                onClick={() => setInfoModal(null)}
                                className="btn-primary btn-full"
                                style={{ fontSize: '14px', padding: '12px' }}>
                                Got it
                            </button>
                        </div>
                    </div>
                )}

                {/* Invite Code Modal */}
                {showInviteInput && (
                    <div className="modal-overlay"
                        onClick={() => {
                            setShowInviteInput(false);
                            setInviteError('');
                            setInviteCodeInput('');
                            setInvitePreview(null);
                        }}>
                        <div className="modal-box"
                            style={{ maxWidth: '400px' }}
                            onClick={e => e.stopPropagation()}>

                            {/* Header */}
                            <div style={{ display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: '20px' }}>
                                <div style={{ display: 'flex',
                                    alignItems: 'center', gap: '10px' }}>
                                    {invitePreview && (
                                        <button
                                            onClick={() => {
                                                setInvitePreview(null);
                                                setInviteError('');
                                            }}
                                            className="btn-icon"
                                            style={{ fontSize: '18px' }}>
                                            ←
                                        </button>
                                    )}
                                    <h3 style={{ margin: 0, fontSize: '16px',
                                        fontWeight: '700',
                                        color: 'var(--text-primary)' }}>
                                        {invitePreview ? 'Group Preview' : 'Join by Invite Code'}
                                    </h3>
                                </div>
                                <button onClick={() => {
                                    setShowInviteInput(false);
                                    setInviteError('');
                                    setInviteCodeInput('');
                                    setInvitePreview(null);
                                }} className="btn-icon"
                                    style={{ fontSize: '20px' }}>×</button>
                            </div>

                            {/* Step 1 — Enter code */}
                            {!invitePreview && (
                                <>
                                    <p style={{ fontSize: '13px',
                                        color: 'var(--text-muted)',
                                        margin: '0 0 16px',
                                        lineHeight: '1.5' }}>
                                        Enter the invite code shared with you to preview
                                        and join the group.
                                    </p>
                                    <input
                                        value={inviteCodeInput}
                                        onChange={e => {
                                            setInviteCodeInput(
                                                e.target.value.toUpperCase());
                                            setInviteError('');
                                        }}
                                        onKeyDown={e => e.key === 'Enter'
                                            && handleFetchInviteInfo()}
                                        placeholder="e.g. DDE3761E3D"
                                        className="input"
                                        style={{ fontSize: '16px',
                                            letterSpacing: '3px',
                                            fontFamily: 'var(--font-mono)',
                                            textAlign: 'center',
                                            marginBottom: '12px',
                                            padding: '14px' }}
                                        autoFocus />
                                    {inviteError && (
                                        <div style={{ display: 'flex',
                                            alignItems: 'center', gap: '8px',
                                            background: 'var(--danger-bg)',
                                            border: '1px solid var(--danger)',
                                            borderRadius: 'var(--radius-md)',
                                            padding: '10px 12px',
                                            marginBottom: '12px' }}>
                                            <span style={{ fontSize: '16px' }}>⚠️</span>
                                            <p style={{ fontSize: '12px',
                                                color: 'var(--danger)',
                                                margin: 0 }}>
                                                {inviteError}
                                            </p>
                                        </div>
                                    )}
                                    <button
                                        onClick={handleFetchInviteInfo}
                                        disabled={!inviteCodeInput.trim()
                                            || inviteLoading}
                                        className="btn-primary btn-full"
                                        style={{ fontSize: '14px',
                                            padding: '13px',
                                            fontWeight: '600' }}>
                                        {inviteLoading
                                            ? 'Looking up group...' : 'Find Group →'}
                                    </button>
                                </>
                            )}

                            {/* Step 2 — Group preview */}
                            {invitePreview && (
                                <>
                                    {/* Group card */}
                                    <div style={{ background: 'var(--input-bg)',
                                        border: '1px solid var(--border)',
                                        borderRadius: 'var(--radius-lg)',
                                        padding: '16px',
                                        marginBottom: '16px' }}>
                                        <div style={{ display: 'flex',
                                            alignItems: 'center', gap: '14px' }}>
                                            <div style={{ width: '56px', height: '56px',
                                                borderRadius: '16px',
                                                background: 'var(--primary-bg)',
                                                border: '1px solid var(--primary-border)',
                                                display: 'flex', alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: '26px', overflow: 'hidden',
                                                flexShrink: 0 }}>
                                                {invitePreview.avatarUrl ? (
                                                    <img
                                                        src={`${BASE}${invitePreview.avatarUrl}`}
                                                        alt="group"
                                                        style={{ width: '100%',
                                                            height: '100%',
                                                            objectFit: 'cover' }} />
                                                ) : '👥'}
                                            </div>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <p style={{ margin: '0 0 4px',
                                                    fontSize: '16px',
                                                    fontWeight: '700',
                                                    color: 'var(--text-primary)',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap' }}>
                                                    {invitePreview.name}
                                                </p>
                                                <div style={{ display: 'flex',
                                                    gap: '6px', flexWrap: 'wrap' }}>
                                                    <span style={{ fontSize: '11px',
                                                        padding: '2px 8px',
                                                        borderRadius: 'var(--radius-xl)',
                                                        background: 'var(--card-bg-solid)',
                                                        color: 'var(--text-secondary)',
                                                        border: '1px solid var(--border-light)' }}>
                                                        👥 {invitePreview.memberCount} members
                                                    </span>
                                                    <span style={{ fontSize: '11px',
                                                        padding: '2px 8px',
                                                        borderRadius: 'var(--radius-xl)',
                                                        background: invitePreview.isPrivate
                                                            ? 'var(--primary-bg)'
                                                            : 'var(--card-bg-solid)',
                                                        color: invitePreview.isPrivate
                                                            ? 'var(--primary)'
                                                            : 'var(--text-secondary)',
                                                        border: '1px solid var(--border-light)' }}>
                                                        {invitePreview.isPrivate
                                                            ? '🔒 Private'
                                                            : '🌐 Public'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        {invitePreview.description && (
                                            <p style={{ margin: '12px 0 0',
                                                fontSize: '13px',
                                                color: 'var(--text-muted)',
                                                lineHeight: '1.5' }}>
                                                {invitePreview.description}
                                            </p>
                                        )}
                                    </div>

                                    {/* Pending state */}
                                    {invitePreview.hasPendingRequest ? (
                                        <>
                                            <div style={{ display: 'flex',
                                                alignItems: 'center', gap: '10px',
                                                background: 'var(--hover-bg)',
                                                border: '1px solid var(--border)',
                                                borderRadius: 'var(--radius-md)',
                                                padding: '12px 14px',
                                                marginBottom: '16px' }}>
                                                <span style={{ fontSize: '20px' }}>⏳</span>
                                                <div>
                                                    <p style={{ margin: 0,
                                                        fontSize: '13px',
                                                        fontWeight: '600',
                                                        color: 'var(--text-primary)' }}>
                                                        Request already sent
                                                    </p>
                                                    <p style={{ margin: '2px 0 0',
                                                        fontSize: '12px',
                                                        color: 'var(--text-muted)' }}>
                                                        Waiting for admin approval
                                                    </p>
                                                </div>
                                            </div>
                                            <button onClick={() => {
                                                setShowInviteInput(false);
                                                setInviteError('');
                                                setInviteCodeInput('');
                                                setInvitePreview(null);
                                            }} className="btn-secondary btn-full"
                                                style={{ fontSize: '14px',
                                                    padding: '13px',
                                                    fontWeight: '600' }}>
                                                Got it
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            {inviteError && (
                                                <div style={{ display: 'flex',
                                                    alignItems: 'center', gap: '8px',
                                                    background: 'var(--danger-bg)',
                                                    border: '1px solid var(--danger)',
                                                    borderRadius: 'var(--radius-md)',
                                                    padding: '10px 12px',
                                                    marginBottom: '12px' }}>
                                                    <span style={{ fontSize: '16px' }}>⚠️</span>
                                                    <p style={{ fontSize: '12px',
                                                        color: 'var(--danger)',
                                                        margin: 0 }}>
                                                        {inviteError}
                                                    </p>
                                                </div>
                                            )}
                                            <button
                                                onClick={handleJoinByInviteCode}
                                                disabled={inviteLoading}
                                                className="btn-primary btn-full"
                                                style={{ fontSize: '15px',
                                                    padding: '13px',
                                                    fontWeight: '600' }}>
                                                {inviteLoading ? 'Processing...'
                                                    : invitePreview.isPrivate
                                                    ? '📨 Send Join Request'
                                                    : '➕ Join Group'}
                                            </button>
                                            <p style={{ fontSize: '12px',
                                                color: 'var(--text-faint)',
                                                textAlign: 'center',
                                                margin: '10px 0 0' }}>
                                                {invitePreview.isPrivate
                                                    ? 'The admin will review your request'
                                                    : 'You\'ll be added instantly'}
                                            </p>
                                        </>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                )}

                {/* Create Group Modal */}
                {showCreateGroup && (
                    <CreateGroupModal
                        onClose={() => setShowCreateGroup(false)}
                        onCreated={(group) => {
                            setGroups(prev => [group, ...prev]);
                            setActiveTab('groups');
                            selectGroup(group.id);
                        }} />
                )}
            </div>

            {/* 1-1 Context Menu */}
            {contextMenu && (() => {
                const items = buildMenuItems(contextMenu.msg);
                const pos = getMenuPosition(
                    contextMenu.x, contextMenu.y, items.length);
                return (
                    <div style={{ ...pos,
                        background: 'var(--modal-bg)',
                        border: '1px solid var(--border)',
                        borderRadius: '10px',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                        zIndex: 1000, overflow: 'hidden',
                        minWidth: '160px' }}
                        onClick={e => e.stopPropagation()}>
                        {items.map(item => (
                            <div key={item.label} onClick={item.action}
                                style={M.dropdownItem(item.danger)}
                                onMouseOver={e =>
                                    e.currentTarget.style.background =
                                    'var(--hover-bg)'}
                                onMouseOut={e =>
                                    e.currentTarget.style.background =
                                    'transparent'}>
                                {item.label}
                            </div>
                        ))}
                    </div>
                );
            })()}

            {/* Delete Modal */}
            {showDeleteModal && (
                <div className="modal-overlay">
                    <div className="modal-box"
                        style={{ maxWidth: '360px' }}>
                        <h3 style={{ margin: '0 0 8px',
                            color: 'var(--text-primary)',
                            fontSize: '16px' }}>
                            Delete Message
                        </h3>
                        <p style={{ color: 'var(--text-muted)',
                            fontSize: '13px',
                            margin: '0 0 1.5rem' }}>
                            Who do you want to delete this for?
                        </p>
                        <div style={{ display: 'flex',
                            flexDirection: 'column', gap: '8px' }}>
                            <button onClick={() =>
                                handleDeleteConfirm(false)}
                                className="btn-secondary btn-full"
                                style={{ textAlign: 'left' }}>
                                Delete for me only
                            </button>
                            <button onClick={() =>
                                handleDeleteConfirm(true)}
                                className="btn-danger btn-full"
                                style={{ textAlign: 'left' }}>
                                Delete for everyone
                            </button>
                            <button onClick={() => {
                                setShowDeleteModal(false);
                                setDeletingMsg(null);
                            }} className="btn-secondary btn-full">
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Forward Modal */}
            {showForwardModal && (
                <div className="modal-overlay"
                    onClick={() => setShowForwardModal(false)}>
                    <div className="modal-box"
                        onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '1rem' }}>
                            <h3 style={{ margin: 0, fontSize: '16px',
                                fontWeight: '600',
                                color: 'var(--text-primary)' }}>
                                Forward Message
                            </h3>
                            <button className="btn-icon"
                                style={{ fontSize: '20px' }}
                                onClick={() =>
                                    setShowForwardModal(false)}>
                                ×
                            </button>
                        </div>
                        <div style={{ overflowY: 'auto', flex: 1 }}>
                            {conversations
                                .filter(c => c.id !== activeConvId)
                                .map(conv => {
                                    const sent = forwardedTo[conv.id];
                                    return (
                                        <div key={conv.id}
                                            style={{ display: 'flex',
                                                alignItems: 'center',
                                                gap: '10px', padding: '10px',
                                                borderRadius:
                                                    'var(--radius-md)',
                                                marginBottom: '4px' }}>
                                            <Avatar
                                                url={conv.otherProfilePicture}
                                                size={38}
                                                initial={conv.otherUsername
                                                    ?.[0]?.toUpperCase()} />
                                            <div style={{ flex: 1 }}>
                                                <p style={{ fontSize: '14px',
                                                    fontWeight: '600',
                                                    margin: 0,
                                                    color:
                                                        'var(--text-primary)' }}>
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
                                                    handleForwardTo(conv.id)}
                                                disabled={
                                                    forwardLoading[conv.id]
                                                    || sent}
                                                style={{ padding: '6px 14px',
                                                    background: sent
                                                        ? 'var(--success-bg)'
                                                        : 'var(--btn-gradient)',
                                                    color: sent
                                                        ? 'var(--success)'
                                                        : '#fff',
                                                    border: 'none',
                                                    borderRadius:
                                                        'var(--radius-md)',
                                                    fontSize: '12px',
                                                    cursor: sent
                                                        ? 'default'
                                                        : 'pointer',
                                                    fontWeight: '500' }}>
                                                {forwardLoading[conv.id]
                                                    ? '...'
                                                    : sent ? 'Sent ✓' : 'Send'}
                                            </button>
                                        </div>
                                    );
                                })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MessagingPage;