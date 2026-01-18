'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/app/components/ui/dialog';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Mail, Lock, User, KeyRound, Sparkles, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/app/context/AuthContext';
import { toast } from 'sonner';
import { Checkbox } from '@/app/components/ui/checkbox';
import { sendSignUpVerificationCode } from '@/app/actions/auth';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/app/components/ui/input-otp';
import { PrivacyPolicy } from './privacy-policy';
import { ScrollArea } from './ui/scroll-area';
import { ImageWithFallback } from './figma/ImageWithFallback';

interface AuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab?: 'signin' | 'signup';
  referralCode?: string;
}

function AuthMarketingPanel() {
  return (
    <div className="relative flex w-2/5 flex-col justify-between rounded-r-lg bg-gradient-to-br from-primary/20 via-secondary to-primary/20 p-8">
      <div className="absolute inset-0 z-0">
        <ImageWithFallback
          src="/hero-slide-1.png"
          alt="PawMe AI companion robot with pet"
          className="size-full object-cover opacity-30"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
      </div>
      <div className="relative z-10">
        <div className="mb-4 text-2xl font-bold">
          Your Pet's Future Best Friend
        </div>
        <p className="text-sm text-muted-foreground">
          Join the waitlist to get exclusive early-bird access and help bring PawMe to life.
        </p>
      </div>
      <div className="relative z-10 space-y-4">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-1 size-5 shrink-0 text-primary" />
          <p className="text-sm text-muted-foreground"><span className="font-semibold text-foreground">Earn Rewards</span> by referring friends and climbing the leaderboard.</p>
        </div>
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-1 size-5 shrink-0 text-primary" />
          <p className="text-sm text-muted-foreground"><span className="font-semibold text-foreground">Exclusive Discounts</span> for early supporters and VIPs.</p>
        </div>
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-1 size-5 shrink-0 text-primary" />
          <p className="text-sm text-muted-foreground"><span className="font-semibold text-foreground">Behind-the-Scenes</span> access to our development journey.</p>
        </div>
      </div>
    </div>
  );
}

