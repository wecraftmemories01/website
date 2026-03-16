'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

type Status = 'idle' | 'loading' | 'success' | 'error'
type ResendStatus = 'idle' | 'loading' | 'success' | 'error'

/* Safe text extractor */
function safeText(input: unknown) {
    if (input == null) return ''
    if (typeof input === 'string' || typeof input === 'number' || typeof input === 'boolean') {
        return String(input)
    }
    try {
        if (typeof input === 'object') {
            // @ts-ignore
            if (input?.message) return String(input.message)
            // @ts-ignore
            if (input?.error) return String(input.error)
            const s = JSON.stringify(input)
            return s.length > 200 ? s.slice(0, 200) + '…' : s
        }
    } catch {
        return ''
    }
    return ''
}

export default function VerifyEmailPage() {
    const { code } = useParams<{ code?: string }>()
    const router = useRouter()
    const controllerRef = useRef<AbortController | null>(null)

    // verification state
    const [status, setStatus] = useState<Status>('idle')
    const [msg, setMsg] = useState('Verifying…')
    const [details, setDetails] = useState<string | null>(null)
    const [showResendInline, setShowResendInline] = useState(false)

    // resend state (isolated)
    const [resendStatus, setResendStatus] = useState<ResendStatus>('idle')
    const [resendMsg, setResendMsg] = useState('')
    const [resendDetails, setResendDetails] = useState<string | null>(null)

    useEffect(() => {
        if (!code) {
            setStatus('error')
            setMsg('Invalid verification link')
            return
        }
        verify(code)
        return () => controllerRef.current?.abort()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [code])

    async function verify(codeToVerify: string) {
        setStatus('loading')
        setMsg('Verifying your email…')
        setDetails(null)
        setShowResendInline(false)

        try {
            const API_BASE = process.env.NEXT_PUBLIC_API_BASE
            controllerRef.current = new AbortController()

            const res = await fetch(
                `${API_BASE}/customer/verify_email/${codeToVerify}`,
                { method: 'PUT', signal: controllerRef.current.signal }
            )

            const payload = await res.json().catch(() => null)

            if (res.ok) {
                setStatus('success')
                setMsg(
                    safeText(payload?.message) || 'Email verified successfully ✅'
                )
                setTimeout(() => router.replace('/login'), 8000)
                return
            }

            // ❌ verification failed
            setStatus('error')
            setMsg('Verification failed')

            const errCode =
                payload?.error?.code ??
                payload?.code ??
                payload?.statusCode

            const errMessage = safeText(
                payload?.error?.message ||
                payload?.message ||
                payload?.error ||
                `Server ${res.status}`
            )

            setDetails(errMessage)

            // ONLY allow resend for expired / invalid token
            if (errCode === 1015) {
                setShowResendInline(true)
            }

        } catch (err: any) {
            if (err?.name === 'AbortError') return
            setStatus('error')
            setMsg('Network error')
            setDetails(safeText(err?.message || err))
        } finally {
            controllerRef.current = null
        }
    }

    async function resendUsingCode() {
        if (!code) return

        const API_BASE = process.env.NEXT_PUBLIC_API_BASE
        setResendStatus('loading')
        setResendMsg('Resending verification email…')
        setResendDetails(null)

        try {
            const res = await fetch(
                `${API_BASE}/customer/resend_verification_code/${code}`,
                { method: 'PUT' }
            )

            const payload = await res.json().catch(() => null)

            if (res.ok) {
                setResendStatus('success')
                setResendMsg(
                    safeText(payload?.message) ||
                    'Verification email has been re-sent.'
                )
                return
            }

            setResendStatus('error')
            setResendMsg('Resend failed')
            setResendDetails(
                safeText(payload?.error || payload?.message)
            )

        } catch (err: any) {
            setResendStatus('error')
            setResendMsg('Resend failed')
            setResendDetails(safeText(err?.message || err))
        }
    }

    return (
        <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center p-6">
            <div className="w-full max-w-xl bg-white rounded-2xl shadow-lg p-8 flex flex-col items-center gap-6">

                {/* Header */}
                <h1 className="text-2xl font-semibold text-slate-800">
                    {status === 'loading'
                        ? 'Verifying your email…'
                        : status === 'success'
                            ? 'Email verified'
                            : 'Verification failed'}
                </h1>

                <p className="text-sm text-slate-500 text-center">
                    {msg}
                </p>

                {details && (
                    <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded px-3 py-2 w-full text-center">
                        {details}
                    </div>
                )}

                {/* Main action */}
                {status === 'success' ? (
                    <button
                        onClick={() => router.replace('/login')}
                        className="w-full px-4 py-2 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700"
                    >
                        Go to Login
                    </button>
                ) : (
                    <button
                        onClick={() => verify(code!)}
                        disabled={status === 'loading'}
                        className="w-full px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-slate-200"
                    >
                        {status === 'loading' ? 'Verifying…' : 'Retry'}
                    </button>
                )}

                {/* ✅ Resend ONLY when verification failed + expired */}
                {status === 'error' && showResendInline && (
                    <div className="w-full flex flex-col items-center gap-3 mt-3">
                        <div className="text-sm text-slate-600 text-center">
                            Your verification link has expired.
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={resendUsingCode}
                                disabled={resendStatus === 'loading'}
                                className="px-4 py-2 rounded-lg bg-amber-500 text-white text-sm hover:bg-amber-600"
                            >
                                {resendStatus === 'loading'
                                    ? 'Resending…'
                                    : 'Resend verification email'}
                            </button>

                            <button
                                onClick={() => verify(code!)}
                                className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 text-sm hover:bg-slate-200"
                            >
                                Try again
                            </button>
                        </div>

                        {resendStatus === 'success' && (
                            <div className="text-sm text-emerald-600">
                                {resendMsg}
                            </div>
                        )}

                        {resendStatus === 'error' && (
                            <div className="text-sm text-red-600">
                                {resendMsg}
                                {resendDetails ? ` — ${resendDetails}` : ''}
                            </div>
                        )}
                    </div>
                )}

                <div className="text-xs text-slate-300 mt-2">
                    If this link doesn’t work, request a new verification email.
                </div>
            </div>
        </main>
    )
}