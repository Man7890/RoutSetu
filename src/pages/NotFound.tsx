import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="container flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <div className="eyebrow">404</div>
      <h1 className="text-4xl font-extrabold">This trail doesn't exist</h1>
      <p className="text-muted-foreground">Let's route you somewhere less crowded.</p>
      <Button asChild>
        <Link to="/">Back home</Link>
      </Button>
    </div>
  );
}