export function AuthDialog({ open, onOpenChange, defaultTab = 'signin', referralCode }: AuthDialogProps) {
  const router = useRouter();
  const { signIn, signUp, signInWithGoogle, sendPasswordReset } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  
  const [signUpStep, setSignUpStep] = useState<'details' | 'verify'>('details');
  const [signUpName, setSignUpName] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [privacyPolicyAgreed, setPrivacyPolicyAgreed] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isPrivacyOpen, setPrivacyOpen] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendCooldown > 0) {
      timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const resetSignUpForm = () => {
    setSignUpStep('details');
    setSignUpName('');
    setSignUpEmail('');
    setSignUpPassword('');
    setVerificationCode('');
    setPrivacyPolicyAgreed(false);
    setMarketingOptIn(false);
    setError('');
    setResendCooldown(0);
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      resetSignUpForm();
    }
    onOpenChange(isOpen);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      await signIn(signInEmail, signInPassword);
      toast.success('Welcome back!');
      onOpenChange(false);
    } catch (error: any) {
      let message = 'Sign in failed. Please try again.';
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        message = 'Invalid email or password. Please try again.';
      } else if (error.code === 'auth/too-many-requests') {
        message = 'Access to this account has been temporarily disabled due to many failed login attempts. You can try again later or reset your password.';
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!signInEmail) {
      toast.error('Please enter your email to reset your password.');
      return;
    }
    setLoading(true);
    const result = await sendPasswordReset(signInEmail);
    if (result.success) {
      toast.success('Password reset email sent!', { description: 'Please check your inbox to continue.' });
    } else {
      toast.error(result.message || 'Failed to send password reset email. Please try again.');
    }
    setLoading(false);
  };

  const handleInitiateSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!privacyPolicyAgreed) {
      setError('You must agree to the Privacy Policy to sign up.');
      return;
    }
    setLoading(true);
    const result = await sendSignUpVerificationCode({ email: signUpEmail, name: signUpName });
    if (result.success) {
      toast.success('Verification code sent!', { description: `A 4-digit code has been sent to ${signUpEmail}.` });
      setSignUpStep('verify');
      setResendCooldown(60);
    } else {
      setError(result.message);
    }
    setLoading(false);
  };

  const handleResendCode = async () => {
    if (resendCooldown > 0) return;
    setLoading(true);
    setError('');
    const result = await sendSignUpVerificationCode({ email: signUpEmail, name: signUpName });
    if (result.success) {
      toast.success('New verification code sent!');
      setResendCooldown(60); // 60 second cooldown
    } else {
      setError(result.message);
    }
    setLoading(false);
  };

  const handleCompleteSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signUp(signUpEmail, signUpPassword, signUpName, verificationCode, referralCode, privacyPolicyAgreed, marketingOptIn);
      toast.success('Account created successfully!');
      handleOpenChange(false);
      router.push('/leaderboard');
    } catch (error: any) {
      setError(error.message || 'Sign up failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    try {
      await signInWithGoogle();
      handleOpenChange(false);
      toast.success('Signed in with Google!');
    } catch (error: any) {
      setError(error.message || 'Google sign in failed');
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-4xl p-0">
          <div className="flex min-h-[600px]">
            <div className="w-3/5 p-8">
              <DialogHeader className="mb-6 text-center">
                <DialogTitle className="text-2xl">Welcome to PawMe</DialogTitle>
                <DialogDescription>
                  {referralCode ? "You've been referred! Sign up to claim your reward." : 'Sign in to access your referral dashboard and track your rewards.'}
                </DialogDescription>
                {error && (
                  <div className="mt-3 rounded-md border border-destructive/20 bg-destructive/10 p-3">
                    <p className="text-sm font-medium text-destructive">{error}</p>
                  </div>
                )}
              </DialogHeader>
              
              <Tabs defaultValue={defaultTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="signin">Sign In</TabsTrigger>
                  <TabsTrigger value="signup" onClick={() => setSignUpStep('details')}>Sign Up</TabsTrigger>
                </TabsList>
                
                <TabsContent value="signin" className="mt-4 space-y-4">
                  <form onSubmit={handleSignIn} className="space-y-4">
                    <div className="space-y-2"><Label htmlFor="signin-email">Email</Label><div className="relative"><Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input id="signin-email" type="email" placeholder="you@example.com" value={signInEmail} onChange={(e) => setSignInEmail(e.target.value)} required className="pl-10" disabled={loading} /></div></div>
                    <div className="space-y-2"><Label htmlFor="signin-password">Password</Label><div className="relative"><Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input id="signin-password" type="password" placeholder="••••••••" value={signInPassword} onChange={(e) => setSignInPassword(e.target.value)} required className="pl-10" disabled={loading} /></div><div className="mt-1 flex items-center justify-end text-sm"><Button type="button" variant="link" className="h-auto p-0 font-normal text-primary hover:text-primary/80" onClick={handlePasswordReset} disabled={loading}>Forgot Password?</Button></div></div>
                    <Button type="submit" className="w-full" disabled={loading}>{loading ? 'Signing in...' : 'Sign In'}</Button>
                  </form>
                  <div className="relative"><div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div><div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">Or continue with</span></div></div>
                  <Button type="button" variant="outline" className="w-full" onClick={handleGoogleSignIn} disabled={loading}><svg className="mr-2 h-4 w-4" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>Continue with Google</Button>
                </TabsContent>
                
                <TabsContent value="signup" className="mt-4 space-y-4">
                  {signUpStep === 'details' && (
                    <form onSubmit={handleInitiateSignUp} className="space-y-4">
                      <div className="space-y-2"><Label htmlFor="signup-name">Name</Label><div className="relative"><User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input id="signup-name" type="text" placeholder="Your name" value={signUpName} onChange={(e) => setSignUpName(e.target.value)} required className="pl-10" disabled={loading} /></div></div>
                      <div className="space-y-2"><Label htmlFor="signup-email">Email</Label><div className="relative"><Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input id="signup-email" type="email" placeholder="you@example.com" value={signUpEmail} onChange={(e) => setSignUpEmail(e.target.value)} required className="pl-10" disabled={loading} /></div></div>
                      <div className="space-y-2"><Label htmlFor="signup-password">Password</Label><div className="relative"><Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input id="signup-password" type="password" placeholder="•••••••• (at least 6 characters)" value={signUpPassword} onChange={(e) => setSignUpPassword(e.target.value)} required minLength={6} className="pl-10" disabled={loading} /></div></div>
                      <div className="flex items-start space-x-2"><Checkbox id="terms" checked={privacyPolicyAgreed} onCheckedChange={(checked) => setPrivacyPolicyAgreed(checked as boolean)} disabled={loading} /><div className="grid gap-1.5 leading-none"><label htmlFor="terms" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">I agree to the{' '}<Button type="button" variant="link" className="h-auto p-0 underline" onClick={() => setPrivacyOpen(true)}>Privacy Policy</Button></label></div></div>
                      <div className="flex items-start space-x-2"><Checkbox id="marketing" checked={marketingOptIn} onCheckedChange={(checked) => setMarketingOptIn(checked as boolean)} disabled={loading} /><div className="grid gap-1.5 leading-none"><label htmlFor="marketing" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Receive occasional product promotion messages</label></div></div>
                      {referralCode && (<div className="rounded-md bg-primary/5 p-3 text-sm text-muted-foreground">You were referred with code: <span className="font-semibold text-primary">{referralCode}</span></div>)}
                      <Button type="submit" className="w-full" disabled={loading || !privacyPolicyAgreed}>{loading ? 'Sending code...' : 'Create Account'}</Button>
                    </form>
                  )}

                  {signUpStep === 'verify' && (
                    <form onSubmit={handleCompleteSignUp} className="space-y-6">
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">Enter the 4-digit code sent to {signUpEmail}</p>
                        <p className="mt-1 text-xs text-muted-foreground">The code expires in 10 minutes.</p>
                      </div>
                      <div className="space-y-2"><InputOTP maxLength={4} value={verificationCode} onChange={setVerificationCode}><InputOTPGroup className="w-full justify-center"><InputOTPSlot index={0} /><InputOTPSlot index={1} /><InputOTPSlot index={2} /><InputOTPSlot index={3} /></InputOTPGroup></InputOTP></div>
                      <Button type="submit" className="w-full" disabled={loading || verificationCode.length < 4}>{loading ? 'Verifying...' : 'Verify & Create Account'}</Button>
                      <div className="text-center text-sm"><Button type="button" variant="link" className="h-auto p-0 font-normal text-primary hover:text-primary/80" onClick={handleResendCode} disabled={loading || resendCooldown > 0}>{resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Didn't receive a code? Resend"}</Button></div>
                      <Button type="button" variant="link" className="w-full text-muted-foreground" onClick={() => setSignUpStep('details')} disabled={loading}>Back to details</Button>
                    </form>
                  )}
                  
                  <div className="relative"><div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div><div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">Or continue with</span></div></div>
                  <Button type="button" variant="outline" className="w-full" onClick={handleGoogleSignIn} disabled={loading}><svg className="mr-2 h-4 w-4" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>Continue with Google</Button>
                </TabsContent>
              </Tabs>
            </div>
            <AuthMarketingPanel />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isPrivacyOpen} onOpenChange={setPrivacyOpen}>
        <DialogContent className="flex h-[80vh] max-w-3xl flex-col">
          <DialogHeader>
            <DialogTitle>Privacy Policy</DialogTitle>
            <DialogDescription>Last updated: January 17, 2026</DialogDescription>
          </DialogHeader>
          <ScrollArea className="flex-grow pr-4">
            <PrivacyPolicy />
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}
