import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save, Loader2, Plus, Trash2, Upload, X, MessageSquare } from 'lucide-react';
import { chatbotsApi, themesApi, Chatbot, Theme } from '../api';
import Layout from '../components/Layout';
import ImageCropper from '../components/ImageCropper';
import TestChat from '../components/TestChat';

type FormData = Omit<Chatbot, 'id' | 'createdAt' | 'updatedAt'>;

const defaultFormData: FormData = {
    name: '',
    webhookUrl: '',
    webhookSecret: '',
    allowedOrigins: [''],
    themeId: 'default',
    customCss: '',
    preChatForm: {
        enabled: false,
        title: 'Before we start',
        fields: [],
    },
    settings: {
        welcomeMessage: 'Hello! How can I help you today?',
        inputPlaceholder: 'Type a message...',
        headerTitle: 'Chat with us',
        headerSubtitle: 'We typically reply within minutes',
        soundEnabled: false,
        typingIndicator: true,
        showTimestamps: true,
    },
};

export default function ChatbotEditor() {
    const { id } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const isNew = !id || id === 'new';

    const [formData, setFormData] = useState<FormData>(defaultFormData);
    const [activeTab, setActiveTab] = useState<'general' | 'appearance' | 'prechat' | 'testchat'>('general');
    const [cropperMode, setCropperMode] = useState<'launcher' | 'header' | null>(null);

    // Load existing chatbot
    const { data: chatbot, isLoading } = useQuery({
        queryKey: ['chatbot', id],
        queryFn: () => chatbotsApi.get(id!),
        enabled: !isNew,
    });

    // Load themes
    const { data: themes } = useQuery({
        queryKey: ['themes'],
        queryFn: themesApi.list,
    });

    // Update form when chatbot loads
    useEffect(() => {
        if (chatbot) {
            setFormData({
                name: chatbot.name,
                webhookUrl: chatbot.webhookUrl,
                webhookSecret: chatbot.webhookSecret || '',
                allowedOrigins: chatbot.allowedOrigins.length > 0 ? chatbot.allowedOrigins : [''],
                themeId: chatbot.themeId || 'default',
                customCss: chatbot.customCss || '',
                preChatForm: chatbot.preChatForm || defaultFormData.preChatForm,
                settings: chatbot.settings,
                launcherLogo: chatbot.launcherLogo,
                headerLogo: chatbot.headerLogo,
            });
        }
    }, [chatbot]);

    // Create/Update mutation
    const saveMutation = useMutation({
        mutationFn: async (data: FormData) => {
            // Filter out empty origins
            const cleanData = {
                ...data,
                allowedOrigins: data.allowedOrigins.filter((o) => o.trim()),
            };

            if (isNew) {
                return chatbotsApi.create(cleanData);
            }
            return chatbotsApi.update(id!, cleanData);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['chatbots'] });
            navigate('/');
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        saveMutation.mutate(formData);
    };

    const addOrigin = () => {
        setFormData((prev) => ({
            ...prev,
            allowedOrigins: [...prev.allowedOrigins, ''],
        }));
    };

    const removeOrigin = (index: number) => {
        setFormData((prev) => ({
            ...prev,
            allowedOrigins: prev.allowedOrigins.filter((_, i) => i !== index),
        }));
    };

    const updateOrigin = (index: number, value: string) => {
        setFormData((prev) => ({
            ...prev,
            allowedOrigins: prev.allowedOrigins.map((o, i) => (i === index ? value : o)),
        }));
    };

    if (isLoading && !isNew) {
        return (
            <Layout>
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <button
                        onClick={() => navigate('/')}
                        className="p-2 hover:bg-gray-100 rounded-lg transition"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">
                            {isNew ? 'Create Chatbot' : 'Edit Chatbot'}
                        </h1>
                        <p className="text-gray-500 mt-1">Configure your chat widget settings</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit}>
                    {/* Tabs */}
                    <div className="bg-white rounded-t-xl border border-gray-200 border-b-0">
                        <div className="flex border-b border-gray-200">
                            {(['general', 'appearance', 'prechat', ...(!isNew ? ['testchat' as const] : [])] as const).map((tab) => (
                                <button
                                    key={tab}
                                    type="button"
                                    onClick={() => setActiveTab(tab)}
                                    className={`px-6 py-4 text-sm font-medium transition border-b-2 -mb-px ${activeTab === tab
                                        ? 'text-primary-600 border-primary-600'
                                        : 'text-gray-500 border-transparent hover:text-gray-700'
                                        }`}
                                >
                                    {tab === 'general' && 'General'}
                                    {tab === 'appearance' && 'Appearance'}
                                    {tab === 'prechat' && 'Pre-chat Form'}
                                    {tab === 'testchat' && (
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <MessageSquare size={15} /> Test Chat
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Tab Content */}
                    <div className="bg-white rounded-b-xl border border-gray-200 border-t-0 p-6">
                        {/* General Tab */}
                        {activeTab === 'general' && (
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Chatbot Name *
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                                        placeholder="My Website Bot"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        n8n Webhook URL *
                                    </label>
                                    <input
                                        type="url"
                                        value={formData.webhookUrl}
                                        onChange={(e) => setFormData((prev) => ({ ...prev, webhookUrl: e.target.value }))}
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                                        placeholder="https://your-n8n.com/webhook/xxxxx"
                                        required
                                    />
                                    <p className="text-sm text-gray-500 mt-1">
                                        The webhook URL from your n8n workflow
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Webhook Secret (Optional)
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.webhookSecret}
                                        onChange={(e) => setFormData((prev) => ({ ...prev, webhookSecret: e.target.value }))}
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                                        placeholder="secret-key"
                                    />
                                    <p className="text-sm text-gray-500 mt-1">
                                        Used to sign webhook requests for verification
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Allowed Origins *
                                    </label>
                                    <p className="text-sm text-gray-500 mb-3">
                                        Domains where this widget is allowed to appear
                                    </p>
                                    {formData.allowedOrigins.map((origin, index) => (
                                        <div key={index} className="flex gap-2 mb-2">
                                            <input
                                                type="text"
                                                value={origin}
                                                onChange={(e) => updateOrigin(index, e.target.value)}
                                                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                                                placeholder="https://example.com"
                                            />
                                            {formData.allowedOrigins.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => removeOrigin(index)}
                                                    className="p-2.5 text-gray-400 hover:text-red-600 transition"
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                    <button
                                        type="button"
                                        onClick={addOrigin}
                                        className="flex items-center gap-1.5 text-primary-600 hover:text-primary-700 text-sm font-medium mt-2"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Add origin
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Appearance Tab */}
                        {activeTab === 'appearance' && (
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Theme
                                    </label>
                                    <select
                                        value={formData.themeId || 'default'}
                                        onChange={(e) => setFormData((prev) => ({ ...prev, themeId: e.target.value }))}
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                                    >
                                        {themes?.map((theme) => (
                                            <option key={theme.id} value={theme.id}>
                                                {theme.name} {theme.isPreset ? '(Preset)' : ''}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Launcher Icon Logo */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Launcher Icon
                                    </label>
                                    <p className="text-xs text-gray-500 mb-3">
                                        Custom logo for the chat button (recommended: square image, 200x200px)
                                    </p>
                                    <div className="flex items-center gap-4">
                                        {formData.launcherLogo ? (
                                            <div className="relative">
                                                <img
                                                    src={formData.launcherLogo}
                                                    alt="Launcher logo"
                                                    className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setFormData((prev) => ({ ...prev, launcherLogo: undefined }))}
                                                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="w-16 h-16 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center">
                                                <Upload className="w-6 h-6 text-gray-400" />
                                            </div>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => setCropperMode('launcher')}
                                            className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                                        >
                                            {formData.launcherLogo ? 'Change Logo' : 'Upload Logo'}
                                        </button>
                                    </div>
                                </div>

                                {/* Header Avatar Logo */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Header Avatar
                                    </label>
                                    <p className="text-xs text-gray-500 mb-3">
                                        Custom logo for the chat header (recommended: square image, 200x200px)
                                    </p>
                                    <div className="flex items-center gap-4">
                                        {formData.headerLogo ? (
                                            <div className="relative">
                                                <img
                                                    src={formData.headerLogo}
                                                    alt="Header logo"
                                                    className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setFormData((prev) => ({ ...prev, headerLogo: undefined }))}
                                                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="w-16 h-16 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center">
                                                <Upload className="w-6 h-6 text-gray-400" />
                                            </div>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => setCropperMode('header')}
                                            className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                                        >
                                            {formData.headerLogo ? 'Change Logo' : 'Upload Logo'}
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Header Title
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.settings.headerTitle}
                                        onChange={(e) =>
                                            setFormData((prev) => ({
                                                ...prev,
                                                settings: { ...prev.settings, headerTitle: e.target.value },
                                            }))
                                        }
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Header Subtitle
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.settings.headerSubtitle || ''}
                                        onChange={(e) =>
                                            setFormData((prev) => ({
                                                ...prev,
                                                settings: { ...prev.settings, headerSubtitle: e.target.value },
                                            }))
                                        }
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Welcome Message
                                    </label>
                                    <textarea
                                        value={formData.settings.welcomeMessage}
                                        onChange={(e) =>
                                            setFormData((prev) => ({
                                                ...prev,
                                                settings: { ...prev.settings, welcomeMessage: e.target.value },
                                            }))
                                        }
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                                        rows={3}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Input Placeholder
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.settings.inputPlaceholder}
                                        onChange={(e) =>
                                            setFormData((prev) => ({
                                                ...prev,
                                                settings: { ...prev.settings, inputPlaceholder: e.target.value },
                                            }))
                                        }
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                                    />
                                </div>

                                <div className="space-y-3">
                                    <label className="flex items-center gap-3">
                                        <input
                                            type="checkbox"
                                            checked={formData.settings.soundEnabled}
                                            onChange={(e) =>
                                                setFormData((prev) => ({
                                                    ...prev,
                                                    settings: { ...prev.settings, soundEnabled: e.target.checked },
                                                }))
                                            }
                                            className="w-4 h-4 text-primary-600 rounded"
                                        />
                                        <span className="text-sm text-gray-700">Enable sound notifications</span>
                                    </label>

                                    <label className="flex items-center gap-3">
                                        <input
                                            type="checkbox"
                                            checked={formData.settings.typingIndicator}
                                            onChange={(e) =>
                                                setFormData((prev) => ({
                                                    ...prev,
                                                    settings: { ...prev.settings, typingIndicator: e.target.checked },
                                                }))
                                            }
                                            className="w-4 h-4 text-primary-600 rounded"
                                        />
                                        <span className="text-sm text-gray-700">Show typing indicator</span>
                                    </label>

                                    <label className="flex items-center gap-3">
                                        <input
                                            type="checkbox"
                                            checked={formData.settings.showTimestamps}
                                            onChange={(e) =>
                                                setFormData((prev) => ({
                                                    ...prev,
                                                    settings: { ...prev.settings, showTimestamps: e.target.checked },
                                                }))
                                            }
                                            className="w-4 h-4 text-primary-600 rounded"
                                        />
                                        <span className="text-sm text-gray-700">Show message timestamps</span>
                                    </label>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Custom CSS (Advanced)
                                    </label>
                                    <textarea
                                        value={formData.customCss}
                                        onChange={(e) => setFormData((prev) => ({ ...prev, customCss: e.target.value }))}
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none font-mono text-sm"
                                        rows={6}
                                        placeholder=".cfui-message { ... }"
                                    />
                                    <p className="text-sm text-gray-500 mt-1">
                                        Override specific widget styles. Use .cfui- prefixed classes.
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Pre-chat Form Tab */}
                        {activeTab === 'prechat' && (
                            <div className="space-y-6">
                                <div className="text-center py-12">
                                    <div className="text-4xl mb-4">🚧</div>
                                    <h3 className="text-lg font-semibold text-gray-700 mb-2">Coming Soon</h3>
                                    <p className="text-sm text-gray-500 max-w-md mx-auto">
                                        Pre-chat forms will allow you to collect user information before starting a conversation.
                                        This feature is currently under development.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Actions — hide on test chat tab */}
                    {activeTab !== 'testchat' && (
                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                type="button"
                                onClick={() => navigate('/')}
                                className="px-5 py-2.5 text-gray-700 hover:bg-gray-100 rounded-lg transition"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={saveMutation.isPending}
                                className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition disabled:opacity-50"
                            >
                                {saveMutation.isPending ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <Save className="w-4 h-4" />
                                        {isNew ? 'Create Chatbot' : 'Save Changes'}
                                    </>
                                )}
                            </button>
                        </div>
                    )}

                    {saveMutation.isError && (
                        <div className="mt-4 bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg">
                            {saveMutation.error instanceof Error ? saveMutation.error.message : 'Failed to save'}
                        </div>
                    )}
                </form>

                {/* Test Chat — rendered outside the form to prevent submit conflicts */}
                {activeTab === 'testchat' && !isNew && id && (
                    <div className="bg-white rounded-b-xl border border-gray-200 border-t-0 p-6">
                        <TestChat chatbotId={id} chatbotName={formData.name || 'Chatbot'} />
                    </div>
                )}
            </div>

            {/* Image Cropper Modal */}
            {cropperMode && (
                <ImageCropper
                    onCropComplete={(croppedImage) => {
                        if (cropperMode === 'launcher') {
                            setFormData((prev) => ({ ...prev, launcherLogo: croppedImage }));
                        } else {
                            setFormData((prev) => ({ ...prev, headerLogo: croppedImage }));
                        }
                        setCropperMode(null);
                    }}
                    onCancel={() => setCropperMode(null)}
                    circularCrop={true}
                    aspectRatio={1}
                />
            )}
        </Layout>
    );
}
