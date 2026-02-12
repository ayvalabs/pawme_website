"use client"
import { motion, useInView, AnimatePresence } from "motion/react"
import { useState, useRef, useEffect } from "react"
import React from "react"
// ============================================================================
// DESIGN TOKENS
// ============================================================================
const colors = {
    green: "#04DA8D",
    neonGreen: "#00FF94",
    blue: "#0085FF",
    dark: "#0E1E2E",
    white: "#FFFFFF",
    offWhite: "#F8FAFC",
    cream: "#FFF8F0",
    purple: "#8E54E9",
    textMuted: "rgba(14, 30, 46, 0.6)",
}
const gradients = {
    primary: "linear-gradient(90deg, #04DA8D 0%, #0085FF 100%)",
    glowHero:
        "radial-gradient(ellipse at 80% 20%, rgba(4, 218, 141, 0.08) 0%, rgba(0, 133, 255, 0.05) 40%, transparent 70%)",
    washLight:
        "linear-gradient(135deg, rgba(4, 218, 141, 0.04) 0%, rgba(0, 133, 255, 0.06) 100%)",
    washMedium:
        "linear-gradient(135deg, rgba(4, 218, 141, 0.08) 0%, rgba(0, 133, 255, 0.12) 100%)",
    midCTA: "linear-gradient(135deg, #4F46E5 0%, #06B6D4 100%)",
}
const fonts = {
    heading: "'SF Pro Rounded', 'Nunito', sans-serif",
    body: "'Nunito', sans-serif",
}
// ============================================================================
// SVG DOODLES
// ============================================================================
const Squiggle = ({
    width = 200,
    thickness = 5,
}: {
    width?: number
    thickness?: number
}) => (
    <svg width={width} height="24" viewBox="0 0 200 24" fill="none">
        <motion.path
            d="M2 12C20 20 40 4 60 12C80 20 100 4 120 12C140 20 160 4 180 12C190 16 198 8 198 8"
            stroke={colors.green}
            strokeWidth={thickness}
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.2, ease: "easeInOut" }}
        />
    </svg>
)
const Star = ({
    size = 30,
    color = colors.purple,
    style,
}: {
    size?: number
    color?: string
    style?: React.CSSProperties
}) => (
    <motion.svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        fill="none"
        style={style}
        animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
        transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
    >
        <path
            d="M20 2L24 14L38 14L26 22L30 36L20 28L10 36L14 22L2 14L16 14L20 2Z"
            fill={color}
            opacity="0.15"
        />
        <path
            d="M20 2L24 14L38 14L26 22L30 36L20 28L10 36L14 22L2 14L16 14L20 2Z"
            stroke={color}
            strokeWidth="2"
        />
    </motion.svg>
)
const Arrow = () => (
    <svg width="50" height="50" viewBox="0 0 50 50" fill="none">
        <motion.path
            d="M10 10C15 25 30 15 40 35M40 35L28 32M40 35L37 23"
            stroke={colors.blue}
            strokeWidth="2.5"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1, ease: "easeInOut" }}
        />
    </svg>
)
// ============================================================================
// COMPONENTS
// ============================================================================
// Email validation helper
const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
}
function EmailPopup({
    isOpen,
    onClose,
    waitlistCount,
    onSubmitSuccess,
}: {
    isOpen: boolean
    onClose: () => void
    waitlistCount: string
    onSubmitSuccess: () => void
}) {
    const [firstName, setFirstName] = useState("")
    const [lastName, setLastName] = useState("")
    const [email, setEmail] = useState("")
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [errors, setErrors] = useState<{
        firstName?: string
        email?: string
    }>({})
    const validateForm = (): boolean => {
        const newErrors: { firstName?: string; email?: string } = {}
        if (!firstName.trim()) {
            newErrors.firstName = "First name is required"
        }
        if (!email.trim()) {
            newErrors.email = "Email is required"
        } else if (!isValidEmail(email)) {
            newErrors.email = "Please enter a valid email address"
        }
        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }
    const handleSubmit = () => {
        if (!validateForm()) return
        setIsSubmitting(true)
        // Simulate form submission - in production, this would send to backend
        setTimeout(() => {
            setIsSubmitting(false)
            onSubmitSuccess()
        }, 800)
    }
    // Clear errors when user starts typing
    const handleFirstNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFirstName(e.target.value)
        if (errors.firstName)
            setErrors((prev) => ({ ...prev, firstName: undefined }))
    }
    const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setEmail(e.target.value)
        if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }))
    }
    if (!isOpen) return null
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
                position: "fixed",
                inset: 0,
                background: "rgba(14,30,46,0.7)",
                backdropFilter: "blur(10px)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 2000,
                padding: 20,
            }}
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 50 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ type: "spring", damping: 25 }}
                onClick={(e) => e.stopPropagation()}
                style={{
                    background: colors.white,
                    borderRadius: 28,
                    padding: 48,
                    maxWidth: 440,
                    width: "100%",
                    textAlign: "center",
                    boxShadow: "0 25px 80px rgba(0,0,0,0.3)",
                }}
            >
                <div style={{ fontSize: 48, marginBottom: 20 }}>🐾</div>
                <h2
                    style={{
                        fontFamily: fonts.heading,
                        fontWeight: 900,
                        fontSize: 28,
                        color: colors.dark,
                        marginBottom: 8,
                    }}
                >
                    Reserve Your VIP Spot
                </h2>
                <p
                    style={{
                        fontFamily: fonts.body,
                        fontSize: 16,
                        color: colors.textMuted,
                        marginBottom: 28,
                    }}
                >
                    Get <strong style={{ color: colors.green }}>50% off</strong>{" "}
                    when PawMe launches on Kickstarter.
                </p>
                {/* First Name */}
                <div style={{ marginBottom: 12, textAlign: "left" }}>
                    <input
                        value={firstName}
                        onChange={handleFirstNameChange}
                        placeholder="First Name *"
                        style={{
                            width: "100%",
                            padding: 16,
                            borderRadius: 12,
                            border: errors.firstName
                                ? "2px solid #FF4444"
                                : "2px solid #EEE",
                            fontSize: 16,
                            outline: "none",
                            boxSizing: "border-box",
                        }}
                    />
                    {errors.firstName && (
                        <p
                            style={{
                                color: "#FF4444",
                                fontSize: 13,
                                marginTop: 4,
                                fontFamily: fonts.body,
                            }}
                        >
                            {errors.firstName}
                        </p>
                    )}
                </div>
                {/* Last Name */}
                <input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Last Name"
                    style={{
                        width: "100%",
                        padding: 16,
                        borderRadius: 12,
                        border: "2px solid #EEE",
                        marginBottom: 12,
                        fontSize: 16,
                        outline: "none",
                        boxSizing: "border-box",
                    }}
                />
                {/* Email */}
                <div style={{ marginBottom: 20, textAlign: "left" }}>
                    <input
                        value={email}
                        onChange={handleEmailChange}
                        type="email"
                        placeholder="Email Address *"
                        style={{
                            width: "100%",
                            padding: 16,
                            borderRadius: 12,
                            border: errors.email
                                ? "2px solid #FF4444"
                                : "2px solid #EEE",
                            fontSize: 16,
                            outline: "none",
                            boxSizing: "border-box",
                        }}
                    />
                    {errors.email && (
                        <p
                            style={{
                                color: "#FF4444",
                                fontSize: 13,
                                marginTop: 4,
                                fontFamily: fonts.body,
                            }}
                        >
                            {errors.email}
                        </p>
                    )}
                </div>
                <motion.button
                    onClick={handleSubmit}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    style={{
                        width: "100%",
                        padding: 18,
                        background: gradients.primary,
                        borderRadius: 50,
                        border: "none",
                        color: "white",
                        fontSize: 16,
                        fontWeight: 800,
                        cursor: "pointer",
                        opacity: isSubmitting ? 0.7 : 1,
                    }}
                    disabled={isSubmitting}
                >
                    {isSubmitting ? "RESERVING..." : "RESERVE MY SPOT →"}
                </motion.button>
                <p
                    style={{
                        fontFamily: fonts.body,
                        fontSize: 14,
                        color: colors.textMuted,
                        marginTop: 20,
                    }}
                >
                    Join {waitlistCount} VIPs who've already reserved.
                </p>
                <p
                    style={{
                        fontFamily: fonts.body,
                        fontSize: 12,
                        color: colors.textMuted,
                        marginTop: 8,
                    }}
                >
                    🔒 No spam. Unsubscribe anytime.
                </p>
            </motion.div>
        </motion.div>
    )
}
// ============================================================================
// VIP UPGRADE PAGE - Shows after form submission
// ============================================================================
function VIPUpgradePage({
    vipSpotsRemaining,
    stripeCheckoutUrl,
    onSkip,
}: {
    vipSpotsRemaining: string
    stripeCheckoutUrl: string
    onSkip: () => void
}) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
                minHeight: "100vh",
                background: `linear-gradient(135deg, ${colors.dark} 0%, #1a3a5c 50%, ${colors.dark} 100%)`,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "60px 24px",
                position: "relative",
                overflow: "hidden",
            }}
        >
            {/* Background decorative elements */}
            <div
                style={{
                    position: "absolute",
                    top: -100,
                    left: -100,
                    width: 400,
                    height: 400,
                    background: "rgba(4,218,141,0.1)",
                    borderRadius: "50%",
                    filter: "blur(120px)",
                }}
            />
            <div
                style={{
                    position: "absolute",
                    bottom: -150,
                    right: -100,
                    width: 500,
                    height: 500,
                    background: "rgba(0,133,255,0.08)",
                    borderRadius: "50%",
                    filter: "blur(150px)",
                }}
            />
            <div
                style={{
                    position: "absolute",
                    top: "30%",
                    right: "10%",
                    width: 200,
                    height: 200,
                    background: "rgba(142,84,233,0.06)",
                    borderRadius: "50%",
                    filter: "blur(80px)",
                }}
            />
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                style={{
                    maxWidth: 600,
                    width: "100%",
                    textAlign: "center",
                    position: "relative",
                    zIndex: 1,
                }}
            >
                {/* Success Badge */}
                <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    style={{ fontSize: 72, marginBottom: 24 }}
                >
                    🎉
                </motion.div>
                {/* Main Headline */}
                <h1
                    style={{
                        fontFamily: fonts.heading,
                        fontSize: "clamp(32px, 5vw, 48px)",
                        fontWeight: 900,
                        color: colors.white,
                        marginBottom: 12,
                        lineHeight: 1.2,
                    }}
                >
                    You're In! But Don't Leave Yet...
                </h1>
                {/* Sub-headline */}
                <p
                    style={{
                        fontFamily: fonts.heading,
                        fontSize: "clamp(20px, 3vw, 28px)",
                        fontWeight: 800,
                        background: gradients.primary,
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        marginBottom: 40,
                    }}
                >
                    Lock in 50% OFF before anyone else — for just $1
                </p>
                {/* Benefits Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    style={{
                        background: "rgba(255,255,255,0.08)",
                        backdropFilter: "blur(20px)",
                        borderRadius: 28,
                        padding: "40px 36px",
                        marginBottom: 32,
                        border: "1px solid rgba(255,255,255,0.1)",
                        boxShadow: "0 25px 60px rgba(0,0,0,0.3)",
                    }}
                >
                    <p
                        style={{
                            fontFamily: fonts.body,
                            fontSize: 18,
                            color: "rgba(255,255,255,0.9)",
                            marginBottom: 28,
                            lineHeight: 1.6,
                        }}
                    >
                        As a{" "}
                        <strong style={{ color: colors.neonGreen }}>
                            VIP Member
                        </strong>
                        , you get exclusive perks that regular waitlist members
                        don't:
                    </p>
                    <div style={{ textAlign: "left" }}>
                        {[
                            {
                                emoji: "💰",
                                text: "Guaranteed 50% discount",
                                detail: "$299 → $149",
                            },
                            {
                                emoji: "🚀",
                                text: "First access when we launch",
                                detail: "Before the public",
                            },
                            {
                                emoji: "🎁",
                                text: "Free charging dock",
                                detail: "$49 value included",
                            },
                            {
                                emoji: "📦",
                                text: "Priority shipping",
                                detail: "2 weeks before regular backers",
                            },
                            {
                                emoji: "✅",
                                text: "100% refundable",
                                detail: "Change your mind? No problem",
                            },
                        ].map((benefit, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.5 + i * 0.1 }}
                                style={{
                                    display: "flex",
                                    alignItems: "flex-start",
                                    gap: 16,
                                    marginBottom: 20,
                                    padding: "12px 16px",
                                    background: "rgba(4,218,141,0.08)",
                                    borderRadius: 12,
                                    border: "1px solid rgba(4,218,141,0.15)",
                                }}
                            >
                                <span style={{ fontSize: 24, flexShrink: 0 }}>
                                    {benefit.emoji}
                                </span>
                                <div>
                                    <span
                                        style={{
                                            color: colors.white,
                                            fontWeight: 700,
                                            fontSize: 16,
                                        }}
                                    >
                                        {benefit.text}
                                    </span>
                                    <span
                                        style={{
                                            color: colors.neonGreen,
                                            fontWeight: 600,
                                            fontSize: 14,
                                            marginLeft: 8,
                                        }}
                                    >
                                        — {benefit.detail}
                                    </span>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>
                {/* Scarcity Alert */}
                <motion.div
                    animate={{ opacity: [0.7, 1, 0.7] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 10,
                        background: "rgba(255,100,100,0.15)",
                        padding: "12px 24px",
                        borderRadius: 50,
                        marginBottom: 32,
                        border: "1px solid rgba(255,100,100,0.3)",
                    }}
                >
                    <span
                        style={{
                            width: 10,
                            height: 10,
                            background: "#FF6B6B",
                            borderRadius: "50%",
                            animation: "pulse 1s infinite",
                        }}
                    />
                    <span
                        style={{
                            color: "#FF6B6B",
                            fontWeight: 800,
                            fontSize: 16,
                        }}
                    >
                        Only {vipSpotsRemaining} VIP spots remaining at this
                        price
                    </span>
                </motion.div>
                {/* Main CTA Button */}
                <motion.a
                    href={stripeCheckoutUrl || "#"}
                    whileHover={{
                        scale: 1.03,
                        boxShadow: "0 20px 60px rgba(4,218,141,0.4)",
                    }}
                    whileTap={{ scale: 0.98 }}
                    style={{
                        display: "block",
                        width: "100%",
                        padding: "24px 48px",
                        fontSize: 20,
                        fontWeight: 900,
                        background: gradients.primary,
                        color: colors.white,
                        borderRadius: 60,
                        border: "none",
                        cursor: "pointer",
                        textDecoration: "none",
                        textAlign: "center",
                        boxShadow: "0 15px 40px rgba(4,218,141,0.3)",
                        marginBottom: 20,
                    }}
                >
                    YES! Lock In My 50% Discount ($1) →
                </motion.a>
                {/* Price breakdown */}
                <p
                    style={{
                        fontFamily: fonts.body,
                        fontSize: 14,
                        color: "rgba(255,255,255,0.7)",
                        marginBottom: 32,
                    }}
                >
                    Just $1 today to reserve your spot. You'll pay the remaining
                    $148 when we ship.
                </p>
                {/* Skip link */}
                <motion.button
                    onClick={onSkip}
                    whileHover={{ opacity: 0.8 }}
                    style={{
                        background: "none",
                        border: "none",
                        color: "rgba(255,255,255,0.4)",
                        fontSize: 14,
                        fontFamily: fonts.body,
                        cursor: "pointer",
                        textDecoration: "underline",
                    }}
                >
                    No thanks, I'll take my chances with the regular waitlist →
                </motion.button>
                {/* Trust badges */}
                <div
                    style={{
                        display: "flex",
                        justifyContent: "center",
                        gap: 24,
                        marginTop: 40,
                        flexWrap: "wrap",
                    }}
                >
                    {[
                        "🔒 Secure Payment",
                        "💳 Stripe Powered",
                        "↩️ 100% Refundable",
                    ].map((badge, i) => (
                        <span
                            key={i}
                            style={{
                                color: "rgba(255,255,255,0.5)",
                                fontSize: 13,
                                fontWeight: 600,
                            }}
                        >
                            {badge}
                        </span>
                    ))}
                </div>
            </motion.div>
        </motion.div>
    )
}
function AnimatedSection({
    children,
    delay = 0,
}: {
    children: React.ReactNode
    delay?: number
}) {
    const ref = useRef(null)
    const isInView = useInView(ref, { once: true, margin: "-80px" })
    return (
        <motion.div
            ref={ref}
            initial={{ opacity: 0, y: 40 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, delay, ease: [0.4, 0, 0.2, 1] }}
        >
            {children}
        </motion.div>
    )
}
// ============================================================================
// MAIN COMPONENT
// ============================================================================
/**
 * PawMe Landing Page
 */
