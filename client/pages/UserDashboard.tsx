import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, LogOut, MapPin, Calendar, FileText } from "lucide-react";
import { toast } from "sonner";

interface Inquiry {
  id: string;
  title: string;
  description: string;
  inquiry_type: "lost" | "found";
  status: string;
  created_at: string;
  location_lost_found?: string;
}

export default function UserDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    loadInquiries();
  }, [user]);

  const loadInquiries = async () => {
    try {
      const { data, error } = await supabase
        .from("inquiries")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error(
          "Supabase error loading inquiries:",
          error.message,
          error.code,
        );
        throw error;
      }
      setInquiries(data as Inquiry[]);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : JSON.stringify(err);
      console.error("Error loading inquiries:", errorMsg);
      toast.error(`Failed to load inquiries: ${errorMsg}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigate("/login");
    } catch (err) {
      toast.error("Failed to logout");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "submitted":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
      case "under_review":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300";
      case "matched":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
      case "resolved":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300";
    }
  };

  const getTypeIcon = (type: string) => {
    return type === "lost" ? "😞" : "🎁";
  };

  const getStatusLabel = (status: string) => {
    return status.replace(/_/g, " ").toUpperCase();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-white shadow-sm dark:bg-slate-900">
        <div className="container mx-auto max-w-6xl px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-primary">My Inquiries</h1>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="default"
                size="sm"
                onClick={() => navigate("/inquiry/new")}
              >
                <Plus className="w-4 h-4 mr-1" />
                New Inquiry
              </Button>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-1" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container max-w-6xl mx-auto px-4 py-8">
        {/* Welcome */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-foreground">
            Welcome back, {user?.email}!
          </h2>
          <p className="text-muted-foreground mt-1">
            Track your lost and found item inquiries
          </p>
        </div>

        {/* Inquiries List */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="inline-block">
              <svg
                className="animate-spin h-8 w-8 text-primary"
                viewBox="0 0 50 50"
              >
                <circle
                  className="opacity-30"
                  cx="25"
                  cy="25"
                  r="20"
                  stroke="currentColor"
                  strokeWidth="5"
                  fill="none"
                />
                <circle
                  className="text-primary"
                  cx="25"
                  cy="25"
                  r="20"
                  stroke="currentColor"
                  strokeWidth="5"
                  fill="none"
                  strokeDasharray="100"
                  strokeDashoffset="75"
                />
              </svg>
            </div>
          </div>
        ) : inquiries.length === 0 ? (
          <Card className="p-12 text-center">
            <div className="text-5xl mb-4">📋</div>
            <h3 className="text-2xl font-bold text-foreground mb-2">
              No inquiries yet
            </h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Start by reporting a lost or found item. Our system will
              automatically match it with our hidden inventory.
            </p>
            <Button asChild size="lg">
              <a href="/inquiry/new">Create Your First Inquiry</a>
            </Button>
          </Card>
        ) : (
          <div className="grid gap-4">
            {inquiries.map((inquiry) => (
              <Card
                key={inquiry.id}
                className="p-6 hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => navigate(`/inquiry/${inquiry.id}`)}
              >
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className="text-3xl flex-shrink-0">
                    {getTypeIcon(inquiry.inquiry_type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <h3 className="font-bold text-lg text-foreground break-words">
                        {inquiry.title}
                      </h3>
                      <Badge className={getStatusColor(inquiry.status)}>
                        {getStatusLabel(inquiry.status)}
                      </Badge>
                    </div>

                    <p className="text-muted-foreground mb-3 line-clamp-2">
                      {inquiry.description}
                    </p>

                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      {inquiry.location_lost_found && (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {inquiry.location_lost_found}
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(inquiry.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  {/* Action */}
                  <Button variant="outline" className="flex-shrink-0">
                    View Details
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
