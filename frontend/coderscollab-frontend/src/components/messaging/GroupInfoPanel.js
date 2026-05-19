import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
    getMembers, removeMember, updateMemberRole,
    leaveGroup, deleteGroup, getJoinRequests,
    acceptJoinRequest, rejectJoinRequest,
    updateGroup
} from '../../api/groupApi';
import * as M from '../../styles/mixins';

const BASE = 'http://localhost:8080';

// ── Add Member Search (admin only) ─────────────────────
const AddMemberSearch = ({ token, groupId, currentMembers,
    onAdded, onError }) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const [open, setOpen] = useState(false);


    const handleSearch = async (q) => {
        setQuery(q);
        if (!q.trim()) { setResults([]); return; }
        setSearching(true);
        try {
            const res = await fetch(
                `${BASE}/api/profile/search?q=${q}`,
                { headers: { Authorization: `Bearer ${token}` }});
            const data = await res.json();
            const memberIds = currentMembers.map(m => m.userId);
            setResults(data.filter(u => !memberIds.includes(u.id)));
        } catch (e) { console.error(e); }
        finally { setSearching(false); }
    };

    const handleAdd = async (userId) => {
        try {
            const res = await fetch(
                `${BASE}/api/groups/${groupId}/members/${userId}`,
                { method: 'POST',
                    headers: { Authorization: `Bearer ${token}` }});
            if (res.ok) {
                const member = await res.json();
                onAdded(member);
                setResults(p => p.filter(u => u.id !== userId));
                setQuery('');
                setResults([]);
            } else {
                const data = await res.json().catch(() => ({}));
                onError(data.message || 'Could not add member');
            }
        } catch (e) { console.error(e); }
    };

    return (
        <div style={{ padding: '8px 16px',
            borderBottom: '1px solid var(--border-light)' }}>
            {/* Toggle button */}
            <button
                onClick={() => setOpen(p => !p)}
                className="btn-primary"
                style={{ width: '100%', fontSize: '12px',
                    padding: '7px', marginBottom: open ? '10px' : 0,
                    display: 'flex', alignItems: 'center',
                    justifyContent: 'center', gap: '6px' }}>
                ➕ {open ? 'Cancel' : 'Add New Member'}
            </button>

            {open && (
                <>
                    <input value={query}
                        onChange={e => handleSearch(e.target.value)}
                        placeholder="Search by username..."
                        className="input"
                        style={{ fontSize: '12px',
                            marginBottom: '6px' }}
                        autoFocus />
                    {searching && (
                        <p style={{ fontSize: '11px',
                            color: 'var(--text-muted)',
                            margin: '4px 0' }}>
                            Searching...
                        </p>
                    )}
                    {!searching && query.trim()
                        && results.length === 0 && (
                        <p style={{ fontSize: '11px',
                            color: 'var(--text-muted)',
                            margin: '4px 0' }}>
                            No users found
                        </p>
                    )}
                    {results.map(u => (
                        <div key={u.id}
                            style={{ display: 'flex',
                                alignItems: 'center', gap: '8px',
                                padding: '7px 0',
                                borderBottom:
                                    '1px solid var(--border-light)' }}>
                            <div style={{ width: '30px', height: '30px',
                                borderRadius: '50%',
                                background: 'var(--primary-bg)',
                                display: 'flex', alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '12px', fontWeight: '600',
                                overflow: 'hidden', flexShrink: 0 }}>
                                {u.profilePictureUrl ? (
                                    <img
                                        src={`${BASE}${u.profilePictureUrl}`}
                                        alt={u.username}
                                        style={{ width: '100%',
                                            height: '100%',
                                            objectFit: 'cover' }} />
                                ) : u.username?.[0]?.toUpperCase()}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ margin: 0, fontSize: '12px',
                                    fontWeight: '600',
                                    color: 'var(--text-primary)',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap' }}>
                                    @{u.username}
                                </p>
                                {u.fullName && (
                                    <p style={{ margin: 0,
                                        fontSize: '10px',
                                        color: 'var(--text-muted)' }}>
                                        {u.fullName}
                                    </p>
                                )}
                            </div>
                            <button onClick={() => handleAdd(u.id)}
                                className="btn-primary"
                                style={{ padding: '4px 10px',
                                    fontSize: '11px',
                                    flexShrink: 0 }}>
                                Add
                            </button>
                        </div>
                    ))}
                </>
            )}
        </div>
    );
};

