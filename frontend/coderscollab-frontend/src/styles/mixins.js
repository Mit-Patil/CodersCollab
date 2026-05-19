export const card = () => ({
    background: 'var(--card-bg)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
    padding: '1.25rem',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
});

export const cardSolid = () => ({
    background: 'var(--card-bg-solid)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
    padding: '1.25rem',
});

export const inputStyle = () => ({
    width: '100%',
    padding: '9px 14px',
    background: 'var(--input-bg)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    fontSize: '13px',
    fontFamily: 'var(--font-main)',
    color: 'var(--text-primary)',
    outline: 'none',
    boxSizing: 'border-box',
});

export const btnPrimary = (full = false) => ({
    background: 'var(--btn-gradient)',
    color: '#fff',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    padding: full ? '10px' : '9px 20px',
    width: full ? '100%' : 'auto',
    fontSize: full ? '14px' : '13px',
    fontWeight: '600',
    fontFamily: 'var(--font-main)',
    cursor: 'pointer',
});

export const btnSecondary = () => ({
    background: 'var(--input-bg)',
    color: 'var(--text-secondary)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    padding: '9px 20px',
    fontSize: '13px',
    fontFamily: 'var(--font-main)',
    cursor: 'pointer',
});

export const btnDanger = () => ({
    background: 'var(--danger-bg)',
    color: 'var(--danger)',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    padding: '9px 20px',
    fontSize: '13px',
    fontFamily: 'var(--font-main)',
    cursor: 'pointer',
});

export const btnIcon = () => ({
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
    color: 'var(--text-muted)',
    fontFamily: 'var(--font-main)',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '13px',
});

export const avatarBase = (size = 38) => ({
    width: `${size}px`,
    height: `${size}px`,
    borderRadius: '50%',
    background: 'var(--primary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: `${Math.floor(size * 0.35)}px`,
    fontWeight: '600',
    color: '#fff',
    flexShrink: 0,
    cursor: 'pointer',
});

export const avatarImg = (size = 38, url) => ({
    ...avatarBase(size),
    background: `url(${url}) center/cover no-repeat`,
});

export const getAvatar = (size, url) =>
    url ? avatarImg(size, url) : avatarBase(size);

export const modalOverlay = () => ({
    position: 'fixed',
    top: 0, left: 0,
    width: '100%', height: '100%',
    background: 'rgba(0,0,0,0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    backdropFilter: 'blur(4px)',
});

export const modalBox = (maxWidth = 420) => ({
    background: 'var(--modal-bg)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
    padding: '1.5rem',
    width: '90%',
    maxWidth: `${maxWidth}px`,
    maxHeight: '85vh',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
});

export const navbar = () => ({
    background: 'var(--nav-bg)',
    padding: '0 1.5rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: '52px',
    position: 'sticky',
    top: 0,
    zIndex: 10,
    borderBottom: '1px solid var(--border)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
});

export const postCard = () => ({
    background: 'var(--card-bg)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
    overflow: 'hidden',
    backdropFilter: 'blur(12px)',
});

export const postFooter = () => ({
    padding: '10px 14px',
    borderTop: '1px solid var(--border-light)',
    display: 'flex',
    gap: '16px',
    alignItems: 'center',
});

export const postTypeBadge = (type) => ({
    fontSize: '11px',
    padding: '3px 8px',
    borderRadius: 'var(--radius-xl)',
    fontWeight: '600',
    background: type === 'CODE' ? '#1e1e2e'
        : type === 'IMAGE' ? 'rgba(74,222,128,0.15)'
        : 'rgba(74,158,255,0.15)',
    color: type === 'CODE' ? '#89b4fa'
        : type === 'IMAGE' ? '#4ade80'
        : '#4a9eff',
});

export const msgBubble = (isOwn) => ({
    background: isOwn
        ? 'var(--msg-own-bg)' : 'var(--msg-other-bg)',
    color: isOwn ? '#fff' : 'var(--text-primary)',
    padding: '10px 14px',
    borderRadius: isOwn
        ? '18px 18px 4px 18px'
        : '18px 18px 18px 4px',
    fontSize: '14px',
    lineHeight: '1.5',
    wordBreak: 'break-word',
});

export const commentBubble = () => ({
    background: 'var(--input-bg)',
    borderRadius: '10px',
    padding: '8px 12px',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '8px',
    flex: 1,
});

export const chatInputArea = () => ({
    background: 'var(--card-bg-solid)',
    border: '1px solid var(--border)',
    borderRadius: '0 0 12px 12px',
    padding: '12px 16px',
    display: 'flex',
    gap: '10px',
    alignItems: 'center',
    flexShrink: 0,
});

export const userCard = () => ({
    background: 'var(--card-bg)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
    padding: '1.25rem',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    gap: '8px',
    backdropFilter: 'blur(12px)',
});

export const badge = (type = 'primary') => ({
    padding: '4px 10px',
    borderRadius: 'var(--radius-xl)',
    fontSize: '11px',
    fontWeight: '600',
    background: type === 'success' ? 'var(--success-bg)'
        : type === 'danger' ? 'var(--danger-bg)'
        : 'var(--primary-bg)',
    color: type === 'success' ? 'var(--success)'
        : type === 'danger' ? 'var(--danger)'
        : 'var(--primary)',
});

export const dropdownMenu = () => ({
    position: 'absolute',
    right: 0,
    top: '28px',
    background: 'var(--modal-bg)',
    border: '1px solid var(--border)',
    borderRadius: '10px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
    zIndex: 100,
    minWidth: '150px',
    overflow: 'hidden',
});

export const dropdownItem = (danger = false) => ({
    padding: '12px 16px',
    fontSize: '13px',
    cursor: 'pointer',
    color: danger ? 'var(--danger)' : 'var(--text-primary)',
    borderBottom: '1px solid var(--border-light)',
    background: 'transparent',
    transition: 'background 0.15s',
});

export const statBox = () => ({
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    textAlign: 'center',
    padding: '0.75rem 0',
    borderTop: '1px solid var(--border-light)',
    borderBottom: '1px solid var(--border-light)',
    marginBottom: '1rem',
});

export const emptyState = () => ({
    background: 'var(--card-bg)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
    padding: '3rem',
    textAlign: 'center',
    color: 'var(--text-muted)',
    fontSize: '15px',
});

export const replyPreview = () => ({
    background: 'var(--primary-bg)',
    borderLeft: '3px solid var(--primary)',
    borderRadius: 'var(--radius-md)',
    padding: '6px 10px',
    marginBottom: '4px',
    cursor: 'pointer',
});

export const copyRow = () => ({
    background: 'var(--input-bg)',
    borderRadius: 'var(--radius-md)',
    padding: '10px 14px',
    display: 'flex',
    alignItems: 'center',
    marginBottom: '1rem',
    border: '1px solid var(--border)',
});