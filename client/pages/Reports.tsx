import { useEffect, useState } from "react";
import { supabase, type LostFoundReport } from "@/lib/supabase";
import Header from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Search, Loader2, MapPin, Tag } from "lucide-react";
import { toast } from "sonner";

export default function Reports() {
  const [reports, setReports] = useState<LostFoundReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "lost" | "found">("all");

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("lost_found_reports")
        .select("*")
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (error) {
        console.error(
          "Supabase error fetching reports:",
          error.message,
          error.code,
          error,
        );
        throw error;
      }

      setReports(data as LostFoundReport[]);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : JSON.stringify(err);
      console.error("Error fetching reports:", errorMsg);
      toast.error(`Failed to load reports: ${errorMsg}`);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredReports = reports.filter((report) => {
    const matchesTab = activeTab === "all" || report.report_type === activeTab;
    const matchesSearch =
      searchTerm === "" ||
      report.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (report.extracted_data?.matching?.keywords || []).some((kw) =>
        kw.toLowerCase().includes(searchTerm.toLowerCase()),
      );

    return matchesTab && matchesSearch;
  });

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, string> = {
      keys: "🔑",
      wallet: "👛",
      phone: "📱",
      earbuds: "🎧",
      laptop: "💻",
      id_card: "🆔",
      bag: "🎒",
      clothing: "👕",
      jewelry: "💍",
      other: "📦",
    };
    return icons[category] || "📦";
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50 dark:from-slate-900 dark:to-slate-800">
      <Header />

      <main className="container max-w-6xl mx-auto px-4 py-8">
        <div className="space-y-8">
          {/* Header */}
          <div className="text-center space-y-3">
            <h1 className="text-4xl font-bold text-foreground">
              Lost & Found Items
            </h1>
            <p className="text-lg text-muted-foreground">
              {filteredReports.length} report
              {filteredReports.length !== 1 ? "s" : ""}
            </p>
          </div>

          {/* Search */}
          <Card className="p-6">
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                <Input
                  placeholder="Search by item name, keywords, or category..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button variant="outline" onClick={fetchReports}>
                Refresh
              </Button>
            </div>
          </Card>

          {/* Tabs */}
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as any)}
            className="w-full"
          >
            <TabsList className="grid w-full max-w-sm mx-auto grid-cols-3">
              <TabsTrigger value="all">All Items</TabsTrigger>
              <TabsTrigger value="lost">Lost</TabsTrigger>
              <TabsTrigger value="found">Found</TabsTrigger>
            </TabsList>

            {/* All Items Tab */}
            <TabsContent value={activeTab} className="mt-8">
              {isLoading ? (
                <div className="flex justify-center items-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : filteredReports.length === 0 ? (
                <Card className="p-12 text-center">
                  <div className="text-4xl mb-4">📭</div>
                  <h3 className="font-semibold text-lg text-foreground mb-2">
                    {searchTerm ? "No items found" : "No reports yet"}
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    {searchTerm
                      ? "Try different search terms"
                      : "Be the first to report a lost or found item"}
                  </p>
                  {!searchTerm && (
                    <Button asChild className="mx-auto">
                      <a href="/submit">Report an Item</a>
                    </Button>
                  )}
                </Card>
              ) : (
                <div className="grid gap-4">
                  {filteredReports.map((report) => (
                    <ReportCard
                      key={report.id}
                      report={report}
                      getCategoryIcon={getCategoryIcon}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>

          {/* Info Banner */}
          <Card className="p-6 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800 dark:text-blue-200">
                <p className="font-semibold mb-1">How it works</p>
                <p>
                  Our system automatically matches lost and found items based on
                  their description, category, color, and location. Contact us
                  through the platform if you see a match!
                </p>
              </div>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}

function ReportCard({
  report,
  getCategoryIcon,
}: {
  report: LostFoundReport;
  getCategoryIcon: (cat: string) => string;
}) {
  const extracted = report.extracted_data;
  const category = extracted.itemIdentity.category;
  const isPrimary = report.report_type === "lost" ? "primary" : "secondary";

  return (
    <Card className="p-6 hover:shadow-lg transition-shadow">
      <div className="flex gap-4">
        {/* Icon */}
        <div className="text-4xl flex-shrink-0">
          {getCategoryIcon(category)}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4 mb-3 flex-wrap">
            <div>
              <h3 className="font-bold text-lg text-foreground break-words">
                {report.title}
              </h3>
              <Badge
                className={
                  isPrimary === "primary"
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground"
                }
              >
                {report.report_type === "lost" ? "😞 Lost" : "🎁 Found"}
              </Badge>
            </div>
          </div>

          {/* Description */}
          <p className="text-muted-foreground mb-4 line-clamp-2">
            {report.description}
          </p>

          {/* Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 text-sm">
            {/* Category */}
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <span className="text-muted-foreground">
                <strong className="text-foreground capitalize">
                  {category}
                </strong>
              </span>
            </div>

            {/* Color */}
            {extracted.appearance.primaryColor && (
              <div className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded-full border-2 border-border flex-shrink-0"
                  style={{
                    backgroundColor:
                      extracted.appearance.primaryColor === "black"
                        ? "#000"
                        : extracted.appearance.primaryColor === "white"
                          ? "#fff"
                          : extracted.appearance.primaryColor === "red"
                            ? "#ef4444"
                            : extracted.appearance.primaryColor === "blue"
                              ? "#3b82f6"
                              : extracted.appearance.primaryColor === "green"
                                ? "#22c55e"
                                : extracted.appearance.primaryColor === "yellow"
                                  ? "#eab308"
                                  : extracted.appearance.primaryColor ===
                                      "orange"
                                    ? "#f97316"
                                    : extracted.appearance.primaryColor ===
                                        "purple"
                                      ? "#a855f7"
                                      : "#f3f4f6",
                  }}
                />
                <span className="text-muted-foreground">
                  <strong className="text-foreground capitalize">
                    {extracted.appearance.primaryColor}
                  </strong>
                </span>
              </div>
            )}

            {/* Material */}
            {extracted.appearance.material && (
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">
                  Material:{" "}
                  <strong className="text-foreground capitalize">
                    {extracted.appearance.material}
                  </strong>
                </span>
              </div>
            )}

            {/* Location */}
            {extracted.location.placeName && (
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <span className="text-muted-foreground">
                  <strong className="text-foreground capitalize">
                    {extracted.location.placeName}
                  </strong>
                </span>
              </div>
            )}
          </div>

          {/* Keywords */}
          {extracted.matching.keywords.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {extracted.matching.keywords.slice(0, 4).map((keyword) => (
                <Badge key={keyword} variant="outline" className="text-xs">
                  {keyword}
                </Badge>
              ))}
            </div>
          )}

          {/* Timestamp */}
          <p className="text-xs text-muted-foreground">
            Reported {new Date(report.created_at || "").toLocaleDateString()}
          </p>
        </div>
      </div>
    </Card>
  );
}
