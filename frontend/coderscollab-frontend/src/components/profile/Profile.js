import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getProfile, updateProfile,
    uploadProfilePicture } from '../../api/profileApi';
import { getUserPosts } from '../../api/userApi';
import { getFollowers, getFollowing,
    getFollowerCount } from '../../api/followerApi';
import PostCard from '../home/PostCard';
import Navbar from '../common/Navbar';
import FollowListModal from '../common/FollowListModal';
import * as M from '../../styles/mixins';

const BASE = 'http://localhost:8080';
const toUrl = (url) => url?.startsWith('http') ? url : `https://${url}`;

const FIELDS = [
    { label: 'Full Name', name: 'fullName', type: 'text' },
    { label: 'Bio', name: 'bio', type: 'textarea' },
    { label: 'Location', name: 'location', type: 'text' },
    { label: 'Master Stack', name: 'masterStack', type: 'text' },
    { label: 'Skills (comma separated)', name: 'skills', type: 'text' },
    { label: 'Years of Experience', name: 'yearsOfExperience', type: 'number' },
    { label: 'GitHub URL', name: 'githubUrl', type: 'text' },
    { label: 'LinkedIn URL', name: 'linkedinUrl', type: 'text' },
    { label: 'Website URL', name: 'websiteUrl', type: 'text' },
];

