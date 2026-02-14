import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from './stores/auth';
import Login from './pages/Login';
import ChangePassword from './pages/ChangePassword';
import Dashboard from './pages/Dashboard';
import ChatbotEditor from './pages/ChatbotEditor';
import Themes from './pages/Themes';
import ThemeEditor from './pages/ThemeEditor';

// Protected Route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, user } = useAuthStore();
    const location = useLocation();

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    // Force password change if needed
    // Use location.pathname instead of window.location.pathname
    // because location.pathname from useLocation() already accounts for basename
    if (user?.mustChangePassword && location.pathname !== '/change-password') {
        return <Navigate to="/change-password" replace />;
    }

    return <>{children}</>;
}

// Public Route (redirects authenticated users)
function PublicRoute({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, user } = useAuthStore();

    if (isAuthenticated) {
        if (user?.mustChangePassword) {
            return <Navigate to="/change-password" replace />;
        }
        return <Navigate to="/" replace />;
    }

    return <>{children}</>;
}

export default function App() {
    return (
        <Routes>
            {/* Public routes */}
            <Route
                path="/login"
                element={
                    <PublicRoute>
                        <Login />
                    </PublicRoute>
                }
            />

            {/* Protected routes */}
            <Route
                path="/change-password"
                element={
                    <ProtectedRoute>
                        <ChangePassword />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/"
                element={
                    <ProtectedRoute>
                        <Dashboard />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/chatbots/new"
                element={
                    <ProtectedRoute>
                        <ChatbotEditor />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/chatbots/:id"
                element={
                    <ProtectedRoute>
                        <ChatbotEditor />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/themes"
                element={
                    <ProtectedRoute>
                        <Themes />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/themes/:id/edit"
                element={
                    <ProtectedRoute>
                        <ThemeEditor />
                    </ProtectedRoute>
                }
            />

            {/* Catch all */}
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}
