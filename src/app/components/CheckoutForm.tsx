'use client';

import React, { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { CreditCard, CalendarIcon, Lock } from "lucide-react";
import { toast } from "sonner";


interface CheckoutFormProps {
  onSuccess: () => Promise<void>;
}

export default function CheckoutForm({ onSuccess }: CheckoutFormProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Simulate payment processing
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    toast.success("Deposit successful!");
    await onSuccess();
    
    setIsLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="card-number">Card Number</Label>
        <div className="relative">
          <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input id="card-number" placeholder="•••• •••• •••• ••••" required className="pl-10" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="expiry-date">Expiry Date</Label>
          <div className="relative">
            <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input id="expiry-date" placeholder="MM / YY" required className="pl-10" />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="cvc">CVC</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input id="cvc" placeholder="•••" required className="pl-10" />
          </div>
        </div>
      </div>

      <Button disabled={isLoading} type="submit" className="w-full mt-6">
        <span id="button-text">
          {isLoading ? "Processing..." : "Pay $1.00 Deposit"}
        </span>
      </Button>
    </form>
  );
}
