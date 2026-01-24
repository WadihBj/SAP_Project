import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { loginUser, isAssistant } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { AlertCircle, Loader2, Shield } from "lucide-react";
import { toast } from "sonner";

export default function AssistantLogin() {
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
      const { user } = await loginUser(email, password);

      // Check if user is an assistant (with error handling)
      try {
        const isAss = await isAssistant(user.id);

        if (!isAss) {
          await supabase.auth.signOut();
          setError(
            "This account is not authorized as an assistant. Please contact your administrator.",
          );
          toast.error("Not authorized");
          return;
        }
      } catch (assistantCheckErr) {
        console.error("Error checking assistant status:", assistantCheckErr);
        // Allow login anyway - will be checked on dashboard
        console.log("Proceeding with login despite assistant check error");
      }

      toast.success("Logged in as assistant!");
      navigate("/assistant/dashboard");
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Login failed";
      setError(errMsg);
      toast.error(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2">
          <Shield className="w-8 h-8 text-primary" />
          <h1 className="text-2xl font-bold text-white">Staff Portal</h1>
        </div>

        {/* Card */}
        <Card className="p-8 space-y-6 bg-slate-800 border-slate-700">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-white">Assistant Sign In</h2>
            <p className="text-slate-400">
              Access the inventory management system
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Error message */}
            {error && (
              <div className="p-4 rounded-lg bg-red-900/30 border border-red-700 flex gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-200">{error}</p>
              </div>
            )}

            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-slate-200 mb-1.5"
              >
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="assistant@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                required
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-slate-200 mb-1.5"
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
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>

            {/* Submit */}
            <Button
              type="submit"
              className="w-full h-11 text-base font-semibold bg-primary hover:bg-primary/90"
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

          {/* User link */}
          <div className="border-t border-slate-700 pt-4">
            <p className="text-center text-sm text-slate-400">
              User account?{" "}
              <Link
                to="/login"
                className="text-primary hover:underline font-medium"
              >
                Sign in here
              </Link>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
