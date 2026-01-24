import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { extractItemData } from "@/lib/extraction";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";

type ReportType = "lost" | "found";

export default function Submit() {
  const navigate = useNavigate();
  const [reportType, setReportType] = useState<ReportType>("lost");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [locationText, setLocationText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !description.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);

    try {
      // Extract data using the extraction logic
      const extractedData = extractItemData({
        reportType,
        title,
        description,
        locationText,
        languageHint: "en",
      });

      // Insert into Supabase
      const { error } = await supabase.from("lost_found_reports").insert([
        {
          report_type: reportType,
          title,
          description,
          location_text: locationText,
          language: "en",
          extracted_data: extractedData,
          status: "active",
        },
      ]);

      if (error) {
        console.error(
          "Supabase error submitting report:",
          error.message,
          error.code,
          error,
        );
        throw error;
      }

      toast.success("Report submitted successfully! 🎉");
      setTimeout(() => navigate("/reports"), 1000);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : JSON.stringify(err);
      console.error("Error submitting report:", errorMsg);
      toast.error(`Failed to submit report. Error: ${errorMsg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50 dark:from-slate-900 dark:to-slate-800">
      <Header />

      <main className="container max-w-2xl mx-auto px-4 py-8">
        <div className="space-y-8">
          {/* Header */}
          <div className="text-center space-y-3">
            <h1 className="text-4xl font-bold text-foreground">
              Report an Item
            </h1>
            <p className="text-lg text-muted-foreground">
              Help reunite lost items with their owners
            </p>
          </div>

          {/* Report Type Selection */}
          <Card className="p-6">
            <label className="block text-sm font-semibold text-foreground mb-4">
              What are you reporting?
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setReportType("lost")}
                className={`relative p-4 rounded-lg border-2 transition-all ${
                  reportType === "lost"
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <div className="text-2xl mb-2">😞</div>
                <div className="font-semibold">Lost Item</div>
                <div className="text-xs text-muted-foreground">
                  I lost something
                </div>
              </button>

              <button
                type="button"
                onClick={() => setReportType("found")}
                className={`relative p-4 rounded-lg border-2 transition-all ${
                  reportType === "found"
                    ? "border-secondary bg-secondary/10"
                    : "border-border hover:border-secondary/50"
                }`}
              >
                <div className="text-2xl mb-2">🎁</div>
                <div className="font-semibold">Found Item</div>
                <div className="text-xs text-muted-foreground">
                  I found something
                </div>
              </button>
            </div>
          </Card>

          {/* Form */}
          <Card className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Title */}
              <div>
                <label
                  htmlFor="title"
                  className="block text-sm font-semibold text-foreground mb-2"
                >
                  Item Title <span className="text-primary">*</span>
                </label>
                <Input
                  id="title"
                  placeholder="e.g., Blue iPhone 15 Pro, Red Leather Wallet"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full"
                  disabled={isSubmitting}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Be specific about the item and its notable features
                </p>
              </div>

              {/* Description */}
              <div>
                <label
                  htmlFor="description"
                  className="block text-sm font-semibold text-foreground mb-2"
                >
                  Description <span className="text-primary">*</span>
                </label>
                <Textarea
                  id="description"
                  placeholder="Describe the item in detail. Include colors, materials, condition, any distinctive marks, and what might be inside. The more details, the better chance of finding a match!"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full min-h-32"
                  disabled={isSubmitting}
                />
              </div>

              {/* Location */}
              <div>
                <label
                  htmlFor="location"
                  className="block text-sm font-semibold text-foreground mb-2"
                >
                  Where was it lost/found?{" "}
                  <span className="text-muted-foreground font-normal">
                    (Optional)
                  </span>
                </label>
                <Input
                  id="location"
                  placeholder="e.g., Library Building 2nd Floor, Downtown Metro Station"
                  value={locationText}
                  onChange={(e) => setLocationText(e.target.value)}
                  className="w-full"
                  disabled={isSubmitting}
                />
              </div>

              {/* Info Box */}
              <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 flex gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-amber-800 dark:text-amber-200">
                  <p className="font-semibold mb-1">Privacy & Safety</p>
                  <p>
                    Never share personal contact information, phone numbers, or
                    email addresses in your report. Matches will be made
                    securely.
                  </p>
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-12 text-base font-semibold"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Submit Report
                  </>
                )}
              </Button>
            </form>
          </Card>

          {/* Tips */}
          <Card className="p-6 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
            <h3 className="font-semibold text-foreground mb-3">
              📋 Tips for Better Matches
            </h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>✓ Include brand and model (e.g., "Apple AirPods Pro")</li>
              <li>✓ Describe colors and materials in detail</li>
              <li>✓ Mention any damage, stickers, or unique markings</li>
              <li>✓ List what was inside the item</li>
              <li>✓ Be specific about location and approximate time</li>
            </ul>
          </Card>
        </div>
      </main>
    </div>
  );
}
