// Navigation helper to respect BASE_PATH configuration
export const getBasePath = (): string => {
    const basePath = (window as any).__BASE_PATH__ || '/';
    // Remove trailing slash for consistency
    return basePath.endsWith('/') && basePath !== '/' ? basePath.slice(0, -1) : basePath;
};

// Helper to create paths that respect BASE_PATH
export const createPath = (path: string): string => {
    const basePath = getBasePath();
    // Ensure path starts with /
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    // For root base path, just return the path
    if (basePath === '/') {
        return cleanPath;
    }
    // Otherwise prepend base path
    return `${basePath}${cleanPath}`;
};
