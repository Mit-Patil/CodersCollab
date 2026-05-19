export const validators = {

    username: (value) => {
        if (!value) return 'Username is required';
        if (value.length < 3) return 'Min 3 characters';
        if (value.length > 50) return 'Max 50 characters';
        if (!/^[a-zA-Z0-9_]+$/.test(value))
            return 'Only letters, numbers and underscores';
        return null;
    },

    email: (value) => {
        if (!value) return 'Email is required';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
            return 'Enter a valid email';
        return null;
    },

    password: (value) => {
        if (!value) return 'Password is required';
        if (value.length < 6) return 'Min 6 characters';
        if (value.length > 100) return 'Max 100 characters';
        return null;
    },

    fullName: (value) => {
        if (value && value.length > 100)
            return 'Max 100 characters';
        return null;
    },

    bio: (value) => {
        if (value && value.length > 500)
            return 'Max 500 characters';
        return null;
    },

    url: (value) => {
        if (!value) return null;
        try {
            const url = value.startsWith('http')
                ? value : `https://${value}`;
            new URL(url);
            return null;
        } catch {
            return 'Enter a valid URL';
        }
    },

    postContent: (value) => {
        if (!value || !value.trim()) return 'Content is required';
        if (value.length > 5000) return 'Max 5000 characters';
        return null;
    },

    comment: (value) => {
        if (!value || !value.trim()) return 'Comment is required';
        if (value.length > 1000) return 'Max 1000 characters';
        return null;
    },

    message: (value) => {
        if (!value || !value.trim()) return 'Message is required';
        if (value.length > 2000) return 'Max 2000 characters';
        return null;
    },
};

export const validateForm = (fields) => {
    const errors = {};
    Object.entries(fields).forEach(([key, { value, validator }]) => {
        const error = validator(value);
        if (error) errors[key] = error;
    });
    return errors;
};