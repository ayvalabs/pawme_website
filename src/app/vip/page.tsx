'use client'

import { useState, useEffect, useCallback } from "react"
import { motion } from "motion/react"
import { useAuth } from "@/app/context/AuthContext"
import { toast } from "sonner"
import { auth, db } from "@/firebase/config"
import {
    signInWithEmailAndPassword,
    signInWithPopup,
    GoogleAuthProvider,
    OAuthProvider,
} from "firebase/auth"
import {
    doc,
    getDoc,
    setDoc,
    collection,
    addDoc,
    Timestamp,
} from "firebase/firestore"
import { sendSignUpVerificationCode } from "@/app/actions/auth"

// ============================================================================
// DESIGN TOKENS
// ============================================================================
const colors = {
    green: "#04DA8D",
    neonGreen: "#00FF94",
    blue: "#0085FF",
    dark: "#0E1E2E",
    white: "#FFFFFF",
    textMuted: "rgba(14, 30, 46, 0.6)",
}
const gradients = {
    primary: "linear-gradient(90deg, #04DA8D 0%, #0085FF 100%)",
    bg: "linear-gradient(135deg, #0E1E2E 0%, #1a3a5c 50%, #0E1E2E 100%)",
}
const fonts = {
    heading: "'SF Pro Rounded', 'Nunito', sans-serif",
    body: "'Nunito', sans-serif",
}

const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: 14,
    borderRadius: 12,
    border: "2px solid rgba(255,255,255,0.15)",
    fontSize: 15,
    outline: "none",
    boxSizing: "border-box",
    fontFamily: fonts.body,
    background: "rgba(255,255,255,0.08)",
    color: colors.white,
}

// ============================================================================
// GOOGLE ICON
// ============================================================================
const GoogleIcon = () => (
    <svg className="mr-2" width="16" height="16" viewBox="0 0 24 24">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
)

// ============================================================================
// BENEFITS LIST
// ============================================================================
const benefits = [
    { emoji: "💰", text: "Guaranteed 50% discount", detail: "$299 → $149" },
    { emoji: "🚀", text: "First access when we launch", detail: "Before the public" },
    { emoji: "🎁", text: "Free charging dock", detail: "$49 value included" },
    { emoji: "📦", text: "Priority shipping", detail: "2 weeks before regular backers" },
    { emoji: "✅", text: "100% refundable", detail: "Change your mind? No problem" },
]

// ============================================================================
// CHECKOUT HELPER
// ============================================================================
async function redirectToCheckout(userId: string, userEmail: string, userName: string) {
    const { createVipCheckoutSession } = await import("@/app/actions/stripe")
    const appUrl = window.location.origin
    const result = await createVipCheckoutSession({
        userId,
        userEmail,
        userName,
        successUrl: `${appUrl}/thanks?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${appUrl}/vip?payment=cancelled`,
    })
    if (result.error) {
        throw new Error(result.error)
    }
    if (result.url) {
        window.location.href = result.url
    }
}

