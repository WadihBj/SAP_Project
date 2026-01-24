import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, MapPin, Calendar, FileText } from "lucide-react";
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
  confidence_score: number;
  inventory_item_id: string;
  status: string;
}

export default function InquiryDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [inquiry, setInquiry] = useState<Inquiry | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    loadInquiry();
  }, [id]);

  const loadInquiry = async () => {
    try {
      const { data, error } = await supabase
        .from("inquiries")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      setInquiry(data as Inquiry);

      // Load matches for this inquiry
      const { data: matchesData } = await supabase
        .from("matches")
        .select("*")
        .eq("inquiry_id", id)
        .order("confidence_score", { ascending: false });

      setMatches(matchesData as Match[]);
    } catch (err) {
      console.error("Error loading inquiry:", err);
      toast.error("Failed to load inquiry");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!inquiry) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50 dark:from-slate-900 dark:to-slate-800">
        <div className="container max-w-4xl mx-auto px-4 py-8">
          <Button
            onClick={() => navigate("/dashboard")}
            variant="outline"
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          <Card className="p-12 text-center">
            <h2 className="text-2xl font-bold text-foreground mb-2">
              Inquiry not found
            </h2>
            <p className="text-muted-foreground mb-6">
              The inquiry you're looking for doesn't exist.
            </p>
            <Button onClick={() => navigate("/dashboard")}>
              Return to Dashboard
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-white shadow-sm dark:bg-slate-900">
        <div className="container max-w-4xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <h1 className="text-xl font-bold text-primary">Inquiry Details</h1>
            <Button onClick={() => navigate("/dashboard")} variant="ghost">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </div>
        </div>
      </header>

      <main className="container max-w-4xl mx-auto px-4 py-8">
        <div className="space-y-6">
          {/* Inquiry Card */}
          <Card className="p-8">
            <div className="flex items-start justify-between gap-4 mb-6">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h2 className="text-3xl font-bold text-foreground">
                    {inquiry.title}
                  </h2>
                  <Badge
                    className={
                      inquiry.inquiry_type === "lost"
                        ? "bg-blue-600"
                        : "bg-green-600"
                    }
                  >
                    {inquiry.inquiry_type === "lost" ? "😞 Lost" : "🎁 Found"}
                  </Badge>
                </div>
                <Badge variant="outline" className="mb-4">
                  Status: {inquiry.status.replace(/_/g, " ").toUpperCase()}
                </Badge>
              </div>
            </div>

            {/* Description */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-foreground mb-2">
                Description
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {inquiry.description}
              </p>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              {inquiry.location_lost_found && (
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">
                    Location
                  </label>
                  <div className="flex items-center gap-2 mt-1">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <p className="text-foreground">
                      {inquiry.location_lost_found}
                    </p>
                  </div>
                </div>
              )}
              <div>
                <label className="text-xs font-semibold text-muted-foreground">
                  Submitted
                </label>
                <div className="flex items-center gap-2 mt-1">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <p className="text-foreground">
                    {new Date(inquiry.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Extracted Attributes */}
            {inquiry.extracted_attributes && (
              <div className="border-t pt-6">
                <h3 className="text-sm font-semibold text-foreground mb-3">
                  Extracted Item Details
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  {inquiry.extracted_attributes.itemIdentity?.category && (
                    <div>
                      <label className="text-xs text-muted-foreground">
                        Category
                      </label>
                      <p className="text-foreground font-medium capitalize">
                        {inquiry.extracted_attributes.itemIdentity.category}
                      </p>
                    </div>
                  )}
                  {inquiry.extracted_attributes.appearance?.primaryColor && (
                    <div>
                      <label className="text-xs text-muted-foreground">
                        Primary Color
                      </label>
                      <p className="text-foreground font-medium capitalize">
                        {inquiry.extracted_attributes.appearance.primaryColor}
                      </p>
                    </div>
                  )}
                  {inquiry.extracted_attributes.appearance?.material && (
                    <div>
                      <label className="text-xs text-muted-foreground">
                        Material
                      </label>
                      <p className="text-foreground font-medium capitalize">
                        {inquiry.extracted_attributes.appearance.material}
                      </p>
                    </div>
                  )}
                  {inquiry.extracted_attributes.appearance?.condition && (
                    <div>
                      <label className="text-xs text-muted-foreground">
                        Condition
                      </label>
                      <p className="text-foreground font-medium capitalize">
                        {inquiry.extracted_attributes.appearance.condition}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </Card>

          {/* Matches Section */}
          {matches.length > 0 && (
            <Card className="p-8">
              <h3 className="text-2xl font-bold text-foreground mb-6">
                Potential Matches ({matches.length})
              </h3>
              <div className="space-y-4">
                {matches.map((match) => (
                  <div key={match.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-foreground">
                        Match ID: {match.id.slice(0, 8)}
                      </p>
                      <Badge className="bg-blue-600">
                        Confidence: {(match.confidence_score * 100).toFixed(0)}%
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      Status: {match.status.replace(/_/g, " ")}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {matches.length === 0 && inquiry.status !== "submitted" && (
            <Card className="p-8 text-center">
              <FileText className="w-8 h-8 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                No matches found yet. Check back soon!
              </p>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
