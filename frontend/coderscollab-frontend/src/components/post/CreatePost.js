import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { createPost, createImagePost } from '../../api/postApi';
import Navbar from '../common/Navbar';
import * as M from '../../styles/mixins';

const POST_TYPES = [
    { value: 'TEXT', label: 'Text Post', icon: '📝',
        desc: 'Share thoughts, ideas or updates' },
    { value: 'CODE', label: 'Code Snippet', icon: '💻',
        desc: 'Share a piece of code with the community' },
    { value: 'IMAGE', label: 'Image Post', icon: '🖼️',
        desc: 'Share one or multiple images' },
    { value: 'COLLAB', label: 'Looking for Collab', icon: '🤝',
        desc: 'Find developers to collaborate with' },
];

const LANGUAGES = [
    'Java', 'Python', 'JavaScript', 'TypeScript', 'C', 'C++',
    'C#', 'Go', 'Rust', 'Kotlin', 'Swift', 'PHP', 'Ruby',
    'HTML', 'CSS', 'SQL', 'Other'
];

const CreatePost = () => {
    const { token, user } = useAuth();
    const [step, setStep] = useState(1);
    const [postType, setPostType] = useState('');
    const [form, setForm] = useState({
        content: '', language: 'Java', visibility: 'PUBLIC' });
    const [imageFiles, setImageFiles] = useState([]);
    const [imagePreviews, setImagePreviews] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleTypeSelect = (type) => {
        setPostType(type); setStep(2);
    };

    const handleImageChange = (e) => {
        const files = Array.from(e.target.files);
        if (files.length + imageFiles.length > 5) {
            setError('Maximum 5 images allowed'); return;
        }
        setError('');
        setImageFiles(p => [...p, ...files]);
        setImagePreviews(p => [...p,
            ...files.map(f => URL.createObjectURL(f))]);
    };

    const removeImage = (i) => {
        setImageFiles(p => p.filter((_, j) => j !== i));
        setImagePreviews(p => p.filter((_, j) => j !== i));
    };

    const handleSubmit = async () => {
        if (!form.content.trim()) {
            setError('Content is required'); return;
        }
        if (postType === 'IMAGE' && imageFiles.length === 0) {
            setError('Please select at least one image'); return;
        }
        setLoading(true); setError('');
        try {
            if (postType === 'IMAGE') {
                const fd = new FormData();
                fd.append('content', form.content);
                fd.append('visibility', form.visibility);
                imageFiles.forEach(f => fd.append('files', f));
                await createImagePost(token, fd);
            } else {
                await createPost(token, {
                    content: form.content,
                    postType: postType === 'COLLAB' ? 'TEXT' : postType,
                    language: postType === 'CODE' ? form.language : null,
                    visibility: form.visibility,
                });
            }
            window.location.href = '/home';
        } catch (e) {
            setError('Failed to create post. Please try again.');
        } finally { setLoading(false); }
    };

    const placeholder = {
        CODE: 'Paste your code here...',
        IMAGE: 'Add a caption for your images...',
        COLLAB: 'Describe what you are building and what kind of developer you are looking for...',
    }[postType] || 'What is on your mind?';

    const selectedType = POST_TYPES.find(t => t.value === postType);

    return (
        <div className="page">
            <Navbar active="" />

            <div style={{ maxWidth: '600px', margin: '2rem auto',
                padding: '0 1rem' }}>

                {/* Step 1 — Choose Type */}
                {step === 1 && (
                    <div>
                        <h2 style={{ fontSize: '18px', fontWeight: '600',
                            color: 'var(--text-primary)',
                            marginBottom: '4px' }}>
                            Create a Post
                        </h2>
                        <p style={{ fontSize: '13px',
                            color: 'var(--text-muted)',
                            marginBottom: '1.5rem' }}>
                            What type of post do you want to create?
                        </p>
                        <div style={{ display: 'flex',
                            flexDirection: 'column', gap: '12px' }}>
                            {POST_TYPES.map(type => (
                                <div key={type.value}
                                    onClick={() =>
                                        handleTypeSelect(type.value)}
                                    className="card-solid"
                                    style={{ cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '16px',
                                        transition: 'border-color 0.2s' }}
                                    onMouseOver={e =>
                                        e.currentTarget.style.borderColor =
                                        'var(--primary)'}
                                    onMouseOut={e =>
                                        e.currentTarget.style.borderColor =
                                        'var(--border)'}>
                                    <div style={{ fontSize: '28px',
                                        width: '52px', height: '52px',
                                        background: 'var(--hover-bg)',
                                        borderRadius: 'var(--radius-lg)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0 }}>
                                        {type.icon}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <p style={{ fontSize: '15px',
                                            fontWeight: '600', margin: 0,
                                            color: 'var(--text-primary)' }}>
                                            {type.label}
                                        </p>
                                        <p style={{ fontSize: '13px',
                                            color: 'var(--text-muted)',
                                            margin: '4px 0 0' }}>
                                            {type.desc}
                                        </p>
                                    </div>
                                    <span style={{ color: 'var(--text-faint)',
                                        fontSize: '18px' }}>→</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Step 2 — Fill Details */}
                {step === 2 && (
                    <div>
                        {/* Header */}
                        <div style={{ display: 'flex',
                            alignItems: 'center', gap: '12px',
                            marginBottom: '1.5rem' }}>
                            <button onClick={() => setStep(1)}
                                className="btn-icon"
                                style={{ fontSize: '20px',
                                    color: 'var(--text-primary)' }}>
                                ←
                            </button>
                            <div>
                                <h2 style={{ fontSize: '18px',
                                    fontWeight: '600',
                                    color: 'var(--text-primary)',
                                    margin: 0 }}>
                                    {selectedType?.label}
                                </h2>
                                <p style={{ fontSize: '13px',
                                    color: 'var(--text-muted)', margin: 0 }}>
                                    Posting as @{user?.username}
                                </p>
                            </div>
                        </div>

                        <div className="card-solid"
                            style={{ padding: '1.5rem' }}>

                            {/* Language — CODE only */}
                            {postType === 'CODE' && (
                                <div style={{ marginBottom: '1rem' }}>
                                    <label style={{ fontSize: '13px',
                                        fontWeight: '600',
                                        color: 'var(--text-secondary)',
                                        display: 'block',
                                        marginBottom: '6px' }}>
                                        Programming Language
                                    </label>
                                    <select name="language"
                                        value={form.language}
                                        onChange={e => setForm(p => ({
                                            ...p, language: e.target.value }))}
                                        className="input">
                                        {LANGUAGES.map(lang => (
                                            <option key={lang} value={lang}>
                                                {lang}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* Images — IMAGE only */}
                            {postType === 'IMAGE' && (
                                <div style={{ marginBottom: '1rem' }}>
                                    <label style={{ fontSize: '13px',
                                        fontWeight: '600',
                                        color: 'var(--text-secondary)',
                                        display: 'block',
                                        marginBottom: '6px' }}>
                                        Images (max 5)
                                    </label>
                                    <label style={{ display: 'block',
                                        border: '2px dashed var(--border)',
                                        borderRadius: 'var(--radius-md)',
                                        padding: '1.5rem',
                                        textAlign: 'center',
                                        cursor: 'pointer',
                                        background: 'var(--hover-bg)',
                                        marginBottom: '10px',
                                        transition: 'border-color 0.2s' }}
                                        onMouseOver={e =>
                                            e.currentTarget.style
                                            .borderColor = 'var(--primary)'}
                                        onMouseOut={e =>
                                            e.currentTarget.style
                                            .borderColor = 'var(--border)'}>
                                        <p style={{ margin: 0,
                                            fontSize: '13px',
                                            color: 'var(--text-muted)' }}>
                                            Click to select images
                                        </p>
                                        <p style={{ margin: '4px 0 0',
                                            fontSize: '11px',
                                            color: 'var(--text-faint)' }}>
                                            JPG, PNG, GIF up to 5MB each
                                        </p>
                                        <input type="file" accept="image/*"
                                            multiple
                                            onChange={handleImageChange}
                                            style={{ display: 'none' }} />
                                    </label>

                                    {imagePreviews.length > 0 && (
                                        <div style={{ display: 'grid',
                                            gridTemplateColumns:
                                                'repeat(auto-fill, minmax(120px, 1fr))',
                                            gap: '8px' }}>
                                            {imagePreviews.map((src, i) => (
                                                <div key={i}
                                                    style={{ position: 'relative' }}>
                                                    <img src={src}
                                                        alt={`preview-${i}`}
                                                        style={{ width: '100%',
                                                            height: '100px',
                                                            objectFit: 'cover',
                                                            borderRadius: 'var(--radius-md)',
                                                            border: '1px solid var(--border)' }} />
                                                    <button onClick={() =>
                                                        removeImage(i)}
                                                        style={{ position: 'absolute',
                                                            top: '4px', right: '4px',
                                                            background: 'var(--danger)',
                                                            color: '#fff',
                                                            border: 'none',
                                                            borderRadius: '50%',
                                                            width: '20px', height: '20px',
                                                            fontSize: '12px',
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center' }}>
                                                        ×
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Content */}
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ fontSize: '13px',
                                    fontWeight: '600',
                                    color: 'var(--text-secondary)',
                                    display: 'block', marginBottom: '6px' }}>
                                    {postType === 'CODE' ? 'Code'
                                        : postType === 'IMAGE' ? 'Caption'
                                        : 'Content'}
                                </label>
                                <textarea name="content"
                                    value={form.content}
                                    onChange={e => setForm(p => ({
                                        ...p, content: e.target.value }))}
                                    placeholder={placeholder}
                                    rows={postType === 'CODE' ? 10 : 4}
                                    className="input"
                                    style={{ fontFamily: postType === 'CODE'
                                            ? 'var(--font-mono)' : 'inherit',
                                        background: postType === 'CODE'
                                            ? '#0d1117' : 'var(--input-bg)',
                                        color: postType === 'CODE'
                                            ? '#d4d4d4'
                                            : 'var(--text-primary)',
                                        resize: 'vertical',
                                        lineHeight: '1.6' }} />
                            </div>

                            {/* Visibility */}
                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ fontSize: '13px',
                                    fontWeight: '600',
                                    color: 'var(--text-secondary)',
                                    display: 'block', marginBottom: '6px' }}>
                                    Visibility
                                </label>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    {[['PUBLIC', 'Public', 'Everyone can see'],
                                      ['FOLLOWERS', 'Followers Only',
                                          'Only your followers']
                                    ].map(([val, label, hint]) => {
                                        const active =
                                            form.visibility === val;
                                        return (
                                            <div key={val}
                                                onClick={() => setForm(p =>
                                                    ({ ...p, visibility: val }))}
                                                style={{ flex: 1,
                                                    padding: '10px',
                                                    border: active
                                                        ? '2px solid var(--primary)'
                                                        : '1px solid var(--border)',
                                                    borderRadius: 'var(--radius-md)',
                                                    textAlign: 'center',
                                                    cursor: 'pointer',
                                                    background: active
                                                        ? 'var(--primary-bg)'
                                                        : 'transparent' }}>
                                                <p style={{ fontSize: '13px',
                                                    fontWeight: '600',
                                                    margin: 0,
                                                    color: active
                                                        ? 'var(--primary)'
                                                        : 'var(--text-secondary)' }}>
                                                    {label}
                                                </p>
                                                <p style={{ fontSize: '11px',
                                                    color: 'var(--text-muted)',
                                                    margin: '2px 0 0' }}>
                                                    {hint}
                                                </p>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {error && (
                                <p style={{ color: 'var(--danger)',
                                    fontSize: '13px',
                                    marginBottom: '1rem' }}>
                                    {error}
                                </p>
                            )}

                            <button onClick={handleSubmit}
                                disabled={loading}
                                className="btn-primary btn-full">
                                {loading ? 'Posting...' : 'Post'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CreatePost;