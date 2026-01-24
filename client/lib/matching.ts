import { supabase } from "./supabase";

interface MatchResult {
  inventoryItemId: string;
  inquiryId: string;
  confidenceScore: number;
  matchingDetails: {
    categoryMatch: boolean;
    categoryScore: number;
    colorMatch: boolean;
    colorScore: number;
    materialMatch: boolean;
    materialScore: number;
    conditionMatch: boolean;
    conditionScore: number;
    locationMatch: boolean;
    locationScore: number;
    distinctiveMarksMatch: boolean;
    distinctiveMarksScore: number;
  };
}

export async function findMatches(inquiryId: string): Promise<MatchResult[]> {
  try {
    // Get the inquiry details
    const { data: inquiry, error: inquiryError } = await supabase
      .from("inquiries")
      .select("*")
      .eq("id", inquiryId)
      .single();

    if (inquiryError) throw inquiryError;

    // Get all available inventory items
    const { data: inventoryItems, error: inventoryError } = await supabase
      .from("inventory_items")
      .select("*")
      .eq("status", "available");

    if (inventoryError) throw inventoryError;

    // Calculate matches
    const matches: MatchResult[] = [];

    for (const item of inventoryItems) {
      const matchResult = calculateMatchScore(inquiry, item);

      // Only include matches with confidence >= 0.5
      if (matchResult.confidenceScore >= 0.5) {
        matches.push(matchResult);
      }
    }

    // Sort by confidence score (highest first)
    matches.sort((a, b) => b.confidenceScore - a.confidenceScore);

    return matches;
  } catch (err) {
    console.error("Error finding matches:", err);
    return [];
  }
}

function calculateMatchScore(inquiry: any, inventoryItem: any): MatchResult {
  const inquiryAttrs = inquiry.extracted_attributes;
  const itemAttrs = inventoryItem.extracted_attributes || {};

  // Category match (highest weight - 30%)
  const categoryScore =
    inquiryAttrs?.itemIdentity?.category === inventoryItem.category ? 1 : 0;

  // Color match (20%)
  let colorScore = 0;
  if (inventoryItem.primary_color && inquiryAttrs?.appearance?.primaryColor) {
    colorScore =
      normalizeColor(inquiryAttrs.appearance.primaryColor) ===
      normalizeColor(inventoryItem.primary_color)
        ? 1
        : 0.5;
  } else {
    colorScore = 0.5; // Neutral if no color specified
  }

  // Material match (10%)
  let materialScore = 0;
  if (inventoryItem.material && inquiryAttrs?.appearance?.material) {
    materialScore =
      inventoryItem.material.toLowerCase() ===
      inquiryAttrs.appearance.material.toLowerCase()
        ? 1
        : 0.3;
  } else {
    materialScore = 0.5;
  }

  // Condition match (10%)
  let conditionScore = 0;
  if (inventoryItem.condition && inquiryAttrs?.appearance?.condition) {
    conditionScore =
      inventoryItem.condition === inquiryAttrs.appearance.condition ? 1 : 0.5;
  } else {
    conditionScore = 0.5;
  }

  // Location match (15%)
  let locationScore = 0;
  if (inventoryItem.received_location && inquiry.location_lost_found) {
    const normInvLoc = inventoryItem.received_location.toLowerCase();
    const normInqLoc = inquiry.location_lost_found.toLowerCase();

    if (normInvLoc.includes(normInqLoc) || normInqLoc.includes(normInvLoc)) {
      locationScore = 1;
    } else if (isSimilarLocation(normInvLoc, normInqLoc)) {
      locationScore = 0.7;
    } else {
      locationScore = 0.2;
    }
  } else {
    locationScore = 0.5;
  }

  // Distinctive marks match (15%)
  let distinctiveMarksScore = 0;
  const inquiryMarks = inquiryAttrs?.appearance?.distinctiveMarks || [];
  const itemMarks = inventoryItem.distinctive_marks || [];

  if (inquiryMarks.length > 0 && itemMarks.length > 0) {
    const matchingMarks = inquiryMarks.filter((mark) =>
      itemMarks.some(
        (itemMark) =>
          itemMark.toLowerCase().includes(mark.toLowerCase()) ||
          mark.toLowerCase().includes(itemMark.toLowerCase()),
      ),
    );
    distinctiveMarksScore =
      matchingMarks.length / Math.max(inquiryMarks.length, itemMarks.length);
  } else {
    distinctiveMarksScore = 0.5; // Neutral if no marks specified
  }

  // Calculate weighted confidence score
  const confidenceScore =
    categoryScore * 0.3 +
    colorScore * 0.2 +
    materialScore * 0.1 +
    conditionScore * 0.1 +
    locationScore * 0.15 +
    distinctiveMarksScore * 0.15;

  return {
    inventoryItemId: inventoryItem.id,
    inquiryId: inquiry.id,
    confidenceScore: Math.round(confidenceScore * 100) / 100,
    matchingDetails: {
      categoryMatch: categoryScore === 1,
      categoryScore,
      colorMatch: colorScore >= 0.8,
      colorScore,
      materialMatch: materialScore >= 0.8,
      materialScore,
      conditionMatch: conditionScore >= 0.8,
      conditionScore,
      locationMatch: locationScore >= 0.8,
      locationScore,
      distinctiveMarksMatch: distinctiveMarksScore >= 0.8,
      distinctiveMarksScore,
    },
  };
}

