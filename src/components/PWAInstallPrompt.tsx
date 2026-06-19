'use client'

import { useEffect, useState } from 'react'

const STORAGE_KEY = 'pwa_prompt_closed_at'
const WAIT_TIME = 7 * 24 * 60 * 60 * 1000

export default function PWAInstallPrompt() {
    const [prompt, setPrompt] = useState<any>(null)
    const [visible, setVisible] = useState(false)
    const [expanded, setExpanded] = useState(false)

    const isInCooldown = () => {
        if (typeof window === 'undefined') return true

        const closedAt = localStorage.getItem(STORAGE_KEY)

        if (!closedAt) return false

        return Date.now() - Number(closedAt) < WAIT_TIME
    }

    useEffect(() => {
        if (typeof window === 'undefined') return
        if (isInCooldown()) return

        let eventCaptured = false
        let userEngaged = false

        const onScroll = () => {
            userEngaged = true
            window.removeEventListener('scroll', onScroll)
        }

        window.addEventListener('scroll', onScroll)

        const handler = (e: any) => {
            e.preventDefault()

            eventCaptured = true
            setPrompt(e)

            setTimeout(() => {
                if (userEngaged) {
                    setVisible(true)
                }
            }, 15000)
        }

        window.addEventListener('beforeinstallprompt', handler)

        const fallback = setTimeout(() => {
            if (
                !eventCaptured &&
                !isInCooldown() &&
                userEngaged
            ) {
                setVisible(true)
            }
        }, 45000)

        return () => {
            window.removeEventListener(
                'beforeinstallprompt',
                handler
            )

            window.removeEventListener(
                'scroll',
                onScroll
            )

            clearTimeout(fallback)
        }
    }, [])

    const install = async () => {
        try {
            if (prompt) {
                prompt.prompt()

                await prompt.userChoice

                setVisible(false)
                setPrompt(null)
                return
            }

            alert(
                'Android: Browser Menu → Add to Home Screen\n\niPhone: Share → Add to Home Screen'
            )

            setVisible(false)
        } catch (err) {
            console.log(err)
        }
    }

    const closePrompt = () => {
        localStorage.setItem(
            STORAGE_KEY,
            Date.now().toString()
        )

        setVisible(false)
        setExpanded(false)
        setPrompt(null)
    }

    if (!visible) return null

    return (
        <div
            className="fixed right-4 bottom-20 z-40"
            style={{
                paddingBottom: 'env(safe-area-inset-bottom)',
            }}
        >
            {!expanded ? (
                <button
                    onClick={() => setExpanded(true)}
                    className="
                        flex items-center gap-2
                        bg-[#065975]
                        text-white
                        rounded-full
                        shadow-xl
                        px-4
                        py-3
                        hover:scale-105
                        transition-all
                    "
                >
                    <span className="text-lg">📱</span>

                    <span className="text-sm font-medium">
                        Install App
                    </span>
                </button>
            ) : (
                <div
                    className="
                        w-[320px]
                        max-w-[calc(100vw-32px)]
                        bg-white
                        rounded-3xl
                        shadow-2xl
                        border
                        border-gray-200
                        overflow-hidden
                        animate-in
                        fade-in
                        slide-in-from-bottom-2
                    "
                >
                    <div className="p-5">
                        <div className="flex justify-between items-start">
                            <div className="flex gap-3">
                                <div
                                    className="
                                        h-12
                                        w-12
                                        rounded-2xl
                                        bg-[#065975]/10
                                        flex
                                        items-center
                                        justify-center
                                        text-xl
                                    "
                                >
                                    📱
                                </div>

                                <div>
                                    <h3 className="font-semibold text-gray-900">
                                        Install App
                                    </h3>

                                    <p className="text-sm text-gray-500 mt-1">
                                        Enjoy faster browsing,
                                        quick checkout and
                                        app-like experience.
                                    </p>
                                </div>
                            </div>

                            <button
                                onClick={closePrompt}
                                className="
                                    text-gray-400
                                    hover:text-gray-700
                                    text-lg
                                    leading-none
                                "
                            >
                                ×
                            </button>
                        </div>

                        <div className="flex gap-2 mt-5">
                            <button
                                onClick={() =>
                                    setExpanded(false)
                                }
                                className="
                                    flex-1
                                    h-11
                                    rounded-xl
                                    border
                                    border-gray-200
                                    text-gray-600
                                    text-sm
                                "
                            >
                                Later
                            </button>

                            <button
                                onClick={install}
                                className="
                                    flex-1
                                    h-11
                                    rounded-xl
                                    bg-[#065975]
                                    text-white
                                    text-sm
                                    font-medium
                                "
                            >
                                Install
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}