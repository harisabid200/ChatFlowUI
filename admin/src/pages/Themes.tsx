import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Palette, Copy, Trash2, Loader2, Edit3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { themesApi, Theme } from '../api';
import Layout from '../components/Layout';
import { createPath } from '../utils/navigation';

export default function Themes() {
    const queryClient = useQueryClient();
    const [deleteId, setDeleteId] = useState<string | null>(null);

    const { data: themes, isLoading } = useQuery({
        queryKey: ['themes'],
        queryFn: themesApi.list,
    });

    const deleteMutation = useMutation({
        mutationFn: themesApi.delete,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['themes'] });
            setDeleteId(null);
        },
    });

    const duplicateMutation = useMutation({
        mutationFn: themesApi.duplicate,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['themes'] });
        },
    });

    const presetThemes = themes?.filter((t) => t.isPreset) || [];
    const customThemes = themes?.filter((t) => !t.isPreset) || [];

    return (
        <Layout>
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-gray-900">Themes</h1>
                    <p className="text-gray-500 mt-1">
                        Customize the appearance of your chat widgets
                    </p>
                </div>

                {/* Loading */}
                {isLoading && (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
                    </div>
                )}

                {!isLoading && (
                    <>
                        {/* Preset Themes */}
                        <div className="mb-8">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">Preset Themes</h2>
                            <div className="grid sm:grid-cols-2 gap-4">
                                {presetThemes.map((theme) => (
                                    <ThemeCard
                                        key={theme.id}
                                        theme={theme}
                                        onDuplicate={() => duplicateMutation.mutate(theme.id)}
                                        isDuplicating={duplicateMutation.isPending}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Custom Themes */}
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">Custom Themes</h2>
                            {customThemes.length === 0 ? (
                                <div className="bg-gray-50 rounded-xl p-8 text-center border border-gray-200">
                                    <Palette className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                                    <p className="text-gray-600">No custom themes yet</p>
                                    <p className="text-sm text-gray-500 mt-1">
                                        Duplicate a preset theme to start customizing
                                    </p>
                                </div>
                            ) : (
                                <div className="grid sm:grid-cols-2 gap-4">
                                    {customThemes.map((theme) => (
                                        <ThemeCard
                                            key={theme.id}
                                            theme={theme}
                                            onDuplicate={() => duplicateMutation.mutate(theme.id)}
                                            onDelete={() => setDeleteId(theme.id)}
                                            isDuplicating={duplicateMutation.isPending}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                )}

                {/* Delete Confirmation Modal */}
                {deleteId && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-xl p-6 max-w-md w-full">
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Theme?</h3>
                            <p className="text-gray-500 mb-6">
                                This action cannot be undone. Chatbots using this theme will fall back to the
                                default theme.
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
            </div>
        </Layout>
    );
}

function ThemeCard({
    theme,
    onDuplicate,
    onDelete,
    isDuplicating,
}: {
    theme: Theme;
    onDuplicate: () => void;
    onDelete?: () => void;
    isDuplicating: boolean;
}) {
    const { colors } = theme.config;
    const navigate = useNavigate();

    return (
        <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition">
            {/* Color Preview */}
            <div className="flex gap-2 mb-4">
                <div
                    className="w-8 h-8 rounded-lg"
                    style={{ background: colors.primary }}
                    title="Primary"
                />
                <div
                    className="w-8 h-8 rounded-lg"
                    style={{ background: colors.headerBg }}
                    title="Header"
                />
                <div
                    className="w-8 h-8 rounded-lg border border-gray-200"
                    style={{ background: colors.background }}
                    title="Background"
                />
                <div
                    className="w-8 h-8 rounded-lg"
                    style={{ background: colors.userMessageBg }}
                    title="User Message"
                />
                <div
                    className="w-8 h-8 rounded-lg"
                    style={{ background: colors.botMessageBg }}
                    title="Bot Message"
                />
            </div>

            <div className="flex items-center justify-between">
                <div>
                    <h3 className="font-semibold text-gray-900">{theme.name}</h3>
                    <p className="text-sm text-gray-500">
                        {theme.isPreset ? 'Preset theme' : 'Custom theme'}
                    </p>
                </div>

                <div className="flex items-center gap-1">
                    {!theme.isPreset && (
                        <button
                            onClick={() => navigate(createPath(`/themes/${theme.id}/edit`))}
                            className="p-2 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition"
                            title="Edit"
                        >
                            <Edit3 className="w-4 h-4" />
                        </button>
                    )}
                    <button
                        onClick={onDuplicate}
                        disabled={isDuplicating}
                        className="p-2 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition"
                        title="Duplicate"
                    >
                        <Copy className="w-4 h-4" />
                    </button>
                    {onDelete && (
                        <button
                            onClick={onDelete}
                            className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="Delete"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
