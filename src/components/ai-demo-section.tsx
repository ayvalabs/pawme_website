'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { generatePetInteractionPlanAction } from '@/app/actions';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, SquareTerminal } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const formSchema = z.object({
  petName: z.string().min(2, 'Pet name must be at least 2 characters.'),
  petType: z.enum(['dog', 'cat', 'other']),
  petActivityLevel: z.enum(['high', 'medium', 'low']),
  petPreferences: z
    .string()
    .min(10, "Please describe your pet's preferences (at least 10 characters)."),
});

export function AiDemoSection() {
  const [plan, setPlan] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      petName: '',
      petType: 'dog',
      petActivityLevel: 'medium',
      petPreferences: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    setPlan(null);
    try {
      const result = await generatePetInteractionPlanAction(values);
      if (result.error) {
        toast({
          variant: 'destructive',
          title: 'Error generating plan',
          description: result.error,
        });
      } else {
        setPlan(result.interactionPlan || 'Could not generate a plan.');
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'An unexpected error occurred',
        description: 'Please try again later.',
      });
    }
    setIsLoading(false);
  }

  return (
    <section id="demo" className="py-20 sm:py-32 bg-primary/5">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto text-center mb-16">
          <h2 className="font-headline text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            See the AI in Action
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Fill out your pet&apos;s details and our AI will generate a
            personalized interaction plan for PawMe.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="font-headline text-2xl">
                Pet Profile
              </CardTitle>
              <CardDescription>Tell us about your furry friend.</CardDescription>
            </CardHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)}>
                <CardContent className="space-y-6">
                  <FormField
                    control={form.control}
                    name="petName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pet&apos;s Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Buddy" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="petType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Pet Type</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="dog">Dog</SelectItem>
                              <SelectItem value="cat">Cat</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="petActivityLevel"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Activity Level</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select level" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="high">High</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="low">Low</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="petPreferences"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pet&apos;s Preferences</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Loves chasing red dots, squeaky toys, and chicken-flavored treats."
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          What does your pet love to do?
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
                <CardFooter>
                  <Button type="submit" disabled={isLoading} className="w-full">
                    {isLoading ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      'Generate Plan'
                    )}
                  </Button>
                </CardFooter>
              </form>
            </Form>
          </Card>

          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-headline text-2xl">
                <SquareTerminal /> Generated Plan
              </CardTitle>
              <CardDescription>
                This is the custom plan PawMe will use to entertain your pet.
              </CardDescription>
            </CardHeader>
            <CardContent className="min-h-[420px] prose prose-sm max-w-none prose-p:text-foreground prose-headings:text-foreground prose-strong:text-foreground">
              {isLoading && (
                <div className="flex justify-center items-center h-full">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              )}
              {plan && (
                <div
                  className="whitespace-pre-wrap"
                  dangerouslySetInnerHTML={{ __html: plan }}
                />
              )}
              {!isLoading && !plan && (
                <p className="text-muted-foreground">
                  Your pet&apos;s AI-generated interaction plan will appear
                  here...
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
