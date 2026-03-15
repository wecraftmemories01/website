'use client'

import { useEffect, useState } from 'react'

export default function PWAInstallPrompt() {
    const [prompt, setPrompt] = useState<any>(null)
    const [visible, setVisible] = useState(false)

    useEffect(() => {
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

    if (!visible) return null

    return (
        <div className="fixed bottom-4 left-4 right-4 z-50 bg-white shadow-xl rounded-xl p-4 flex items-center justify-between border">
            <div className="text-sm">
                <b>Install WeCraftMemories App</b>
                <p className="text-gray-500 text-xs">Faster access & better experience</p>
            </div>
            <button
                onClick={install}
                className="bg-[#0B5C73] text-white px-4 py-2 rounded-lg text-sm hover:opacity-90"
            >
                Install
            </button>
        </div>
    )
}