// ── Member Row ─────────────────────────────────────────
const MemberRow = ({ m, isAdmin, currentUserId, currentUsername,
    onRoleChange, onConfirmRemove, token }) => {
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef(null);

    useEffect(() => {
        if (!menuOpen) return;
        const close = (e) => {
            if (menuRef.current &&
                !menuRef.current.contains(e.target))
                setMenuOpen(false);
        };
        document.addEventListener('mousedown', close);
        return () => document.removeEventListener('mousedown', close);
    }, [menuOpen]);

    const isSelf = m.userId === Number(currentUserId);

    const handleMessagePrivately = async () => {
        setMenuOpen(false);
        try {
            // Check follow status first
            const followRes = await fetch(
                `${BASE}/api/follow/status/${m.userId}`,  // ← correct endpoint
                { headers: { Authorization: `Bearer ${token}` }});
            const followData = await followRes.json();

            console.log('[Follow Status]', followData); // ← see exact response shape

            // FollowResponse likely has 'status' field
            // PENDING = follow request sent, ACCEPTED = following
            const isFollowing = followData.status === 'ACCEPTED'
                || followData.following === true;
            const isPending = followData.status === 'PENDING';

            // Check if target is private — use profile endpoint
            const profileRes = await fetch(
                `${BASE}/api/profile/${m.username}`,
                { headers: { Authorization: `Bearer ${token}` }});
            const profile = await profileRes.json();

            if (profile.isPrivate && !isFollowing) {
                if (isPending) {
                    alert(`You've sent a follow request to @${m.username}. Wait for them to accept before messaging.`);
                } else {
                    alert(`@${m.username} has a private account. Follow them first to send a message.`);
                    window.location.href = `/user/${m.username}`;
                }
                return;
            }

            // Public account OR already following → open/create conversation
            const convRes = await fetch(
                `${BASE}/api/messages/conversation/${m.userId}`,  // ← correct endpoint
                { method: 'POST',
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json' }});
            const conv = await convRes.json();
            window.location.href = `/messages/${conv.id}`;

        } catch (e) {
            console.error('Message privately error:', e);
            window.location.href = `/user/${m.username}`;
        }
    };

    return (
        <div style={{ display: 'flex', alignItems: 'center',
            gap: '10px', padding: '10px 16px',
            borderBottom: '1px solid var(--border-light)',
            transition: 'background 0.15s' }}
            onMouseOver={e =>
                e.currentTarget.style.background = 'var(--hover-bg)'}
            onMouseOut={e =>
                e.currentTarget.style.background = 'transparent'}>

            {/* Clickable avatar + info → profile */}
            <div
                onClick={() => window.location.href =
                    `/user/${m.username}`}
                style={{ display: 'flex', alignItems: 'center',
                    gap: '10px', flex: 1, minWidth: 0,
                    cursor: 'pointer' }}>
                <div style={M.getAvatar(38,
                    m.profilePictureUrl
                        ? `${BASE}${m.profilePictureUrl}` : null)}>
                    {!m.profilePictureUrl
                        && m.username?.[0]?.toUpperCase()}
                </div>
                <div style={{ minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: '13px',
                        fontWeight: '600',
                        color: 'var(--text-primary)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap' }}>
                        @{m.username}
                        {isSelf && (
                            <span style={{ color: 'var(--text-faint)',
                                fontWeight: '400',
                                fontSize: '11px',
                                marginLeft: '4px' }}>
                                (You)
                            </span>
                        )}
                    </p>
                    <p style={{ margin: 0, fontSize: '11px',
                        color: m.role === 'ADMIN'
                            ? 'var(--primary)'
                            : 'var(--text-muted)' }}>
                        {m.role}
                        {m.fullName && (
                            <span style={{ color: 'var(--text-faint)',
                                marginLeft: '4px' }}>
                                · {m.fullName}
                            </span>
                        )}
                    </p>
                </div>
            </div>

            {/* 3-dot menu — show for others always,
                admins get extra options */}
            {!isSelf && (
                <div style={{ position: 'relative',
                    flexShrink: 0 }} ref={menuRef}>
                    <button
                        onClick={e => {
                            e.stopPropagation();
                            setMenuOpen(p => !p);
                        }}
                        className="btn-icon"
                        style={{ fontSize: '18px',
                            padding: '2px 6px',
                            color: 'var(--text-muted)' }}>
                        ⋯
                    </button>
                    {menuOpen && (
                        <div style={{
                            position: 'absolute',
                            right: 0, top: '30px',
                            background: 'var(--modal-bg)',
                            border: '1px solid var(--border)',
                            borderRadius: '10px',
                            boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
                            zIndex: 200, overflow: 'hidden',
                            minWidth: '170px' }}>

                            {/* View Profile — always */}
                            <div
                                onClick={() => {
                                    window.location.href =
                                        `/user/${m.username}`;
                                }}
                                style={M.dropdownItem(false)}
                                onMouseOver={e =>
                                    e.currentTarget.style.background =
                                    'var(--hover-bg)'}
                                onMouseOut={e =>
                                    e.currentTarget.style.background =
                                    'transparent'}>
                                👤 View Profile
                            </div>

                            {/* Message Privately — always
                                (handles private check internally) */}
                            <div
                                onClick={handleMessagePrivately}
                                style={M.dropdownItem(false)}
                                onMouseOver={e =>
                                    e.currentTarget.style.background =
                                    'var(--hover-bg)'}
                                onMouseOut={e =>
                                    e.currentTarget.style.background =
                                    'transparent'}>
                                💬 Message Privately
                            </div>

                            {/* Admin-only options */}
                            {isAdmin && (
                                <>
                                    <div style={{ height: '1px',
                                        background: 'var(--border-light)',
                                        margin: '2px 0' }} />
                                    <div
                                        onClick={() => {
                                            onRoleChange(m.userId,
                                                m.role === 'ADMIN'
                                                    ? 'MEMBER' : 'ADMIN');
                                            setMenuOpen(false);
                                        }}
                                        style={M.dropdownItem(false)}
                                        onMouseOver={e =>
                                            e.currentTarget.style.background =
                                            'var(--hover-bg)'}
                                        onMouseOut={e =>
                                            e.currentTarget.style.background =
                                            'transparent'}>
                                        {m.role === 'ADMIN'
                                            ? '⬇️ Demote to Member'
                                            : '⬆️ Promote to Admin'}
                                    </div>
                                    <div
                                        onClick={() => {
                                            onConfirmRemove(m.userId, m.username);
                                            setMenuOpen(false);
                                        }}
                                        style={M.dropdownItem(true)}
                                        onMouseOver={e =>
                                            e.currentTarget.style.background =
                                            'var(--hover-bg)'}
                                        onMouseOut={e =>
                                            e.currentTarget.style.background =
                                            'transparent'}>
                                        🚫 Remove from Group
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// ── Main Panel ─────────────────────────────────────────
const GroupInfoPanel = ({ group, wsEvent, onClose,
    onGroupUpdated, onMembersChanged, onGroupDeleted, onLeft }) => {
    const { token, user } = useAuth();
    const [members, setMembers] = useState([]);
    const [filteredMembers, setFilteredMembers] = useState([]);
    const [memberSearch, setMemberSearch] = useState('');
    const [requests, setRequests] = useState([]);
    const [tab, setTab] = useState('members');
    const [loading, setLoading] = useState(true);
    const [editMode, setEditMode] = useState(false);
    const [editName, setEditName] = useState(group.name);
    const [editDesc, setEditDesc] = useState(
        group.description || '');
    const [editPrivate, setEditPrivate] = useState(group.isPrivate);
    const [editAdminSend, setEditAdminSend] = useState(
        group.onlyAdminsCanSend);
    const [editAdminAdd, setEditAdminAdd] = useState(
        group.onlyAdminsCanAdd);
    const [saving, setSaving] = useState(false);
    const [editAvatar, setEditAvatar] = useState(null);
    const [editAvatarPreview, setEditAvatarPreview] = useState(null);

    const [editError, setEditError] = useState('');
    const [editMaxMembers, setEditMaxMembers] = useState(
    group.maxMembers || 100);

    const [confirmModal, setConfirmModal] = useState(null);
    const [linkCopied, setLinkCopied] = useState(false);


    const isAdmin = group.isAdmin || group.admin;
    const canAddMembers = isAdmin || !group.onlyAdminsCanAdd;

    useEffect(() => {
        loadMembers();
        if (isAdmin) loadRequests();
    }, [group.id]);

    // ── Filter members on search ───────────────────────
    useEffect(() => {
        if (!memberSearch.trim()) {
            setFilteredMembers(members);
        } else {
            const q = memberSearch.toLowerCase();
            setFilteredMembers(members.filter(m =>
                m.username?.toLowerCase().includes(q) ||
                m.fullName?.toLowerCase().includes(q)));
        }
    }, [memberSearch, members]);

        useEffect(() => {
            if (!wsEvent) return;
            if (Number(wsEvent.groupId) !== Number(group.id)) return;
            if (wsEvent.type === 'MEMBER_JOINED' ||
                wsEvent.type === 'MEMBER_LEFT') {
                loadMembers();
            }
            if (wsEvent.type === 'MEMBER_ROLE_CHANGED') {
                loadMembers();
            }
        }, [wsEvent]);

    // Add inside GroupInfoPanel, after existing useEffect
    useEffect(() => {
        if (!isAdmin) return;
        // Poll for new requests every 30s
        const interval = setInterval(() => {
            if (tab === 'requests') loadRequests();
        }, 30000);
        return () => clearInterval(interval);
    }, [isAdmin, tab]);

    // In GroupInfoPanel, update loadMembers to also notify parent:
    const loadMembers = async () => {
        try {
            const data = await getMembers(token, group.id);
            setMembers(data);
            setFilteredMembers(data);
            // Notify parent of new member count
            // if (onMembersChanged) {
            //     onMembersChanged(data.length);
            // }
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const loadRequests = async () => {
        try {
            const data = await getJoinRequests(token, group.id);
            setRequests(data);
        } catch (e) {}
    };

   // After removing a member:
    const handleRemove = async (userId) => {
        try {
            await removeMember(token, group.id, userId);
            const updated = members.filter(m => m.userId !== userId);
            setMembers(updated);
            setFilteredMembers(updated);
            onMembersChanged?.();   // ← triggers parent refresh
        } catch (e) { console.error(e); }
    };

    // After accepting a join request:
    const handleAccept = async (userId) => {
        try {
            await acceptJoinRequest(token, group.id, userId);
            setRequests(p => p.filter(r => r.userId !== userId));
            await loadMembers();   // refresh panel member list
            onMembersChanged?.();  // ← update count in header
        } catch (e) { console.error(e); }
    };

    const handleConfirmRemove = (userId, username) => {
    setConfirmModal({
        icon: '🚫',
        iconBg: 'var(--danger-bg)',
        title: 'Remove Member',
        message: `Remove @${username} from this group?`,
        confirmLabel: 'Remove',
        confirmClass: 'btn-danger',
        onConfirm: async () => {
            setConfirmModal(p => ({ ...p, loading: true }));
            try {
                await removeMember(token, group.id, userId);
                setMembers(p =>
                    p.filter(m => m.userId !== userId));
                setConfirmModal(null);
            } catch (e) {
                setConfirmModal(p => ({
                    ...p, loading: false }));
            }
        }
    });
    };

    const handleRoleChange = async (userId, newRole) => {
        try {
            const updated = await updateMemberRole(
                token, group.id, userId, newRole);
            setMembers(p => p.map(m =>
                m.userId === userId
                    ? { ...m, role: updated.role } : m));
        } catch (e) { console.error(e); }
    };

    const handleLeave = () => {
        setConfirmModal({
            icon: '🚪',
            iconBg: 'var(--hover-bg)',
            title: 'Leave Group',
            message: `Are you sure you want to leave "${group.name}"? You'll need to be invited back to rejoin.`,
            confirmLabel: 'Leave Group',
            confirmClass: 'btn-danger',
            onConfirm: async () => {
                setConfirmModal(p => ({ ...p, loading: true }));
                try {
                    await leaveGroup(token, group.id);
                    setConfirmModal(null);
                    onLeft();
                } catch (e) {
                    setConfirmModal(p => ({
                        ...p,
                        loading: false,
                        error: e.response?.data?.message
                            || e.message
                    }));
                }
            }
        });
    };

    const handleDelete = () => {
        setConfirmModal({
            icon: '🗑️',
            iconBg: 'var(--danger-bg)',
            title: 'Delete Group',
            message: `Are you sure you want to permanently delete "${group.name}"? All messages and members will be lost. This cannot be undone.`,
            confirmLabel: 'Delete Group',
            confirmClass: 'btn-danger',
            onConfirm: async () => {
                setConfirmModal(p => ({ ...p, loading: true }));
                try {
                    await deleteGroup(token, group.id);
                    setConfirmModal(null);
                    onGroupDeleted();
                } catch (e) {
                    setConfirmModal(p => ({
                        ...p,
                        loading: false,
                        error: e.response?.data?.message
                            || e.message
                    }));
                }
            }
        });
    };

    const handleSaveEdit = async () => {
        // Validate max members
        const newMax = Number(editMaxMembers);
        if (isNaN(newMax) || newMax < 3) {
            setEditError('Member limit must be at least 3');
            return;
        }
        const currentCount = members.length;
        if (newMax < currentCount) {
            setEditError(
                `Cannot set limit to ${newMax} — group currently has ${currentCount} members. Remove members first or set a higher limit.`
            );
            return;
        }

        setSaving(true);
        setEditError('');
        try {
            const formData = new FormData();
            const data = {
                name: editName,
                description: editDesc,
                isPrivate: editPrivate,
                onlyAdminsCanSend: editAdminSend,
                onlyAdminsCanAdd: editAdminAdd,
                maxMembers: editMaxMembers 
            };
            formData.append('data', new Blob(
                [JSON.stringify(data)],
                { type: 'application/json' }));
            if (editAvatar) formData.append('avatar', editAvatar);
            const updated = await updateGroup(
                token, group.id, formData);
            onGroupUpdated(updated);
            setEditMode(false);
            setEditAvatar(null);
            setEditAvatarPreview(null);
        } catch (e) {
            setEditError(e.response?.data?.message
                || 'Could not save changes');
        } finally { setSaving(false); }
    };


    const handleReject = (userId, username) => {
        setConfirmModal({
            icon: '❌',
            iconBg: 'var(--danger-bg)',
            title: 'Reject Request',
            message: `Reject @${username}'s request to join this group?`,
            confirmLabel: 'Reject',
            confirmClass: 'btn-danger',
            onConfirm: async () => {
                setConfirmModal(p => ({ ...p, loading: true }));
                try {
                    await rejectJoinRequest(token, group.id, userId);
                    setRequests(p =>
                        p.filter(r => r.userId !== userId));
                    setConfirmModal(null);
                } catch (e) {
                    setConfirmModal(p => ({
                        ...p, loading: false }));
                }
            }
        });
    };

    return (
        <div style={{ width: '320px', flexShrink: 0,
            display: 'flex', flexDirection: 'column',
            background: 'var(--card-bg-solid)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden', height: '100%' }}>

            {/* Header */}
            <div style={{ padding: '14px 16px',
                borderBottom: '1px solid var(--border)',
                display: 'flex', alignItems: 'center',
                gap: '10px' }}>
                <button onClick={onClose} className="btn-icon"
                    style={{ fontSize: '18px' }}>←</button>
                <h3 style={{ margin: 0, fontSize: '15px',
                    fontWeight: '700',
                    color: 'var(--text-primary)', flex: 1 }}>
                    Group Info
                </h3>
                {!editMode && (
                    <>
                        <button onClick={() => {
                            const link = `${window.location.origin}/groups/join/${group.inviteCode}`;
                            navigator.clipboard.writeText(link).then(() => {
                                setLinkCopied(true);
                                setTimeout(() => setLinkCopied(false), 2500);
                            }).catch(() => {
                                // Fallback for browsers without clipboard API
                                const el = document.createElement('textarea');
                                el.value = link;
                                document.body.appendChild(el);
                                el.select();
                                document.execCommand('copy');
                                document.body.removeChild(el);
                                setLinkCopied(true);
                                setTimeout(() => setLinkCopied(false), 2500);
                            });
                        }}
                            className="btn-icon"
                            style={{ fontSize: '16px',
                                transition: 'transform 0.2s',
                                transform: linkCopied ? 'scale(1.2)' : 'scale(1)' }}
                            title={linkCopied ? 'Copied!' : 'Copy invite link'}>
                            {linkCopied ? '✅' : '🔗'}
                        </button>
                        {isAdmin && (
                        <button onClick={() => setEditMode(true)}
                            className="btn-icon"
                            style={{ fontSize: '16px' }}>✏️</button>
                        )}
                    </>
                )}
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
                {/* Group Avatar & Name */}
                <div style={{ padding: '20px 16px',
                    textAlign: 'center',
                    borderBottom: '1px solid var(--border)' }}>
                    <div style={{ width: '72px', height: '72px',
                        borderRadius: '50%',
                        background: 'var(--primary-bg)',
                        border: '2px solid var(--primary)',
                        display: 'flex', alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 12px',
                        overflow: 'hidden', fontSize: '28px' }}>
                        {group.avatarUrl ? (
                            <img src={`${BASE}${group.avatarUrl}`}
                                alt="group"
                                style={{ width: '100%',
                                    height: '100%',
                                    objectFit: 'cover' }} />
                        ) : '👥'}
                    </div>

                    {editMode ? (
                        <div>
                            <label style={{ cursor: 'pointer',
                                display: 'block',
                                marginBottom: '12px' }}>
                                <div style={{ width: '72px',
                                    height: '72px',
                                    borderRadius: '50%',
                                    border: '2px dashed var(--primary)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    margin: '0 auto',
                                    overflow: 'hidden',
                                    fontSize: '24px',
                                    position: 'relative' }}>
                                    {editAvatarPreview ? (
                                        <img src={editAvatarPreview}
                                            alt="avatar"
                                            style={{ width: '100%',
                                                height: '100%',
                                                objectFit: 'cover' }} />
                                    ) : group.avatarUrl ? (
                                        <img
                                            src={`${BASE}${group.avatarUrl}`}
                                            alt="avatar"
                                            style={{ width: '100%',
                                                height: '100%',
                                                objectFit: 'cover' }} />
                                    ) : '👥'}
                                    <div style={{ position: 'absolute',
                                        inset: 0,
                                        background: 'rgba(0,0,0,0.3)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '16px' }}>
                                        📷
                                    </div>
                                </div>
                                <p style={{ textAlign: 'center',
                                    fontSize: '11px',
                                    color: 'var(--text-muted)',
                                    margin: '4px 0 0' }}>
                                    Click to change photo
                                </p>
                                <input type="file" accept="image/*"
                                    onChange={e => {
                                        const file = e.target.files[0];
                                        if (file) {
                                            setEditAvatar(file);
                                            setEditAvatarPreview(
                                                URL.createObjectURL(file));
                                        }
                                    }}
                                    style={{ display: 'none' }} />
                            </label>
                            <input value={editName}
                                onChange={e =>
                                    setEditName(e.target.value)}
                                className="input"
                                style={{ marginBottom: '8px',
                                    textAlign: 'center',
                                    fontSize: '15px',
                                    fontWeight: '600' }} />
                                {/* Max members field in edit mode */}
                                <div style={{ padding: '8px 10px',
                                    borderRadius: 'var(--radius-md)',
                                    background: 'var(--hover-bg)',
                                    marginBottom: '6px' }}>
                                    <p style={{ margin: '0 0 6px', fontSize: '12px',
                                        fontWeight: '600',
                                        color: 'var(--text-primary)' }}>
                                        👥 Member Limit
                                    </p>
                                    <div style={{ display: 'flex',
                                        alignItems: 'center', gap: '8px' }}>
                                        <input
                                            type="number"
                                            min="3"
                                            max="1000"
                                            value={editMaxMembers}
                                            onChange={e => {
                                                setEditMaxMembers(
                                                    parseInt(e.target.value) || 3);
                                                setEditError('');
                                            }}
                                            className="input"
                                            style={{ fontSize: '13px',
                                                padding: '6px 10px', flex: 1,
                                                borderColor: Number(editMaxMembers) < members.length
                                                    ? 'var(--danger)' : undefined }} />
                                        <span style={{ fontSize: '11px',
                                            color: 'var(--text-muted)',
                                            whiteSpace: 'nowrap' }}>
                                            / {members.length} now
                                        </span>
                                    </div>
                                    {Number(editMaxMembers) < members.length && (
                                        <p style={{ margin: '4px 0 0',
                                            fontSize: '11px',
                                            color: 'var(--danger)' }}>
                                            Below current count ({members.length})
                                        </p>
                                    )}
                                    {Number(editMaxMembers) < 3 && (
                                        <p style={{ margin: '4px 0 0',
                                            fontSize: '11px',
                                            color: 'var(--danger)' }}>
                                            Minimum is 3
                                        </p>
                                    )}
                                </div>
                            <textarea value={editDesc}
                                onChange={e =>
                                    setEditDesc(e.target.value)}
                                rows={2} className="input"
                                style={{ fontSize: '12px',
                                    resize: 'none',
                                    marginBottom: '8px' }}
                                placeholder="Description..." />
                            {[
                                { label: '🔒 Private',
                                    val: editPrivate,
                                    set: setEditPrivate },
                                { label: '✍️ Admins Only Send',
                                    val: editAdminSend,
                                    set: setEditAdminSend },
                                { label: '➕ Admins Only Add',
                                    val: editAdminAdd,
                                    set: setEditAdminAdd },
                            ].map(t => (
                                <div key={t.label}
                                    onClick={() => t.set(!t.val)}
                                    style={{ display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '8px 10px',
                                        borderRadius: 'var(--radius-md)',
                                        background: 'var(--hover-bg)',
                                        cursor: 'pointer',
                                        marginBottom: '6px' }}>
                                    <span style={{ fontSize: '12px',
                                        color: 'var(--text-primary)' }}>
                                        {t.label}
                                    </span>
                                    <div style={{ width: '32px',
                                        height: '18px',
                                        borderRadius: '9px',
                                        background: t.val
                                            ? 'var(--primary)'
                                            : 'var(--border)',
                                        position: 'relative',
                                        transition: 'background 0.2s' }}>
                                        <div style={{ width: '14px',
                                            height: '14px',
                                            borderRadius: '50%',
                                            background: '#fff',
                                            position: 'absolute',
                                            top: '2px',
                                            left: t.val
                                                ? '16px' : '2px',
                                            transition: 'left 0.2s' }} />
                                    </div>
                                </div>
                            ))}

                            {editError && (
                                <div style={{ display: 'flex',
                                    alignItems: 'flex-start', gap: '8px',
                                    background: 'var(--danger-bg)',
                                    border: '1px solid var(--danger)',
                                    borderRadius: 'var(--radius-md)',
                                    padding: '10px 12px',
                                    marginBottom: '8px' }}>
                                    <span style={{ fontSize: '14px',
                                        flexShrink: 0 }}>⚠️</span>
                                    <p style={{ fontSize: '12px',
                                        color: 'var(--danger)',
                                        margin: 0, lineHeight: '1.5' }}>
                                        {editError}
                                    </p>
                                </div>
                            )}
                            <div style={{ display: 'flex',
                                gap: '6px', marginTop: '8px' }}>
                                <button onClick={handleSaveEdit}
                                    disabled={saving}
                                    className="btn-primary btn-full"
                                    style={{ flex: 1, fontSize: '12px' }}>
                                    {saving ? 'Saving...' : 'Save'}
                                </button>
                                <button onClick={() => {
                                    setEditMode(false);
                                    setEditError('');
                                }}
                                    className="btn-secondary btn-full"
                                    style={{ flex: 1, fontSize: '12px' }}>
                                    Cancel
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <p style={{ margin: '0 0 4px',
                                fontSize: '16px', fontWeight: '700',
                                color: 'var(--text-primary)' }}>
                                {group.name}
                            </p>
                            {group.description && (
                                <p style={{ margin: '0 0 8px',
                                    fontSize: '12px',
                                    color: 'var(--text-muted)' }}>
                                    {group.description}
                                </p>
                            )}
                            <div style={{ display: 'flex',
                                justifyContent: 'center',
                                gap: '8px', flexWrap: 'wrap' }}>
                                <span style={{ fontSize: '11px',
                                    padding: '3px 8px',
                                    borderRadius: 'var(--radius-xl)',
                                    background: 'var(--input-bg)',
                                    color: 'var(--text-secondary)' }}>
                                    {group.memberCount} members
                                </span>
                                {group.isPrivate && (
                                    <span style={{ fontSize: '11px',
                                        padding: '3px 8px',
                                        borderRadius: 'var(--radius-xl)',
                                        background: 'var(--primary-bg)',
                                        color: 'var(--primary)' }}>
                                        🔒 Private
                                    </span>
                                )}
                                {group.onlyAdminsCanSend && (
                                    <span style={{ fontSize: '11px',
                                        padding: '3px 8px',
                                        borderRadius: 'var(--radius-xl)',
                                        background: 'var(--hover-bg)',
                                        color: 'var(--text-secondary)' }}>
                                        ✍️ Admins Only
                                    </span>
                                )}
                            </div>
                        </>
                    )}
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex',
                    borderBottom: '1px solid var(--border)' }}>
                    {['members', ...(isAdmin ? ['requests'] : [])].map(t => (
                        <button key={t}
                            onClick={() => {
                                setTab(t);
                                if (t === 'requests') loadRequests(); // ← ADD THIS
                            }}
                            style={{ flex: 1, padding: '10px',
                                fontSize: '12px', fontWeight: '600',
                                background: 'transparent', border: 'none',
                                borderBottom: tab === t
                                    ? '2px solid var(--primary)'
                                    : '2px solid transparent',
                                color: tab === t
                                    ? 'var(--primary)' : 'var(--text-muted)',
                                cursor: 'pointer',
                                textTransform: 'capitalize' }}>
                            {t}
                            {t === 'requests' && requests.length > 0 && (
                                <span style={{ marginLeft: '4px',
                                    background: 'var(--danger)', color: '#fff',
                                    borderRadius: '50%', padding: '1px 5px',
                                    fontSize: '10px' }}>
                                    {requests.length}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Members Tab */}
                {tab === 'members' && (
                    <div>
                        {/* Add Member section — only if allowed */}
                        {canAddMembers && (
                        <AddMemberSearch
                            token={token}
                            groupId={group.id}
                            currentMembers={members}
                            onAdded={(newMember) => {
                                setMembers(p => [...p, newMember]);
                            }}
                            onError={(msg) => {
                                setConfirmModal({
                                    icon: msg.toLowerCase().includes('full')
                                        ? '🚫' : '⚠️',
                                    iconBg: 'var(--danger-bg)',
                                    title: msg.toLowerCase().includes('full')
                                        ? 'Group is Full' : 'Could Not Add Member',
                                    message: msg,
                                    confirmLabel: 'Got it',
                                    confirmClass: 'btn-primary',
                                    onConfirm: () => setConfirmModal(null)
                                });
                            }} />
                        )}

                        {/* Member search box */}
                        <div style={{ padding: '10px 16px',
                            borderBottom:
                                '1px solid var(--border-light)' }}>
                            <input
                                value={memberSearch}
                                onChange={e =>
                                    setMemberSearch(e.target.value)}
                                placeholder={`Search ${members.length} members...`}
                                className="input"
                                style={{ fontSize: '12px' }} />
                        </div>

                        {/* Member list */}
                        {loading ? (
                            <p style={{ textAlign: 'center',
                                color: 'var(--text-muted)',
                                padding: '1rem', fontSize: '13px' }}>
                                Loading...
                            </p>
                        ) : filteredMembers.length === 0 ? (
                            <p style={{ textAlign: 'center',
                                color: 'var(--text-muted)',
                                padding: '1rem', fontSize: '13px' }}>
                                No members match "{memberSearch}"
                            </p>
                        ) : filteredMembers.map(m => (
                            <MemberRow
                                key={m.userId}
                                m={m}
                                isAdmin={isAdmin}
                                currentUserId={user?.id}
                                currentUsername={user?.username}
                                onRoleChange={handleRoleChange}
                                onConfirmRemove={handleConfirmRemove}
                                token={token} />
                        ))}
                    </div>
                )}

                {/* Requests Tab */}
                {tab === 'requests' && (
                    <div style={{ padding: '8px 0' }}>
                        {requests.length === 0 ? (
                            <p style={{ textAlign: 'center',
                                color: 'var(--text-muted)',
                                padding: '1rem', fontSize: '13px' }}>
                                No pending requests
                            </p>
                        ) : requests.map(r => (
                            <div key={r.id}
                                style={{ display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    padding: '10px 16px',
                                    borderBottom:
                                        '1px solid var(--border-light)' }}>
                                <div style={M.getAvatar(38,
                                    r.profilePictureUrl
                                        ? `${BASE}${r.profilePictureUrl}`
                                        : null)}>
                                    {!r.profilePictureUrl
                                        && r.username?.[0]?.toUpperCase()}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <p style={{ margin: 0,
                                        fontSize: '13px',
                                        fontWeight: '600',
                                        color: 'var(--text-primary)' }}>
                                        @{r.username}
                                    </p>
                                    <p style={{ margin: 0,
                                        fontSize: '11px',
                                        color: 'var(--text-muted)' }}>
                                        {r.fullName}
                                    </p>
                                </div>
                                <div style={{ display: 'flex',
                                    gap: '4px' }}>
                                    <button
                                        onClick={() =>
                                            handleAccept(r.userId)}
                                        className="btn-primary"
                                        style={{ padding: '4px 8px',
                                            fontSize: '10px' }}>
                                        Accept
                                    </button>
                                    <button
                                        onClick={() =>
                                            handleReject(r.userId, r.username)}
                                        className="btn-danger"
                                        style={{ padding: '4px 8px',
                                            fontSize: '10px' }}>
                                        Reject
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Footer */}
            <div style={{ padding: '12px 16px',
                borderTop: '1px solid var(--border)',
                display: 'flex', flexDirection: 'column',
                gap: '8px' }}>
                <button onClick={handleLeave}
                    className="btn-secondary btn-full"
                    style={{ fontSize: '13px' }}>
                    🚪 Leave Group
                </button>
                {isAdmin && (
                    <button onClick={handleDelete}
                        className="btn-danger btn-full"
                        style={{ fontSize: '13px' }}>
                        🗑️ Delete Group
                    </button>
                )}
            </div>

            {/* Confirm Modal */}
                {confirmModal && (
                    <div className="modal-overlay"
                        onClick={() => !confirmModal.loading
                            && setConfirmModal(null)}>
                        <div className="modal-box"
                            style={{ maxWidth: '360px' }}
                            onClick={e => e.stopPropagation()}>
                            <div style={{ width: '56px', height: '56px',
                                background: confirmModal.iconBg,
                                borderRadius: '50%',
                                display: 'flex', alignItems: 'center',
                                justifyContent: 'center',
                                margin: '0 auto 16px',
                                fontSize: '24px' }}>
                                {confirmModal.icon}
                            </div>
                            <h3 style={{ margin: '0 0 8px',
                                fontSize: '17px', fontWeight: '700',
                                color: 'var(--text-primary)',
                                textAlign: 'center' }}>
                                {confirmModal.title}
                            </h3>
                            <p style={{ color: 'var(--text-muted)',
                                fontSize: '13px',
                                margin: '0 0 20px',
                                textAlign: 'center',
                                lineHeight: '1.6' }}>
                                {confirmModal.message}
                            </p>
                            {confirmModal.error && (
                                <div style={{ background: 'var(--danger-bg)',
                                    border: '1px solid var(--danger)',
                                    borderRadius: 'var(--radius-md)',
                                    padding: '8px 12px',
                                    marginBottom: '12px',
                                    fontSize: '12px',
                                    color: 'var(--danger)',
                                    textAlign: 'center' }}>
                                    {confirmModal.error}
                                </div>
                            )}
                            <div style={{ display: 'flex',
                                flexDirection: 'column', gap: '8px' }}>
                                <button
                                    onClick={confirmModal.onConfirm}
                                    disabled={confirmModal.loading}
                                    className={`${confirmModal.confirmClass} btn-full`}
                                    style={{ fontSize: '14px',
                                        padding: '12px',
                                        fontWeight: '600' }}>
                                    {confirmModal.loading
                                        ? 'Processing...'
                                        : confirmModal.confirmLabel}
                                </button>
                                <button
                                    onClick={() => setConfirmModal(null)}
                                    disabled={confirmModal.loading}
                                    className="btn-secondary btn-full"
                                    style={{ fontSize: '14px',
                                        padding: '12px' }}>
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )}
        </div>
    );
};

export default GroupInfoPanel;