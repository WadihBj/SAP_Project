import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { loginUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { AlertCircle, Loader2, Package } from "lucide-react";
import { toast } from "sonner";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await loginUser(email, password);
      toast.success("Logged in successfully!");
      navigate("/dashboard");
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Login failed";
      setError(errMsg);
      toast.error(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2">
          <Package className="w-8 h-8 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Lost & Found</h1>
        </div>

        {/* Card */}
        <Card className="p-8 space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-foreground">Sign In</h2>
            <p className="text-muted-foreground">
              Enter your credentials to continue
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Error message */}
            {error && (
              <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-800 dark:text-red-200">
                  {error}
                </p>
              </div>
            )}

            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-foreground mb-1.5"
              >
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-foreground mb-1.5"
              >
                Password
              </label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>

            {/* Submit */}
            <Button
              type="submit"
              className="w-full h-11 text-base font-semibold"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>

          {/* Sign up link */}
          <div className="text-center text-sm">
            <p className="text-muted-foreground">
              Don't have an account?{" "}
              <Link
                to="/register"
                className="text-primary hover:underline font-medium"
              >
                Sign up
              </Link>
            </p>
          </div>

          {/* TEST MODE BUTTON */}
          <div className="pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={async () => {
                setIsLoading(true);
                try {
                  // Try to login with test credentials
                  await loginUser("test@example.com", "TestPassword123!");
                  toast.success("Test mode - logged in!");
                  navigate("/dashboard");
                } catch (err) {
                  // If test user doesn't exist, create one
                  const { createClient } = await import("@supabase/supabase-js");
                  const testEmail = `test${Date.now()}@example.com`;
                  const testPassword = "TestPassword123!";
                  
                  const client = createClient(
                    import.meta.env.VITE_SUPABASE_URL,
                    import.meta.env.VITE_SUPABASE_ANON_KEY
                  );
                  
                  try {
                    await client.auth.signUp({
                      email: testEmail,
                      password: testPassword,
                    });
                    await loginUser(testEmail, testPassword);
                    toast.success("Test account created and logged in!");
                    navigate("/dashboard");
                  } catch (signupErr) {
                    toast.error("Could not create test account");
                    console.error(signupErr);
                  }
                }
                setIsLoading(false);
              }}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Loading...
                </>
              ) : (
                "🧪 Demo/Test Mode"
              )}
            </Button>
          </div>

          {/* Assistant link */}
          <div className="border-t border-border pt-4">
            <p className="text-center text-sm text-muted-foreground">
              Staff?{" "}
              <Link
                to="/assistant/login"
                className="text-primary hover:underline font-medium"
              >
                Sign in as assistant
              </Link>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
