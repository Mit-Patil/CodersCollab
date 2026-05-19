import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { createGroup } from '../../api/groupApi';

const BASE = 'http://localhost:8080';

const CreateGroupModal = ({ onClose, onCreated }) => {
    const { token } = useAuth();
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [isPrivate, setIsPrivate] = useState(false);
    const [onlyAdminsCanSend, setOnlyAdminsCanSend] = useState(false);
    const [onlyAdminsCanAdd, setOnlyAdminsCanAdd] = useState(false);
    const [maxMembers, setMaxMembers] = useState(100);
    const [avatar, setAvatar] = useState(null);
    const [avatarPreview, setAvatarPreview] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Member search states
    const [memberQuery, setMemberQuery] = useState('');
    const [memberResults, setMemberResults] = useState([]);
    const [memberSearching, setMemberSearching] = useState(false);
    const [selectedMembers, setSelectedMembers] = useState([]);

    const handleAvatarChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setAvatar(file);
            setAvatarPreview(URL.createObjectURL(file));
        }
    };

    const handleMemberSearch = async (q) => {
        setMemberQuery(q);
        if (!q.trim()) { setMemberResults([]); return; }
        setMemberSearching(true);
        try {
            const res = await fetch(
                `${BASE}/api/profile/search?q=${q}`,
                { headers: { Authorization: `Bearer ${token}` }});
            const data = await res.json();
            // Filter already selected
            const selectedIds = selectedMembers.map(m => m.id);
            setMemberResults(data.filter(u =>
                !selectedIds.includes(u.id)));
        } catch (e) {}
        finally { setMemberSearching(false); }
    };

    const addMember = (user) => {
        setSelectedMembers(p => [...p, user]);
        setMemberResults(p => p.filter(u => u.id !== user.id));
        setMemberQuery('');
    };

    const removeMember = (userId) => {
        setSelectedMembers(p => p.filter(u => u.id !== userId));
    };

    const handleSubmit = async () => {
        if (!name.trim()) {
            setError('Group name is required');
            return;
        }
        const max = Number(maxMembers);
            if (isNaN(max) || max < 3) {
                setError('Member limit must be at least 3');
                return;
            }
            if (max > 1000) {
                setError('Member limit cannot exceed 1000');
                return;
            }
            setLoading(true);
            setError('');
        try {
            const formData = new FormData();
            const data = {
                name, description, isPrivate,
                onlyAdminsCanSend, onlyAdminsCanAdd,
                maxMembers: Number(maxMembers),
                memberIds: selectedMembers.map(m => m.id)
            };
            formData.append('data', new Blob(
                [JSON.stringify(data)],
                { type: 'application/json' }));
            if (avatar) formData.append('avatar', avatar);
            const group = await createGroup(token, formData);
            onCreated(group);
            onClose();
        } catch (e) {
            setError(e.response?.data?.message
                || 'Failed to create group');
        } finally { setLoading(false); }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-box"
                style={{ maxWidth: '460px',
                    maxHeight: '90vh', overflowY: 'auto' }}
                onClick={e => e.stopPropagation()}>

                <div style={{ display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '1.25rem' }}>
                    <h3 style={{ margin: 0, fontSize: '16px',
                        fontWeight: '700',
                        color: 'var(--text-primary)' }}>
                        Create Group
                    </h3>
                    <button onClick={onClose}
                        className="btn-icon"
                        style={{ fontSize: '20px' }}>×</button>
                </div>

                {/* Avatar */}
                <div style={{ display: 'flex',
                    justifyContent: 'center',
                    marginBottom: '1.25rem' }}>
                    <label style={{ cursor: 'pointer' }}>
                        <div style={{ width: '80px', height: '80px',
                            borderRadius: '50%',
                            background: avatarPreview
                                ? 'transparent'
                                : 'var(--primary-bg)',
                            border: '2px dashed var(--primary)',
                            display: 'flex', alignItems: 'center',
                            justifyContent: 'center',
                            overflow: 'hidden', fontSize: '28px',
                            position: 'relative' }}>
                            {avatarPreview ? (
                                <img src={avatarPreview}
                                    alt="avatar"
                                    style={{ width: '100%',
                                        height: '100%',
                                        objectFit: 'cover' }} />
                            ) : '📷'}
                        </div>
                        <p style={{ textAlign: 'center',
                            fontSize: '11px',
                            color: 'var(--text-muted)',
                            margin: '4px 0 0' }}>
                            {avatarPreview
                                ? 'Click to change'
                                : 'Add photo'}
                        </p>
                        <input type="file" accept="image/*"
                            onChange={handleAvatarChange}
                            style={{ display: 'none' }} />
                    </label>
                </div>

                {/* Name */}
                <div style={{ marginBottom: '12px' }}>
                    <label style={{ fontSize: '12px',
                        fontWeight: '600',
                        color: 'var(--text-secondary)',
                        display: 'block',
                        marginBottom: '6px' }}>
                        Group Name *
                    </label>
                    <input value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="Enter group name..."
                        className="input"
                        style={{ fontSize: '14px' }} />
                </div>

                {/* Description */}
                <div style={{ marginBottom: '12px' }}>
                    <label style={{ fontSize: '12px',
                        fontWeight: '600',
                        color: 'var(--text-secondary)',
                        display: 'block',
                        marginBottom: '6px' }}>
                        Description
                    </label>
                    <textarea value={description}
                        onChange={e => setDescription(e.target.value)}
                        placeholder="What's this group about?"
                        rows={2}
                        className="input"
                        style={{ fontSize: '13px',
                            resize: 'vertical' }} />
                </div>

                {/* Max Members */}
                <div style={{ marginBottom: '12px' }}>
                    <label style={{ fontSize: '12px', fontWeight: '600',
                        color: 'var(--text-secondary)',
                        display: 'block', marginBottom: '6px' }}>
                        Member Limit
                        <span style={{ color: 'var(--text-faint)',
                            fontWeight: '400', marginLeft: '6px' }}>
                            (min 3, max 1000)
                        </span>
                    </label>
                    <input type="number"
                        value={maxMembers}
                        onChange={e => {
                            setMaxMembers(e.target.value);
                            setError(''); // clear error on change
                        }}
                        min={3} max={1000}
                        className="input"
                        style={{ fontSize: '14px' }} />
                    {Number(maxMembers) < 3 && maxMembers !== '' && (
                        <p style={{ fontSize: '11px',
                            color: 'var(--danger)',
                            margin: '4px 0 0' }}>
                            ⚠️ Minimum 3 members required for a group
                        </p>
                    )}
                </div>

                {/* Add Members */}
                <div style={{ marginBottom: '12px' }}>
                    <label style={{ fontSize: '12px',
                        fontWeight: '600',
                        color: 'var(--text-secondary)',
                        display: 'block',
                        marginBottom: '6px' }}>
                        Add Members (optional)
                    </label>

                    {/* Selected members */}
                    {selectedMembers.length > 0 && (
                        <div style={{ display: 'flex',
                            flexWrap: 'wrap', gap: '6px',
                            marginBottom: '8px' }}>
                            {selectedMembers.map(m => (
                                <div key={m.id}
                                    style={{ display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        background: 'var(--primary-bg)',
                                        border: '1px solid var(--primary-border)',
                                        borderRadius: 'var(--radius-xl)',
                                        padding: '3px 10px 3px 8px',
                                        fontSize: '12px',
                                        color: 'var(--primary)' }}>
                                    <div style={{ width: '20px',
                                        height: '20px',
                                        borderRadius: '50%',
                                        background: 'var(--primary)',
                                        color: '#fff',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '10px',
                                        fontWeight: '700',
                                        overflow: 'hidden',
                                        flexShrink: 0 }}>
                                        {m.profilePictureUrl ? (
                                            <img
                                                src={`${BASE}${m.profilePictureUrl}`}
                                                alt={m.username}
                                                style={{ width: '100%',
                                                    height: '100%',
                                                    objectFit: 'cover' }} />
                                        ) : m.username?.[0]?.toUpperCase()}
                                    </div>
                                    @{m.username}
                                    <button onClick={() =>
                                        removeMember(m.id)}
                                        style={{ background: 'none',
                                            border: 'none',
                                            color: 'var(--primary)',
                                            cursor: 'pointer',
                                            padding: '0',
                                            fontSize: '14px',
                                            lineHeight: 1,
                                            marginLeft: '2px' }}>
                                        ×
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    <input value={memberQuery}
                        onChange={e =>
                            handleMemberSearch(e.target.value)}
                        placeholder="Search users by username..."
                        className="input"
                        style={{ fontSize: '13px',
                            marginBottom: '4px' }} />

                    {memberSearching && (
                        <p style={{ fontSize: '11px',
                            color: 'var(--text-muted)',
                            margin: '4px 0' }}>
                            Searching...
                        </p>
                    )}

                    {memberResults.length > 0 && (
                        <div style={{ background: 'var(--input-bg)',
                            border: '1px solid var(--border)',
                            borderRadius: 'var(--radius-md)',
                            overflow: 'hidden',
                            maxHeight: '160px',
                            overflowY: 'auto' }}>
                            {memberResults.map(u => (
                                <div key={u.id}
                                    onClick={() => addMember(u)}
                                    style={{ display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        padding: '8px 12px',
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
                                    <div style={{ width: '30px',
                                        height: '30px',
                                        borderRadius: '50%',
                                        background: 'var(--primary-bg)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '12px',
                                        fontWeight: '600',
                                        overflow: 'hidden',
                                        flexShrink: 0 }}>
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
                                        <p style={{ margin: 0,
                                            fontSize: '13px',
                                            fontWeight: '600',
                                            color: 'var(--text-primary)' }}>
                                            @{u.username}
                                        </p>
                                        {u.fullName && (
                                            <p style={{ margin: 0,
                                                fontSize: '11px',
                                                color: 'var(--text-muted)' }}>
                                                {u.fullName}
                                            </p>
                                        )}
                                    </div>
                                    <span style={{ fontSize: '18px',
                                        color: 'var(--primary)' }}>
                                        +
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Toggles */}
                {[
                    { label: '🔒 Private Group',
                        sub: 'Members need approval to join',
                        val: isPrivate,
                        set: setIsPrivate },
                    { label: '✍️ Only Admins Can Send',
                        sub: 'Only admins can send messages',
                        val: onlyAdminsCanSend,
                        set: setOnlyAdminsCanSend },
                    { label: '➕ Only Admins Can Add Members',
                        sub: 'Only admins can invite people',
                        val: onlyAdminsCanAdd,
                        set: setOnlyAdminsCanAdd },
                ].map(t => (
                    <div key={t.label}
                        onClick={() => t.set(!t.val)}
                        style={{ display: 'flex',
                            alignItems: 'center', gap: '12px',
                            padding: '10px 12px',
                            borderRadius: 'var(--radius-md)',
                            background: t.val
                                ? 'var(--primary-bg)'
                                : 'var(--hover-bg)',
                            border: `1px solid ${t.val
                                ? 'var(--primary-border)'
                                : 'var(--border)'}`,
                            cursor: 'pointer',
                            marginBottom: '8px',
                            transition: 'all 0.2s' }}>
                        <div style={{ flex: 1 }}>
                            <p style={{ margin: 0,
                                fontSize: '13px',
                                fontWeight: '600',
                                color: 'var(--text-primary)' }}>
                                {t.label}
                            </p>
                            <p style={{ margin: '2px 0 0',
                                fontSize: '11px',
                                color: 'var(--text-muted)' }}>
                                {t.sub}
                            </p>
                        </div>
                        <div style={{ width: '36px', height: '20px',
                            borderRadius: '10px',
                            background: t.val
                                ? 'var(--primary)'
                                : 'var(--border)',
                            position: 'relative',
                            transition: 'background 0.2s',
                            flexShrink: 0 }}>
                            <div style={{ width: '16px',
                                height: '16px',
                                borderRadius: '50%',
                                background: '#fff',
                                position: 'absolute', top: '2px',
                                left: t.val ? '18px' : '2px',
                                transition: 'left 0.2s' }} />
                        </div>
                    </div>
                ))}

                {error && (
                    <p style={{ fontSize: '12px',
                        color: 'var(--danger)', margin: '8px 0',
                        background: 'var(--danger-bg)',
                        padding: '8px 12px',
                        borderRadius: 'var(--radius-md)' }}>
                        {error}
                    </p>
                )}

                <div style={{ display: 'flex',
                    gap: '8px', marginTop: '1rem' }}>
                    <button onClick={handleSubmit}
                        disabled={loading}
                        className="btn-primary btn-full"
                        style={{ flex: 1 }}>
                        {loading ? 'Creating...' : `Create${selectedMembers.length > 0 ? ` (+ ${selectedMembers.length})` : ''}`}
                    </button>
                    <button onClick={onClose}
                        className="btn-secondary btn-full"
                        style={{ flex: 1 }}>
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CreateGroupModal;