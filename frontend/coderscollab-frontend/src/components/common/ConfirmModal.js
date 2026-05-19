// src/components/common/ConfirmModal.jsx
import React from 'react';

const ConfirmModal = ({
    show,
    icon = '⚠️',
    iconBg = 'var(--danger-bg)',
    title,
    message,
    confirmLabel = 'Confirm',
    confirmClass = 'btn-danger',
    cancelLabel = 'Cancel',
    onConfirm,
    onCancel,
    loading = false,
    children
}) => {
    if (!show) return null;

    return (
        <div className="modal-overlay" onClick={onCancel}>
            <div className="modal-box"
                style={{ maxWidth: '360px' }}
                onClick={e => e.stopPropagation()}>

                {/* Icon */}
                <div style={{ width: '56px', height: '56px',
                    background: iconBg,
                    borderRadius: '50%',
                    display: 'flex', alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px',
                    fontSize: '24px' }}>
                    {icon}
                </div>

                {/* Title */}
                <h3 style={{ margin: '0 0 8px',
                    fontSize: '17px', fontWeight: '700',
                    color: 'var(--text-primary)',
                    textAlign: 'center' }}>
                    {title}
                </h3>

                {/* Message */}
                {message && (
                    <p style={{ color: 'var(--text-muted)',
                        fontSize: '13px',
                        margin: '0 0 20px',
                        textAlign: 'center',
                        lineHeight: '1.6' }}>
                        {message}
                    </p>
                )}

                {/* Extra content slot */}
                {children}

                {/* Buttons */}
                <div style={{ display: 'flex',
                    flexDirection: 'column', gap: '8px' }}>
                    <button
                        onClick={onConfirm}
                        disabled={loading}
                        className={`${confirmClass} btn-full`}
                        style={{ fontSize: '14px',
                            padding: '12px',
                            fontWeight: '600' }}>
                        {loading ? 'Processing...' : confirmLabel}
                    </button>
                    <button
                        onClick={onCancel}
                        disabled={loading}
                        className="btn-secondary btn-full"
                        style={{ fontSize: '14px',
                            padding: '12px' }}>
                        {cancelLabel}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmModal;