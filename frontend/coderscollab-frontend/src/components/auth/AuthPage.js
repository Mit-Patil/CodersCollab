import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { registerUser, loginUser } from '../../api/authApi';
import { validators } from '../../utils/validators';

const CODE_SYMBOLS = [
    'const', 'let', '{ }', '()=>', '</>', 'git',
    'push', 'null', 'true', 'async', 'await', '[ ]',
    'if', 'for', '&&', '===', 'fn', 'import', 'class'
];

const CodeRain = () => {
    const rainRef = useRef(null);
    useEffect(() => {
        if (!rainRef.current) return;
        for (let i = 0; i < 8; i++) {
            const col = document.createElement('div');
            col.style.cssText = `
                position: absolute;
                top: -100%;
                left: ${5 + i * 12}%;
                font-family: 'JetBrains Mono', monospace;
                font-size: 11px;
                color: #4a9eff;
                line-height: 1.8;
                opacity: ${0.2 + Math.random() * 0.3};
                animation: fall ${12 + Math.random() * 10}s linear
                    ${-Math.random() * 15}s infinite;
                white-space: nowrap;
            `;
            let txt = '';
            for (let j = 0; j < 20; j++) {
                txt += CODE_SYMBOLS[Math.floor(
                    Math.random() * CODE_SYMBOLS.length)] + '\n';
            }
            col.textContent = txt;
            rainRef.current.appendChild(col);
        }
    }, []);
    return <div ref={rainRef} style={{ position: 'absolute',
        inset: 0, overflow: 'hidden' }} />;
};

