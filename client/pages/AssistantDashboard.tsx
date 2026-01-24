import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { findMatches, saveMatches } from "@/lib/matching";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogOut, CheckCircle, AlertCircle, Search, Inbox } from "lucide-react";
import { toast } from "sonner";

interface Inquiry {
  id: string;
  title: string;
  description: string;
  inquiry_type: "lost" | "found";
  status: string;
  created_at: string;
  location_lost_found?: string;
  extracted_attributes?: any;
}

interface Match {
  id: string;
  inquiry_id: string;
  inventory_item_id: string;
  confidence_score: number;
  status: string;
}

export default function AssistantDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    try {
      // Load pending inquiries
      const { data: inquiriesData, error: inquiriesError } = await supabase
        .from("inquiries")
        .select("*")
        .eq("status", "submitted")
        .order("created_at", { ascending: false });

      if (inquiriesError) throw inquiriesError;
      setInquiries(inquiriesData as Inquiry[]);

      // Load pending matches for review
      const { data: matchesData, error: matchesError } = await supabase
        .from("matches")
        .select("*")
        .eq("status", "pending_review")
        .order("confidence_score", { ascending: false });

      if (matchesError) throw matchesError;
      setMatches(matchesData as Match[]);
    } catch (err) {
      console.error("Error loading data:", err);
      toast.error("Failed to load dashboard data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleProcessInquiry = async (inquiryId: string) => {
    setProcessingId(inquiryId);
    try {
      // Run matching algorithm
      const matchResults = await findMatches(inquiryId);

      if (matchResults.length === 0) {
        // Update inquiry status to indicate no matches found
        await supabase
          .from("inquiries")
          .update({ status: "matched" })
          .eq("id", inquiryId);

        await supabase.from("inquiry_status_history").insert([
          {
            inquiry_id: inquiryId,
            old_status: "submitted",
            new_status: "matched",
            changed_by: user!.id,
            notes: "No matches found in inventory",
          },
        ]);

        toast.success("No matches found for this inquiry");
      } else {
        // Save matches
        await saveMatches(inquiryId, matchResults);
        toast.success(`Found ${matchResults.length} potential match(es)`);
      }

      // Reload data
      loadData();
    } catch (err) {
      console.error("Error processing inquiry:", err);
      toast.error("Failed to process inquiry");
    } finally {
      setProcessingId(null);
    }
  };

  const handleApproveMatch = async (matchId: string) => {
    try {
      const { error } = await supabase
        .from("matches")
        .update({
          status: "approved",
          reviewed_by: user!.id,
          reviewed_at: new Date(),
        })
        .eq("id", matchId);

      if (error) throw error;

      toast.success("Match approved");
      loadData();
    } catch (err) {
      console.error("Error approving match:", err);
      toast.error("Failed to approve match");
    }
  };

  const handleRejectMatch = async (matchId: string) => {
    try {
      const { error } = await supabase
        .from("matches")
        .update({
          status: "rejected",
          reviewed_by: user!.id,
          reviewed_at: new Date(),
        })
        .eq("id", matchId);

      if (error) throw error;

      toast.success("Match rejected");
      loadData();
    } catch (err) {
      console.error("Error rejecting match:", err);
      toast.error("Failed to reject match");
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigate("/assistant/login");
    } catch (err) {
      toast.error("Failed to logout");
    }
  };

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-700 bg-slate-800 shadow-sm">
        <div className="container mx-auto max-w-6xl px-4">
          <div className="flex items-center justify-between h-16">
            <h1 className="text-xl font-bold text-white">
              Assistant Dashboard
            </h1>
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-400">{user?.email}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-white hover:bg-slate-700"
              >
                <LogOut className="w-4 h-4 mr-1" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container max-w-6xl mx-auto px-4 py-8">
        <Tabs defaultValue="inquiries" className="space-y-6">
          <TabsList className="bg-slate-800 text-slate-200">
            <TabsTrigger value="inquiries" className="flex items-center gap-2">
              <Inbox className="w-4 h-4" />
              Pending Inquiries ({inquiries.length})
            </TabsTrigger>
            <TabsTrigger value="matches" className="flex items-center gap-2">
              <Search className="w-4 h-4" />
              Pending Matches ({matches.length})
            </TabsTrigger>
            <TabsTrigger value="inventory">Inventory</TabsTrigger>
          </TabsList>

          {/* Pending Inquiries Tab */}
          <TabsContent value="inquiries" className="space-y-4">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin h-8 w-8 text-primary"></div>
              </div>
            ) : inquiries.length === 0 ? (
              <Card className="p-12 text-center bg-slate-800 border-slate-700">
                <CheckCircle className="w-8 h-8 mx-auto text-green-400 mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">
                  All caught up!
                </h3>
                <p className="text-slate-400">
                  No pending inquiries to process
                </p>
              </Card>
            ) : (
              <div className="grid gap-4">
                {inquiries.map((inquiry) => (
                  <Card
                    key={inquiry.id}
                    className="p-6 bg-slate-800 border-slate-700 hover:border-slate-600 transition-colors"
                  >
                    <div className="space-y-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="font-bold text-lg text-white break-words">
                            {inquiry.title}
                          </h3>
                          <p className="text-slate-400 text-sm mt-1">
                            {inquiry.inquiry_type === "lost"
                              ? "😞 Lost"
                              : "🎁 Found"}{" "}
                            ·{" "}
                            {new Date(inquiry.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge
                          className={
                            inquiry.inquiry_type === "lost"
                              ? "bg-blue-600"
                              : "bg-green-600"
                          }
                        >
                          {inquiry.inquiry_type.toUpperCase()}
                        </Badge>
                      </div>

                      <p className="text-slate-300 line-clamp-2">
                        {inquiry.description}
                      </p>

                      {inquiry.location_lost_found && (
                        <p className="text-sm text-slate-400">
                          📍 {inquiry.location_lost_found}
                        </p>
                      )}

                      <Button
                        onClick={() => handleProcessInquiry(inquiry.id)}
                        disabled={processingId === inquiry.id}
                        className="w-full bg-primary hover:bg-primary/90"
                      >
                        {processingId === inquiry.id
                          ? "Processing..."
                          : "Process & Find Matches"}
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Pending Matches Tab */}
          <TabsContent value="matches" className="space-y-4">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin h-8 w-8 text-primary"></div>
              </div>
            ) : matches.length === 0 ? (
              <Card className="p-12 text-center bg-slate-800 border-slate-700">
                <AlertCircle className="w-8 h-8 mx-auto text-yellow-400 mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">
                  No pending matches
                </h3>
                <p className="text-slate-400">
                  Process inquiries to generate matches for review
                </p>
              </Card>
            ) : (
              <div className="grid gap-4">
                {matches.map((match) => (
                  <Card
                    key={match.id}
                    className="p-6 bg-slate-800 border-slate-700"
                  >
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-white">
                          Match ID: {match.id.slice(0, 8)}
                        </h3>
                        <Badge className="bg-blue-600">
                          Confidence:{" "}
                          {(match.confidence_score * 100).toFixed(0)}%
                        </Badge>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleApproveMatch(match.id)}
                          className="flex-1 bg-green-600 hover:bg-green-700"
                        >
                          ✓ Approve
                        </Button>
                        <Button
                          onClick={() => handleRejectMatch(match.id)}
                          variant="outline"
                          className="flex-1 border-red-600 text-red-400 hover:bg-red-900/20"
                        >
                          ✗ Reject
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Inventory Tab */}
          <TabsContent value="inventory">
            <div className="space-y-4">
              <Button
                onClick={() => navigate("/assistant/inventory")}
                className="w-full bg-primary hover:bg-primary/90 h-12"
              >
                Open Inventory Management
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
