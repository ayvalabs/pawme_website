'use client'
import { useState, useEffect } from "react"
import { motion } from "motion/react"
import { useAuth } from "@/app/context/AuthContext"
import { toast } from "sonner"
import { ReferralShareSection } from "@/app/components/referral-share-section"
// ========== DESIGN TOKENS (SAME AS LANDING PAGE) ==========
const colors = {
    green: "#04DA8D",
    blue: "#0085FF",
    dark: "#1A1A2E",
    white: "#FFFFFF",
    offWhite: "#F8F9FA",
    cream: "#FFF8F0",
    textMuted: "#6B7280",
    gold: "#FFD700",
}
const gradients = {
    primary: "linear-gradient(135deg, #04DA8D 0%, #0085FF 100%)",
    hero: "linear-gradient(180deg, #FFFFFF 0%, #F0FDF9 50%, #E0F2FE 100%)",
    celebration:
        "linear-gradient(135deg, #F0FDF9 0%, #FFF8F0 50%, #E0F2FE 100%)",
}
const fonts = {
    heading:
        "'SF Pro Rounded', 'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif",
    body: "'SF Pro Rounded', 'SF Pro Text', -apple-system, BlinkMacSystemFont, sans-serif",
}
// ========== CONFETTI PARTICLE COMPONENT ==========
function ConfettiParticle({
    delay,
    color,
    left,
}: {
    delay: number
    color: string
    left: string
}) {
    return (
        <motion.div
            initial={{ y: -20, opacity: 0, rotate: 0 }}
            animate={{
                y: [0, 400, 800],
                opacity: [0, 1, 0],
                rotate: [0, 180, 360],
                x: [0, Math.random() * 100 - 50, Math.random() * 200 - 100],
            }}
            transition={{
                duration: 4,
                delay: delay,
                repeat: Infinity,
                repeatDelay: 2,
            }}
            style={{
                position: "absolute",
                top: -20,
                left: left,
                width: 10,
                height: 10,
                background: color,
                borderRadius: Math.random() > 0.5 ? "50%" : "2px",
                zIndex: 1,
            }}
        />
    )
}
// ========== STAR DOODLE (SAME AS LANDING PAGE) ==========
function Star({
    size = 24,
    color = colors.green,
    style = {},
}: {
    size?: number
    color?: string
    style?: React.CSSProperties
}) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" style={style}>
            <path
                fill={color}
                d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z"
            />
        </svg>
    )
}
// ========== MAIN THANK YOU PAGE COMPONENT ==========
export default function ThankYouPage() {
    const { user, profile, refreshProfile } = useAuth()
    const [showConfetti, setShowConfetti] = useState(true)
    const [isMobile, setIsMobile] = useState(false)
    const [verified, setVerified] = useState(false)
    // Mobile detection
    useEffect(() => {
        if (typeof window === "undefined") return
        const checkMobile = () => setIsMobile(window.innerWidth < 768)
        checkMobile()
        window.addEventListener("resize", checkMobile)
        return () => window.removeEventListener("resize", checkMobile)
    }, [])
    // Verify payment with Stripe, update Firestore VIP status, and track purchase
    useEffect(() => {
        if (typeof window === "undefined" || verified) return
        const urlParams = new URLSearchParams(window.location.search)
        const sessionId = urlParams.get("session_id") || ""
        if (!sessionId) return

        setVerified(true)

        // Fire GTM purchase tracking
        const nameParts = (profile?.name || user?.displayName || "").trim().split(/\s+/)
        ;(window as any).trackPawMePurchase?.(
            user?.email || "",
            nameParts[0] || "",
            nameParts.slice(1).join(" ") || "",
            sessionId
        )

        // Verify with Stripe and update Firestore (fallback if webhook hasn't fired)
        const verifyPayment = async () => {
            try {
                const { verifyVipPayment } = await import("@/app/actions/stripe")
                const result = await verifyVipPayment(sessionId)
                if (result.success) {
                    console.log("✅ VIP payment verified and Firestore updated")
                    toast.success("Payment successful! Welcome to VIP! 👑")
                    // Refresh profile so UI reflects VIP status immediately
                    await refreshProfile()
                } else {
                    console.warn("⚠️ Payment verification returned:", result.error)
                    toast.success("Payment received! Welcome to VIP! 👑")
                }
            } catch (err) {
                console.error("⚠️ Payment verification failed:", err)
                toast.success("Payment received! Welcome to VIP! 👑")
            }
            // Clean up URL
            window.history.replaceState({}, "", "/thanks")
        }
        verifyPayment()
    }, [user, profile, verified, refreshProfile])
    // Confetti colors
    const confettiColors = [
        colors.green,
        colors.blue,
        colors.gold,
        "#FF6B6B",
        "#A855F7",
    ]
    const contactEmail = "pawme+hello@ayvalabs.com"
    return (
        <div
            style={{
                fontFamily: fonts.heading,
                color: colors.dark,
                background: gradients.celebration,
                minHeight: "100vh",
                width: "100%",
                overflowX: "hidden",
                position: "relative",
            }}
        >
            {/* Confetti Animation */}
            {showConfetti && (
                <div
                    style={{
                        position: "fixed",
                        inset: 0,
                        pointerEvents: "none",
                        overflow: "hidden",
                        zIndex: 100,
                    }}
                >
                    {[...Array(isMobile ? 15 : 30)].map((_, i) => (
                        <ConfettiParticle
                            key={i}
                            delay={i * 0.15}
                            color={confettiColors[i % confettiColors.length]}
                            left={`${(i * 3.5) % 100}%`}
                        />
                    ))}
                </div>
            )}
            {/* Decorative Stars - Hidden on mobile */}
            {!isMobile && (
                <>
                    <Star
                        size={40}
                        style={{
                            position: "absolute",
                            top: "10%",
                            left: "8%",
                            opacity: 0.6,
                        }}
                    />
                    <Star
                        size={28}
                        color={colors.blue}
                        style={{
                            position: "absolute",
                            top: "15%",
                            right: "12%",
                            opacity: 0.6,
                        }}
                    />
                    <Star
                        size={20}
                        color={colors.gold}
                        style={{
                            position: "absolute",
                            bottom: "20%",
                            left: "15%",
                            opacity: 0.5,
                        }}
                    />
                    <Star
                        size={32}
                        style={{
                            position: "absolute",
                            bottom: "25%",
                            right: "10%",
                            opacity: 0.5,
                        }}
                    />
                </>
            )}
            {/* Main Content */}
            <div
                style={{
                    maxWidth: 700,
                    margin: "0 auto",
                    padding: isMobile ? "60px 20px" : "80px 24px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    textAlign: "center",
                    position: "relative",
                    zIndex: 10,
                }}
            >
                {/* Success Checkmark */}
                <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{
                        type: "spring",
                        stiffness: 200,
                        damping: 15,
                        delay: 0.2,
                    }}
                    style={{
                        width: isMobile ? 80 : 100,
                        height: isMobile ? 80 : 100,
                        borderRadius: "50%",
                        background: gradients.primary,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        marginBottom: isMobile ? 24 : 32,
                        boxShadow: "0 20px 60px rgba(4, 218, 141, 0.4)",
                    }}
                >
                    <svg
                        width={isMobile ? 40 : 50}
                        height={isMobile ? 40 : 50}
                        viewBox="0 0 24 24"
                        fill="none"
                    >
                        <motion.path
                            d="M5 13L9 17L19 7"
                            stroke="white"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: 1 }}
                            transition={{ duration: 0.5, delay: 0.5 }}
                        />
                    </svg>
                </motion.div>
                {/* Main Headline */}
                <motion.h1
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    style={{
                        fontSize: isMobile ? 32 : "clamp(36px, 8vw, 56px)",
                        fontWeight: 900,
                        marginBottom: 12,
                        lineHeight: 1.1,
                    }}
                >
                    You're In! 🎉
                </motion.h1>
                {/* Subheadline */}
                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    style={{
                        fontSize: isMobile ? 16 : "clamp(18px, 3vw, 24px)",
                        fontWeight: 700,
                        background: gradients.primary,
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        marginBottom: isMobile ? 24 : 32,
                    }}
                >
                    Welcome to the PawMe VIP Family
                </motion.p>               
                {/* Thank You Message Card */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    style={{
                        background: colors.white,
                        borderRadius: isMobile ? 20 : 24,
                        padding: isMobile ? "28px 20px" : "40px 32px",
                        boxShadow: "0 20px 60px rgba(0,0,0,0.08)",
                        marginBottom: isMobile ? 32 : 40,
                        width: "100%",
                        textAlign: "left",
                    }}
                >
                    <h2
                        style={{
                            fontSize: isMobile ? 18 : 22,
                            fontWeight: 800,
                            marginBottom: 12,
                            color: colors.dark,
                        }}
                    >
                        🙏 Thank You for Believing in Us
                    </h2>
                    <p
                        style={{
                            fontSize: isMobile ? 14 : 16,
                            lineHeight: 1.7,
                            color: colors.textMuted,
                            marginBottom: 20,
                        }}
                    >
                        You're not just a customer — you're one of our earliest
                        supporters. Your trust means everything to us, and we're
                        committed to building something amazing for you and your
                        furry best friend.
                    </p>
                    {/* What's Next Section */}
                    <h3
                        style={{
                            fontSize: isMobile ? 16 : 18,
                            fontWeight: 800,
                            marginBottom: 14,
                            color: colors.dark,
                        }}
                    >
                        📬 What Happens Next?
                    </h3>
                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: isMobile ? 12 : 16,
                        }}
                    >
                        {[
                            {
                                icon: "✉️",
                                title: "Welcome Email Incoming",
                                desc: "Check your inbox! Your VIP confirmation with all the details is on its way.",
                            },
                            {
                                icon: "📅",
                                title: "Weekly Insider Updates",
                                desc: "Every week, you'll get exclusive behind-the-scenes looks at our progress, new features, and development milestones.",
                            },
                            {
                                icon: "🎁",
                                title: "VIP-Only Perks",
                                desc: "As a VIP member, you'll be the first to know about beta access, special offers, and surprise bonuses.",
                            },
                            {
                                icon: "🚀",
                                title: "Launch Priority",
                                desc: "When we launch on Kickstarter, you'll get first access and your exclusive 50% VIP discount.",
                            },
                        ].map((item, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.8 + i * 0.1 }}
                                style={{
                                    display: "flex",
                                    gap: isMobile ? 12 : 16,
                                    padding: isMobile ? 12 : 16,
                                    background: colors.offWhite,
                                    borderRadius: 12,
                                    alignItems: "flex-start",
                                }}
                            >
                                <span style={{ fontSize: isMobile ? 20 : 24 }}>
                                    {item.icon}
                                </span>
                                <div>
                                    <div
                                        style={{
                                            fontWeight: 700,
                                            fontSize: isMobile ? 14 : 15,
                                            marginBottom: 4,
                                            color: colors.dark,
                                        }}
                                    >
                                        {item.title}
                                    </div>
                                    <div
                                        style={{
                                            fontSize: isMobile ? 13 : 14,
                                            color: colors.textMuted,
                                            lineHeight: 1.5,
                                        }}
                                    >
                                        {item.desc}
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>
                {/* Referral Share & Follow Us */}
                <ReferralShareSection variant="light" animationDelay={1.2} />
                
                {/* Email Check Reminder */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.3 }}
                    style={{
                        textAlign: "center",
                        marginTop: isMobile ? 32 : 40,
                        padding: isMobile ? "16px 20px" : "20px 32px",
                        background: "rgba(4, 218, 141, 0.08)",
                        borderRadius: 16,
                        border: "1px solid rgba(4, 218, 141, 0.2)",
                    }}
                >
                    <p
                        style={{
                            fontSize: isMobile ? 13 : 14,
                            color: colors.textMuted,
                            lineHeight: 1.6,
                            margin: 0,
                        }}
                    >
                        📧 Check your inbox for our email! If you don't see it, check your <strong>Promotions</strong> or <strong>Spam</strong> folder and move it to your Primary inbox so you don't miss future updates.
                    </p>
                </motion.div>

                {/* Footer Message */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.4 }}
                    style={{ textAlign: "center", marginTop: isMobile ? 32 : 40 }}
                >
                    <p
                        style={{
                            fontSize: isMobile ? 14 : 16,
                            color: colors.textMuted,
                            marginBottom: 8,
                        }}
                    >
                        Questions? We're here for you.
                    </p>
                    <a
                        href={`mailto:${contactEmail}`}
                        style={{
                            color: colors.green,
                            fontWeight: 700,
                            textDecoration: "none",
                            fontSize: isMobile ? 14 : 16,
                        }}
                    >
                        {contactEmail}
                    </a>
                </motion.div>
                {/* PawMe Logo/Footer */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.5 }}
                    style={{
                        marginTop: isMobile ? 40 : 60,
                        paddingTop: isMobile ? 24 : 32,
                        borderTop: `1px solid ${colors.offWhite}`,
                        width: "100%",
                        textAlign: "center",
                    }}
                >
                    <div
                        style={{
                            fontSize: isMobile ? 20 : 24,
                            fontWeight: 900,
                            background: gradients.primary,
                            WebkitBackgroundClip: "text",
                            WebkitTextFillColor: "transparent",
                            marginBottom: 8,
                        }}
                    >
                        🐾 PawMe
                    </div>
                    <p
                        style={{
                            fontSize: isMobile ? 12 : 13,
                            color: colors.textMuted,
                        }}
                    >
                        The AI companion that moves with your pet.
                    </p>
                </motion.div>
            </div>
        </div>
    )
}