// ============================================================================
// INLINE AUTH FORM
// ============================================================================
function VipAuthForm({ onAuthSuccess }: { onAuthSuccess: (isVip: boolean, uid: string, email: string, name: string) => void }) {
    const { signUp, sendPasswordReset, refreshProfile } = useAuth()
    const [tab, setTab] = useState<"signin" | "signup">("signin")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    const [showPassword, setShowPassword] = useState(false)

    // Sign in fields
    const [signInEmail, setSignInEmail] = useState("")
    const [signInPassword, setSignInPassword] = useState("")

    // Sign up fields
    const [signUpStep, setSignUpStep] = useState<"details" | "verify">("details")
    const [signUpName, setSignUpName] = useState("")
    const [signUpEmail, setSignUpEmail] = useState("")
    const [signUpPassword, setSignUpPassword] = useState("")
    const [verificationCode, setVerificationCode] = useState("")
    const [privacyAgreed, setPrivacyAgreed] = useState(false)
    const [resendCooldown, setResendCooldown] = useState(0)

    useEffect(() => {
        let timer: NodeJS.Timeout
        if (resendCooldown > 0) {
            timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000)
        }
        return () => clearTimeout(timer)
    }, [resendCooldown])

    const resolveVipAndCallback = async (uid: string, email: string, name: string) => {
        const userDocRef = doc(db, "users", uid)
        const userDoc = await getDoc(userDocRef)
        const isVip = userDoc.exists() ? (userDoc.data()?.isVip === true) : false
        onAuthSuccess(isVip, uid, email, name)
    }

    const handleSignIn = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError("")
        try {
            const credential = await signInWithEmailAndPassword(auth, signInEmail, signInPassword)
            await refreshProfile()
            toast.success("Welcome back!")
            await resolveVipAndCallback(credential.user.uid, credential.user.email || "", credential.user.displayName || signInEmail)
        } catch (err: any) {
            let message = "Sign in failed. Please try again."
            if (err.code === "auth/invalid-credential" || err.code === "auth/user-not-found" || err.code === "auth/wrong-password") {
                message = "Invalid email or password."
            } else if (err.code === "auth/too-many-requests") {
                message = "Too many attempts. Try again later or reset your password."
            }
            setError(message)
        } finally {
            setLoading(false)
        }
    }

    const handlePasswordReset = async () => {
        if (!signInEmail) {
            toast.error("Please enter your email to reset your password.")
            return
        }
        setLoading(true)
        const result = await sendPasswordReset(signInEmail)
        if (result.success) {
            toast.success("Password reset email sent!")
        } else {
            toast.error(result.message || "Failed to send reset email.")
        }
        setLoading(false)
    }

    const handleGoogleSignIn = async () => {
        setError("")
        try {
            const provider = new GoogleAuthProvider()
            const result = await signInWithPopup(auth, provider)
            const googleUser = result.user
            const userDocRef = doc(db, "users", googleUser.uid)
            const userDoc = await getDoc(userDocRef)
            if (!userDoc.exists()) {
                const name = googleUser.displayName || googleUser.email!.split("@")[0]
                const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
                const namePart = name.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().substring(0, 4).padEnd(4, "X")
                let randomPart = ""
                for (let i = 0; i < 4; i++) randomPart += chars.charAt(Math.floor(Math.random() * chars.length))
                await setDoc(userDocRef, {
                    id: googleUser.uid,
                    email: googleUser.email!,
                    name,
                    referralCode: `${namePart}${randomPart}`,
                    points: 100,
                    referralCount: 0,
                    referredBy: null,
                    theme: "purple",
                    rewards: [],
                    createdAt: new Date().toISOString(),
                    isVip: false,
                    privacyPolicyAgreed: true,
                    marketingOptIn: false,
                })
            }
            await refreshProfile()
            toast.success("Signed in with Google!")
            await resolveVipAndCallback(googleUser.uid, googleUser.email || "", googleUser.displayName || "")
        } catch (err: any) {
            if (err.code === "auth/popup-closed-by-user") return
            toast.error(err.message || "Google sign in failed")
        }
    }

    const handleAppleSignIn = async () => {
        setError("")
        try {
            const provider = new OAuthProvider("apple.com")
            provider.addScope("email")
            provider.addScope("name")
            const result = await signInWithPopup(auth, provider)
            const appleUser = result.user
            const userDocRef = doc(db, "users", appleUser.uid)
            const userDoc = await getDoc(userDocRef)
            if (!userDoc.exists()) {
                const name = appleUser.displayName || appleUser.email?.split("@")[0] || "Apple User"
                const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
                const namePart = name.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().substring(0, 4).padEnd(4, "X")
                let randomPart = ""
                for (let i = 0; i < 4; i++) randomPart += chars.charAt(Math.floor(Math.random() * chars.length))
                await setDoc(userDocRef, {
                    id: appleUser.uid,
                    email: appleUser.email || "",
                    name,
                    referralCode: `${namePart}${randomPart}`,
                    points: 100,
                    referralCount: 0,
                    referredBy: null,
                    theme: "purple",
                    rewards: [],
                    createdAt: new Date().toISOString(),
                    isVip: false,
                    privacyPolicyAgreed: true,
                    marketingOptIn: false,
                })
            }
            await refreshProfile()
            toast.success("Signed in with Apple!")
            await resolveVipAndCallback(appleUser.uid, appleUser.email || "", appleUser.displayName || "")
        } catch (err: any) {
            if (err.code === "auth/popup-closed-by-user") return
            toast.error(err.message || "Apple sign in failed")
        }
    }

    const handleInitiateSignUp = async (e: React.FormEvent) => {
        e.preventDefault()
        setError("")
        if (!privacyAgreed) {
            toast.error("You must agree to the Privacy Policy to sign up.")
            return
        }
        setLoading(true)
        const result = await sendSignUpVerificationCode({ email: signUpEmail, name: signUpName })
        if (result.success && result.code && result.expiresAt) {
            try {
                await addDoc(collection(db, "verifications"), {
                    email: signUpEmail,
                    code: result.code,
                    expiresAt: Timestamp.fromMillis(result.expiresAt),
                })
                toast.success("Verification code sent!", { description: `A 4-digit code has been sent to ${signUpEmail}.` })
                setResendCooldown(60)
                setTimeout(() => setSignUpStep("verify"), 100)
            } catch {
                toast.error("Failed to process verification. Please try again.")
            }
        } else {
            toast.error(result.message || "Failed to send verification code.")
        }
        setLoading(false)
    }

    const handleResendCode = async () => {
        if (resendCooldown > 0) return
        setLoading(true)
        const result = await sendSignUpVerificationCode({ email: signUpEmail, name: signUpName })
        if (result.success && result.code && result.expiresAt) {
            try {
                await addDoc(collection(db, "verifications"), {
                    email: signUpEmail,
                    code: result.code,
                    expiresAt: Timestamp.fromMillis(result.expiresAt),
                })
                toast.success("New verification code sent!")
                setResendCooldown(60)
            } catch {
                toast.error("Failed to process verification.")
            }
        } else {
            toast.error(result.message || "Failed to send verification code.")
        }
        setLoading(false)
    }

    const handleCompleteSignUp = async (e: React.FormEvent) => {
        e.preventDefault()
        setError("")
        setLoading(true)
        try {
            await signUp(signUpEmail, signUpPassword, signUpName, verificationCode, undefined, privacyAgreed, false)
            toast.success("Account created successfully!")
            await resolveVipAndCallback(auth.currentUser!.uid, signUpEmail, signUpName)
        } catch (err: any) {
            setError(err.message || "Sign up failed. Please try again.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            style={{
                background: "rgba(255,255,255,0.06)",
                backdropFilter: "blur(20px)",
                borderRadius: 28,
                padding: "40px 36px",
                maxWidth: 440,
                width: "100%",
                border: "1px solid rgba(255,255,255,0.12)",
                boxShadow: "0 25px 60px rgba(0,0,0,0.3)",
            }}
        >
            <div style={{ textAlign: "center", marginBottom: 24 }}>
                <h2 style={{ fontFamily: fonts.heading, fontWeight: 900, fontSize: 24, color: colors.white, marginBottom: 6 }}>
                    Sign in to claim your VIP spot
                </h2>
                <p style={{ fontFamily: fonts.body, fontSize: 14, color: "rgba(255,255,255,0.6)" }}>
                    Just $1 today · 100% refundable · Exclusive early access
                </p>
            </div>

            {error && (
                <div style={{ background: "rgba(255,68,68,0.15)", border: "1px solid rgba(255,68,68,0.3)", borderRadius: 10, padding: "10px 14px", marginBottom: 16 }}>
                    <p style={{ color: "#FF7777", fontSize: 13, fontFamily: fonts.body, margin: 0 }}>{error}</p>
                </div>
            )}

            {/* Tab switcher */}
            <div style={{ display: "flex", gap: 0, marginBottom: 20, background: "rgba(255,255,255,0.08)", borderRadius: 10, padding: 3 }}>
                {(["signin", "signup"] as const).map((t) => (
                    <button
                        key={t}
                        onClick={() => { setTab(t); setError(""); if (t === "signup") setSignUpStep("details") }}
                        style={{
                            flex: 1, padding: "10px 0", border: "none", borderRadius: 8,
                            fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: fonts.body,
                            background: tab === t ? "rgba(255,255,255,0.15)" : "transparent",
                            color: tab === t ? colors.white : "rgba(255,255,255,0.5)",
                            transition: "all 0.2s",
                        }}
                    >
                        {t === "signin" ? "Sign In" : "Sign Up"}
                    </button>
                ))}
            </div>

            {/* Social sign-in buttons */}
            <div style={{ display: "flex", gap: 12, width: "100%", marginBottom: 16 }}>
                <motion.button
                    onClick={handleGoogleSignIn}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    style={{ flex: 1, padding: 13, borderRadius: 50, border: "2px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.06)", fontSize: 14, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontFamily: fonts.body, color: colors.white }}
                >
                    <GoogleIcon />
                    Google
                </motion.button>
                <motion.button
                    onClick={handleAppleSignIn}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    style={{ flex: 1, padding: 13, borderRadius: 50, border: "2px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.06)", fontSize: 14, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontFamily: fonts.body, color: colors.white }}
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" /></svg>
                    Apple
                </motion.button>
            </div>

            {/* Divider */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.1)" }} />
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", fontFamily: fonts.body, textTransform: "uppercase" }}>Or use email</span>
                <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.1)" }} />
            </div>

            {/* Sign In form */}
            {tab === "signin" && (
                <form onSubmit={handleSignIn} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <input type="email" placeholder="Email" value={signInEmail} onChange={(e) => setSignInEmail(e.target.value)} required style={inputStyle} disabled={loading} />
                    <div style={{ position: "relative" }}>
                        <input type={showPassword ? "text" : "password"} placeholder="Password" value={signInPassword} onChange={(e) => setSignInPassword(e.target.value)} required style={inputStyle} disabled={loading} />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "rgba(255,255,255,0.5)" }}>{showPassword ? "Hide" : "Show"}</button>
                    </div>
                    <div style={{ textAlign: "right" }}>
                        <button type="button" onClick={handlePasswordReset} disabled={loading} style={{ background: "none", border: "none", color: colors.green, fontSize: 13, cursor: "pointer", fontFamily: fonts.body }}>Forgot Password?</button>
                    </div>
                    <motion.button type="submit" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} disabled={loading} style={{ width: "100%", padding: 16, background: gradients.primary, borderRadius: 50, border: "none", color: "white", fontSize: 15, fontWeight: 800, cursor: "pointer", opacity: loading ? 0.7 : 1 }}>
                        {loading ? "Signing in..." : "Sign In & Lock In My Spot →"}
                    </motion.button>
                </form>
            )}

            {/* Sign Up – details step */}
            {tab === "signup" && signUpStep === "details" && (
                <form onSubmit={handleInitiateSignUp} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <input type="text" placeholder="Your name" value={signUpName} onChange={(e) => setSignUpName(e.target.value)} required style={inputStyle} disabled={loading} />
                    <input type="email" placeholder="Email address" value={signUpEmail} onChange={(e) => setSignUpEmail(e.target.value)} required style={inputStyle} disabled={loading} />
                    <div style={{ position: "relative" }}>
                        <input type={showPassword ? "text" : "password"} placeholder="Password (min 6 characters)" value={signUpPassword} onChange={(e) => setSignUpPassword(e.target.value)} required minLength={6} style={inputStyle} disabled={loading} />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "rgba(255,255,255,0.5)" }}>{showPassword ? "Hide" : "Show"}</button>
                    </div>
                    <label style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13, color: "rgba(255,255,255,0.6)", fontFamily: fonts.body, cursor: "pointer" }}>
                        <input type="checkbox" checked={privacyAgreed} onChange={(e) => setPrivacyAgreed(e.target.checked)} style={{ marginTop: 2 }} />
                        <span>I agree to the <a href="/privacy" target="_blank" style={{ color: colors.green, textDecoration: "underline" }}>Privacy Policy</a></span>
                    </label>
                    <motion.button type="submit" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} disabled={loading || !privacyAgreed} style={{ width: "100%", padding: 16, background: gradients.primary, borderRadius: 50, border: "none", color: "white", fontSize: 15, fontWeight: 800, cursor: "pointer", opacity: loading || !privacyAgreed ? 0.5 : 1 }}>
                        {loading ? "Sending code..." : "Create Account & Get VIP →"}
                    </motion.button>
                </form>
            )}

            {/* Sign Up – verify step */}
            {tab === "signup" && signUpStep === "verify" && (
                <form onSubmit={handleCompleteSignUp} style={{ display: "flex", flexDirection: "column", gap: 16, textAlign: "center" }}>
                    <p style={{ fontSize: 14, color: "rgba(255,255,255,0.7)", fontFamily: fonts.body, margin: 0 }}>Enter the 4-digit code sent to {signUpEmail}</p>
                    <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", fontFamily: fonts.body, margin: 0 }}>The code expires in 10 minutes.</p>
                    <div style={{ display: "flex", justifyContent: "center", gap: 8 }}>
                        {[0, 1, 2, 3].map((i) => (
                            <input
                                key={i}
                                type="text"
                                maxLength={1}
                                value={verificationCode[i] || ""}
                                onChange={(e) => {
                                    const val = e.target.value.replace(/\D/g, "")
                                    const newCode = verificationCode.split("")
                                    newCode[i] = val
                                    setVerificationCode(newCode.join(""))
                                    if (val && e.target.nextElementSibling) {
                                        (e.target.nextElementSibling as HTMLInputElement).focus()
                                    }
                                }}
                                style={{ width: 52, height: 60, textAlign: "center", fontSize: 26, fontWeight: 700, borderRadius: 12, border: "2px solid rgba(255,255,255,0.2)", outline: "none", background: "rgba(255,255,255,0.08)", color: colors.white }}
                            />
                        ))}
                    </div>
                    <motion.button type="submit" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} disabled={loading || verificationCode.length !== 4} style={{ width: "100%", padding: 16, background: gradients.primary, borderRadius: 50, border: "none", color: "white", fontSize: 15, fontWeight: 800, cursor: "pointer", opacity: loading || verificationCode.length !== 4 ? 0.5 : 1 }}>
                        {loading ? "Verifying..." : "Verify & Get VIP Access →"}
                    </motion.button>
                    <button type="button" onClick={handleResendCode} disabled={loading || resendCooldown > 0} style={{ background: "none", border: "none", color: colors.green, fontSize: 13, cursor: "pointer", fontFamily: fonts.body }}>
                        {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Didn't receive a code? Resend"}
                    </button>
                    <button type="button" onClick={() => setSignUpStep("details")} disabled={loading} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: 13, cursor: "pointer", fontFamily: fonts.body }}>
                        Back to details
                    </button>
                </form>
            )}

            <p style={{ fontFamily: fonts.body, fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 16, textAlign: "center" }}>
                🔒 Secure · No spam · Unsubscribe anytime
            </p>
        </motion.div>
    )
}

