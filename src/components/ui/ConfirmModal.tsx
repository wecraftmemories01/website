'use client';

import React from 'react';
import { motion } from 'framer-motion';

type ConfirmModalProps = {
    open: boolean;
    title?: string;
    description?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    loading?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
};

export default function ConfirmModal({
    open,
    title = 'Are you sure?',
    description = 'This action cannot be undone. Do you want to continue?',
    confirmLabel = 'Yes, remove',
    cancelLabel = 'Cancel',
    loading = false,
    onConfirm,
    onCancel,
}: ConfirmModalProps) {
    if (!open) return null;

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-modal-title"
            className="fixed inset-0 z-50 flex items-center justify-center px-4"
        >
            {/* Backdrop */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onCancel}
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />

            {/* Modal panel */}
            <motion.div
                initial={{ y: 12, opacity: 0, scale: 0.98 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: 12, opacity: 0, scale: 0.98 }}
                transition={{ type: 'spring', stiffness: 320, damping: 28 }}
                className="relative max-w-md w-full bg-white rounded-2xl shadow-2xl p-6 ring-1 ring-black/5"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-start gap-4">
                    <div className="shrink-0 w-12 h-12 flex items-center justify-center rounded-full bg-red-50 text-red-600">
                        {/* simple icon */}
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </div>

                    <div className="flex-1">
                        <h3 id="confirm-modal-title" className="text-lg font-semibold text-gray-900">
                            {title}
                        </h3>
                        <p className="mt-1 text-sm text-gray-600">{description}</p>

                        <div className="mt-5 flex items-center justify-end gap-3">
                            <button
                                onClick={onCancel}
                                className="inline-flex items-center justify-center px-4 py-2 rounded-lg border hover:bg-gray-50 text-sm"
                                disabled={loading}
                            >
                                {cancelLabel}
                            </button>

                            <button
                                onClick={onConfirm}
                                className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm shadow"
                                disabled={loading}
                            >
                                {loading ? (
                                    <svg className="animate-spin w-4 h-4 mr-2 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                                    </svg>
                                ) : null}
                                {confirmLabel}
                            </button>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}