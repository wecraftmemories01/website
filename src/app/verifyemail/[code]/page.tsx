'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

type Status = 'idle' | 'loading' | 'success' | 'error'
type ResendStatus = 'idle' | 'loading' | 'success' | 'error'

/* Safe text extractor so we never render objects directly */
function safeText(input: unknown) {
    if (input == null) return ''
    if (typeof input === 'string' || typeof input === 'number' || typeof input === 'boolean') return String(input)
    try {
        if (typeof input === 'object') {
            // prefer message / error fields
            // @ts-ignore
            if (input?.message && typeof input.message === 'string') return input.message
            // @ts-ignore
            if (input?.error && typeof input.error === 'string') return input.error
            const s = JSON.stringify(input)
            return s.length > 200 ? s.slice(0, 200) + '…' : s
        }
    } catch {
        return String(input)
    }
    return String(input)
}

export default function VerifyEmailPage() {
    const { code } = useParams<{ code?: string }>()
    const router = useRouter()
    const [isMounted, setIsMounted] = useState(false)

    // verification (main) state
    const [status, setStatus] = useState<Status>('idle')
    const [msg, setMsg] = useState<string>('Verifying…')
    const [details, setDetails] = useState<string | null>(null)
    const [showResendInline, setShowResendInline] = useState(false)
    const controllerRef = useRef<AbortController | null>(null)

    // separate resend state so we don't mix UI flows
    const [resendStatus, setResendStatus] = useState<ResendStatus>('idle')
    const [resendMsg, setResendMsg] = useState<string>('')
    const [resendDetails, setResendDetails] = useState<string | null>(null)

    useEffect(() => {
        setIsMounted(true)
    }, [])

    useEffect(() => {
        if (!isMounted) return
        if (!code) {
            setStatus('error')
            setMsg('Invalid verification link')
            setDetails(null)
            return
        }
        verify(code)
        return () => controllerRef.current?.abort()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isMounted, code])

    async function verify(codeToVerify: string) {
        setStatus('loading')
        setMsg('Verifying your email…')
        setDetails(null)
        setShowResendInline(false)
        try {
            const API_BASE = process.env.NEXT_PUBLIC_API_BASE
            controllerRef.current = new AbortController()
            const res = await fetch(`${API_BASE}/customer/verify_email/${codeToVerify}`, {
                method: 'PUT',
                signal: controllerRef.current.signal
            })

            const payload = await res.json().catch(() => null)

            if (res.ok) {
                setStatus('success')
                setMsg(safeText((payload && (payload.message || payload.msg)) || 'Email verified ✅'))
                // auto-redirect after success (use replace to avoid back nav)
                setTimeout(() => router.replace('/login'), 10000)
            } else {
                setStatus('error')

                const errCode =
                    (payload && (payload.error?.code ?? (payload.code ?? payload?.statusCode))) ?? undefined
                const errMessage = safeText(
                    (payload && (payload.error?.message || payload.message || payload.error || payload.msg)) ||
                    `Server ${res.status}`
                )

                setMsg('Verification failed')
                setDetails(errMessage)

                if (errCode === 1015) {
                    setShowResendInline(true)
                } else {
                    setShowResendInline(false)
                }
            }
        } catch (err: any) {
            if (err?.name === 'AbortError') return
            setStatus('error')
            setMsg('Network error')
            setDetails(safeText(err?.message || err))
            setShowResendInline(false)
        } finally {
            controllerRef.current = null
        }
    }

    // Resend does not touch `status` (verification). It updates its own resendStatus/resendMsg.
    async function resendUsingCode() {
        if (!code) return
        const API_BASE = process.env.NEXT_PUBLIC_API_BASE
        const resendUrl = `${API_BASE}/customer/resend_verification_code/${code}`

        setResendStatus('loading')
        setResendMsg('Resending verification email…')
        setResendDetails(null)
        try {
            const res = await fetch(resendUrl, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' }
                // no body — server reads code from URL
            })
            const payload = await res.json().catch(() => null)

            if (res.ok) {
                setResendStatus('success')
                setResendMsg(safeText((payload && (payload.message || 'Verification email resent')) || 'Verification email resent'))
                setResendDetails(null)
                // keep main verification status unchanged — user should not be redirected by resend
            } else {
                setResendStatus('error')
                setResendMsg('Resend failed')
                const friendly = safeText((payload && (payload.error || payload.message)) || `Server ${res.status}`)
                setResendDetails(friendly)
            }
        } catch (err: any) {
            setResendStatus('error')
            setResendMsg('Resend failed')
            setResendDetails(safeText(err?.message || err))
        }
    }

    return (
        <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center p-6">
            <div className="w-full max-w-xl bg-white rounded-2xl shadow-lg p-8 flex flex-col items-center gap-6">
                {/* Icon / Hero */}
                <div className="flex items-center justify-center w-28 h-28 rounded-full bg-indigo-50 shadow-sm">
                    {status === 'loading' || (!isMounted && status === 'idle') ? (
                        <svg className="animate-spin h-12 w-12 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden>
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                        </svg>
                    ) : status === 'success' ? (
                        <svg width="56" height="56" viewBox="0 0 24 24" fill="none" aria-hidden>
                            <circle cx="12" cy="12" r="12" fill="#ecfdf5" />
                            <path d="M7 12.5l2.5 2.5L17 8" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    ) : (
                        <svg width="56" height="56" viewBox="0 0 24 24" fill="none" aria-hidden>
                            <circle cx="12" cy="12" r="12" fill="#fff1f2" />
                            <path d="M12 8v5" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M12 16h.01" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    )}
                </div>

                {/* Title */}
                <h1 className="text-2xl font-semibold text-slate-800" suppressHydrationWarning>
                    {(!isMounted && status === 'idle') ? 'Verifying your email…' : status === 'loading' ? 'Verifying your email…' : status === 'success' ? 'Email verified' : 'Verification failed'}
                </h1>

                {/* Message (dynamic) */}
                <p className="text-sm text-slate-500 text-center max-w-[36rem]" suppressHydrationWarning>
                    {(!isMounted && status === 'idle') ? 'Hang tight — we are checking your verification link.' : safeText(msg)}
                </p>

                {/* Details (verification errors) */}
                {details ? (
                    <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2 mt-2 w-full text-center" suppressHydrationWarning>
                        {details}
                    </div>
                ) : null}

                {/* Action button row */}
                <div className="w-full flex flex-col sm:flex-row gap-3 mt-2">
                    {status === 'success' ? (
                        <button
                            onClick={() => router.replace('/login')}
                            className="w-full px-4 py-2 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition"
                        >
                            Go to Login
                        </button>
                    ) : (
                        <button
                            onClick={() => (status === 'error' ? verify(code!) : null)}
                            className={`w-full px-4 py-2 rounded-lg ${status === 'loading' ? 'bg-slate-200 text-slate-600' : 'bg-indigo-600 text-white hover:bg-indigo-700'} transition`}
                            disabled={status === 'loading'}
                        >
                            {status === 'loading' ? 'Verifying…' : 'Retry'}
                        </button>
                    )}
                </div>

                {/* Resend area */}
                {!isMounted || !showResendInline ? (
                    <div className="w-full flex flex-col items-center gap-2 mt-1">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => resendUsingCode()}
                                className="text-xs text-slate-500 hover:text-slate-700"
                                suppressHydrationWarning
                                disabled={resendStatus === 'loading'}
                            >
                                {resendStatus === 'loading' ? 'Resending…' : 'Resend email'}
                            </button>

                            {/* show a small inline resend status message (separate from verification status) */}
                            {resendStatus === 'success' && (
                                <div className="text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded" suppressHydrationWarning>
                                    {resendMsg || 'Verification email has been re-sent to your registered email.'}
                                </div>
                            )}

                            {resendStatus === 'error' && (
                                <div className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded" suppressHydrationWarning>
                                    {resendMsg} {resendDetails ? `— ${resendDetails}` : ''}
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="w-full flex flex-col items-center gap-3 mt-3">
                        <div className="text-sm text-slate-600 text-center">Your verification link has expired.</div>
                        <div className="flex gap-2">
                            <button
                                onClick={resendUsingCode}
                                className="px-4 py-2 rounded-lg bg-amber-500 text-white text-sm font-medium hover:bg-amber-600 transition"
                                disabled={resendStatus === 'loading'}
                            >
                                {resendStatus === 'loading' ? 'Resending…' : 'Resend verification email'}
                            </button>
                            <button
                                onClick={() => verify(code!)}
                                className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 text-sm hover:bg-slate-200 transition"
                            >
                                Try verification again
                            </button>
                        </div>

                        {resendStatus === 'success' && (
                            <div className="text-sm text-emerald-600 mt-2">{resendMsg || 'Verification email has been re-sent to your registered email.'}</div>
                        )}

                        {resendStatus === 'error' && (
                            <div className="text-sm text-red-600 mt-2">{resendMsg} {resendDetails ? `— ${resendDetails}` : ''}</div>
                        )}
                    </div>
                )}

                <div className="text-xs text-slate-300 mt-2">If this link doesn't work, request a new verification email.</div>
            </div>
        </main>
    )
}