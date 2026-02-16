'use client'

import { useState } from 'react'
import { motion } from 'motion/react'
import { SocialIcon } from 'react-social-icons'
import { useAuth } from '@/app/context/AuthContext'
import { toast } from 'sonner'

const colors = {
    green: "#04DA8D",
    neonGreen: "#00FF94",
    blue: "#0085FF",
    white: "#FFFFFF",
}
const gradients = {
    primary: "linear-gradient(90deg, #04DA8D 0%, #0085FF 100%)",
}
const fonts = {
    heading: "'SF Pro Rounded', 'Nunito', sans-serif",
    body: "'Nunito', sans-serif",
}

const socialLinks = [
    { network: "twitter", url: "https://twitter.com/pawme_ai" },
    { network: "facebook", url: "https://facebook.com/pawmeai" },
    { network: "instagram", url: "https://instagram.com/pawme.ai" },
    { network: "youtube", url: "https://youtube.com/@pawme_ai" },
    { network: "tiktok", url: "https://tiktok.com/@pawme.ai" },
]

interface ReferralShareSectionProps {
    variant?: 'dark' | 'light'
    animationDelay?: number
}

export function ReferralShareSection({ variant = 'dark', animationDelay = 0 }: ReferralShareSectionProps) {
    const { profile } = useAuth()
    const [copied, setCopied] = useState(false)

    const referralUrl = typeof window !== "undefined" && profile?.referralCode
        ? `${window.location.origin}/?ref=${profile.referralCode}`
        : ""

    const isDark = variant === 'dark'
    const cardBg = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.04)"
    const cardBorder = isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(0,0,0,0.08)"
    const textColor = isDark ? colors.white : "#1A1A2E"
    const mutedColor = isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.5)"
    const subtleMuted = isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.4)"
    const inputBg = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)"
    const inputBorder = isDark ? "1px solid rgba(255,255,255,0.2)" : "1px solid rgba(0,0,0,0.12)"
    const shareOutlineBorder = isDark ? "1px solid rgba(255,255,255,0.3)" : "1px solid rgba(0,0,0,0.15)"
    const socialFg = isDark ? "white" : "#1A1A2E"

    const handleCopyLink = () => {
        if (referralUrl) {
            navigator.clipboard.writeText(referralUrl)
            setCopied(true)
            toast.success("Referral link copied!")
            setTimeout(() => setCopied(false), 2000)
        }
    }

    const handleShare = (platform: string) => {
        const text = encodeURIComponent("I just joined the PawMe waitlist! PawMe is an AI-powered companion robot for pets. Join with my link to get 100 bonus points!")
        const url = encodeURIComponent(referralUrl)
        let shareUrl = ""
        switch (platform) {
            case "twitter": shareUrl = `https://twitter.com/intent/tweet?text=${text}&url=${url}`; break
            case "facebook": shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}`; break
            case "whatsapp": shareUrl = `https://wa.me/?text=${text} ${url}`; break
        }
        if (shareUrl) window.open(shareUrl, "_blank", "width=600,height=400")
    }

    const handleNativeShare = () => {
        if (navigator.share) {
            navigator.share({
                title: "Join me on the PawMe waitlist!",
                text: "I'm on the waitlist for PawMe, an amazing AI companion for pets. Join with my link to get 100 bonus points!",
                url: referralUrl,
            })
        } else {
            handleCopyLink()
        }
    }

    return (
        <>
            {/* ========== REFERRAL SHARE SECTION ========== */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: animationDelay }}
                style={{ background: cardBg, backdropFilter: "blur(20px)", borderRadius: 28, padding: "40px 36px", marginBottom: 32, border: cardBorder, boxShadow: "0 25px 60px rgba(0,0,0,0.1)", width: "100%" }}
            >
                <h2 style={{ fontFamily: fonts.heading, fontSize: 24, fontWeight: 900, color: textColor, marginBottom: 8 }}>
                    Share & Earn Rewards 🎁
                </h2>
                <p style={{ fontFamily: fonts.body, fontSize: 15, color: mutedColor, marginBottom: 24, lineHeight: 1.6 }}>
                    Share PawMe with friends & family. Each signup earns you <strong style={{ color: colors.neonGreen }}>100 bonus points</strong> toward exclusive rewards!
                </p>

                {/* Referral Link */}
                {referralUrl && (
                    <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
                        <input
                            readOnly
                            value={referralUrl}
                            style={{
                                flex: 1,
                                padding: "12px 16px",
                                borderRadius: 12,
                                border: inputBorder,
                                background: inputBg,
                                color: textColor,
                                fontSize: 13,
                                outline: "none",
                                fontFamily: fonts.body,
                            }}
                        />
                        <motion.button
                            onClick={handleCopyLink}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            style={{
                                padding: "12px 20px",
                                borderRadius: 12,
                                border: "none",
                                background: copied ? colors.green : gradients.primary,
                                color: colors.white,
                                fontWeight: 700,
                                fontSize: 13,
                                cursor: "pointer",
                                whiteSpace: "nowrap",
                            }}
                        >
                            {copied ? "Copied!" : "Copy"}
                        </motion.button>
                    </div>
                )}

                {/* Share Buttons */}
                <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
                    {[
                        { label: "Twitter", platform: "twitter", bg: "#1DA1F2" },
                        { label: "Facebook", platform: "facebook", bg: "#4267B2" },
                        { label: "WhatsApp", platform: "whatsapp", bg: "#25D366" },
                    ].map((s) => (
                        <motion.button
                            key={s.platform}
                            onClick={() => handleShare(s.platform)}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            style={{
                                padding: "10px 20px",
                                borderRadius: 50,
                                border: "none",
                                background: s.bg,
                                color: colors.white,
                                fontWeight: 700,
                                fontSize: 13,
                                cursor: "pointer",
                                fontFamily: fonts.body,
                            }}
                        >
                            {s.label}
                        </motion.button>
                    ))}
                    <motion.button
                        onClick={handleNativeShare}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        style={{
                            padding: "10px 20px",
                            borderRadius: 50,
                            border: shareOutlineBorder,
                            background: "transparent",
                            color: textColor,
                            fontWeight: 700,
                            fontSize: 13,
                            cursor: "pointer",
                            fontFamily: fonts.body,
                        }}
                    >
                        Share...
                    </motion.button>
                </div>
            </motion.div>

            {/* ========== FOLLOW US SECTION ========== */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: animationDelay + 0.2 }}
                style={{ background: cardBg, backdropFilter: "blur(20px)", borderRadius: 28, padding: "32px 36px", border: cardBorder, width: "100%" }}
            >
                <h3 style={{ fontFamily: fonts.heading, fontSize: 20, fontWeight: 800, color: textColor, marginBottom: 8 }}>
                    Follow Us for Updates 🐾
                </h3>
                <p style={{ fontFamily: fonts.body, fontSize: 14, color: subtleMuted, marginBottom: 20 }}>
                    Stay in the loop — behind-the-scenes, launch updates, and pet content!
                </p>
                <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
                    {socialLinks.map((social) => (
                        <SocialIcon
                            key={social.network}
                            url={social.url}
                            network={social.network}
                            bgColor="transparent"
                            fgColor={socialFg}
                            style={{ height: 48, width: 48, transition: "transform 0.2s" }}
                            target="_blank"
                            rel="noopener noreferrer"
                        />
                    ))}
                </div>
            </motion.div>
        </>
    )
}