const AuthPage = ({ initialTab = 'login' }) => {
    const { login } = useAuth();
    const [tab, setTab] = useState(initialTab);
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [serverError, setServerError] = useState('');

    const [loginForm, setLoginForm] = useState({
        email: '', password: '' });
    const [registerForm, setRegisterForm] = useState({
        username: '', email: '', password: '' });

    const validateLogin = () => {
        const e = {};
        const emailErr = validators.email(loginForm.email);
        const passErr = validators.password(loginForm.password);
        if (emailErr) e.email = emailErr;
        if (passErr) e.password = passErr;
        return e;
    };

    const validateRegister = () => {
        const e = {};
        const userErr = validators.username(registerForm.username);
        const emailErr = validators.email(registerForm.email);
        const passErr = validators.password(registerForm.password);
        if (userErr) e.username = userErr;
        if (emailErr) e.email = emailErr;
        if (passErr) e.password = passErr;
        return e;
    };

    const handleLogin = async () => {
        const e = validateLogin();
        if (Object.keys(e).length > 0) { setErrors(e); return; }
        setLoading(true);
        setServerError('');
        try {
            const data = await loginUser(loginForm);
            login({ id: data.id, username: data.username,
                email: data.email }, data.token);
            window.location.href = '/home';
        } catch (err) {
            setServerError('Invalid email or password');
        } finally {
            setLoading(false);
        }
    };

    const handleRegister = async () => {
        const e = validateRegister();
        if (Object.keys(e).length > 0) { setErrors(e); return; }
        setLoading(true);
        setServerError('');
        try {
            const data = await registerUser(registerForm);
            login({ id: data.id, username: data.username,
                email: data.email }, data.token);
            window.location.href = '/home';
        } catch (err) {
            setServerError(err.response?.data?.message
                || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    const switchTab = (t) => {
        setTab(t);
        setErrors({});
        setServerError('');
    };

    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

                @keyframes fall {
                    0% { transform: translateY(-100%); }
                    100% { transform: translateY(200%); }
                }
                @keyframes orbFloat {
                    0%, 100% { transform: translateY(0) scale(1); }
                    50% { transform: translateY(-20px) scale(1.05); }
                }
                @keyframes gridMove {
                    0% { transform: translateY(0); }
                    100% { transform: translateY(40px); }
                }
                @keyframes cardIn {
                    from { opacity: 0; transform: translateY(20px) scale(0.97); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
                @keyframes slideIn {
                    from { opacity: 0; transform: translateX(-16px); }
                    to { opacity: 1; transform: translateX(0); }
                }
                @keyframes badgeFloat {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-6px); }
                }
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    20%, 60% { transform: translateX(-6px); }
                    40%, 80% { transform: translateX(6px); }
                }
                .auth-input-field {
                    width: 100%;
                    padding: 10px 14px;
                    background: rgba(255,255,255,0.07);
                    border: 1px solid rgba(255,255,255,0.1);
                    border-radius: 10px;
                    font-size: 13px;
                    font-family: 'Space Grotesk', sans-serif;
                    color: #fff;
                    outline: none;
                    box-sizing: border-box;
                    transition: border-color 0.2s, background 0.2s;
                }
                .auth-input-field::placeholder {
                    color: rgba(255,255,255,0.25);
                }
                .auth-input-field:focus {
                    border-color: rgba(74,158,255,0.5);
                    background: rgba(74,158,255,0.08);
                }
                .auth-input-field.error {
                    border-color: rgba(239,68,68,0.6);
                    background: rgba(239,68,68,0.06);
                }
                .auth-btn-main {
                    width: 100%;
                    padding: 11px;
                    background: linear-gradient(135deg, #1e5ab4, #4a9eff);
                    border: none;
                    border-radius: 10px;
                    font-size: 14px;
                    font-weight: 600;
                    font-family: 'Space Grotesk', sans-serif;
                    color: #fff;
                    cursor: pointer;
                    margin-top: 6px;
                    letter-spacing: -0.2px;
                    transition: opacity 0.2s, transform 0.1s;
                    position: relative;
                    overflow: hidden;
                }
                .auth-btn-main:hover:not(:disabled) {
                    opacity: 0.9;
                    transform: translateY(-1px);
                }
                .auth-btn-main:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }
                .feature-item-ani:nth-child(1) {
                    animation: slideIn 0.6s 0.1s ease forwards;
                    opacity: 0;
                }
                .feature-item-ani:nth-child(2) {
                    animation: slideIn 0.6s 0.25s ease forwards;
                    opacity: 0;
                }
                .feature-item-ani:nth-child(3) {
                    animation: slideIn 0.6s 0.4s ease forwards;
                    opacity: 0;
                }
                .shake { animation: shake 0.4s ease; }


                .typing-text {
                    display: inline-block;
                    background: linear-gradient(90deg, #4a9eff, #a78bfa);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;

                    overflow: hidden;
                    white-space: nowrap;
                    border-right: 2px solid #a78bfa;

                    width: 0;
                    animation: typing 3s steps(15) infinite alternate,
                                blink 0.7s infinite;
                    }

                    @keyframes typing {
                    from { width: 0 }
                    to { width: 15ch }
                    }

                    @keyframes blink {
                    50% { border-color: transparent }
                    }
            `}</style>

            <div style={{ display: 'flex', minHeight: '100vh',
                background: '#0a0f1e', fontFamily:
                    "'Space Grotesk', sans-serif",
                position: 'relative', overflow: 'hidden' }}>

                {/* Background */}
                <div style={{ position: 'absolute', inset: 0 }}>
                    {/* Grid */}
                    <div style={{ position: 'absolute', inset: 0,
                        backgroundImage: `
                            linear-gradient(rgba(30,90,180,0.12) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(30,90,180,0.12) 1px, transparent 1px)`,
                        backgroundSize: '40px 40px',
                        animation: 'gridMove 20s linear infinite' }} />

                    {/* Orbs */}
                    {[
                        { w:400, h:400, bg:'rgba(30,90,200,0.3)',
                            t:'-120px', l:'5%', d:'0s' },
                        { w:250, h:250, bg:'rgba(80,180,255,0.18)',
                            b:'40px', l:'35%', d:'-3s' },
                        { w:180, h:180, bg:'rgba(100,60,255,0.22)',
                            t:'40%', l:'2%', d:'-5s' },
                    ].map((o, i) => (
                        <div key={i} style={{
                            position: 'absolute',
                            width: o.w, height: o.h,
                            background: o.bg,
                            borderRadius: '50%',
                            filter: 'blur(70px)',
                            top: o.t, bottom: o.b,
                            left: o.l,
                            animation: `orbFloat 8s ${o.d} ease-in-out infinite`
                        }} />
                    ))}

                    <CodeRain />
                </div>

                {/* Floating Badges */}
                <div style={{ position: 'absolute', bottom: '60px',
                    left: '32px', zIndex: 5,
                    display: 'flex', alignItems: 'center', gap: '6px',
                    background: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    backdropFilter: 'blur(10px)',
                    borderRadius: '20px', padding: '6px 12px',
                    fontSize: '11px', color: 'rgba(255,255,255,0.7)',
                    animation: 'badgeFloat 4s ease-in-out infinite' }}>
                    <div style={{ width: 6, height: 6,
                        borderRadius: '50%', background: '#4ade80',
                        boxShadow: '0 0 6px #4ade80' }} />
                    2.4k developers online
                </div>

                {/* Left Panel */}
                <div style={{ flex: 1, position: 'relative',
                    zIndex: 2, display: 'flex',
                    flexDirection: 'column', justifyContent: 'center',
                    padding: '48px 48px 48px 60px' }}>

                    {/* Brand */}
                    <div style={{ display: 'flex', alignItems: 'center',
                        gap: '10px', marginBottom: '48px' }}>
                        <div style={{ width: 38, height: 38,
                            background: 'linear-gradient(135deg, #1e5ab4, #4a9eff)',
                            borderRadius: '10px', display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center' }}>
                            <svg width="18" height="18" viewBox="0 0 24 24"
                                fill="none" stroke="#fff" strokeWidth="2"
                                strokeLinecap="round">
                                <polyline points="16 18 22 12 16 6"/>
                                <polyline points="8 6 2 12 8 18"/>
                            </svg>
                        </div>
                        <span style={{ fontSize: '18px', fontWeight: 700,
                            color: '#fff', letterSpacing: '-0.3px' }}>
                            CodersCollab
                        </span>
                    </div>

                    {/* Headline */}
                    <div style={{ marginBottom: '40px' }}>
                        <h1 style={{ fontSize: 'clamp(28px, 3vw, 40px)',
                            fontWeight: 700, color: '#fff',
                            lineHeight: 1.15, letterSpacing: '-0.5px',
                            margin: '0 0 14px' }}>
                            Where developers
                            <br />
                            <span className="typing-text">
                            build together
                            </span>
                        </h1>
                        <p style={{ fontSize: '14px',
                            color: 'rgba(255,255,255,0.5)',
                            lineHeight: 1.7, margin: 0,
                            maxWidth: '300px' }}>
                            Share code, collaborate on projects and connect
                            with developers who think like you.
                        </p>
                    </div>

                    {/* Features */}
                    <div style={{ display: 'flex',
                        flexDirection: 'column', gap: '16px' }}>
                        {[
                            { icon: '💻', text: 'Share code with syntax highlighting' },
                            { icon: '🤝', text: 'Find collaborators for your projects' },
                            { icon: '🚀', text: 'Build your developer profile' },
                        ].map((f, i) => (
                            <div key={i} className="feature-item-ani"
                                style={{ display: 'flex',
                                    alignItems: 'center', gap: '12px' }}>
                                <div style={{ width: 30, height: 30,
                                    borderRadius: '8px',
                                    background: 'rgba(74,158,255,0.12)',
                                    border: '1px solid rgba(74,158,255,0.25)',
                                    display: 'flex', alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '14px', flexShrink: 0 }}>
                                    {f.icon}
                                </div>
                                <span style={{ fontSize: '13px',
                                    color: 'rgba(255,255,255,0.65)' }}>
                                    {f.text}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right Panel — Glass Card */}
                <div style={{ width: '600px', flexShrink: 0,
                    display: 'flex', alignItems: 'center',
                    justifyContent: 'center',
                    padding: '32px 152px 32px 16px',
                    position: 'relative', zIndex: 3 }}>

                    <div style={{ width: '100%',
                        background: 'rgba(255,255,255,0.06)',
                        backdropFilter: 'blur(24px)',
                        WebkitBackdropFilter: 'blur(24px)',
                        border: '1px solid rgba(255,255,255,0.12)',
                        borderRadius: '20px', padding: '32px 28px',
                        boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
                        animation: 'cardIn 0.5s cubic-bezier(0.16,1,0.3,1) forwards' }}>

                        {/* Tabs */}
                        <div style={{ display: 'flex',
                            background: 'rgba(255,255,255,0.06)',
                            borderRadius: '10px', padding: '3px',
                            marginBottom: '24px' }}>
                            {['login', 'register'].map(t => (
                                <button key={t} onClick={() => switchTab(t)}
                                    style={{ flex: 1, padding: '8px 0',
                                        fontSize: '13px', fontWeight: 500,
                                        fontFamily: "'Space Grotesk', sans-serif",
                                        border: tab === t
                                            ? '1px solid rgba(74,158,255,0.3)'
                                            : 'none',
                                        borderRadius: '8px', cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        background: tab === t
                                            ? 'rgba(74,158,255,0.18)' : 'transparent',
                                        color: tab === t
                                            ? '#4a9eff'
                                            : 'rgba(255,255,255,0.45)' }}>
                                    {t === 'login' ? 'Sign In' : 'Register'}
                                </button>
                            ))}
                        </div>

                        {/* Login Form */}
                        {tab === 'login' && (
                            <div>
                                <p style={{ fontSize: '20px',
                                    fontWeight: 700, color: '#fff',
                                    margin: '0 0 4px',
                                    letterSpacing: '-0.3px' }}>
                                    Welcome back
                                </p>
                                <p style={{ fontSize: '12px',
                                    color: 'rgba(255,255,255,0.4)',
                                    margin: '0 0 20px' }}>
                                    Sign in to your account
                                </p>

                                {['email', 'password'].map(field => (
                                    <div key={field}
                                        style={{ marginBottom: '14px' }}>
                                        <label style={{ display: 'block',
                                            fontSize: '11px', fontWeight: 500,
                                            color: 'rgba(255,255,255,0.45)',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.8px',
                                            marginBottom: '6px' }}>
                                            {field}
                                        </label>
                                        <input
                                            className={`auth-input-field ${errors[field] ? 'error' : ''}`}
                                            type={field}
                                            placeholder={field === 'email'
                                                ? 'you@example.com'
                                                : '••••••••'}
                                            value={loginForm[field]}
                                            onChange={e => {
                                                setLoginForm(prev => ({
                                                    ...prev,
                                                    [field]: e.target.value
                                                }));
                                                if (errors[field]) {
                                                    setErrors(prev => {
                                                        const n = {...prev};
                                                        delete n[field];
                                                        return n;
                                                    });
                                                }
                                            }}
                                            onKeyDown={e =>
                                                e.key === 'Enter' && handleLogin()}
                                        />
                                        {errors[field] && (
                                            <p style={{ fontSize: '11px',
                                                color: '#f87171',
                                                margin: '4px 0 0' }}>
                                                {errors[field]}
                                            </p>
                                        )}
                                    </div>
                                ))}

                                {serverError && (
                                    <p style={{ fontSize: '12px',
                                        color: '#f87171',
                                        background: 'rgba(239,68,68,0.1)',
                                        border: '1px solid rgba(239,68,68,0.2)',
                                        borderRadius: '8px',
                                        padding: '8px 12px',
                                        margin: '0 0 12px' }}>
                                        {serverError}
                                    </p>
                                )}

                                <button className="auth-btn-main"
                                    onClick={handleLogin}
                                    disabled={loading}>
                                    {loading ? 'Signing in...' : 'Sign In →'}
                                </button>

                                <p style={{ textAlign: 'center',
                                    fontSize: '12px',
                                    color: 'rgba(255,255,255,0.4)',
                                    margin: '14px 0 0' }}>
                                    Don't have an account?{' '}
                                    <span onClick={() => switchTab('register')}
                                        style={{ color: '#4a9eff',
                                            cursor: 'pointer',
                                            fontWeight: 500 }}>
                                        Register
                                    </span>
                                </p>
                            </div>
                        )}

                        {/* Register Form */}
                        {tab === 'register' && (
                            <div>
                                <p style={{ fontSize: '20px',
                                    fontWeight: 700, color: '#fff',
                                    margin: '0 0 4px',
                                    letterSpacing: '-0.3px' }}>
                                    Join the community
                                </p>
                                <p style={{ fontSize: '12px',
                                    color: 'rgba(255,255,255,0.4)',
                                    margin: '0 0 20px' }}>
                                    Create your developer account
                                </p>

                                {[
                                    { key: 'username', label: 'Username',
                                        type: 'text',
                                        ph: 'cool_dev_42' },
                                    { key: 'email', label: 'Email',
                                        type: 'email',
                                        ph: 'you@example.com' },
                                    { key: 'password', label: 'Password',
                                        type: 'password',
                                        ph: 'min 6 characters' },
                                ].map(f => (
                                    <div key={f.key}
                                        style={{ marginBottom: '12px' }}>
                                        <label style={{ display: 'block',
                                            fontSize: '11px', fontWeight: 500,
                                            color: 'rgba(255,255,255,0.45)',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.8px',
                                            marginBottom: '6px' }}>
                                            {f.label}
                                        </label>
                                        <input
                                            className={`auth-input-field ${errors[f.key] ? 'error' : ''}`}
                                            type={f.type}
                                            placeholder={f.ph}
                                            value={registerForm[f.key]}
                                            onChange={e => {
                                                setRegisterForm(prev => ({
                                                    ...prev,
                                                    [f.key]: e.target.value
                                                }));
                                                if (errors[f.key]) {
                                                    setErrors(prev => {
                                                        const n = {...prev};
                                                        delete n[f.key];
                                                        return n;
                                                    });
                                                }
                                            }}
                                            onKeyDown={e =>
                                                e.key === 'Enter'
                                                && handleRegister()}
                                        />
                                        {errors[f.key] && (
                                            <p style={{ fontSize: '11px',
                                                color: '#f87171',
                                                margin: '4px 0 0' }}>
                                                {errors[f.key]}
                                            </p>
                                        )}
                                    </div>
                                ))}

                                {serverError && (
                                    <p style={{ fontSize: '12px',
                                        color: '#f87171',
                                        background: 'rgba(239,68,68,0.1)',
                                        border: '1px solid rgba(239,68,68,0.2)',
                                        borderRadius: '8px',
                                        padding: '8px 12px',
                                        margin: '0 0 12px' }}>
                                        {serverError}
                                    </p>
                                )}

                                <button className="auth-btn-main"
                                    onClick={handleRegister}
                                    disabled={loading}>
                                    {loading
                                        ? 'Creating account...'
                                        : 'Create Account →'}
                                </button>

                                <p style={{ textAlign: 'center',
                                    fontSize: '12px',
                                    color: 'rgba(255,255,255,0.4)',
                                    margin: '14px 0 0' }}>
                                    Already have an account?{' '}
                                    <span onClick={() => switchTab('login')}
                                        style={{ color: '#4a9eff',
                                            cursor: 'pointer',
                                            fontWeight: 500 }}>
                                        Sign In
                                    </span>
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};

export default AuthPage;