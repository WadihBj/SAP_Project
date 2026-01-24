import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { extractItemData } from "@/lib/extraction";
import { checkRateLimit, recordInquiry } from "@/lib/fraud-prevention";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import {
  AlertCircle,
  Loader2,
  Upload,
  X,
  Image as ImageIcon,
  Shield,
  CheckCircle,
  Camera,
} from "lucide-react";
import { toast } from "sonner";

export default function NewInquiry() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [inquiryType, setInquiryType] = useState<"lost" | "found">("lost");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [dateLostFound, setDateLostFound] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [imagePreview, setImagePreview] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [descriptionQuality, setDescriptionQuality] = useState<"poor" | "fair" | "good">("poor");

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter((file) => file.type.startsWith("image/"));

    if (validFiles.length + images.length > 5) {
      toast.error("Maximum 5 images allowed");
      return;
    }

    addImagesToForm(validFiles);
  };

  const handleCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter((file) => file.type.startsWith("image/"));

    if (validFiles.length + images.length > 5) {
      toast.error("Maximum 5 images allowed");
      return;
    }

    addImagesToForm(validFiles);
  };

  const addImagesToForm = (validFiles: File[]) => {
    setImages([...images, ...validFiles]);

    // Create previews
    validFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        setImagePreview((prev) => [...prev, event.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });

    toast.success(`Added ${validFiles.length} photo(s)`);
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
    setImagePreview(imagePreview.filter((_, i) => i !== index));
  };

  // Track description quality for fraud detection
  const updateDescriptionQuality = (text: string) => {
    setDescription(text);
    
    if (text.length > 150) {
      if (text.includes("color") && text.includes("condition")) {
        setDescriptionQuality("good");
      } else if (text.length > 100) {
        setDescriptionQuality("fair");
      }
    }
  };

  const uploadImages = async (inquiryId: string): Promise<void> => {
    for (const file of images) {
      try {
        const fileName = `${inquiryId}/${Date.now()}-${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from("inquiry-images")
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const {
          data: { publicUrl },
        } = supabase.storage.from("inquiry-images").getPublicUrl(fileName);

        // Store image metadata
        await supabase.from("inquiry_images").insert([
          {
            inquiry_id: inquiryId,
            image_url: publicUrl,
            storage_path: fileName,
          },
        ]);
      } catch (err) {
        console.error("Error uploading image:", err);
        toast.error("Failed to upload image");
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !description.trim()) {
      toast.error("Please fill in title and description");
      return;
    }

    // Check rate limiting
    const rateLimit = checkRateLimit(user!.id);
    if (!rateLimit.allowed) {
      toast.error(rateLimit.reason || "Too many inquiries. Please try again later.");
      return;
    }

    setIsSubmitting(true);

    try {
      // Extract data from submission
      const extractedData = extractItemData({
        reportType: inquiryType,
        title,
        description,
        locationText: location,
        languageHint: "en",
      });

      // Create inquiry
      const { data: inquiryData, error: insertError } = await supabase
        .from("inquiries")
        .insert([
          {
            user_id: user!.id,
            inquiry_type: inquiryType,
            title,
            description,
            location_lost_found: location,
            date_lost_found: dateLostFound || null,
            status: "submitted",
            extracted_attributes: extractedData,
            description_quality: descriptionQuality,
            image_count: images.length,
          },
        ])
        .select()
        .single();

      if (insertError) {
        console.error("Supabase insert error:", insertError);
        throw new Error(`Database error: ${insertError.message || JSON.stringify(insertError)}`);
      }

      if (!inquiryData) {
        throw new Error("No data returned from insert");
      }

      // Upload images if any
      if (images.length > 0) {
        await uploadImages(inquiryData.id);
      }

      // Create status history entry
      const { error: historyError } = await supabase.from("inquiry_status_history").insert([
        {
          inquiry_id: inquiryData.id,
          old_status: null,
          new_status: "submitted",
          notes: "Inquiry submitted by user",
        },
      ]);

      if (historyError) {
        console.error("Status history error:", historyError);
        throw new Error(`Status history error: ${historyError.message}`);
      }

      // Record inquiry for rate limiting
      recordInquiry(user!.id);

      toast.success("Inquiry submitted! Our team will review it shortly.");
      navigate("/dashboard");
    } catch (err) {
      console.error("Error submitting inquiry:", err);
      const errMsg = err instanceof Error ? err.message : JSON.stringify(err);
      console.error("Full error details:", errMsg);
      toast.error(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-white shadow-sm dark:bg-slate-900">
        <div className="container mx-auto max-w-4xl px-4">
          <div className="flex items-center justify-between h-16">
            <h1 className="text-xl font-bold text-primary">New Inquiry</h1>
            <Button variant="ghost" onClick={() => navigate("/dashboard")}>
              Back
            </Button>
          </div>
        </div>
      </header>

      <main className="container max-w-4xl mx-auto px-4 py-8">
        <div className="space-y-6">
          {/* Title */}
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-bold text-foreground">
              Report a Lost or Found Item
            </h2>
            <p className="text-muted-foreground">
              Provide details and photos to help us find a match
            </p>
          </div>

          {/* Form */}
          <Card className="p-8">
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Inquiry Type */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-4">
                  What are you reporting?
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setInquiryType("lost")}
                    className={`relative p-4 rounded-lg border-2 transition-all ${
                      inquiryType === "lost"
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div className="text-2xl mb-2">😞</div>
                    <div className="font-semibold">Lost Item</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setInquiryType("found")}
                    className={`relative p-4 rounded-lg border-2 transition-all ${
                      inquiryType === "found"
                        ? "border-secondary bg-secondary/10"
                        : "border-border hover:border-secondary/50"
                    }`}
                  >
                    <div className="text-2xl mb-2">🎁</div>
                    <div className="font-semibold">Found Item</div>
                  </button>
                </div>
              </div>

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
                  disabled={isSubmitting}
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label
                  htmlFor="desc"
                  className="block text-sm font-semibold text-foreground mb-2"
                >
                  Description <span className="text-primary">*</span>
                </label>
                <Textarea
                  id="desc"
                  placeholder="Describe the item in detail. Include colors, materials, condition, distinctive marks, and contents."
                  value={description}
                  onChange={(e) => updateDescriptionQuality(e.target.value)}
                  className="min-h-32"
                  disabled={isSubmitting}
                  required
                />
                <div className="mt-2 flex items-center gap-2">
                  {descriptionQuality === "good" && (
                    <div className="flex items-center gap-1 text-sm text-green-600 dark:text-green-400">
                      <CheckCircle className="w-4 h-4" />
                      Good description quality
                    </div>
                  )}
                  {descriptionQuality === "fair" && (
                    <div className="text-sm text-amber-600 dark:text-amber-400">
                      Fair - Add more details for better matches
                    </div>
                  )}
                  {descriptionQuality === "poor" && description.length > 20 && (
                    <div className="text-sm text-muted-foreground">
                      Add more details (color, condition, distinctive features)
                    </div>
                  )}
                </div>
              </div>

              {/* Location */}
              <div>
                <label
                  htmlFor="location"
                  className="block text-sm font-semibold text-foreground mb-2"
                >
                  Location (Where was it lost/found?){" "}
                  <span className="text-muted-foreground font-normal">
                    (Optional)
                  </span>
                </label>
                <Input
                  id="location"
                  placeholder="e.g., Library Building 2nd Floor"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>

              {/* Date */}
              <div>
                <label
                  htmlFor="date"
                  className="block text-sm font-semibold text-foreground mb-2"
                >
                  Date{" "}
                  <span className="text-muted-foreground font-normal">
                    (Optional)
                  </span>
                </label>
                <Input
                  id="date"
                  type="date"
                  value={dateLostFound}
                  onChange={(e) => setDateLostFound(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>

              {/* Image Upload */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-4">
                  Photos{" "}
                  <span className="text-muted-foreground font-normal">
                    (Optional, up to 5)
                  </span>
                </label>

                {/* Upload and Camera Buttons */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center justify-center gap-2 p-4 border-2 border-border rounded-lg hover:border-primary hover:bg-primary/5 transition-colors"
                    disabled={isSubmitting}
                  >
                    <Upload className="w-5 h-5" />
                    <span className="font-medium text-sm">Upload Photos</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="flex items-center justify-center gap-2 p-4 border-2 border-border rounded-lg hover:border-primary hover:bg-primary/5 transition-colors"
                    disabled={isSubmitting}
                  >
                    <Camera className="w-5 h-5" />
                    <span className="font-medium text-sm">Take Photo</span>
                  </button>
                </div>

                {/* File Input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                  disabled={isSubmitting}
                />

                {/* Camera Input */}
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleCameraCapture}
                  className="hidden"
                  disabled={isSubmitting}
                />

                {/* Upload Area (Drag & Drop) */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors mb-4"
                >
                  <ImageIcon className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="font-medium text-foreground">
                    Click to upload or take photos
                  </p>
                  <p className="text-sm text-muted-foreground">
                    or drag and drop images here
                  </p>
                </div>

                {/* Image Previews */}
                {images.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-foreground mb-3">
                      {images.length} photo{images.length !== 1 ? "s" : ""} added
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                      {imagePreview.map((preview, idx) => (
                        <div key={idx} className="relative group">
                          <img
                            src={preview}
                            alt={`Preview ${idx + 1}`}
                            className="w-full h-32 object-cover rounded-lg"
                          />
                          <button
                            type="button"
                            onClick={() => removeImage(idx)}
                            className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Privacy Warning */}
              <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 flex gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-amber-800 dark:text-amber-200">
                  <p className="font-semibold mb-1">Privacy Notice</p>
                  <p>
                    Never include personal information, phone numbers, or email
                    addresses in your photos or description. We'll handle all
                    communications securely.
                  </p>
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full h-12 text-base font-semibold"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit Inquiry"
                )}
              </Button>
            </form>
          </Card>
        </div>
      </main>
    </div>
  );
}
