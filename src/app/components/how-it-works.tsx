import { Card } from '@/app/components/ui/card';

export function HowItWorks() {
  const steps = [
    {
      number: '01',
      title: 'Join the Waitlist',
      description: 'Sign up with your email and get your unique referral link. Be among the first to know when PawMe launches.',
      color: 'from-emerald-500 to-primary',
    },
    {
      number: '02',
      title: 'Share & Earn',
      description: 'Share your referral link with friends and family who love their pets. Earn rewards for every successful referral.',
      color: 'from-primary to-teal-500',
    },
    {
      number: '03',
      title: 'Get Exclusive Access',
      description: 'Unlock early bird discounts and special perks based on your referral tier. The more you share, the more you save!',
      color: 'from-teal-500 to-cyan-500',
    },
    {
      number: '04',
      title: 'Welcome PawMe Home',
      description: 'Be the first to receive PawMe when we launch on Kickstarter. Give your pet the companion they deserve.',
      color: 'from-cyan-500 to-emerald-500',
    },
  ];

  return (
    <div className="py-20 px-4 bg-gradient-to-b from-secondary/20 via-transparent to-secondary/20">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl mb-4">How It Works</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Join our community in 4 simple steps and help bring PawMe to life
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step, index) => (
            <Card 
              key={index} 
              className="p-6 relative overflow-hidden border-2 border-border hover:border-primary/30 transition-all group hover:-translate-y-1"
            >
              {/* Number badge */}
              <div className={`absolute -top-6 -right-6 w-24 h-24 bg-gradient-to-br ${step.color} rounded-full opacity-10 group-hover:opacity-20 transition-opacity`} />
              
              <div className="relative">
                <div className={`inline-block px-4 py-2 bg-gradient-to-r ${step.color} text-white rounded-lg mb-4`}>
                  <span className="text-sm">Step {step.number}</span>
                </div>
                
                <h3 className="mb-3">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.description}</p>
              </div>

              {/* Arrow connector (hidden on mobile, shown on desktop except for last item) */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-1/2 -right-3 z-10">
                  <div className="w-6 h-6 bg-primary/20 rotate-45" />
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
