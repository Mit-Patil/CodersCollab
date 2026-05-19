import React from 'react';

const STACKS = ['React', 'Spring Boot', 'Node.js', 'Django',
    'Flutter', 'Angular', 'Vue', 'Laravel', 'FastAPI'];

const SearchBar = ({ search, setSearch, stack, setStack,
    skill, setSkill, collabOnly, setCollabOnly,
    onSearch, onReset }) => (

    <div className="card-solid"
        style={{ marginBottom: '1.5rem' }}>

        <h2 style={{ fontSize: '18px', fontWeight: '600',
            color: 'var(--text-primary)', margin: '0 0 1rem' }}>
            Explore Developers
        </h2>

        {/* Search Row */}
        <div style={{ display: 'flex', gap: '10px',
            marginBottom: '1rem' }}>
            <input value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && onSearch()}
                placeholder="Search by name, username or email..."
                className="input"
                style={{ flex: 1 }} />
            <button onClick={onSearch}
                className="btn-primary"
                style={{ padding: '9px 20px' }}>
                Search
            </button>
            <button onClick={onReset}
                className="btn-secondary"
                style={{ padding: '9px 16px' }}>
                Reset
            </button>
        </div>

        {/* Filter Row */}
        <div style={{ display: 'flex', gap: '10px',
            flexWrap: 'wrap', alignItems: 'center' }}>
            <select value={stack}
                onChange={e => setStack(e.target.value)}
                className="input"
                style={{ width: 'auto' }}>
                <option value="">All Stacks</option>
                {STACKS.map(s => (
                    <option key={s} value={s}>{s}</option>
                ))}
            </select>

            <input value={skill}
                onChange={e => setSkill(e.target.value)}
                placeholder="Filter by skill..."
                className="input"
                style={{ width: '160px' }} />

            <label style={{ display: 'flex', alignItems: 'center',
                gap: '6px', fontSize: '13px',
                color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <input type="checkbox" checked={collabOnly}
                    onChange={e => setCollabOnly(e.target.checked)} />
                Available for Collab only
            </label>
        </div>
    </div>
);

export default SearchBar;