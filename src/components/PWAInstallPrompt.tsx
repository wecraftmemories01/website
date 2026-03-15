'use client'

import { useEffect, useState } from 'react'

const STORAGE_KEY = 'pwa_prompt_closed_at'
const WAIT_TIME = 30 * 60 * 1000 // 30 minutes

export default function PWAInstallPrompt() {
    const [prompt, setPrompt] = useState<any>(null)
    const [visible, setVisible] = useState(false)

    useEffect(() => {
        const closedAt = localStorage.getItem(STORAGE_KEY)

        if (closedAt) {
            const diff = Date.now() - Number(closedAt)
            if (diff < WAIT_TIME) {
                return
            }
        }

        const handler = (e: any) => {
            e.preventDefault()
            setPrompt(e)
            setVisible(true)
        }

        window.addEventListener('beforeinstallprompt', handler)

        return () => window.removeEventListener('beforeinstallprompt', handler)
    }, [])

    const install = async () => {
        if (!prompt) return

        prompt.prompt()
        await prompt.userChoice

        setVisible(false)
        setPrompt(null)
    }

    const closePrompt = () => {
        localStorage.setItem(STORAGE_KEY, Date.now().toString())
        setVisible(false)
    }

    if (!visible) return null

    return (
        <div className="fixed bottom-4 left-4 right-4 z-50 bg-white shadow-xl rounded-xl p-4 flex items-center justify-between border">

            <div className="text-sm pr-4">
                <b>Install WeCraftMemories App</b>
                <p className="text-gray-500 text-xs">Faster access & better experience</p>
            </div>

            <div className="flex items-center gap-2">
                <button
                    onClick={install}
                    className="bg-[#0B5C73] text-white px-4 py-2 rounded-lg text-sm hover:opacity-90"
                >
                    Install
                </button>

                <button
                    onClick={closePrompt}
                    className="text-gray-400 hover:text-gray-700 text-lg px-2"
                    aria-label="Close"
                >
                    ✕
                </button>
            </div>

        </div>
    )
}