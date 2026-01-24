import { useLocation } from "react-router-dom";
import { Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname,
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center px-4">
      <div className="text-center space-y-6 max-w-md">
        <div className="text-6xl">🔍</div>
        <h1 className="text-4xl font-bold text-foreground">Page Not Found</h1>
        <p className="text-lg text-muted-foreground">
          Looks like this page has been lost! It might have gone missing just
          like the items we help reunite.
        </p>

        <div className="pt-4">
          <Button asChild size="lg" className="h-12">
            <Link to="/">
              <Home className="w-5 h-5 mr-2" />
              Return Home
            </Link>
          </Button>
        </div>

        <div className="pt-8 text-sm text-muted-foreground">
          <p>Lost something instead?</p>
          <Button asChild variant="outline">
            <Link to="/submit">Report an Item</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
