import React from 'react';
import * as M from '../../styles/mixins';

const CreatePostBtn = ({ avatarUrl, initials }) => (
    <div className="card-solid"
        style={{ padding: '1rem', marginBottom: '1rem',
            display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={M.getAvatar(40, avatarUrl)}>
            {!avatarUrl && initials}
        </div>
        <button onClick={() => window.location.href = '/create-post'}
            className="input"
            style={{ flex: 1, padding: '10px 16px',
                borderRadius: 'var(--radius-xl)',
                textAlign: 'left', cursor: 'pointer',
                color: 'var(--text-muted)', fontSize: '13px' }}>
            Create a post...
        </button>
    </div>
);

export default CreatePostBtn;