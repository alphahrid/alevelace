import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Heart, CreditCard, Smartphone, Copy, Check } from "lucide-react";
import { toast } from "sonner";

const BKASH_NUMBER = "01716611398";

export function DonationButton({ variant = "ghost" }: { variant?: "ghost" | "outline" | "default" }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try { await navigator.clipboard.writeText(BKASH_NUMBER); setCopied(true); toast.success("bKash number copied"); setTimeout(() => setCopied(false), 1800); }
    catch { toast.error("Couldn't copy"); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} size="sm" className="gap-2">
          <Heart className="size-4 text-pink-500 fill-pink-500/20" />
          <span className="hidden sm:inline">Support the App</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Heart className="size-5 text-pink-500" /> Support A-Level Ace</DialogTitle>
          <DialogDescription>
            This app is <span className="font-medium text-foreground">100% free</span> with no premium paywalls — ever.
            If it's helping you toward an A*, a small contribution keeps the AI lights on.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="bkash" className="mt-2">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="bkash" className="gap-2"><Smartphone className="size-4" /> bKash</TabsTrigger>
            <TabsTrigger value="card" className="gap-2"><CreditCard className="size-4" /> Card</TabsTrigger>
          </TabsList>

          <TabsContent value="bkash" className="mt-4">
            <div className="rounded-lg border bg-card p-4">
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">bKash Merchant / Personal</div>
              <div className="flex items-center justify-between gap-3">
                <div className="text-2xl font-bold tracking-tight tabular-nums">{BKASH_NUMBER}</div>
                <Button size="sm" variant="outline" onClick={copy} className="gap-1.5">
                  {copied ? <Check className="size-4" /> : <Copy className="size-4" />} {copied ? "Copied" : "Copy"}
                </Button>
              </div>
              <ol className="mt-4 text-sm text-muted-foreground space-y-1.5 list-decimal list-inside">
                <li>Open the bKash app.</li>
                <li>Choose <span className="font-medium text-foreground">Send Money</span> or <span className="font-medium text-foreground">Merchant Pay</span>.</li>
                <li>Enter the number above and the amount you'd like to give.</li>
                <li>Confirm with your bKash PIN — that's it. Thank you 🙏</li>
              </ol>
            </div>
          </TabsContent>

          <TabsContent value="card" className="mt-4">
            <div className="rounded-lg border bg-card p-4 space-y-3">
              <div className="text-sm text-muted-foreground">
                International card payments (Visa / Mastercard / Amex) are coming soon.
              </div>
              <div className="grid gap-2 opacity-60 pointer-events-none select-none">
                <input className="rounded-md border bg-background px-3 py-2 text-sm" placeholder="1234 5678 9012 3456" disabled />
                <div className="grid grid-cols-2 gap-2">
                  <input className="rounded-md border bg-background px-3 py-2 text-sm" placeholder="MM / YY" disabled />
                  <input className="rounded-md border bg-background px-3 py-2 text-sm" placeholder="CVC" disabled />
                </div>
                <Button disabled>Donate</Button>
              </div>
              <div className="text-xs text-muted-foreground">In the meantime, bKash works worldwide via family/friends in Bangladesh.</div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