function normalizeColor(color: string): string {
  const colorMap: Record<string, string> = {
    "dark blue": "blue",
    "light blue": "blue",
    navy: "blue",
    "dark gray": "gray",
    grey: "gray",
    "dark red": "red",
    "light red": "red",
    "dark green": "green",
    "light green": "green",
  };

  const normalized = color.toLowerCase();
  return colorMap[normalized] || normalized;
}

function isSimilarLocation(loc1: string, loc2: string): boolean {
  // Check if locations are in similar areas
  const campusKeywords = [
    "library",
    "hall",
    "building",
    "building",
    "room",
    "floor",
  ];
  const transportKeywords = ["metro", "bus", "station", "train"];
  const outdoorKeywords = ["park", "street", "plaza", "outdoor"];

  const locType1 = getCategoryOfLocation(loc1);
  const locType2 = getCategoryOfLocation(loc2);

  return locType1 === locType2;
}

function getCategoryOfLocation(location: string): string {
  const campusKeywords = [
    "library",
    "hall",
    "building",
    "room",
    "floor",
    "classroom",
    "office",
  ];
  const transportKeywords = ["metro", "bus", "station", "train", "transit"];
  const outdoorKeywords = ["park", "street", "plaza", "outdoor", "sidewalk"];

  if (campusKeywords.some((kw) => location.includes(kw))) return "campus";
  if (transportKeywords.some((kw) => location.includes(kw))) return "transport";
  if (outdoorKeywords.some((kw) => location.includes(kw))) return "outdoor";
  return "unknown";
}

export async function saveMatches(
  inquiryId: string,
  matches: MatchResult[],
): Promise<void> {
  try {
    for (const match of matches) {
      const { error } = await supabase.from("matches").insert([
        {
          inquiry_id: match.inquiryId,
          inventory_item_id: match.inventoryItemId,
          confidence_score: match.confidenceScore,
          matching_details: match.matchingDetails,
          status: "pending_review",
        },
      ]);

      if (error) throw error;
    }

    // Update inquiry status to under_review
    const { error: updateError } = await supabase
      .from("inquiries")
      .update({ status: "under_review" })
      .eq("id", inquiryId);

    if (updateError) throw updateError;

    // Add status history
    await supabase.from("inquiry_status_history").insert([
      {
        inquiry_id: inquiryId,
        old_status: "submitted",
        new_status: "under_review",
        notes: `Automatic matching found ${matches.length} potential match(es)`,
      },
    ]);
  } catch (err) {
    console.error("Error saving matches:", err);
    throw err;
  }
}

export async function generateVerificationQuestions(
  matchId: string,
  inventoryItem: any,
): Promise<string[]> {
  const questions: string[] = [];

  // Category-specific questions
  switch (inventoryItem.category) {
    case "phone":
      questions.push("What color is the back of the phone?");
      questions.push("Do you have a case or screen protector? What color?");
      questions.push("What apps are installed on the phone?");
      break;
    case "wallet":
      questions.push("What color is the inside lining?");
      questions.push("How many card slots does it have?");
      questions.push("Is there any distinctive branding or emblem?");
      break;
    case "keys":
      questions.push("How many keys are attached?");
      questions.push("What color is the keychain?");
      questions.push("Are there any unique identifiers or labels?");
      break;
    case "laptop":
      questions.push("What brand is the laptop?");
      questions.push("What is the screen size?");
      questions.push("Does it have any stickers or markings?");
      break;
    case "id_card":
      questions.push("What is the expiration year?");
      questions.push("What is the type of ID (student, driver license, etc)?");
      break;
    case "earbuds":
      questions.push("What brand are the earbuds?");
      questions.push("Do they have a charging case?");
      questions.push("Are they wireless or wired?");
      break;
    default:
      questions.push("Can you describe a distinctive feature of this item?");
      questions.push("Where did you lose/find this item?");
  }

  return questions.slice(0, 3); // Return top 3 questions
}
