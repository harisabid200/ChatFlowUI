import { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { MessageSquare, LayoutDashboard, Palette, LogOut, Settings } from 'lucide-react';
import { useAuthStore } from '../stores/auth';
import { authApi } from '../api';
import clsx from 'clsx';
import { createPath } from '../utils/navigation';

interface LayoutProps {
    children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, logout } = useAuthStore();

    const handleLogout = async () => {
        try {
            await authApi.logout();
        } catch {
            // Ignore errors
        }
        logout();
        navigate(createPath('/login'));
    };

    const navItems = [
        { path: '/', label: 'Chatbots', icon: LayoutDashboard },
        { path: '/themes', label: 'Themes', icon: Palette },
    ];

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Sidebar */}
            <aside className="fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-gray-200 flex flex-col">
                {/* Logo */}
                <div className="flex items-center gap-3 px-5 py-6 border-b border-gray-100">
                    <div className="w-10 h-10 bg-primary-500 rounded-xl flex items-center justify-center">
                        <MessageSquare className="w-5 h-5 text-white" />
                    </div>
                    <span className="font-bold text-lg text-gray-900">ChatFlowUI</span>
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-3 py-4">
                    {navItems.map((item) => {
                        const isActive = location.pathname === item.path;
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={clsx(
                                    'flex items-center gap-3 px-4 py-3 rounded-lg mb-1 transition',
                                    isActive
                                        ? 'bg-primary-50 text-primary-600'
                                        : 'text-gray-600 hover:bg-gray-100'
                                )}
                            >
                                <item.icon className="w-5 h-5" />
                                <span className="font-medium">{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>

                {/* User */}
                <div className="border-t border-gray-100 p-4">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-9 h-9 bg-gray-200 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-gray-600">
                                {user?.username?.[0]?.toUpperCase() || 'U'}
                            </span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{user?.username}</p>
                            <p className="text-xs text-gray-500">Administrator</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Link
                            to="/change-password"
                            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition text-sm"
                        >
                            <Settings className="w-4 h-4" />
                            Settings
                        </Link>
                        <button
                            onClick={handleLogout}
                            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition text-sm"
                        >
                            <LogOut className="w-4 h-4" />
                            Logout
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="ml-64 p-8">{children}</main>
        </div>
    );
}
