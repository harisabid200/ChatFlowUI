import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Plus,
    Settings,
    Trash2,
    Code,
    ExternalLink,
    Bot,
    Loader2,
    Copy,
    Check,
} from 'lucide-react';
import { chatbotsApi, Chatbot } from '../api';
import Layout from '../components/Layout';

export default function Dashboard() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [embedModal, setEmbedModal] = useState<{ chatbotId: string; code: string } | null>(null);
    const [copied, setCopied] = useState(false);

    const { data: chatbots, isLoading } = useQuery({
        queryKey: ['chatbots'],
        queryFn: chatbotsApi.list,
    });

    const deleteMutation = useMutation({
        mutationFn: chatbotsApi.delete,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['chatbots'] });
            setDeleteId(null);
        },
    });

    const handleGetEmbed = async (id: string) => {
        try {
            const { embedCode } = await chatbotsApi.getEmbed(id);
            setEmbedModal({ chatbotId: id, code: embedCode });
        } catch (error) {
            console.error('Failed to get embed code:', error);
        }
    };

    const handleCopy = () => {
        if (embedModal) {
            navigator.clipboard.writeText(embedModal.code);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <Layout>
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Chatbots</h1>
                        <p className="text-gray-500 mt-1">Manage your chat widgets</p>
                    </div>
                    <Link
                        to="/chatbots/new"
                        className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2.5 rounded-lg font-medium transition"
                    >
                        <Plus className="w-5 h-5" />
                        Create Chatbot
                    </Link>
                </div>

                {/* Loading */}
                {isLoading && (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
                    </div>
                )}

                {/* Empty State */}
                {!isLoading && (!chatbots || chatbots.length === 0) && (
                    <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                        <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Bot className="w-8 h-8 text-primary-600" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">No chatbots yet</h3>
                        <p className="text-gray-500 mb-6">Create your first chatbot to get started</p>
                        <Link
                            to="/chatbots/new"
                            className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-lg font-medium transition"
                        >
                            <Plus className="w-5 h-5" />
                            Create Chatbot
                        </Link>
                    </div>
                )}

                {/* Chatbot List */}
                {chatbots && chatbots.length > 0 && (
                    <div className="grid gap-4">
                        {chatbots.map((chatbot) => (
                            <div
                                key={chatbot.id}
                                className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
                                            <Bot className="w-6 h-6 text-primary-600" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-gray-900">{chatbot.name}</h3>
                                            <p className="text-sm text-gray-500 mt-0.5">
                                                {chatbot.allowedOrigins.length} allowed domain(s)
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => handleGetEmbed(chatbot.id)}
                                            className="flex items-center gap-1.5 px-3 py-2 text-gray-600 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition text-sm"
                                        >
                                            <Code className="w-4 h-4" />
                                            Embed
                                        </button>
                                        <Link
                                            to={`/chatbots/${chatbot.id}`}
                                            className="flex items-center gap-1.5 px-3 py-2 text-gray-600 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition text-sm"
                                        >
                                            <Settings className="w-4 h-4" />
                                            Edit
                                        </Link>
                                        <button
                                            onClick={() => setDeleteId(chatbot.id)}
                                            className="flex items-center gap-1.5 px-3 py-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition text-sm"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Delete Confirmation Modal */}
                {deleteId && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-xl p-6 max-w-md w-full">
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Chatbot?</h3>
                            <p className="text-gray-500 mb-6">
                                This action cannot be undone. The widget will stop working on all websites.
                            </p>
                            <div className="flex gap-3 justify-end">
                                <button
                                    onClick={() => setDeleteId(null)}
                                    className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => deleteMutation.mutate(deleteId)}
                                    disabled={deleteMutation.isPending}
                                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition disabled:opacity-50"
                                >
                                    {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Embed Code Modal */}
                {embedModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-xl p-6 max-w-2xl w-full">
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">Embed Code</h3>
                            <p className="text-gray-500 mb-4">
                                Copy and paste this code into your website's HTML, just before the closing{' '}
                                <code className="bg-gray-100 px-1 rounded">&lt;/body&gt;</code> tag.
                            </p>
                            <div className="relative">
                                <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
                                    {embedModal.code}
                                </pre>
                                <button
                                    onClick={handleCopy}
                                    className="absolute top-2 right-2 flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded transition text-sm"
                                >
                                    {copied ? (
                                        <>
                                            <Check className="w-4 h-4" />
                                            Copied!
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="w-4 h-4" />
                                            Copy
                                        </>
                                    )}
                                </button>
                            </div>
                            <div className="flex justify-end mt-4">
                                <button
                                    onClick={() => setEmbedModal(null)}
                                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
}
