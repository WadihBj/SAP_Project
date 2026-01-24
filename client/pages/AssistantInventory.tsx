import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit2, Trash2, Search, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface InventoryItem {
  id: string;
  title: string;
  description?: string;
  category: string;
  primary_color?: string;
  status: string;
  created_at: string;
}

export default function AssistantInventory() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "other",
    primary_color: "",
    material: "",
    condition: "good",
    distinctive_marks: "",
    received_location: "",
    stored_location: "",
  });

  useEffect(() => {
    loadInventory();
  }, [user]);

  const loadInventory = async () => {
    try {
      const { data, error } = await supabase
        .from("inventory_items")
        .select("*")
        .eq("status", "available")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setItems(data as InventoryItem[]);
    } catch (err) {
      console.error("Error loading inventory:", err);
      toast.error("Failed to load inventory");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title) {
      toast.error("Please enter item title");
      return;
    }

    try {
      const { error } = await supabase.from("inventory_items").insert([
        {
          title: formData.title,
          description: formData.description,
          category: formData.category,
          primary_color: formData.primary_color,
          material: formData.material,
          condition: formData.condition,
          distinctive_marks: formData.distinctive_marks
            ? formData.distinctive_marks.split(",").map((m) => m.trim())
            : [],
          received_location: formData.received_location,
          stored_location: formData.stored_location,
          status: "available",
          added_by: user!.id,
        },
      ]);

      if (error) throw error;

      toast.success("Item added to inventory");
      setFormData({
        title: "",
        description: "",
        category: "other",
        primary_color: "",
        material: "",
        condition: "good",
        distinctive_marks: "",
        received_location: "",
        stored_location: "",
      });
      setShowAddForm(false);
      loadInventory();
    } catch (err) {
      console.error("Error adding item:", err);
      toast.error("Failed to add item");
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm("Delete this item from inventory?")) return;

    try {
      const { error } = await supabase
        .from("inventory_items")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Item deleted");
      loadInventory();
    } catch (err) {
      console.error("Error deleting item:", err);
      toast.error("Failed to delete item");
    }
  };

  const filteredItems = items.filter(
    (item) =>
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const categoryIcons: Record<string, string> = {
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

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-700 bg-slate-800">
        <div className="container mx-auto max-w-6xl px-4">
          <div className="flex items-center justify-between h-16">
            <h1 className="text-xl font-bold text-white">
              Inventory Management
            </h1>
            <Button
              onClick={() => navigate("/assistant/dashboard")}
              variant="ghost"
              className="text-white"
            >
              Back to Dashboard
            </Button>
          </div>
        </div>
      </header>

      <main className="container max-w-6xl mx-auto px-4 py-8">
        <div className="space-y-6">
          {/* Search & Add */}
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <Input
                placeholder="Search items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-slate-800 border-slate-700 text-white"
              />
            </div>
            <Button
              onClick={() => setShowAddForm(!showAddForm)}
              className="bg-primary hover:bg-primary/90"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Item
            </Button>
          </div>

          {/* Add Form */}
          {showAddForm && (
            <Card className="p-6 bg-slate-800 border-slate-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">Add New Item</h3>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddItem} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      Title *
                    </label>
                    <Input
                      value={formData.title}
                      onChange={(e) =>
                        setFormData({ ...formData, title: e.target.value })
                      }
                      placeholder="Item title"
                      className="bg-slate-700 border-slate-600 text-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      Category *
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) =>
                        setFormData({ ...formData, category: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white rounded-md"
                    >
                      <option value="keys">Keys</option>
                      <option value="wallet">Wallet</option>
                      <option value="phone">Phone</option>
                      <option value="earbuds">Earbuds</option>
                      <option value="laptop">Laptop</option>
                      <option value="id_card">ID Card</option>
                      <option value="bag">Bag</option>
                      <option value="clothing">Clothing</option>
                      <option value="jewelry">Jewelry</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Description
                  </label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="Item description"
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      Color
                    </label>
                    <Input
                      value={formData.primary_color}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          primary_color: e.target.value,
                        })
                      }
                      placeholder="e.g., blue"
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      Material
                    </label>
                    <Input
                      value={formData.material}
                      onChange={(e) =>
                        setFormData({ ...formData, material: e.target.value })
                      }
                      placeholder="e.g., leather"
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      Condition
                    </label>
                    <select
                      value={formData.condition}
                      onChange={(e) =>
                        setFormData({ ...formData, condition: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white rounded-md"
                    >
                      <option value="new">New</option>
                      <option value="good">Good</option>
                      <option value="worn">Worn</option>
                      <option value="damaged">Damaged</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Received Location
                  </label>
                  <Input
                    value={formData.received_location}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        received_location: e.target.value,
                      })
                    }
                    placeholder="Where was it found"
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    type="submit"
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    Add to Inventory
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    variant="outline"
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {/* Items List */}
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filteredItems.length === 0 ? (
            <Card className="p-12 text-center bg-slate-800 border-slate-700">
              <p className="text-slate-400 mb-4">No items in inventory</p>
              <Button
                onClick={() => setShowAddForm(true)}
                className="bg-primary"
              >
                Add Your First Item
              </Button>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredItems.map((item) => (
                <Card
                  key={item.id}
                  className="p-6 bg-slate-800 border-slate-700 hover:border-slate-600 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-2xl">
                          {categoryIcons[item.category] || "📦"}
                        </span>
                        <h3 className="text-lg font-bold text-white">
                          {item.title}
                        </h3>
                        <Badge className="bg-green-600">Available</Badge>
                      </div>
                      {item.description && (
                        <p className="text-slate-400 text-sm mb-2">
                          {item.description}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-2 text-xs">
                        <span className="bg-slate-700 px-2 py-1 rounded text-slate-300">
                          📂 {item.category}
                        </span>
                        {item.primary_color && (
                          <span className="bg-slate-700 px-2 py-1 rounded text-slate-300">
                            🎨 {item.primary_color}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleDeleteItem(item.id)}
                        variant="outline"
                        size="sm"
                        className="border-red-600 text-red-400 hover:bg-red-900/20"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
