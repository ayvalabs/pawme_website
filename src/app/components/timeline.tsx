import { Card } from '@/app/components/ui/card';
import { CheckCircle2, Circle } from 'lucide-react';

export function Timeline() {
  const milestones = [
    {
      quarter: 'Q1 2026',
      title: 'Kickstarter Campaign Launch',
      description: 'Official launch on Kickstarter with early bird pricing for backers.',
      status: 'upcoming',
    },
    {
      quarter: 'Q2 2026',
      title: 'Beta Testing Phase',
      description: 'Select early backers receive beta units for real-world testing and feedback.',
      status: 'upcoming',
    },
    {
      quarter: 'Q3 2026',
      title: 'Production & Manufacturing',
      description: 'Full-scale production begins with quality assurance and final refinements.',
      status: 'upcoming',
    },
    {
      quarter: 'Q4 2026',
      title: 'Global Shipping',
      description: 'First units ship to backers worldwide. Welcome to the PawMe family!',
      status: 'upcoming',
    },
  ];

  return (
    <div className="py-20 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl mb-4">Development Roadmap</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Stay updated on every step of PawMe's journey from concept to your home. Early adopters get exclusive updates!
          </p>
        </div>

        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary via-primary/50 to-border md:left-1/2 md:-translate-x-1/2" />

          <div className="space-y-12">
            {milestones.map((milestone, index) => (
              <div key={index} className="relative">
                {/* Timeline dot */}
                <div className="absolute left-6 -translate-x-1/2 md:left-1/2">
                  <div className="w-12 h-12 rounded-full bg-background border-4 border-primary flex items-center justify-center">
                    {milestone.status === 'completed' ? (
                      <CheckCircle2 className="w-6 h-6 text-primary" />
                    ) : (
                      <Circle className="w-6 h-6 text-primary fill-primary" />
                    )}
                  </div>
                </div>

                {/* Content card */}
                <div className={`ml-20 md:ml-0 ${index % 2 === 0 ? 'md:mr-[52%]' : 'md:ml-[52%]'}`}>
                  <Card className="p-6 border-2 border-border hover:border-primary/30 transition-all">
                    <div className="mb-2">
                      <span className="inline-block px-3 py-1 bg-primary/10 text-primary text-sm rounded-full">
                        {milestone.quarter}
                      </span>
                    </div>
                    <h3 className="mb-2">{milestone.title}</h3>
                    <p className="text-sm text-muted-foreground">{milestone.description}</p>
                  </Card>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
