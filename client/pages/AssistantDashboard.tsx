import { useState, useEffect } from "react";
import { supabase, LostItem, ItemStatus, UserInquiry, InquiryMatch } from "../lib/supabase";
import { Search, Upload, Image as ImageIcon, Edit2, MessageSquare, CheckCircle2 } from "lucide-react";

export default function AssistantDashboard() {
  const [activeTab, setActiveTab] = useState<"items" | "inquiries">("items");
  const [items, setItems] = useState<LostItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  
  // Inquiry state
  const [inquiries, setInquiries] = useState<UserInquiry[]>([]);
  const [inquirySearch, setInquirySearch] = useState("");
  const [selectedInquiry, setSelectedInquiry] = useState<UserInquiry | null>(null);
  const [inquiryMatches, setInquiryMatches] = useState<InquiryMatch[]>([]);
  const [loadingInquiries, setLoadingInquiries] = useState(false);
  
  // Upload form state
  const [itemName, setItemName] = useState("");
  const [description, setDescription] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  // Mark as found state
  const [foundItemId, setFoundItemId] = useState<string | null>(null);
  const [founderName, setFounderName] = useState("");
  
  // Edit item state
  const [editingItem, setEditingItem] = useState<LostItem | null>(null);
  const [editItemName, setEditItemName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editStatus, setEditStatus] = useState<ItemStatus>("submitted");
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadItems();
    if (activeTab === "inquiries") {
      loadInquiries();
    }
  }, [activeTab]);

  const loadItems = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("lost_items")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error("Error loading items:", error);
      alert("Error loading items. Please check your database connection.");
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName || !description) {
      alert("Please fill in item name and description");
      return;
    }

    try {
      setUploading(true);
      let imageUrl = null;
      let imageUploadWarning = null;

      // Upload image if provided (make it optional - don't fail if bucket doesn't exist)
      if (imageFile) {
        try {
          const fileExt = imageFile.name.split(".").pop() || "jpg";
          const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
          const filePath = `lost-items/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from("item-images")
            .upload(filePath, imageFile, {
              cacheControl: "3600",
              upsert: false,
            });

          if (uploadError) {
            // If bucket doesn't exist or upload fails, just warn but continue
            console.warn("Image upload failed:", uploadError);
            const errorMsg = uploadError.message || "Unknown error";
            if (errorMsg.includes("Bucket not found") || errorMsg.includes("does not exist")) {
              imageUploadWarning = "⚠️ Storage bucket 'item-images' not found. Please create it in Supabase Storage (see instructions below). Item saved without image.";
            } else {
              imageUploadWarning = `⚠️ Image upload failed: ${errorMsg}. Item saved without image.`;
            }
          } else {
            const { data: urlData } = supabase.storage
              .from("item-images")
              .getPublicUrl(filePath);

            imageUrl = urlData?.publicUrl || null;
          }
        } catch (imageError: any) {
          // Catch any image upload errors and continue without image
          console.warn("Image upload error:", imageError);
          imageUploadWarning = "Note: Image upload failed. Item saved without image.";
        }
      }

      // Insert item into database (always try this even if image failed)
      const { error } = await supabase.from("lost_items").insert({
        item_name: itemName,
        description: description,
        image_url: imageUrl,
        status: "submitted",
      });

      if (error) throw error;

      // Reset form
      setItemName("");
      setDescription("");
      setImageFile(null);
      setImagePreview(null);
      
      // Reload items
      await loadItems();
      
      // Show success message with optional warning
      if (imageUploadWarning) {
        alert(`Item uploaded successfully!\n\n${imageUploadWarning}`);
      } else {
        alert("Item uploaded successfully!");
      }
    } catch (error: any) {
      console.error("Error uploading item:", error);
      alert(error?.message ? `Upload failed: ${error.message}` : "Error uploading item. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleMarkAsFound = async () => {
    if (!foundItemId || !founderName.trim()) {
      alert("Please enter the founder's name");
      return;
    }

    try {
      const { error } = await supabase
        .from("lost_items")
        .update({
          status: "found",
          founder_name: founderName.trim(),
          found_at: new Date().toISOString(),
        })
        .eq("id", foundItemId);

      if (error) throw error;

      setFoundItemId(null);
      setFounderName("");
      await loadItems();
      alert("Item marked as found!");
    } catch (error) {
      console.error("Error marking item as found:", error);
      alert("Error updating item. Please try again.");
    }
  };

  const handleEditClick = (item: LostItem) => {
    setEditingItem(item);
    setEditItemName(item.item_name);
    setEditDescription(item.description);
    setEditStatus(item.status);
    setEditImagePreview(item.image_url);
    setEditImageFile(null);
  };

  const handleEditImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setEditImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingItem || !editItemName || !editDescription) {
      alert("Please fill in all required fields");
      return;
    }

    try {
      setSaving(true);
      let imageUrl = editingItem.image_url;
      let imageUploadWarning = null;

      // Upload new image if provided
      if (editImageFile) {
        try {
          const fileExt = editImageFile.name.split(".").pop() || "jpg";
          const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
          const filePath = `lost-items/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from("item-images")
            .upload(filePath, editImageFile, {
              cacheControl: "3600",
              upsert: false,
            });

          if (uploadError) {
            console.warn("Image upload failed:", uploadError);
            imageUploadWarning = "Note: New image could not be uploaded. Keeping existing image.";
          } else {
            const { data: urlData } = supabase.storage
              .from("item-images")
              .getPublicUrl(filePath);

            imageUrl = urlData?.publicUrl || imageUrl;
          }
        } catch (imageError: any) {
          console.warn("Image upload error:", imageError);
          imageUploadWarning = "Note: New image upload failed. Keeping existing image.";
        }
      }

      // Update item in database
      const updateData: any = {
        item_name: editItemName,
        description: editDescription,
        status: editStatus,
        image_url: imageUrl,
      };

      // Only update founder info if status is "found"
      if (editStatus === "found" && !editingItem.founder_name) {
        updateData.found_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("lost_items")
        .update(updateData)
        .eq("id", editingItem.id);

      if (error) throw error;

      // Reset edit state
      setEditingItem(null);
      setEditItemName("");
      setEditDescription("");
      setEditStatus("submitted");
      setEditImageFile(null);
      setEditImagePreview(null);

      await loadItems();
      if (imageUploadWarning) {
        alert(`Item updated successfully!\n\n${imageUploadWarning}`);
      } else {
        alert("Item updated successfully!");
      }
    } catch (error: any) {
      console.error("Error updating item:", error);
      alert(error?.message ? `Update failed: ${error.message}` : "Error updating item. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const loadInquiries = async () => {
    try {
      setLoadingInquiries(true);
      const { data, error } = await supabase
        .from("user_inquiries")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setInquiries(data || []);
    } catch (error) {
      console.error("Error loading inquiries:", error);
      alert("Error loading inquiries. Please check your database connection.");
    } finally {
      setLoadingInquiries(false);
    }
  };

  const loadInquiryMatches = async (inquiryId: string) => {
    try {
      const { data, error } = await supabase
        .from("inquiry_matches")
        .select("*, lost_items(*)")
        .eq("inquiry_id", inquiryId)
        .order("confidence_score", { ascending: false });

      if (error) throw error;
      setInquiryMatches(data || []);
    } catch (error) {
      console.error("Error loading matches:", error);
    }
  };

  const handleViewInquiry = async (inquiry: UserInquiry) => {
    setSelectedInquiry(inquiry);
    await loadInquiryMatches(inquiry.id);
  };

  const handleApproveMatch = async (matchId: string) => {
    try {
      // Update match approval
      const { error: matchError } = await supabase
        .from("inquiry_matches")
        .update({ assistant_approved: true })
        .eq("id", matchId);

      if (matchError) throw matchError;

      // Update inquiry status
      if (selectedInquiry) {
        const { error: inquiryError } = await supabase
          .from("user_inquiries")
          .update({ status: "matched" })
          .eq("id", selectedInquiry.id);

        if (inquiryError) throw inquiryError;
      }

      await loadInquiryMatches(selectedInquiry!.id);
      await loadInquiries();
      alert("Match approved successfully!");
    } catch (error) {
      console.error("Error approving match:", error);
      alert("Error approving match. Please try again.");
    }
  };

  const getStatusColor = (status: ItemStatus) => {
    switch (status) {
      case "submitted":
        return "bg-blue-100 text-blue-800 border-blue-300";
      case "under-review":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "match found":
        return "bg-purple-100 text-purple-800 border-purple-300";
      case "found":
        return "bg-green-100 text-green-800 border-green-300";
      case "lost":
        return "bg-gray-100 text-gray-800 border-gray-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  const getInquiryStatusColor = (status: string) => {
    switch (status) {
      case "submitted":
        return "bg-blue-100 text-blue-800 border-blue-300";
      case "under-review":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "matched":
        return "bg-purple-100 text-purple-800 border-purple-300";
      case "resolved":
        return "bg-green-100 text-green-800 border-green-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  const filteredInquiries = inquiries.filter((inquiry) => {
    if (!inquirySearch) return true;
    const search = inquirySearch.toLowerCase();
    return (
      inquiry.inquiry_number.toString().includes(search) ||
      inquiry.phone_number.toLowerCase().includes(search) ||
      inquiry.extracted_title?.toLowerCase().includes(search) ||
      inquiry.extracted_description?.toLowerCase().includes(search)
    );
  });

  const filteredItems = items.filter((item) =>
    item.item_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Lost & Found - Assistant Portal
        </h1>

        {/* Tabs */}
        <div className="flex gap-4 mb-6 border-b border-gray-200">
          <button
            onClick={() => setActiveTab("items")}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === "items"
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <Upload className="w-4 h-4 inline mr-2" />
            Lost Items Catalog
          </button>
          <button
            onClick={() => setActiveTab("inquiries")}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === "inquiries"
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <MessageSquare className="w-4 h-4 inline mr-2" />
            User Inquiries
          </button>
        </div>

        {activeTab === "items" && (
          <>
        {/* Upload Form */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Upload New Lost Item
          </h2>
          <form onSubmit={handleUpload} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Item Name *
              </label>
              <input
                type="text"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., iPhone 13, Black Wallet"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description *
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Describe the item in detail..."
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Item Picture (Optional)
              </label>
              <div className="flex items-center gap-4">
                <label className="cursor-pointer flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors">
                  <ImageIcon className="w-5 h-5" />
                  <span>Choose Image</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </label>
                {imagePreview && (
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-24 h-24 object-cover rounded-md border border-gray-300"
                  />
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={uploading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {uploading ? "Uploading..." : "Upload Item"}
            </button>
          </form>
        </div>

        {/* Search and Items List */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search items by name or description..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="text-sm text-gray-600">
              {filteredItems.length} item{filteredItems.length !== 1 ? "s" : ""}
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading items...</div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              {searchQuery ? "No items match your search." : "No items found. Upload your first item above!"}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  className="border-2 border-gray-200 rounded-lg p-4 bg-white hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-lg font-semibold text-gray-900 flex-1">
                      {item.item_name}
                    </h3>
                    <button
                      onClick={() => handleEditClick(item)}
                      className="p-1 hover:bg-gray-100 rounded transition-colors"
                      title="Edit item"
                    >
                      <Edit2 className="w-4 h-4 text-gray-600" />
                    </button>
                  </div>

                  <div className="mb-3">
                    <span className={`inline-block px-2 py-1 text-xs font-semibold rounded border ${getStatusColor(item.status)}`}>
                      {item.status}
                    </span>
                  </div>

                  {item.image_url && (
                    <img
                      src={item.image_url}
                      alt={item.item_name}
                      className="w-full h-48 object-cover rounded-md mb-3"
                    />
                  )}

                  <p className="text-sm text-gray-600 mb-3">{item.description}</p>

                  {item.status === "found" && item.founder_name && (
                    <div className="mb-3 p-2 bg-green-100 rounded-md">
                      <p className="text-sm text-green-800">
                        <strong>Found by:</strong> {item.founder_name}
                      </p>
                      {item.found_at && (
                        <p className="text-xs text-green-700 mt-1">
                          Found on: {new Date(item.found_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  )}

                  {item.status !== "found" && (
                    <button
                      onClick={() => setFoundItemId(item.id)}
                      className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition-colors text-sm"
                    >
                      Mark as Found
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Mark as Found Modal */}
        {foundItemId && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-xl font-semibold mb-4">Mark Item as Found</h3>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Founder's Name *
                </label>
                <input
                  type="text"
                  value={founderName}
                  onChange={(e) => setFounderName(e.target.value)}
                  placeholder="Enter the name of the person who found it"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  autoFocus
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleMarkAsFound}
                  className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition-colors"
                >
                  Confirm
                </button>
                <button
                  onClick={() => {
                    setFoundItemId(null);
                    setFounderName("");
                  }}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Item Modal */}
        {editingItem && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 my-8">
              <h3 className="text-xl font-semibold mb-4">Edit Item</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Item Name *
                  </label>
                  <input
                    type="text"
                    value={editItemName}
                    onChange={(e) => setEditItemName(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description *
                  </label>
                  <textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status *
                  </label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as ItemStatus)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="submitted">Submitted</option>
                    <option value="under-review">Under Review</option>
                    <option value="match found">Match Found</option>
                    <option value="lost">Lost</option>
                    <option value="found">Found</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Item Picture
                  </label>
                  <div className="flex items-center gap-4">
                    <label className="cursor-pointer flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors">
                      <ImageIcon className="w-5 h-5" />
                      <span>Change Image</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleEditImageChange}
                        className="hidden"
                      />
                    </label>
                    {editImagePreview && (
                      <img
                        src={editImagePreview}
                        alt="Preview"
                        className="w-24 h-24 object-cover rounded-md border border-gray-300"
                      />
                    )}
                  </div>
                </div>

                {editStatus === "found" && !editingItem.founder_name && (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                    <p className="text-sm text-yellow-800">
                      Note: When marking as "Found", you may want to use the "Mark as Found" button to add founder information.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleSaveEdit}
                  disabled={saving}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
                <button
                  onClick={() => {
                    setEditingItem(null);
                    setEditItemName("");
                    setEditDescription("");
                    setEditStatus("submitted");
                    setEditImageFile(null);
                    setEditImagePreview(null);
                  }}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
          </>
        )}

        {activeTab === "inquiries" && (
          <>
            {/* Inquiry Search */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-8">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                User Inquiries
              </h2>
              <div className="flex items-center gap-4 mb-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    value={inquirySearch}
                    onChange={(e) => setInquirySearch(e.target.value)}
                    placeholder="Search by inquiry number, phone, or description..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="text-sm text-gray-600">
                  {filteredInquiries.length} inquiry{filteredInquiries.length !== 1 ? "ies" : ""}
                </div>
              </div>

              {loadingInquiries ? (
                <div className="text-center py-12 text-gray-500">Loading inquiries...</div>
              ) : filteredInquiries.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  {inquirySearch ? "No inquiries match your search." : "No inquiries found."}
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredInquiries.map((inquiry) => (
                    <div
                      key={inquiry.id}
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => handleViewInquiry(inquiry)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="font-semibold text-lg">#{inquiry.inquiry_number}</span>
                            <span className={`px-2 py-1 text-xs font-semibold rounded border ${getInquiryStatusColor(inquiry.status)}`}>
                              {inquiry.status}
                            </span>
                            {inquiry.ai_confidence && (
                              <span className="text-sm text-gray-600">
                                AI Confidence: {inquiry.ai_confidence.toFixed(1)}%
                              </span>
                            )}
                          </div>
                          <p className="font-medium text-gray-900 mb-1">
                            {inquiry.extracted_title || "Untitled Inquiry"}
                          </p>
                          <p className="text-sm text-gray-600 mb-2">
                            {inquiry.extracted_description || inquiry.sms_text || "No description"}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span>Phone: {inquiry.phone_number}</span>
                            <span>Type: {inquiry.extracted_type || "N/A"}</span>
                            <span>Category: {inquiry.extracted_category || "N/A"}</span>
                            <span>{new Date(inquiry.created_at).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                      {inquiry.image_urls && inquiry.image_urls.length > 0 && (
                        <div className="flex gap-2 mt-3">
                          {inquiry.image_urls.slice(0, 3).map((url, idx) => (
                            <img
                              key={idx}
                              src={url}
                              alt={`Inquiry ${inquiry.inquiry_number} image ${idx + 1}`}
                              className="w-20 h-20 object-cover rounded border border-gray-300"
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Inquiry Detail Modal */}
            {selectedInquiry && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
                <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 my-8">
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="text-2xl font-semibold">
                      Inquiry #{selectedInquiry.inquiry_number}
                    </h3>
                    <button
                      onClick={() => {
                        setSelectedInquiry(null);
                        setInquiryMatches([]);
                      }}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="space-y-4 mb-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                      <p className="text-gray-900">{selectedInquiry.extracted_title || "N/A"}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                      <p className="text-gray-900">{selectedInquiry.extracted_description || selectedInquiry.sms_text || "N/A"}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                        <p className="text-gray-900">{selectedInquiry.phone_number}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                        <span className={`inline-block px-2 py-1 text-xs font-semibold rounded border ${getInquiryStatusColor(selectedInquiry.status)}`}>
                          {selectedInquiry.status}
                        </span>
                      </div>
                    </div>
                    {selectedInquiry.image_urls && selectedInquiry.image_urls.length > 0 && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Images</label>
                        <div className="flex gap-2 flex-wrap">
                          {selectedInquiry.image_urls.map((url, idx) => (
                            <img
                              key={idx}
                              src={url}
                              alt={`Inquiry image ${idx + 1}`}
                              className="w-32 h-32 object-cover rounded border border-gray-300"
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* AI Matches */}
                  <div className="border-t pt-4">
                    <h4 className="text-lg font-semibold mb-4">AI Matches</h4>
                    {inquiryMatches.length === 0 ? (
                      <p className="text-gray-500">No matches found yet.</p>
                    ) : (
                      <div className="space-y-4">
                        {inquiryMatches.map((match) => (
                          <div
                            key={match.id}
                            className={`border-2 rounded-lg p-4 ${
                              match.assistant_approved
                                ? "border-green-500 bg-green-50"
                                : "border-gray-200 bg-white"
                            }`}
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <h5 className="font-semibold text-lg">
                                  {match.lost_items?.item_name || "Unknown Item"}
                                </h5>
                                <p className="text-sm text-gray-600 mb-2">
                                  {match.lost_items?.description || "No description"}
                                </p>
                                <div className="flex items-center gap-4 text-sm">
                                  <span className="font-medium">
                                    Confidence: <span className="text-blue-600">{match.confidence_score.toFixed(1)}%</span>
                                  </span>
                                  {match.assistant_approved && (
                                    <span className="text-green-600 font-medium flex items-center gap-1">
                                      <CheckCircle2 className="w-4 h-4" />
                                      Approved
                                    </span>
                                  )}
                                </div>
                                {match.ai_reasoning && (
                                  <p className="text-xs text-gray-500 mt-2 italic">
                                    AI Reasoning: {match.ai_reasoning}
                                  </p>
                                )}
                              </div>
                              {match.lost_items?.image_url && (
                                <img
                                  src={match.lost_items.image_url}
                                  alt={match.lost_items.item_name}
                                  className="w-24 h-24 object-cover rounded border border-gray-300 ml-4"
                                />
                              )}
                            </div>
                            {!match.assistant_approved && (
                              <button
                                onClick={() => handleApproveMatch(match.id)}
                                className="mt-2 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition-colors text-sm"
                              >
                                Approve Match
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
