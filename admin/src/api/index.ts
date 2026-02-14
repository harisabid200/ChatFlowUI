import { useAuthStore } from '../stores/auth';

// Get API base path from window.__BASE_PATH__ (set at runtime)
const getApiBase = () => {
    const basePath = (window as any).__BASE_PATH__ || '/';
    // Remove trailing slash if present, then add /api
    const cleanPath = basePath.endsWith('/') ? basePath.slice(0, -1) : basePath;
    return `${cleanPath}/api`;
};

const API_BASE = getApiBase();

interface ApiError {
    error: string;
    details?: unknown;
}

class ApiClient {
    private getHeaders(): HeadersInit {
        const headers: HeadersInit = {
            'Content-Type': 'application/json',
        };

        // Token is kept in memory only (not persisted to localStorage)
        // Used for dev mode cross-port auth; production uses httpOnly cookie
        const token = useAuthStore.getState().token;
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        return headers;
    }

    private async handleResponse<T>(response: Response): Promise<T> {
        if (!response.ok) {
            const error: ApiError = await response.json().catch(() => ({
                error: 'Unknown error occurred',
            }));

            // Handle 401 by logging out
            if (response.status === 401) {
                useAuthStore.getState().logout();
            }

            throw new Error(error.error || 'Request failed');
        }

        return response.json();
    }

    async get<T>(path: string): Promise<T> {
        const response = await fetch(`${API_BASE}${path}`, {
            method: 'GET',
            headers: this.getHeaders(),
            credentials: 'include',
        });
        return this.handleResponse<T>(response);
    }

    async post<T>(path: string, data?: unknown): Promise<T> {
        const response = await fetch(`${API_BASE}${path}`, {
            method: 'POST',
            headers: this.getHeaders(),
            credentials: 'include',
            body: data ? JSON.stringify(data) : undefined,
        });
        return this.handleResponse<T>(response);
    }

    async put<T>(path: string, data: unknown): Promise<T> {
        const response = await fetch(`${API_BASE}${path}`, {
            method: 'PUT',
            headers: this.getHeaders(),
            credentials: 'include',
            body: JSON.stringify(data),
        });
        return this.handleResponse<T>(response);
    }

    async delete<T>(path: string): Promise<T> {
        const response = await fetch(`${API_BASE}${path}`, {
            method: 'DELETE',
            headers: this.getHeaders(),
            credentials: 'include',
        });
        return this.handleResponse<T>(response);
    }
}

export const api = new ApiClient();

// Auth API
export const authApi = {
    login: (username: string, password: string) =>
        api.post<{ token: string; user: { id: number; username: string; mustChangePassword: boolean } }>(
            '/auth/login',
            { username, password }
        ),

    logout: () => api.post<{ success: boolean }>('/auth/logout'),

    me: () => api.get<{ id: number; username: string; mustChangePassword: boolean }>('/auth/me'),

    changePassword: (currentPassword: string, newPassword: string) =>
        api.post<{ success: boolean }>('/auth/change-password', { currentPassword, newPassword }),
};

// Chatbots API
export interface Chatbot {
    id: string;
    name: string;
    webhookUrl: string;
    webhookSecret?: string;
    allowedOrigins: string[];
    themeId?: string;
    customCss?: string;
    preChatForm?: {
        enabled: boolean;
        title: string;
        fields: Array<{
            id: string;
            label: string;
            type: 'text' | 'email' | 'phone' | 'select';
            required: boolean;
            placeholder?: string;
            options?: string[];
        }>;
    };
    settings: {
        welcomeMessage: string;
        inputPlaceholder: string;
        headerTitle: string;
        headerSubtitle?: string;
        soundEnabled: boolean;
        typingIndicator: boolean;
        showTimestamps: boolean;
    };
    launcherLogo?: string;
    headerLogo?: string;
    createdAt: string;
    updatedAt: string;
}


export const chatbotsApi = {
    list: () => api.get<Chatbot[]>('/chatbots'),

    get: (id: string) => api.get<Chatbot>(`/chatbots/${id}`),

    create: (data: Omit<Chatbot, 'id' | 'createdAt' | 'updatedAt'>) =>
        api.post<Chatbot>('/chatbots', data),

    update: (id: string, data: Omit<Chatbot, 'id' | 'createdAt' | 'updatedAt'>) =>
        api.put<Chatbot>(`/chatbots/${id}`, data),

    delete: (id: string) => api.delete<{ success: boolean }>(`/chatbots/${id}`),

    getEmbed: (id: string) =>
        api.get<{ embedCode: string; baseUrl: string; chatbotId: string }>(`/chatbots/${id}/embed`),

    testMessage: (id: string, sessionId: string, message: string) =>
        api.post<{ success: boolean; response: { message?: string; quickReplies?: string[] } | null }>(
            `/chatbots/${id}/test-message`,
            { sessionId, message }
        ),
};

// Themes API
export interface ThemeConfig {
    name: string;
    colors: {
        primary: string;
        primaryHover: string;
        background: string;
        headerBg: string;
        headerText: string;
        userMessageBg: string;
        userMessageText: string;
        botMessageBg: string;
        botMessageText: string;
        inputBg: string;
        inputText: string;
        inputBorder: string;
        userAvatarBg: string;
    };
    typography: {
        fontFamily: string;
        fontSize: string;
        headerFontSize: string;
    };
    dimensions: {
        width: string;
        height: string;
        borderRadius: string;
        buttonSize: string;
    };
    position: {
        placement: 'bottom-right' | 'bottom-left';
        offsetX: string;
        offsetY: string;
    };
    branding: {
        logo?: string;
        title: string;
        subtitle?: string;
        welcomeMessage: string;
        inputPlaceholder: string;
    };
    features: {
        soundEnabled: boolean;
        typingIndicator: boolean;
        showTimestamps: boolean;
    };
}

export interface Theme {
    id: string;
    name: string;
    isPreset: boolean;
    config: ThemeConfig;
    createdAt: string;
}

export const themesApi = {
    list: () => api.get<Theme[]>('/themes'),

    get: (id: string) => api.get<Theme>(`/themes/${id}`),

    create: (config: ThemeConfig) => api.post<Theme>('/themes', config),

    update: (id: string, config: ThemeConfig) => api.put<Theme>(`/themes/${id}`, config),

    delete: (id: string) => api.delete<{ success: boolean }>(`/themes/${id}`),

    duplicate: (id: string) => api.post<Theme>(`/themes/${id}/duplicate`),
};
