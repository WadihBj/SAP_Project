import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { generateVerificationQuestions } from "@/lib/matching";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  FileText,
  Image as ImageIcon,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  Award,
} from "lucide-react";
import { toast } from "sonner";

interface Inquiry {
  id: string;
  title: string;
  description: string;
  inquiry_type: "lost" | "found";
  status: string;
  created_at: string;
  date_lost_found?: string;
  location_lost_found?: string;
  extracted_attributes?: any;
}

interface Match {
  id: string;
  inventory_item_id: string;
  inquiry_id: string;
  confidence_score: number;
  final_confidence: number;
  status: string;
  created_at: string;
  matching_details?: any;
}

interface InventoryItem {
  id: string;
  title: string;
  description?: string;
  category: string;
  primary_color?: string;
  material?: string;
  condition?: string;
  distinctive_marks?: string;
}

export default function InquiryDetails() {
  const { id: inquiryId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [inquiry, setInquiry] = useState<Inquiry | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [inventoryItems, setInventoryItems] = useState<
    Record<string, InventoryItem>
  >({});
  const [images, setImages] = useState<any[]>([]);
  const [statusHistory, setStatusHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [verificationAnswers, setVerificationAnswers] = useState<
    Record<string, string>
  >({});
  const [verificationQuestions, setVerificationQuestions] = useState<
    { question: string; expectedFormat: string }[]
  >([]);
  const [isSubmittingVerification, setIsSubmittingVerification] =
    useState(false);

  useEffect(() => {
    loadData();
  }, [inquiryId]);

  const loadData = async () => {
    if (!inquiryId) return;

    try {
      setIsLoading(true);

      // Load inquiry
      const { data: inquiryData, error: inquiryError } = await supabase
        .from("inquiries")
        .select("*")
        .eq("id", inquiryId)
        .single();

      if (inquiryError) throw inquiryError;
      setInquiry(inquiryData);

      // Load images
      const { data: imagesData } = await supabase
        .from("inquiry_images")
        .select("*")
        .eq("inquiry_id", inquiryId);
      setImages(imagesData || []);

      // Load matches
      const { data: matchesData } = await supabase
        .from("matches")
        .select("*")
        .eq("inquiry_id", inquiryId)
        .order("final_confidence", { ascending: false });
      setMatches(matchesData || []);

      // Load inventory items for matches
      if (matchesData && matchesData.length > 0) {
        const itemIds = matchesData.map((m) => m.inventory_item_id);
        const { data: itemsData } = await supabase
          .from("inventory_items")
          .select("*")
          .in("id", itemIds);

        const itemsMap: Record<string, InventoryItem> = {};
        itemsData?.forEach((item) => {
          itemsMap[item.id] = item;
        });
        setInventoryItems(itemsMap);
      }

      // Load status history
      const { data: historyData } = await supabase
        .from("inquiry_status_history")
        .select("*")
        .eq("inquiry_id", inquiryId)
        .order("created_at", { ascending: true });
      setStatusHistory(historyData || []);
    } catch (err) {
      console.error("Error loading inquiry details:", err);
      toast.error("Failed to load inquiry details");
    } finally {
      setIsLoading(false);
    }
  };

  const handleMatchSelect = async (matchId: string, itemId: string) => {
    setSelectedMatchId(matchId);

    // Generate verification questions
    const item = inventoryItems[itemId];
    if (item) {
      const questions = await generateVerificationQuestions(matchId, item);
      // Convert string array to expected format
      const formattedQuestions = questions.map((q) => ({
        question: q,
        expectedFormat: "Your answer",
      }));
      setVerificationQuestions(formattedQuestions);
      setVerificationAnswers({});
    }
  };

  const handleVerificationSubmit = async () => {
    if (!selectedMatchId || Object.keys(verificationAnswers).length === 0) {
      toast.error("Please answer at least one question");
      return;
    }

    setIsSubmittingVerification(true);

    try {
      // Save verification responses
      await supabase.from("match_verification_responses").insert([
        {
          match_id: selectedMatchId,
          responses: verificationAnswers,
          submitted_at: new Date().toISOString(),
        },
      ]);

      // Update match status
      await supabase
        .from("matches")
        .update({ status: "verification_submitted" })
        .eq("id", selectedMatchId);

      toast.success("Verification submitted! Assistants will review your answers.");
      setSelectedMatchId(null);
      setVerificationAnswers({});
      loadData();
    } catch (err) {
      console.error("Error submitting verification:", err);
      toast.error("Failed to submit verification");
    } finally {
      setIsSubmittingVerification(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "submitted":
        return <Clock className="w-5 h-5" />;
      case "under_review":
        return <AlertCircle className="w-5 h-5" />;
      case "matched":
        return <CheckCircle2 className="w-5 h-5" />;
      case "resolved":
        return <Award className="w-5 h-5" />;
      default:
        return <FileText className="w-5 h-5" />;
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!inquiry) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Inquiry not found</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-white shadow-sm dark:bg-slate-900">
        <div className="container mx-auto max-w-4xl px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => navigate("/dashboard")}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <h1 className="text-xl font-bold">{inquiry.title}</h1>
              <Badge className={getStatusColor(inquiry.status)}>
                {inquiry.status.replace(/_/g, " ")}
              </Badge>
            </div>
          </div>
        </div>
      </header>

      <main className="container max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Inquiry Overview */}
        <Card className="p-6">
          <div className="space-y-6">
            {/* Type and Date */}
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Type</p>
                <p className="text-lg font-semibold capitalize">
                  {inquiry.inquiry_type === "lost" ? "😞 Lost Item" : "🎁 Found Item"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Submitted</p>
                <p className="text-sm font-medium">
                  {new Date(inquiry.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>

            {/* Description */}
            <div>
              <p className="text-sm text-muted-foreground mb-2">Description</p>
              <p className="text-foreground">{inquiry.description}</p>
            </div>

            {/* Location and Date */}
            {(inquiry.location_lost_found || inquiry.date_lost_found) && (
              <div className="grid grid-cols-2 gap-4">
                {inquiry.location_lost_found && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1 flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      Location
                    </p>
                    <p className="text-foreground">{inquiry.location_lost_found}</p>
                  </div>
                )}
                {inquiry.date_lost_found && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1 flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Date
                    </p>
                    <p className="text-foreground">
                      {new Date(inquiry.date_lost_found).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Images */}
            {images.length > 0 && (
              <div>
                <p className="text-sm text-muted-foreground mb-3 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" />
                  Photos ({images.length})
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {images.map((img) => (
                    <img
                      key={img.id}
                      src={img.image_url}
                      alt="Inquiry photo"
                      className="w-full h-32 object-cover rounded-lg"
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Status Timeline */}
        {statusHistory.length > 0 && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Status History</h3>
            <div className="space-y-4">
              {statusHistory.map((history, idx) => (
                <div key={idx} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    {getStatusIcon(history.new_status)}
                    {idx < statusHistory.length - 1 && (
                      <div className="w-0.5 h-12 bg-border mt-2" />
                    )}
                  </div>
                  <div className="pb-4">
                    <p className="font-semibold capitalize">
                      {history.new_status.replace(/_/g, " ")}
                    </p>
                    {history.notes && (
                      <p className="text-sm text-muted-foreground">{history.notes}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(history.created_at).toLocaleDateString()}{" "}
                      {new Date(history.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Matches */}
        {matches.length > 0 ? (
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">
              Potential Matches ({matches.length})
            </h3>

            <Tabs defaultValue="list" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="list">All Matches</TabsTrigger>
                <TabsTrigger value="verify">Verification</TabsTrigger>
              </TabsList>

              <TabsContent value="list" className="space-y-4 mt-6">
                {matches.map((match) => {
                  const item = inventoryItems[match.inventory_item_id];
                  if (!item) return null;

                  const confidencePercent = Math.round(
                    (match.final_confidence || match.confidence_score) * 100
                  );

                  return (
                    <div
                      key={match.id}
                      className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-semibold">{item.title}</h4>
                          <p className="text-sm text-muted-foreground">
                            {item.category}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-lg">
                            {confidencePercent}%
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Match Score
                          </p>
                        </div>
                      </div>

                      {item.description && (
                        <p className="text-sm text-foreground mb-3">
                          {item.description}
                        </p>
                      )}

                      {/* Details */}
                      <div className="grid grid-cols-2 gap-2 text-sm mb-4">
                        {item.primary_color && (
                          <div>
                            <p className="text-muted-foreground">Color</p>
                            <p className="font-medium capitalize">
                              {item.primary_color}
                            </p>
                          </div>
                        )}
                        {item.condition && (
                          <div>
                            <p className="text-muted-foreground">Condition</p>
                            <p className="font-medium capitalize">
                              {item.condition}
                            </p>
                          </div>
                        )}
                      </div>

                      <Button
                        onClick={() =>
                          handleMatchSelect(match.id, match.inventory_item_id)
                        }
                        variant="outline"
                        className="w-full"
                      >
                        This is my item!
                      </Button>
                    </div>
                  );
                })}
              </TabsContent>

              <TabsContent value="verify" className="space-y-6 mt-6">
                {selectedMatchId ? (
                  <div>
                    <h4 className="font-semibold mb-4">Verify Ownership</h4>
                    <div className="space-y-4">
                      {verificationQuestions.map((q, idx) => (
                        <div key={idx}>
                          <label className="text-sm font-medium mb-2 block">
                            {q.question}
                          </label>
                          <Textarea
                            placeholder="Your answer"
                            value={
                              verificationAnswers[`q_${idx}`] || ""
                            }
                            onChange={(e) =>
                              setVerificationAnswers({
                                ...verificationAnswers,
                                [`q_${idx}`]: e.target.value,
                              })
                            }
                            className="min-h-20"
                          />
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-3 mt-6">
                      <Button
                        onClick={() => setSelectedMatchId(null)}
                        variant="outline"
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleVerificationSubmit}
                        disabled={isSubmittingVerification}
                        className="flex-1"
                      >
                        {isSubmittingVerification ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Submitting...
                          </>
                        ) : (
                          "Submit Verification"
                        )}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground">
                    Select a match from the list to verify ownership
                  </p>
                )}
              </TabsContent>
            </Tabs>
          </Card>
        ) : (
          <Card className="p-6 text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">
              {inquiry.status === "submitted"
                ? "No matches found yet. Assistants are reviewing your inquiry."
                : "No matches available for this inquiry."}
            </p>
          </Card>
        )}
      </main>
    </div>
  );
}