// ============================================================================
// MAIN VIP PAGE
// ============================================================================
export default function VipPage() {
    const { user, profile, loading: authLoading } = useAuth()
    const [checkoutLoading, setCheckoutLoading] = useState(false)
    const [redirectingToWelcome, setRedirectingToWelcome] = useState(false)

    // Load fonts
    useEffect(() => {
        if (typeof document === "undefined") return
        const link = document.createElement("link")
        link.href = "https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap"
        link.rel = "stylesheet"
        document.head.appendChild(link)
    }, [])

    // Handle cancelled payment query param
    useEffect(() => {
        if (typeof window === "undefined") return
        const urlParams = new URLSearchParams(window.location.search)
        if (urlParams.get("payment") === "cancelled") {
            toast.info("Payment cancelled. You can try again anytime.")
            window.history.replaceState({}, "", "/vip")
        }
    }, [])

    const handleCheckout = useCallback(async (uid: string, email: string, name: string) => {
        setCheckoutLoading(true)
        try {
            await redirectToCheckout(uid, email, name)
        } catch (err: any) {
            console.error("Checkout error:", err)
            toast.error("Failed to start checkout. Please try again.")
            setCheckoutLoading(false)
        }
    }, [])

    // Once auth resolves for a logged-in user, handle routing
    useEffect(() => {
        if (authLoading || !user) return

        if (profile?.isVip) {
            // VIP user → send to #welcome
            setRedirectingToWelcome(true)
            window.location.href = "/#welcome"
        } else if (profile) {
            // Non-VIP, profile loaded → go to checkout
            handleCheckout(user.uid, user.email || "", profile.name || user.displayName || "")
        }
        // If profile is null but user is set, wait for profile to load
    }, [authLoading, user, profile, handleCheckout])

    // After sign-in/sign-up on the form
    const handleAuthSuccess = async (isVip: boolean, uid: string, email: string, name: string) => {
        if (isVip) {
            setRedirectingToWelcome(true)
            window.location.href = "/#welcome"
        } else {
            await handleCheckout(uid, email, name)
        }
    }

    // ── Loading: auth initialising OR user logged in but profile not yet fetched ──
    if (authLoading || (user && !profile)) {
        return (
            <div style={{ minHeight: "100vh", background: gradients.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} style={{ width: 48, height: 48, border: "4px solid rgba(255,255,255,0.1)", borderTopColor: colors.green, borderRadius: "50%" }} />
            </div>
        )
    }

    // ── Redirecting to /#welcome (VIP user) ──
    if (redirectingToWelcome) {
        return (
            <div style={{ minHeight: "100vh", background: gradients.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
                <div style={{ fontSize: 64 }}>👑</div>
                <p style={{ color: colors.white, fontFamily: fonts.heading, fontWeight: 700, fontSize: 20 }}>You're already a VIP member!</p>
                <p style={{ color: "rgba(255,255,255,0.6)", fontFamily: fonts.body, fontSize: 15 }}>Taking you to your VIP dashboard...</p>
            </div>
        )
    }

    // ── Checkout in progress (logged-in non-VIP) ──
    if (checkoutLoading || (user && !profile?.isVip && profile)) {
        return (
            <div style={{ minHeight: "100vh", background: gradients.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20 }}>
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} style={{ width: 48, height: 48, border: "4px solid rgba(255,255,255,0.1)", borderTopColor: colors.green, borderRadius: "50%" }} />
                <div style={{ textAlign: "center" }}>
                    <p style={{ color: colors.white, fontFamily: fonts.heading, fontWeight: 700, fontSize: 20, marginBottom: 8 }}>Taking you to checkout...</p>
                    <p style={{ color: "rgba(255,255,255,0.6)", fontFamily: fonts.body, fontSize: 14 }}>Preparing your secure VIP checkout</p>
                </div>
            </div>
        )
    }

    // ── Not logged in: show auth form + offer ──
    return (
        <div
            style={{
                minHeight: "100vh",
                background: gradients.bg,
                fontFamily: fonts.heading,
                overflowX: "hidden",
                position: "relative",
            }}
        >
            {/* Background blobs */}
            <div style={{ position: "fixed", top: -100, left: -100, width: 500, height: 500, background: "rgba(4,218,141,0.07)", borderRadius: "50%", filter: "blur(120px)", pointerEvents: "none" }} />
            <div style={{ position: "fixed", bottom: -150, right: -100, width: 600, height: 600, background: "rgba(0,133,255,0.06)", borderRadius: "50%", filter: "blur(150px)", pointerEvents: "none" }} />

            <div
                style={{
                    maxWidth: 1000,
                    margin: "0 auto",
                    padding: "60px 24px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 48,
                    position: "relative",
                    zIndex: 1,
                }}
            >
                {/* Header */}
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} style={{ textAlign: "center" }}>
                    <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 2, repeat: Infinity }} style={{ fontSize: 72, marginBottom: 16 }}>
                        👑
                    </motion.div>
                    <h1 style={{ fontFamily: fonts.heading, fontSize: "clamp(30px, 5vw, 52px)", fontWeight: 900, color: colors.white, marginBottom: 12, lineHeight: 1.15 }}>
                        You've Been Invited to<br />Join PawMe VIP
                    </h1>
                    <p style={{ fontFamily: fonts.heading, fontSize: "clamp(18px, 3vw, 26px)", fontWeight: 800, background: gradients.primary, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: 8 }}>
                        Lock in 50% OFF — for just $1 · 100% Refundable
                    </p>
                    <p style={{ color: "rgba(255,255,255,0.55)", fontFamily: fonts.body, fontSize: 15 }}>
                        Sign in or create your account below to claim your exclusive VIP spot
                    </p>
                </motion.div>

                {/* Two-column layout: benefits + auth form */}
                <div
                    style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 40,
                        alignItems: "flex-start",
                        justifyContent: "center",
                        width: "100%",
                    }}
                >
                    {/* Benefits card */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 }}
                        style={{
                            flex: "1 1 360px",
                            maxWidth: 460,
                            background: "rgba(255,255,255,0.06)",
                            backdropFilter: "blur(20px)",
                            borderRadius: 28,
                            padding: "36px 32px",
                            border: "1px solid rgba(255,255,255,0.1)",
                            boxShadow: "0 25px 60px rgba(0,0,0,0.25)",
                        }}
                    >
                        <p style={{ fontFamily: fonts.body, fontSize: 17, color: "rgba(255,255,255,0.85)", marginBottom: 24, lineHeight: 1.6 }}>
                            As a <strong style={{ color: colors.neonGreen }}>VIP Member</strong>, you get exclusive perks that regular waitlist members don't:
                        </p>
                        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                            {benefits.map((benefit, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.4 + i * 0.1 }}
                                    style={{ display: "flex", alignItems: "flex-start", gap: 14, padding: "12px 16px", background: "rgba(4,218,141,0.08)", borderRadius: 12, border: "1px solid rgba(4,218,141,0.15)" }}
                                >
                                    <span style={{ fontSize: 22, flexShrink: 0 }}>{benefit.emoji}</span>
                                    <div>
                                        <span style={{ color: colors.white, fontWeight: 700, fontSize: 15 }}>{benefit.text}</span>
                                        <span style={{ color: colors.neonGreen, fontWeight: 600, fontSize: 13, marginLeft: 8 }}>— {benefit.detail}</span>
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        {/* Scarcity badge */}
                        <motion.div
                            animate={{ opacity: [0.7, 1, 0.7] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(255,100,100,0.12)", padding: "12px 20px", borderRadius: 50, marginTop: 24, border: "1px solid rgba(255,100,100,0.25)" }}
                        >
                            <span style={{ width: 8, height: 8, background: "#FF6B6B", borderRadius: "50%", flexShrink: 0 }} />
                            <span style={{ color: "#FF8888", fontWeight: 700, fontSize: 14 }}>Limited VIP spots available — claim yours now</span>
                        </motion.div>

                        {/* Trust badges */}
                        <div style={{ display: "flex", justifyContent: "center", gap: 20, marginTop: 24, flexWrap: "wrap" }}>
                            {["🔒 Secure Checkout", "💳 Stripe Powered", "↩️ 100% Refundable"].map((badge, i) => (
                                <span key={i} style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, fontWeight: 600 }}>{badge}</span>
                            ))}
                        </div>
                    </motion.div>

                    {/* Auth form */}
                    <div style={{ flex: "1 1 360px", maxWidth: 460, display: "flex", justifyContent: "center" }}>
                        <VipAuthForm onAuthSuccess={handleAuthSuccess} />
                    </div>
                </div>

                {/* Footer */}
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8 }}
                    style={{ color: "rgba(255,255,255,0.3)", fontFamily: fonts.body, fontSize: 13, textAlign: "center" }}
                >
                    🐾 PawMe · The AI companion that moves with your pet
                </motion.p>
            </div>
        </div>
    )
}