export default function PawMeLandingPage() {
    const heroHeadline = "Your Pet Camera Sits Still. Your Pet Doesn't."
    const heroSubheadline = "Meet the AI companion that moves with them."
    const ctaText = "GET EARLY ACCESS →"
    const waitlistCount = "847"
    const totalWaitlist = "2,847"
    const vipSpotsRemaining = "73"
    const stripeCheckoutUrl = ""
    const headlineSize = 80
    const subheadlineSize = 22
    const portraitSize = 200
    const problemHeadline = "Sound Familiar?"
    const problemCard1Title = "Where'd They Go?"
    const problemCard1Desc = "You check your camera and... empty room. Your pet wandered off. Again. Now you're refreshing the app hoping they come back."
    const problemCard2Title = "Are They Okay?"
    const problemCard2Desc = "That anxiety when you hear a crash but can't see what happened. Static cameras show you one room. Your pet lives in the whole house."
    const problemCard3Title = "Wasted Money"
    const problemCard3Desc = "You bought a pet camera to watch your pet. But most of the time, you're watching an empty couch. That's not monitoring — that's furniture surveillance."
    const problemClosingLine = "We built PawMe to fix this."
    const [popupOpen, setPopupOpen] = useState(false)
    const [showSticky, setShowSticky] = useState(false)
    const [showVIPUpgrade, setShowVIPUpgrade] = useState(false) // VIP upgrade page state
    const [isMobile, setIsMobile] = useState(false) // Mobile detection
    const heroRef = useRef<HTMLDivElement>(null)
    // Handle successful form submission - show VIP upgrade
    const handleFormSuccess = () => {
        setPopupOpen(false)
        setShowVIPUpgrade(true)
        // Push state so browser back button works
        if (typeof window !== "undefined") {
            window.history.pushState({ page: "vip" }, "", "#vip-upgrade")
            window.scrollTo({ top: 0, behavior: "smooth" })
        }
    }
    // Handle skip on VIP page - could redirect or show thank you
    const handleVIPSkip = () => {
        // Go back in history when skipping
        if (typeof window !== "undefined") {
            window.history.back()
        }
        setShowVIPUpgrade(false)
    }
    // Listen for browser back button (popstate)
    useEffect(() => {
        if (typeof window === "undefined") return
        const handlePopState = (event: PopStateEvent) => {
            // If we're on VIP page and user presses back, show landing page
            if (showVIPUpgrade) {
                setShowVIPUpgrade(false)
            }
        }
        window.addEventListener("popstate", handlePopState)
        return () => window.removeEventListener("popstate", handlePopState)
    }, [showVIPUpgrade])
    // Fonts
    useEffect(() => {
        if (typeof document === "undefined") return
        // Load Nunito from Google Fonts
        const link = document.createElement("link")
        link.href =
            "https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap"
        link.rel = "stylesheet"
        document.head.appendChild(link)
        // Load local SF Pro Rounded font
        const style = document.createElement("style")
        style.textContent = `
            @font-face {
                font-family: 'SF Pro Rounded';
                src: url('/lander/fonts/sf-pro-rounded.ttf') format('truetype');
                font-weight: 100 900;
                font-display: swap;
            }
            @font-face {
                font-family: 'SF Compact Rounded';
                src: url('/lander/fonts/sf-compact-rounded.ttf') format('truetype');
                font-weight: 400;
                font-display: swap;
            }
        `
        document.head.appendChild(style)
    }, [])
    // Mobile detection
    useEffect(() => {
        if (typeof window === "undefined") return
        const checkMobile = () => setIsMobile(window.innerWidth < 768)
        checkMobile() // Check on mount
        window.addEventListener("resize", checkMobile)
        return () => window.removeEventListener("resize", checkMobile)
    }, [])
    // Sticky header on scroll
    useEffect(() => {
        if (typeof window === "undefined") return
        const handleScroll = () =>
            setShowSticky(window.scrollY > window.innerHeight * 0.8)
        window.addEventListener("scroll", handleScroll, { passive: true })
        return () => window.removeEventListener("scroll", handleScroll)
    }, [])
    const openPopup = () => setPopupOpen(true)
    // ========== STYLES ==========
    const sectionStyle: React.CSSProperties = {
        padding: "100px 24px",
        maxWidth: 1200,
        margin: "0 auto",
        width: "100%",
    }
    // ========== CONDITIONAL RENDER: VIP UPGRADE PAGE ==========
    if (showVIPUpgrade) {
        return (
            <div
                style={{
                    fontFamily: fonts.heading,
                    color: colors.dark,
                    background: colors.white,
                    overflowX: "hidden",
                    width: "100%",
                }}
            >
                <VIPUpgradePage
                    vipSpotsRemaining={vipSpotsRemaining}
                    stripeCheckoutUrl={stripeCheckoutUrl}
                    onSkip={handleVIPSkip}
                />
            </div>
        )
    }
    return (
        <div
            style={{
                fontFamily: fonts.heading,
                color: colors.dark,
                background: colors.white,
                overflowX: "hidden",
                width: "100%",
            }}
        >
            <EmailPopup
                isOpen={popupOpen}
                onClose={() => setPopupOpen(false)}
                waitlistCount={waitlistCount}
                onSubmitSuccess={handleFormSuccess}
            />
            {/* STICKY HEADER */}
            <AnimatePresence>
                {showSticky && (
                    <motion.header
                        initial={{ y: -80 }}
                        animate={{ y: 0 }}
                        exit={{ y: -80 }}
                        style={{
                            position: "fixed",
                            top: 0,
                            left: 0,
                            right: 0,
                            background: "rgba(255,255,255,0.95)",
                            backdropFilter: "blur(20px)",
                            zIndex: 1000,
                            padding: "12px 24px",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            borderBottom: "1px solid rgba(0,0,0,0.05)",
                        }}
                    >
                        <div
                            style={{
                                fontWeight: 900,
                                fontSize: 22,
                                background: gradients.primary,
                                WebkitBackgroundClip: "text",
                                WebkitTextFillColor: "transparent",
                            }}
                        >
                            PawMe
                        </div>
                        <motion.button
                            onClick={openPopup}
                            whileHover={{ scale: 1.05 }}
                            style={{
                                background: gradients.primary,
                                color: "white",
                                padding: "12px 28px",
                                borderRadius: 50,
                                border: "none",
                                fontWeight: 700,
                                fontSize: 14,
                                cursor: "pointer",
                            }}
                        >
                            {ctaText}
                        </motion.button>
                    </motion.header>
                )}
            </AnimatePresence>
            {/* ========== SECTION 1: HERO (Centered + Large Bots) ========== */}
            <section
                ref={heroRef}
                style={{
                    minHeight: "100vh",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "flex-start",
                    padding: "80px 24px 40px",
                    background: gradients.glowHero,
                    position: "relative",
                    textAlign: "center",
                    overflow: "hidden",
                }}
            >
                {/* Background Gradient Orbs for depth */}
                <div
                    style={{
                        position: "absolute",
                        top: "5%",
                        left: "10%",
                        width: 400,
                        height: 400,
                        background:
                            "radial-gradient(circle, rgba(4,218,141,0.15) 0%, transparent 70%)",
                        borderRadius: "50%",
                        filter: "blur(60px)",
                        pointerEvents: "none",
                    }}
                />
                <div
                    style={{
                        position: "absolute",
                        bottom: "10%",
                        right: "5%",
                        width: 350,
                        height: 350,
                        background:
                            "radial-gradient(circle, rgba(0,133,255,0.12) 0%, transparent 70%)",
                        borderRadius: "50%",
                        filter: "blur(50px)",
                        pointerEvents: "none",
                    }}
                />
                <div
                    style={{
                        position: "absolute",
                        top: "40%",
                        right: "20%",
                        width: 250,
                        height: 250,
                        background:
                            "radial-gradient(circle, rgba(168,85,247,0.1) 0%, transparent 70%)",
                        borderRadius: "50%",
                        filter: "blur(40px)",
                        pointerEvents: "none",
                    }}
                />
                {/* Subtle Grid Overlay */}
                <div
                    style={{
                        position: "absolute",
                        inset: 0,
                        backgroundImage: `linear-gradient(rgba(0,0,0,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.02) 1px, transparent 1px)`,
                        backgroundSize: "60px 60px",
                        pointerEvents: "none",
                        zIndex: 1,
                    }}
                />
                {/* Large PawMe Bot - LEFT SIDE - Smaller on mobile */}
                <motion.img
                    src="/lander/bot-hero.png"
                    alt="PawMe Bot Left"
                        initial={{ opacity: 0, x: -100 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.8, delay: 0.3 }}
                    style={{
                        position: "absolute",
                        left: isMobile ? -20 : 0,
                        bottom: isMobile ? "2%" : "10%",
                        height: isMobile ? "22%" : "55%",
                        width: "auto",
                        objectFit: "contain",
                        zIndex: 2,
                        pointerEvents: "none",
                        opacity: isMobile ? 0.85 : 1,
                    }}
                />
                {/* Large PawMe Bot - RIGHT SIDE - Smaller on mobile */}
                <motion.img
                    src="/lander/bot-hero.png"
                    alt="PawMe Bot Right"
                        initial={{ opacity: 0, x: 100 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.8, delay: 0.4 }}
                    style={{
                        position: "absolute",
                        right: isMobile ? -20 : 0,
                        bottom: isMobile ? "2%" : "10%",
                        height: isMobile ? "22%" : "55%",
                        width: "auto",
                        objectFit: "contain",
                        transform: "scaleX(-1)",
                        zIndex: 2,
                        pointerEvents: "none",
                        opacity: isMobile ? 0.85 : 1,
                    }}
                />
                {/* Doodles - Hidden on mobile to avoid text overlap */}
                {!isMobile && (
                    <>
                        <Star
                            size={45}
                            style={{
                                position: "absolute",
                                top: "8%",
                                left: "25%",
                                zIndex: 5,
                            }}
                        />
                        <Star
                            size={32}
                            color={colors.blue}
                            style={{
                                position: "absolute",
                                top: "12%",
                                right: "25%",
                                zIndex: 5,
                            }}
                        />
                    </>
                )}
                {/* Pre-headline */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    style={{ zIndex: 10 }}
                >
                    <div
                        style={{
                            textTransform: "uppercase",
                            letterSpacing: "0.2em",
                            fontWeight: 800,
                            fontSize: 13,
                            background: gradients.primary,
                            WebkitBackgroundClip: "text",
                            WebkitTextFillColor: "transparent",
                            marginBottom: 12,
                        }}
                    >
                        Coming to Kickstarter
                    </div>
                </motion.div>
                {/* Main Headline - with squiggle on "Your pet" */}
                <motion.h1
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.1 }}
                    style={{
                        fontSize: `clamp(42px, 7vw, ${headlineSize}px)`,
                        fontWeight: 900,
                        lineHeight: 1,
                        marginBottom: 16,
                        letterSpacing: "-0.03em",
                        maxWidth: 900,
                        zIndex: 10,
                    }}
                >
                    <span
                        style={{
                            position: "relative",
                            display: "inline-block",
                        }}
                    >
                        Your pet
                        <div
                            style={{
                                position: "absolute",
                                bottom: -14,
                                left: "50%",
                                transform: "translateX(-50%)",
                                width: "120%",
                            }}
                        >
                            <Squiggle width={260} thickness={6} />
                        </div>
                    </span>{" "}
                    camera sits still.
                    <br />
                    Your pet doesn't.
                </motion.h1>
                {/* Subheadline - with "Meet the AI companion" highlighted */}
                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 }}
                    style={{
                        fontSize: `clamp(18px, 2vw, ${subheadlineSize}px)`,
                        color: colors.textMuted,
                        marginBottom: 28,
                        lineHeight: 1.5,
                        fontFamily: fonts.body,
                        maxWidth: 500,
                        zIndex: 10,
                    }}
                >
                    <strong style={{ color: colors.dark, fontWeight: 700 }}>
                        Meet the AI companion
                    </strong>{" "}
                    that moves with them.
                </motion.p>
                {/* CTA Button - INSTANT Hover Animation */}
                <motion.button
                    onClick={openPopup}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35 }}
                    whileHover={{
                        scale: 1.08,
                        boxShadow:
                            "0 0 60px rgba(4,218,141,0.5), 0 0 100px rgba(0,133,255,0.3)",
                        y: -4,
                        transition: { duration: 0.1 },
                    }}
                    whileTap={{ scale: 0.98, transition: { duration: 0.05 } }}
                    style={{
                        padding: "22px 56px",
                        fontSize: 18,
                        fontWeight: 800,
                        background: gradients.primary,
                        borderRadius: 60,
                        border: "none",
                        color: "white",
                        cursor: "pointer",
                        boxShadow: "0 10px 40px rgba(4,218,141,0.35)",
                        position: "relative",
                        overflow: "hidden",
                        zIndex: 10,
                    }}
                >
                    {ctaText}
                </motion.button>
                {/* VIP Teaser */}
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.55 }}
                    style={{
                        fontSize: 15,
                        color: colors.textMuted,
                        marginTop: 20,
                        fontFamily: fonts.body,
                        zIndex: 10,
                    }}
                >
                    Join{" "}
                    <strong style={{ color: colors.green }}>
                        {waitlistCount} VIPs
                    </strong>{" "}
                    who've already reserved. Get 50% off at launch.
                </motion.p>
                {/* Polaroid Portraits - With Custom Image Support */}
                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4, duration: 0.6 }}
                    style={{
                        display: "grid",
                        gridTemplateColumns: isMobile
                            ? "repeat(2, 1fr)"
                            : "repeat(4, auto)",
                        justifyContent: "center",
                        justifyItems: "center",
                        gap: isMobile ? 12 : 24,
                        marginTop: 32,
                        position: "relative",
                        zIndex: 10,
                        maxWidth: isMobile ? 320 : "none",
                        margin: isMobile ? "32px auto 0" : "32px 0 0",
                    }}
                >
                    {(() => {
                        const mobileSize = 130
                        const actualSize = isMobile ? mobileSize : portraitSize
                        return [
                            { rot: -6, emoji: "🐕", image: "/lander/portrait-dog-golden.png" },
                            { rot: 4, emoji: "🐈", image: "/lander/portrait-cat.png" },
                            { rot: -4, emoji: "🐾", image: "/lander/portrait-dog-white.png" },
                            { rot: 5, emoji: "🤖", image: "/lander/portrait-corgi.png" },
                        ].map((frame, i) => (
                            <motion.div
                                key={i}
                                initial={{
                                    opacity: 0,
                                    y: 20,
                                    rotate: frame.rot,
                                }}
                                animate={{
                                    opacity: 1,
                                    y: 0,
                                    rotate: frame.rot,
                                }}
                                transition={{
                                    delay: 0.5 + i * 0.08,
                                    duration: 0.4,
                                }}
                                whileHover={{
                                    rotate: 0,
                                    scale: 1.1,
                                    zIndex: 10,
                                    transition: { duration: 0.1 },
                                }}
                                style={{
                                    background: "white",
                                    padding: `${actualSize * 0.08}px ${actualSize * 0.08}px ${actualSize * 0.16}px`,
                                    boxShadow: "0 15px 40px rgba(0,0,0,0.15)",
                                    width: actualSize,
                                    cursor: "pointer",
                                }}
                            >
                                <img
                                    src={frame.image}
                                    alt="Pet portrait"
                                    style={{
                                        width: "100%",
                                        aspectRatio: "1",
                                        objectFit: "cover",
                                        borderRadius: 6,
                                    }}
                                />
                            </motion.div>
                        ))
                    })()}
                </motion.div>
            </section>
            {/* ========== SECTION 2: SOCIAL PROOF MARQUEE ========== */}
            <div
                style={{
                    background: colors.dark,
                    padding: "24px 0",
                    overflow: "hidden",
                    transform: "rotate(-1deg) scale(1.02)",
                }}
            >
                <motion.div
                    animate={{ x: ["0%", "-50%"] }}
                    transition={{
                        duration: 20,
                        repeat: Infinity,
                        ease: "linear",
                    }}
                    style={{ display: "flex", gap: 60, whiteSpace: "nowrap" }}
                >
                    {[...Array(16)].map((_, i) => (
                        <span
                            key={i}
                            style={{
                                fontSize: 18,
                                fontWeight: 700,
                                color: "white",
                                opacity: 0.9,
                            }}
                        >
                            🐾 Trusted by {totalWaitlist}+ pet parents
                        </span>
                    ))}
                </motion.div>
            </div>
            {/* ========== SECTION 3: PROBLEM (FULL WIDTH) ========== */}
            <section
                style={{
                    background: colors.offWhite,
                    padding: "80px 0 60px",
                    width: "100%",
                }}
            >
                <div
                    style={{
                        maxWidth: 1200,
                        margin: "0 auto",
                        padding: "0 24px",
                    }}
                >
                    <AnimatedSection>
                        <h2
                            style={{
                                fontSize: "clamp(40px, 5vw, 56px)",
                                fontWeight: 900,
                                textAlign: "center",
                                marginBottom: 48,
                            }}
                        >
                            {problemHeadline}
                        </h2>
                    </AnimatedSection>
                    <div
                        style={{
                            display: "flex",
                            flexWrap: "wrap",
                            justifyContent: "center",
                            gap: 32,
                            alignItems: "stretch",
                        }}
                    >
                        {[
                            {
                                emoji: "🔍",
                                title: problemCard1Title,
                                desc: problemCard1Desc,
                            },
                            {
                                emoji: "😰",
                                title: problemCard2Title,
                                desc: problemCard2Desc,
                            },
                            {
                                emoji: "💸",
                                title: problemCard3Title,
                                desc: problemCard3Desc,
                            },
                        ].map((card, i) => (
                            <AnimatedSection key={i} delay={i * 0.15}>
                                <motion.div
                                    whileHover={{
                                        y: -10,
                                        boxShadow:
                                            "0 25px 60px rgba(4,218,141,0.15), 0 15px 40px rgba(0,0,0,0.1)",
                                    }}
                                    style={{
                                        background: colors.white,
                                        padding: 40,
                                        borderRadius: 24,
                                        width: 340,
                                        height: "100%",
                                        display: "flex",
                                        flexDirection: "column",
                                        boxShadow:
                                            "0 8px 32px rgba(0,0,0,0.06)",
                                        position: "relative",
                                        overflow: "hidden",
                                        border: "1px solid rgba(4,218,141,0.1)",
                                    }}
                                >
                                    {/* Gradient glow accent */}
                                    <div
                                        style={{
                                            position: "absolute",
                                            top: 0,
                                            left: 0,
                                            right: 0,
                                            height: 4,
                                            background: gradients.primary,
                                        }}
                                    />
                                    <div
                                        style={{
                                            fontSize: 56,
                                            marginBottom: 24,
                                        }}
                                    >
                                        {card.emoji}
                                    </div>
                                    <h3
                                        style={{
                                            fontSize: 26,
                                            fontWeight: 800,
                                            marginBottom: 14,
                                        }}
                                    >
                                        {card.title}
                                    </h3>
                                    <p
                                        style={{
                                            fontSize: 16,
                                            lineHeight: 1.7,
                                            color: colors.textMuted,
                                            fontFamily: fonts.body,
                                            flex: 1,
                                        }}
                                    >
                                        {card.desc}
                                    </p>
                                </motion.div>
                            </AnimatedSection>
                        ))}
                    </div>
                    {/* Closing line - TRIPLE SIZE like section headline with depth */}
                    <AnimatedSection delay={0.5}>
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: 20,
                                marginTop: 48,
                            }}
                        >
                                <motion.img
                                    src="/lander/bot-hero.png"
                                    alt="PawMe Bot"
                                    style={{
                                        width: 80,
                                        height: 80,
                                        borderRadius: "50%",
                                        objectFit: "cover",
                                        border: `4px solid ${colors.green}`,
                                        boxShadow:
                                            "0 8px 24px rgba(4,218,141,0.3)",
                                    }}
                                    animate={{
                                        rotate: [0, 5, -5, 0],
                                        scale: [1, 1.05, 1],
                                    }}
                                    transition={{
                                        repeat: Infinity,
                                        duration: 3,
                                        ease: "easeInOut",
                                    }}
                                />
                            <h2
                                style={{
                                    fontSize: "clamp(40px, 5vw, 56px)",
                                    fontWeight: 900,
                                    background: gradients.primary,
                                    WebkitBackgroundClip: "text",
                                    WebkitTextFillColor: "transparent",
                                    textShadow:
                                        "0 4px 20px rgba(4,218,141,0.2)",
                                }}
                            >
                                {problemClosingLine}
                            </h2>
                        </div>
                    </AnimatedSection>
                </div>
            </section>
            {/* ========== SECTION 4: SOLUTION - PREMIUM REDESIGN ========== */}
            <section
                style={{
                    background: colors.white,
                    padding: "60px 24px 40px",
                    width: "100%",
                }}
            >
                <div style={{ maxWidth: 1200, margin: "0 auto" }}>
                    <AnimatedSection>
                        <h2
                            style={{
                                fontSize: "clamp(40px, 5vw, 60px)",
                                fontWeight: 900,
                                textAlign: "center",
                                marginBottom: 20,
                                lineHeight: 1.1,
                            }}
                        >
                            Meet{" "}
                            <span
                                style={{
                                    background: gradients.primary,
                                    WebkitBackgroundClip: "text",
                                    WebkitTextFillColor: "transparent",
                                }}
                            >
                                PawMe
                            </span>
                        </h2>
                        <p
                            style={{
                                fontSize: "clamp(18px, 2vw, 24px)",
                                textAlign: "center",
                                color: colors.textMuted,
                                maxWidth: 600,
                                margin: "0 auto 48px",
                                fontFamily: fonts.body,
                            }}
                        >
                            The pet camera that actually follows your pet
                        </p>
                    </AnimatedSection>
                    <div
                        style={{
                            display: "flex",
                            flexWrap: "wrap",
                            alignItems: "center",
                            gap: 48,
                        }}
                    >
                        {/* Feature Cards - Left Side */}
                        <div
                            style={{
                                flex: "1 1 480px",
                                display: "flex",
                                flexDirection: "column",
                                gap: 20,
                            }}
                        >
                            {[
                                {
                                    icon: "🤖",
                                    title: "AI Tracks Room-to-Room",
                                    desc: "Computer vision locks onto your pet and follows them automatically. No manual control needed.",
                                },
                                {
                                    icon: "🎤",
                                    title: "Talk to Your Pet Anytime",
                                    desc: "Two-way audio lets you comfort, command, or just say hi from anywhere in the world.",
                                },
                                {
                                    icon: "🌙",
                                    title: "Crystal Clear, Day or Night",
                                    desc: "Advanced night vision means you never miss a moment, even in complete darkness.",
                                },
                            ].map((feature, i) => (
                                <AnimatedSection key={i} delay={0.1 + i * 0.1}>
                                    <motion.div
                                        whileHover={{
                                            x: 8,
                                            boxShadow:
                                                "0 20px 50px rgba(4,218,141,0.12)",
                                        }}
                                        style={{
                                            background: colors.white,
                                            padding: "28px 32px",
                                            borderRadius: 20,
                                            display: "flex",
                                            gap: 20,
                                            alignItems: "flex-start",
                                            border: "1px solid rgba(0,0,0,0.06)",
                                            boxShadow:
                                                "0 4px 20px rgba(0,0,0,0.04)",
                                            position: "relative",
                                            overflow: "hidden",
                                        }}
                                    >
                                        {/* Gradient left border */}
                                        <div
                                            style={{
                                                position: "absolute",
                                                left: 0,
                                                top: 0,
                                                bottom: 0,
                                                width: 4,
                                                background: gradients.primary,
                                                borderRadius: "20px 0 0 20px",
                                            }}
                                        />
                                        <div
                                            style={{
                                                width: 56,
                                                height: 56,
                                                borderRadius: 16,
                                                background:
                                                    "linear-gradient(135deg, rgba(4,218,141,0.1), rgba(0,133,255,0.1))",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                fontSize: 28,
                                                flexShrink: 0,
                                            }}
                                        >
                                            {feature.icon}
                                        </div>
                                        <div>
                                            <h4
                                                style={{
                                                    fontSize: 20,
                                                    fontWeight: 800,
                                                    marginBottom: 8,
                                                }}
                                            >
                                                {feature.title}
                                            </h4>
                                            <p
                                                style={{
                                                    fontSize: 15,
                                                    lineHeight: 1.6,
                                                    color: colors.textMuted,
                                                    fontFamily: fonts.body,
                                                    margin: 0,
                                                }}
                                            >
                                                {feature.desc}
                                            </p>
                                        </div>
                                    </motion.div>
                                </AnimatedSection>
                            ))}
                        </div>
                        {/* Video/Media - Right Side - TALLER FOR REELS */}
                        <AnimatedSection delay={0.2}>
                            <motion.div
                                whileHover={{ scale: 1.02, rotate: 0 }}
                                style={{
                                    flex: "1 1 400px",
                                    minWidth: 320,
                                    height: 520,
                                    background: gradients.washLight,
                                    borderRadius: 32,
                                    boxShadow:
                                        "0 25px 60px rgba(0,0,0,0.1), 0 10px 30px rgba(4,218,141,0.08)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    overflow: "hidden",
                                    transform: "rotate(2deg)",
                                    border: "4px solid white",
                                    position: "relative",
                                }}
                            >
                                <video
                                    src="/lander/pawme-demo.mp4"
                                    autoPlay
                                    loop
                                    muted
                                    playsInline
                                    style={{
                                        width: "100%",
                                        height: "100%",
                                        objectFit: "cover",
                                    }}
                                />
                                {/* Floating badge */}
                                <motion.div
                                    animate={{ y: [0, -8, 0] }}
                                    transition={{
                                        duration: 2,
                                        repeat: Infinity,
                                        ease: "easeInOut",
                                    }}
                                    style={{
                                        position: "absolute",
                                        bottom: -20,
                                        right: -10,
                                        background: gradients.primary,
                                        color: "white",
                                        padding: "12px 24px",
                                        borderRadius: 50,
                                        fontWeight: 800,
                                        fontSize: 14,
                                        boxShadow:
                                            "0 8px 24px rgba(4,218,141,0.4)",
                                    }}
                                >
                                    ✨ AI-Powered
                                </motion.div>
                            </motion.div>
                        </AnimatedSection>
                    </div>
                    {/* Get Early Access CTA Card - Centered below features */}
                    <AnimatedSection delay={0.4}>
                        <motion.div
                            whileHover={{
                                y: -5,
                                boxShadow: "0 30px 80px rgba(4,218,141,0.15)",
                            }}
                            style={{
                                maxWidth: 500,
                                margin: "60px auto 0",
                                background: colors.white,
                                borderRadius: 32,
                                padding: "48px",
                                textAlign: "center",
                                border: "2px solid rgba(4,218,141,0.15)",
                                boxShadow: "0 15px 50px rgba(0,0,0,0.08)",
                            }}
                        >
                            <motion.div
                                animate={{ scale: [1, 1.1, 1] }}
                                transition={{ duration: 2, repeat: Infinity }}
                                style={{ fontSize: 40, marginBottom: 16 }}
                            >
                                🎉
                            </motion.div>
                            <h3
                                style={{
                                    fontSize: "clamp(24px, 3vw, 32px)",
                                    fontWeight: 900,
                                    marginBottom: 8,
                                    lineHeight: 1.2,
                                }}
                            >
                                Get Early Access
                            </h3>
                            <p
                                style={{
                                    fontSize: 16,
                                    color: colors.textMuted,
                                    marginBottom: 24,
                                    fontFamily: fonts.body,
                                }}
                            >
                                Be first to know when we launch + unlock your
                                VIP discount
                            </p>
                            <motion.button
                                onClick={openPopup}
                                whileHover={{
                                    scale: 1.05,
                                    boxShadow:
                                        "0 15px 40px rgba(4,218,141,0.3)",
                                }}
                                whileTap={{ scale: 0.98 }}
                                style={{
                                    padding: "20px 48px",
                                    fontSize: 17,
                                    fontWeight: 800,
                                    background: gradients.primary,
                                    color: "white",
                                    borderRadius: 60,
                                    border: "none",
                                    cursor: "pointer",
                                    boxShadow:
                                        "0 10px 30px rgba(4,218,141,0.25)",
                                    display: "block",
                                    margin: "0 auto 20px",
                                }}
                            >
                                RESERVE MY SPOT →
                            </motion.button>
                            <motion.div
                                animate={{ opacity: [0.7, 1, 0.7] }}
                                transition={{ duration: 2, repeat: Infinity }}
                                style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "center",
                                    gap: 6,
                                }}
                            >
                                <span
                                    style={{
                                        width: 8,
                                        height: 8,
                                        background: colors.green,
                                        borderRadius: "50%",
                                    }}
                                />
                                <span
                                    style={{
                                        color: colors.green,
                                        fontWeight: 800,
                                        fontSize: 14,
                                    }}
                                >
                                    Only {vipSpotsRemaining} VIP spots remain at
                                    50% off
                                </span>
                            </motion.div>
                        </motion.div>
                    </AnimatedSection>
                </div>
            </section>
            {/* ========== SECTION 5: FEATURES - WITH DEPTH ========== */}
            <section
                style={{
                    background: gradients.washLight,
                    padding: "60px 24px",
                    position: "relative",
                }}
            >
                {/* Background blur elements for depth */}
                <div
                    style={{
                        position: "absolute",
                        top: 40,
                        left: "10%",
                        width: 200,
                        height: 200,
                        background: "rgba(4,218,141,0.08)",
                        borderRadius: "50%",
                        filter: "blur(80px)",
                    }}
                />
                <div
                    style={{
                        position: "absolute",
                        bottom: 40,
                        right: "15%",
                        width: 250,
                        height: 250,
                        background: "rgba(0,133,255,0.06)",
                        borderRadius: "50%",
                        filter: "blur(100px)",
                    }}
                />
                <div
                    style={{
                        maxWidth: 1200,
                        margin: "0 auto",
                        position: "relative",
                        zIndex: 1,
                    }}
                >
                    <AnimatedSection>
                        <h2
                            style={{
                                fontSize: "clamp(32px, 4vw, 48px)",
                                fontWeight: 900,
                                textAlign: "center",
                                marginBottom: 48,
                            }}
                        >
                            Everything You Need to Stay Connected
                        </h2>
                    </AnimatedSection>
                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns:
                                "repeat(auto-fit, minmax(300px, 1fr))",
                            gap: 24,
                        }}
                    >
                        {[
                            {
                                emoji: "🚗",
                                title: "Autonomous Navigation",
                                desc: "PawMe maps your home and navigates obstacles automatically. No manual control needed.",
                            },
                            {
                                emoji: "🎯",
                                title: "AI Pet Tracking",
                                desc: "Computer vision locks onto your pet and follows them room-to-room.",
                            },
                            {
                                emoji: "📱",
                                title: "App Control",
                                desc: "Check in anytime from your phone. Live video, two-way audio, treat dispensing.",
                            },
                            {
                                emoji: "🌙",
                                title: "Night Vision",
                                desc: "Crystal clear video even in complete darkness. See what they're up to at 3am.",
                            },
                            {
                                emoji: "🔋",
                                title: "Auto-Charging",
                                desc: "PawMe returns to its dock when battery is low. Always ready when you need it.",
                            },
                            {
                                emoji: "🛡️",
                                title: "Pet-Safe Design",
                                desc: "Rounded edges, quiet motors, and gentle movement. Designed around curious pets.",
                            },
                        ].map((card, i) => (
                            <AnimatedSection key={i} delay={i * 0.08}>
                                <motion.div
                                    whileHover={{
                                        y: -8,
                                        boxShadow:
                                            "0 20px 50px rgba(4,218,141,0.12)",
                                    }}
                                    style={{
                                        background: colors.white,
                                        padding: 32,
                                        borderRadius: 24,
                                        border: "1px solid rgba(4,218,141,0.1)",
                                        boxShadow:
                                            "0 8px 32px rgba(0,0,0,0.06)",
                                        position: "relative",
                                        overflow: "hidden",
                                    }}
                                >
                                    {/* Top gradient accent */}
                                    <div
                                        style={{
                                            position: "absolute",
                                            top: 0,
                                            left: 0,
                                            right: 0,
                                            height: 3,
                                            background: gradients.primary,
                                        }}
                                    />
                                    <div
                                        style={{
                                            width: 60,
                                            height: 60,
                                            borderRadius: 16,
                                            background:
                                                "linear-gradient(135deg, rgba(4,218,141,0.15), rgba(0,133,255,0.1))",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            fontSize: 28,
                                            marginBottom: 20,
                                        }}
                                    >
                                        {card.emoji}
                                    </div>
                                    <h3
                                        style={{
                                            fontSize: 20,
                                            fontWeight: 800,
                                            marginBottom: 12,
                                        }}
                                    >
                                        {card.title}
                                    </h3>
                                    <p
                                        style={{
                                            fontSize: 15,
                                            lineHeight: 1.6,
                                            color: colors.textMuted,
                                            fontFamily: fonts.body,
                                        }}
                                    >
                                        {card.desc}
                                    </p>
                                </motion.div>
                            </AnimatedSection>
                        ))}
                    </div>
                </div>
            </section>
            {/* ========== SECTION 7: WAITLIST COUNTER ========== */}
            {/* ========== SECTION 7: WAITLIST COUNTER - GRADIENT BACKGROUND ========== */}
            <section
                style={{
                    background: gradients.midCTA,
                    padding: "100px 24px",
                    textAlign: "center",
                    position: "relative",
                    overflow: "hidden",
                }}
            >
                {/* Decorative blur elements */}
                <div
                    style={{
                        position: "absolute",
                        top: -50,
                        left: "20%",
                        width: 200,
                        height: 200,
                        background: "rgba(255,255,255,0.05)",
                        borderRadius: "50%",
                        filter: "blur(60px)",
                    }}
                />
                <div
                    style={{
                        position: "absolute",
                        bottom: -80,
                        right: "10%",
                        width: 300,
                        height: 300,
                        background: "rgba(255,255,255,0.03)",
                        borderRadius: "50%",
                        filter: "blur(80px)",
                    }}
                />
                <AnimatedSection>
                    <h2
                        style={{
                            fontSize: "clamp(28px, 3vw, 40px)",
                            fontWeight: 800,
                            marginBottom: 24,
                            color: "white",
                        }}
                    >
                        Join Pet Parents on the VIP Waitlist
                    </h2>
                    <div
                        style={{
                            fontSize: "clamp(80px, 15vw, 160px)",
                            fontWeight: 900,
                            color: "white",
                            lineHeight: 1,
                            textShadow: "0 10px 40px rgba(0,0,0,0.2)",
                        }}
                    >
                        {totalWaitlist}
                    </div>
                    <div
                        style={{
                            display: "flex",
                            flexWrap: "wrap",
                            justifyContent: "center",
                            gap: 32,
                            marginTop: 40,
                        }}
                    >
                        {[
                            "50% Early Bird Discount",
                            "Priority Shipping",
                            "Free Charging Dock ($49 value)",
                        ].map((text, i) => (
                            <div
                                key={i}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 8,
                                    fontSize: 16,
                                    fontWeight: 700,
                                    color: "white",
                                }}
                            >
                                <span style={{ color: colors.neonGreen }}>
                                    ✓
                                </span>{" "}
                                {text}
                            </div>
                        ))}
                    </div>
                </AnimatedSection>
            </section>
            {/* ========== SECTION 8: FOUNDER ========== */}
            <section style={{ ...sectionStyle, padding: "80px 24px" }}>
                <div
                    style={{
                        display: "flex",
                        flexWrap: "wrap",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 60,
                    }}
                >
                    <AnimatedSection>
                        <motion.div
                            initial={{ rotate: -3 }}
                            whileHover={{ rotate: 0, scale: 1.05 }}
                            style={{
                                background: "white",
                                padding: "20px 20px 50px",
                                boxShadow: "0 15px 50px rgba(0,0,0,0.1)",
                                transform: "rotate(-3deg)",
                                width: 280,
                            }}
                        >
                            <div
                                style={{
                                    width: "100%",
                                    height: 280,
                                    background: colors.offWhite,
                                    overflow: "hidden",
                                }}
                            >
                                <img
                                    src="/lander/portrait-beagle.png"
                                    alt="Founder"
                                    style={{
                                        width: "100%",
                                        height: "100%",
                                        objectFit: "cover",
                                    }}
                                />
                            </div>
                            <p
                                style={{
                                    fontFamily: "'Comic Sans MS', cursive",
                                    fontSize: 18,
                                    textAlign: "center",
                                    marginTop: 16,
                                    color: colors.textMuted,
                                }}
                            >
                                Me & Luna 🐕
                            </p>
                        </motion.div>
                    </AnimatedSection>
                    <AnimatedSection delay={0.2}>
                        <div style={{ maxWidth: 500 }}>
                            <h2
                                style={{
                                    fontSize: 40,
                                    fontWeight: 900,
                                    marginBottom: 24,
                                }}
                            >
                                Why I Built This
                            </h2>
                            <p
                                style={{
                                    fontSize: 18,
                                    lineHeight: 1.8,
                                    color: colors.textMuted,
                                    fontFamily: fonts.body,
                                }}
                            >
                                "Every day I'd check my pet camera, and she was
                                never in frame. I'd spend 5 minutes refreshing,
                                wondering if she was okay or just in the other
                                room. One day she got into trouble and I only
                                found out hours later.
                                <br />
                                <br />
                                That's when I realized: static cameras weren't
                                built for curious pets. So I built PawMe — a
                                camera that actually follows them. Now I never
                                miss a moment, no matter where she roams."
                            </p>
                        </div>
                    </AnimatedSection>
                </div>
            </section>
            {/* ========== SECTION 9: PRICING - WITH DEPTH ========== */}
            <section
                style={{
                    background: colors.dark,
                    padding: "80px 24px",
                    color: "white",
                    position: "relative",
                    overflow: "hidden",
                }}
            >
                {/* Depth elements */}
                <div
                    style={{
                        position: "absolute",
                        top: -100,
                        right: -100,
                        width: 400,
                        height: 400,
                        background: "rgba(4,218,141,0.08)",
                        borderRadius: "50%",
                        filter: "blur(120px)",
                    }}
                />
                <div
                    style={{
                        position: "absolute",
                        bottom: -80,
                        left: "20%",
                        width: 300,
                        height: 300,
                        background: "rgba(0,133,255,0.05)",
                        borderRadius: "50%",
                        filter: "blur(100px)",
                    }}
                />
                <div style={{ position: "relative", zIndex: 1 }}>
                    <AnimatedSection>
                        <h2
                            style={{
                                fontSize: "clamp(32px, 4vw, 48px)",
                                fontWeight: 900,
                                textAlign: "center",
                                marginBottom: 48,
                            }}
                        >
                            Early Supporters Get the Best Deal
                        </h2>
                    </AnimatedSection>
                    <div
                        style={{
                            display: "flex",
                            flexWrap: "wrap",
                            justifyContent: "center",
                            alignItems: "center",
                            gap: 24,
                            maxWidth: 900,
                            margin: "0 auto",
                        }}
                    >
                        {/* Retail */}
                        <div
                            style={{
                                flex: "1 1 200px",
                                textAlign: "center",
                                opacity: 0.5,
                            }}
                        >
                            <div
                                style={{
                                    fontSize: 14,
                                    fontWeight: 700,
                                    marginBottom: 8,
                                }}
                            >
                                RETAIL
                            </div>
                            <div
                                style={{
                                    fontSize: 48,
                                    fontWeight: 900,
                                    textDecoration: "line-through",
                                }}
                            >
                                $299
                            </div>
                            <div style={{ fontSize: 14 }}>
                                After Kickstarter
                            </div>
                        </div>
                        {/* VIP */}
                        <AnimatedSection>
                            <motion.div
                                whileHover={{
                                    scale: 1.05,
                                    boxShadow:
                                        "0 25px 60px rgba(4,218,141,0.25)",
                                }}
                                style={{
                                    flex: "1 1 280px",
                                    background: "rgba(255,255,255,0.08)",
                                    backdropFilter: "blur(20px)",
                                    borderRadius: 24,
                                    padding: 48,
                                    textAlign: "center",
                                    border: `2px solid ${colors.green}`,
                                    position: "relative",
                                    boxShadow: "0 15px 50px rgba(0,0,0,0.3)",
                                }}
                            >
                                <div
                                    style={{
                                        position: "absolute",
                                        top: -14,
                                        left: "50%",
                                        transform: "translateX(-50%)",
                                        background: colors.green,
                                        padding: "6px 20px",
                                        borderRadius: 20,
                                        fontWeight: 800,
                                        fontSize: 12,
                                        color: colors.dark,
                                    }}
                                >
                                    BEST VALUE
                                </div>
                                <div
                                    style={{
                                        fontSize: 14,
                                        fontWeight: 700,
                                        marginBottom: 8,
                                    }}
                                >
                                    VIP EXCLUSIVE
                                </div>
                                <div
                                    style={{
                                        fontSize: 72,
                                        fontWeight: 900,
                                        background: gradients.primary,
                                        WebkitBackgroundClip: "text",
                                        WebkitTextFillColor: "transparent",
                                    }}
                                >
                                    $149
                                </div>
                                <div style={{ fontSize: 14, marginTop: 8 }}>
                                    50% off — VIPs only
                                </div>
                                <motion.button
                                    onClick={openPopup}
                                    whileHover={{ background: colors.green }}
                                    style={{
                                        width: "100%",
                                        marginTop: 24,
                                        padding: 16,
                                        borderRadius: 12,
                                        border: "none",
                                        fontWeight: 800,
                                        fontSize: 16,
                                        cursor: "pointer",
                                        background: "white",
                                        color: colors.dark,
                                    }}
                                >
                                    LOCK IN MY VIP PRICE →
                                </motion.button>
                            </motion.div>
                        </AnimatedSection>
                        {/* Kickstarter */}
                        <div style={{ flex: "1 1 200px", textAlign: "center" }}>
                            <div
                                style={{
                                    fontSize: 14,
                                    fontWeight: 700,
                                    marginBottom: 8,
                                }}
                            >
                                KICKSTARTER
                            </div>
                            <div style={{ fontSize: 48, fontWeight: 900 }}>
                                $179
                            </div>
                            <div style={{ fontSize: 14 }}>40% off retail</div>
                        </div>
                    </div>
                    <p
                        style={{
                            textAlign: "center",
                            color: "rgba(255,255,255,0.5)",
                            marginTop: 40,
                            fontSize: 15,
                        }}
                    >
                        Only 100 VIP spots at $149. VIP pricing ends when we
                        launch.
                    </p>
                </div>
            </section>
            {/* ========== SECTION 10: FINAL CTA ========== */}
            <section
                style={{
                    background: gradients.washMedium,
                    padding: "80px 24px",
                    textAlign: "center",
                }}
            >
                <AnimatedSection>
                    <h2
                        style={{
                            fontSize: "clamp(36px, 5vw, 56px)",
                            fontWeight: 900,
                            marginBottom: 20,
                        }}
                    >
                        Don't Miss the Best Price
                    </h2>
                    <p
                        style={{
                            fontSize: 20,
                            color: colors.textMuted,
                            maxWidth: 600,
                            margin: "0 auto 40px",
                            lineHeight: 1.5,
                            fontFamily: fonts.body,
                        }}
                    >
                        VIP waitlist members get 50% off — that's $150 in
                        savings. Join {totalWaitlist} pet parents who've already
                        signed up.
                    </p>
                    <motion.button
                        onClick={openPopup}
                        animate={{ scale: [1, 1.03, 1] }}
                        transition={{ repeat: Infinity, duration: 2.5 }}
                        whileHover={{
                            boxShadow: "0 15px 50px rgba(4,218,141,0.4)",
                        }}
                        style={{
                            padding: "24px 60px",
                            fontSize: 20,
                            fontWeight: 800,
                            background: gradients.primary,
                            borderRadius: 60,
                            border: "none",
                            color: "white",
                            cursor: "pointer",
                            boxShadow: "0 10px 35px rgba(4,218,141,0.3)",
                        }}
                    >
                        {ctaText}
                    </motion.button>
                    <p
                        style={{
                            fontSize: 14,
                            color: colors.textMuted,
                            marginTop: 24,
                        }}
                    >
                        🔒 We'll never spam you. Unsubscribe anytime.
                    </p>
                </AnimatedSection>
            </section>
            {/* ========== SECTION 11: FOOTER ========== */}
            <footer
                style={{
                    background: colors.dark,
                    padding: "60px 24px",
                    textAlign: "center",
                }}
            >
                <div
                    style={{
                        fontSize: 24,
                        fontWeight: 900,
                        color: "white",
                        marginBottom: 20,
                    }}
                >
                    PawMe
                </div>
                <div
                    style={{
                        display: "flex",
                        justifyContent: "center",
                        gap: 24,
                        marginBottom: 20,
                    }}
                >
                    {["Instagram", "TikTok", "Facebook"].map((s) => (
                        <a
                            key={s}
                            href="#"
                            style={{
                                color: "rgba(255,255,255,0.5)",
                                fontSize: 14,
                                textDecoration: "none",
                            }}
                        >
                            {s}
                        </a>
                    ))}
                </div>
                <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13 }}>
                    © 2026 PawMe. All rights reserved.
                </p>
            </footer>
        </div>
    )
}