const Profile = () => {
    const { token } = useAuth();
    const [profile, setProfile] = useState(null);
    const [editing, setEditing] = useState(false);
    const [posts, setPosts] = useState([]);
    const [activeTab, setActiveTab] = useState('profile');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
    const [followerCount, setFollowerCount] = useState(0);
    const [followingCount, setFollowingCount] = useState(0);
    const [modal, setModal] = useState(null);
    const [modalList, setModalList] = useState([]);
    const [modalLoading, setModalLoading] = useState(false);
    const [form, setForm] = useState({
        fullName: '', bio: '', location: '',
        websiteUrl: '', githubUrl: '', linkedinUrl: '',
        masterStack: '', skills: '', yearsOfExperience: '',
        availableForCollab: true, isPrivate: false
    });

    useEffect(() => { fetchProfile(); }, []);

    const fetchProfile = async () => {
        try {
            const data = await getProfile(token);
            const [postsData, counts] = await Promise.all([
                getUserPosts(token, data.username),
                getFollowerCount(data.id)
            ]);
            setProfile(data);
            setPosts(postsData);
            setFollowerCount(counts.followers);
            setFollowingCount(counts.following);
            setForm({
                fullName: data.fullName || '',
                bio: data.bio || '',
                location: data.location || '',
                websiteUrl: data.websiteUrl || '',
                githubUrl: data.githubUrl || '',
                linkedinUrl: data.linkedinUrl || '',
                masterStack: data.masterStack || '',
                skills: data.skills?.join(', ') || '',
                yearsOfExperience: data.yearsOfExperience || '',
                availableForCollab: data.availableForCollab ?? true,
                isPrivate: data.isPrivate ?? false
            });
        } catch (e) {
            setMessage('Failed to load profile');
        } finally { setLoading(false); }
    };

    const handleChange = (e) => {
        const val = e.target.type === 'checkbox'
            ? e.target.checked : e.target.value;
        setForm(p => ({ ...p, [e.target.name]: val }));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const payload = { ...form,
                skills: form.skills.split(',')
                    .map(s => s.trim()).filter(Boolean),
                yearsOfExperience: parseInt(form.yearsOfExperience) || 0
            };
            const data = await updateProfile(token, payload);
            setProfile(data);
            setEditing(false);
            setMessage('Profile updated!');
            setTimeout(() => setMessage(''), 3000);
        } catch (e) {
            setMessage('Failed to update profile');
        } finally { setSaving(false); }
    };

    const handlePictureUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        try {
            const data = await uploadProfilePicture(token, file);
            setProfile(data);
            setMessage('Picture updated!');
            setTimeout(() => setMessage(''), 3000);
        } catch (e) { setMessage('Upload failed'); }
    };

    const openModal = async (type) => {
        setModal(type);
        setModalLoading(true);
        setModalList([]);
        try {
            const data = type === 'followers'
                ? await getFollowers(profile.id)
                : await getFollowing(profile.id);
            setModalList(data);
        } catch (e) {}
        finally { setModalLoading(false); }
    };

    const avatarUrl = profile?.profilePictureUrl
        ? `${BASE}${profile.profilePictureUrl}` : null;

    if (loading) return (
        <div className="page" style={{ display: 'flex',
            justifyContent: 'center', alignItems: 'center',
            height: '100vh' }}>
            <p style={{ color: 'var(--text-muted)' }}>Loading...</p>
        </div>
    );

    return (
        <div className="page">
            <Navbar active="Profile" />

            {modal && (
                <FollowListModal
                    title={modal === 'followers'
                        ? 'Followers' : 'Following'}
                    list={modalLoading ? [] : modalList}
                    onClose={() => setModal(null)} />
            )}

            <div style={{ maxWidth: '700px', margin: '2rem auto',
                padding: '0 1rem' }}>

                {/* Tabs */}
                <div style={{ display: 'flex', gap: '8px',
                    marginBottom: '1rem' }}>
                    {[['profile', 'Profile'],
                      ['posts', `My Posts (${posts.length})`]
                    ].map(([tab, label]) => (
                        <button key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={activeTab === tab
                                ? 'btn-primary' : 'btn-secondary'}
                            style={{ padding: '8px 20px',
                                fontSize: '13px', fontWeight: '600' }}>
                            {label}
                        </button>
                    ))}
                </div>

                {/* Posts Tab */}
                {activeTab === 'posts' ? (
                    posts.length === 0 ? (
                        <div className="empty-state">
                            You haven't posted anything yet.
                        </div>
                    ) : (
                        <div style={{ display: 'flex',
                            flexDirection: 'column', gap: '1rem' }}>
                            {posts.map(post => (
                                <PostCard key={post.id} post={post}
                                    onDeleted={id => setPosts(p =>
                                        p.filter(x => x.id !== id))}
                                    onUpdated={u => setPosts(p =>
                                        p.map(x => x.id === u.id
                                            ? u : x))} />
                            ))}
                        </div>
                    )
                ) : (
                    /* Profile Tab */
                    <div className="card-solid"
                        style={{ padding: '2rem' }}>

                        {/* Profile Header */}
                        <div style={{ display: 'flex',
                            alignItems: 'center', gap: '1.5rem',
                            marginBottom: '1.5rem' }}>

                            {/* Avatar */}
                            <div style={{ position: 'relative' }}>
                                <div style={{ ...M.getAvatar(90, avatarUrl),
                                    fontSize: '28px',
                                    border: '3px solid var(--primary)' }}>
                                    {!avatarUrl &&
                                        profile?.username?.[0]?.toUpperCase()}
                                </div>
                                <label style={{ position: 'absolute',
                                    bottom: 0, right: 0,
                                    background: 'var(--primary)',
                                    color: '#fff', borderRadius: '50%',
                                    width: '28px', height: '28px',
                                    display: 'flex', alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer', fontSize: '14px',
                                    border: '2px solid var(--card-bg-solid)' }}>
                                    📷
                                    <input type="file" accept="image/*"
                                        onChange={handlePictureUpload}
                                        style={{ display: 'none' }} />
                                </label>
                            </div>

                            <div>
                                <h2 style={{ color: 'var(--text-primary)',
                                    margin: '0 0 4px',
                                    fontSize: '20px' }}>
                                    @{profile?.username}
                                </h2>
                                <p style={{ color: 'var(--text-muted)',
                                    fontSize: '13px', margin: '0 0 10px' }}>
                                    {profile?.email}
                                </p>
                                <div style={{ display: 'flex',
                                    gap: '16px', marginBottom: '10px' }}>
                                    {[['followers', followerCount, 'Followers'],
                                      ['following', followingCount, 'Following']
                                    ].map(([type, count, label]) => (
                                        <div key={type}
                                            onClick={() => openModal(type)}
                                            style={{ cursor: 'pointer' }}>
                                            <span style={{ fontWeight: '600',
                                                color: 'var(--text-primary)',
                                                fontSize: '15px' }}>
                                                {count}
                                            </span>
                                            <span style={{
                                                color: 'var(--text-muted)',
                                                fontSize: '13px',
                                                marginLeft: '4px',
                                                textDecoration: 'underline' }}>
                                                {label}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                                <span style={M.badge(
                                    profile?.availableForCollab
                                        ? 'success' : 'danger')}>
                                    {profile?.availableForCollab
                                        ? 'Available for Collab'
                                        : 'Not Available'}
                                </span>
                            </div>
                        </div>

                        {/* Message */}
                        {message && (
                            <p style={{ textAlign: 'center',
                                color: 'var(--primary)',
                                marginBottom: '1rem',
                                fontWeight: '600' }}>
                                {message}
                            </p>
                        )}

                        {/* View Mode */}
                        {!editing ? (
                            <div>
                                {[
                                    { title: 'Basic Info', fields: [
                                        ['Name', profile?.fullName],
                                        ['Bio', profile?.bio],
                                        ['Location', profile?.location],
                                    ]},
                                    { title: 'Dev Info', fields: [
                                        ['Stack', profile?.masterStack],
                                        ['Skills', profile?.skills?.join(', ')],
                                        ['Experience', profile?.yearsOfExperience
                                            ? `${profile.yearsOfExperience} yrs`
                                            : null],
                                    ]},
                                    { title: 'Social Links', fields: [
                                        ['GitHub', profile?.githubUrl],
                                        ['LinkedIn', profile?.linkedinUrl],
                                        ['Website', profile?.websiteUrl],
                                    ]},
                                ].map(section => (
                                    <div key={section.title}
                                        style={{ marginBottom: '1rem',
                                            padding: '1rem',
                                            background: 'var(--hover-bg)',
                                            borderRadius: 'var(--radius-md)',
                                            border: '1px solid var(--border)' }}>
                                        <h3 style={{ color: 'var(--primary)',
                                            margin: '0 0 8px',
                                            fontSize: '15px',
                                            fontWeight: '600' }}>
                                            {section.title}
                                        </h3>
                                        {section.fields.map(([label, value]) => (
                                            <p key={label}
                                                style={{ margin: '4px 0',
                                                    fontSize: '14px',
                                                    color: 'var(--text-secondary)' }}>
                                                <b style={{ color: 'var(--text-primary)' }}>
                                                    {label}:
                                                </b>{' '}
                                                {value || '—'}
                                            </p>
                                        ))}
                                    </div>
                                ))}
                                <button onClick={() => setEditing(true)}
                                    className="btn-primary btn-full"
                                    style={{ marginTop: '1rem' }}>
                                    Edit Profile
                                </button>
                            </div>
                        ) : (
                            /* Edit Mode */
                            <div>
                                {FIELDS.map(f => (
                                    <div key={f.name}
                                        style={{ marginBottom: '1rem' }}>
                                        <label style={{ display: 'block',
                                            marginBottom: '4px',
                                            fontSize: '13px',
                                            fontWeight: '600',
                                            color: 'var(--text-secondary)' }}>
                                            {f.label}
                                        </label>
                                        {f.type === 'textarea' ? (
                                            <textarea name={f.name}
                                                value={form[f.name]}
                                                onChange={handleChange}
                                                className="input"
                                                style={{ minHeight: '80px',
                                                    resize: 'vertical' }} />
                                        ) : (
                                            <input type={f.type}
                                                name={f.name}
                                                value={form[f.name]}
                                                onChange={handleChange}
                                                className="input" />
                                        )}
                                    </div>
                                ))}

                                {/* Checkboxes */}
                                {[['availableForCollab',
                                    'Available for Collaboration', null],
                                  ['isPrivate', 'Private Account',
                                    'Only followers can see your posts']
                                ].map(([name, label, hint]) => (
                                    <div key={name}
                                        style={{ marginBottom: '1rem' }}>
                                        <label style={{ fontSize: '13px',
                                            color: 'var(--text-secondary)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px', cursor: 'pointer' }}>
                                            <input type="checkbox"
                                                name={name}
                                                checked={form[name]}
                                                onChange={handleChange} />
                                            {label}
                                        </label>
                                        {hint && (
                                            <p style={{ fontSize: '11px',
                                                color: 'var(--text-faint)',
                                                margin: '4px 0 0 22px' }}>
                                                {hint}
                                            </p>
                                        )}
                                    </div>
                                ))}

                                <div style={{ display: 'flex', gap: '1rem' }}>
                                    <button onClick={handleSave}
                                        disabled={saving}
                                        className="btn-primary btn-full">
                                        {saving ? 'Saving...' : 'Save Changes'}
                                    </button>
                                    <button onClick={() => setEditing(false)}
                                        className="btn-secondary btn-full">
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Profile;