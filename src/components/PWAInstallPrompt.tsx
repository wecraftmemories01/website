'use client'

import { useEffect, useState } from 'react'

const STORAGE_KEY = 'pwa_prompt_closed_at'

// show again after 7 days
const WAIT_TIME = 7 * 24 * 60 * 60 * 1000

export default function PWAInstallPrompt() {
    const [prompt, setPrompt] = useState<any>(null)
    const [visible, setVisible] = useState(false)

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

        // Detect engagement
        const onScroll = () => {
            userEngaged = true
            window.removeEventListener('scroll', onScroll)
        }

        window.addEventListener('scroll', onScroll)

        // Real install prompt event
        const handler = (e: any) => {
            console.log('beforeinstallprompt fired')

            e.preventDefault()

            eventCaptured = true
            setPrompt(e)

            // show gently after engagement
            setTimeout(() => {
                if (userEngaged) {
                    setVisible(true)
                }
            }, 15000) // 15 sec
        }

        window.addEventListener('beforeinstallprompt', handler)

        // Smart fallback
        const fallback = setTimeout(() => {
            if (
                !eventCaptured &&
                !isInCooldown() &&
                userEngaged
            ) {
                console.log('Showing fallback install prompt')
                setVisible(true)
            }
        }, 45000) // 45 sec

        return () => {
            window.removeEventListener(
                'beforeinstallprompt',
                handler
            )

            window.removeEventListener('scroll', onScroll)

            clearTimeout(fallback)
        }
    }, [])

    const install = async () => {
        try {
            // Real browser prompt
            if (prompt) {
                prompt.prompt()

                const choice = await prompt.userChoice

                console.log(choice)

                setVisible(false)
                setPrompt(null)

                return
            }

            // Fallback instructions
            alert(
                'To install this app:\n\nAndroid: Browser Menu → Add to Home Screen\n\niPhone: Share → Add to Home Screen'
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
        setPrompt(null)
    }

    if (!visible) return null

    return (
        <div
            className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-4"
            style={{
                paddingBottom:
                    'calc(env(safe-area-inset-bottom) + 12px)',
            }}
        >
            <div
                className="
                    mx-auto
                    max-w-md
                    rounded-2xl
                    bg-white/95
                    backdrop-blur-md
                    border border-gray-200
                    shadow-xl
                    px-4 py-3
                    flex items-center justify-between gap-3
                    animate-in slide-in-from-bottom-5 fade-in duration-300
                "
            >
                <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900">
                        Install WeCraftMemories
                    </p>

                    <p className="text-xs text-gray-500 mt-0.5">
                        Faster browsing & quick checkout
                    </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    <button
                        onClick={closePrompt}
                        className="
                            text-sm
                            text-gray-500
                            hover:text-gray-800
                            transition
                        "
                    >
                        Later
                    </button>

                    <button
                        onClick={install}
                        className="
                            bg-[#0B5C73]
                            hover:bg-[#094a5c]
                            text-white
                            text-sm
                            font-medium
                            px-4 py-2
                            rounded-xl
                            transition
                        "
                    >
                        Install
                    </button>
                </div>
            </div>
        </div>
    )
}