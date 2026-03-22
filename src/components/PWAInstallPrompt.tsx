'use client'

import { useEffect, useState } from 'react'

const STORAGE_KEY = 'pwa_prompt_closed_at'
const WAIT_TIME = 30 * 60 * 1000 // 30 minutes

export default function PWAInstallPrompt() {
    const [prompt, setPrompt] = useState<any>(null)
    const [visible, setVisible] = useState(false)

    // ✅ Cooldown check
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

        const handler = (e: any) => {
            console.log("✅ PWA install event captured")

            e.preventDefault()
            eventCaptured = true

            setPrompt(e)
            setVisible(true)
        }

        window.addEventListener('beforeinstallprompt', handler)

        // ✅ Fallback (IMPORTANT for localhost / unsupported cases)
        const fallback = setTimeout(() => {
            if (!eventCaptured && !isInCooldown()) {
                console.log("⚠️ Fallback showing install UI")
                setVisible(true)
            }
        }, 4000) // show after 4 sec

        return () => {
            window.removeEventListener('beforeinstallprompt', handler)
            clearTimeout(fallback)
        }
    }, [])

    // ✅ Install handler
    const install = async () => {
        if (!prompt) {
            alert("To install this app, open browser menu → Add to Home Screen")
            return
        }

        prompt.prompt()
        await prompt.userChoice

        setVisible(false)
        setPrompt(null)
    }

    // ✅ Close handler (store cooldown)
    const closePrompt = () => {
        localStorage.setItem(STORAGE_KEY, Date.now().toString())
        setVisible(false)
        setPrompt(null)
    }

    if (!visible) return null

    return (
        <div
            className="fixed z-[999] right-4 sm:right-6"
            style={{ bottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}
        >
            <div className="
                w-[90vw] sm:w-[320px]
                max-w-[340px]
                animate-in slide-in-from-bottom-6 fade-in duration-300
            ">
                <div className="
                    bg-white/95 backdrop-blur
                    border border-gray-200
                    shadow-xl
                    rounded-2xl
                    p-3 sm:p-4
                ">

                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">

                        <div className="flex items-start gap-2 sm:gap-3">
                            {/* Icon */}
                            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#0B5C73]/10 flex items-center justify-center text-[#0B5C73] text-base">
                                📲
                            </div>

                            <div>
                                <h4 className="text-xs sm:text-sm font-semibold text-gray-900 leading-tight">
                                    Install WeCraftMemories
                                </h4>
                                <p className="text-[11px] sm:text-xs text-gray-500 mt-0.5">
                                    Faster checkout & quick access
                                </p>
                            </div>
                        </div>

                        {/* Close */}
                        <button
                            onClick={closePrompt}
                            className="text-gray-400 hover:text-gray-700 text-sm"
                        >
                            ✕
                        </button>
                    </div>

                    {/* Buttons */}
                    <div className="mt-3 flex items-center gap-2">

                        <button
                            onClick={install}
                            className="flex-1 bg-[#0B5C73] hover:bg-[#094a5c] text-white text-xs sm:text-sm font-medium py-2 rounded-lg transition"
                        >
                            Install
                        </button>

                        <button
                            onClick={closePrompt}
                            className="text-xs sm:text-sm text-gray-500 hover:text-gray-800 px-2"
                        >
                            Not now
                        </button>

                    </div>

                </div>
            </div>
        </div>
    )
}