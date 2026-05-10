import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { Lock } from "lucide-react";

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-6 px-4">
      <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
        <Lock size={24} className="text-primary" />
      </div>
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-display font-bold text-foreground">
          Page not found
        </h1>
        <p className="text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
      </div>
      <Button asChild variant="outline">
        <Link to="/app/conversations" data-ocid="notfound.home_link">
          Back to Conversations
        </Link>
      </Button>
      <p className="text-xs text-muted-foreground border-t border-border pt-4 mt-2">
        To report a bug, email{" "}
        <a
          href="mailto:support@charliesierra.io"
          className="underline hover:text-foreground transition-colors duration-200"
        >
          support@charliesierra.io
        </a>
      </p>
    </div>
  );
}
