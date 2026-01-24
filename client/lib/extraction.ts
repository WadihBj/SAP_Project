import { LostFoundReport } from "./supabase";

type ItemCategory =
  | "keys"
  | "wallet"
  | "phone"
  | "earbuds"
  | "laptop"
  | "id_card"
  | "bag"
  | "clothing"
  | "jewelry"
  | "other";
type Condition = "unknown" | "new" | "good" | "worn" | "damaged";
type LocationType =
  | "building"
  | "room"
  | "campus"
  | "transport"
  | "outdoor"
  | "unknown";

interface ExtractionInput {
  reportType: "lost" | "found";
  title: string;
  description: string;
  locationText?: string;
  languageHint?: string;
}

export function extractItemData(input: ExtractionInput) {
  const text =
    `${input.title} ${input.description} ${input.locationText || ""}`.toLowerCase();

  // Detect language
  const language = detectLanguage(input.languageHint, text);

  // Extract category
  const category = extractCategory(text);

  // Extract appearance details
  const colors = extractColors(text);
  const material = extractMaterial(text);
  const condition = extractCondition(text);
  const distinctiveMarks = extractDistinctiveMarks(text);

  // Extract location
  const location = extractLocation(input.locationText || text);

  // Extract contents
  const contents = extractContents(text);

  // Extract time references
  const timeInfo = extractTime(text);

  // Check for sensitive info
  const { sensitiveInfoPresent, sensitiveInfoTypes } = checkSensitiveInfo(
    input.title + input.description,
  );

  // Generate keywords
  const keywords = generateKeywords(
    input.title,
    category,
    colors.primary,
    location.placeName,
  );

  // Determine matching criteria
  const { mustMatch, niceToMatch } = generateMatchingCriteria(
    category,
    colors,
    material,
    condition,
  );

  const extractedData = {
    meta: {
      reportType: input.reportType,
      language: language,
      confidenceNotes:
        category === "other" ? "Category unclear - may need manual review" : "",
    },
    itemIdentity: {
      category,
      brand: extractBrand(text, category),
      model: extractModel(text, category),
      serialOrTag: "",
      textOnItem: extractTextOnItem(input.description),
    },
    appearance: {
      primaryColor: colors.primary,
      secondaryColors: colors.secondary,
      material,
      size: extractSize(text),
      condition,
      distinctiveMarks,
    },
    contents: {
      contains: contents,
      containsSensitiveItems: contents.some((c) =>
        ["card", "id", "license", "document", "sim", "bank"].some((s) =>
          c.includes(s),
        ),
      ),
    },
    location: {
      placeName: location.placeName,
      locationType: location.locationType,
      confidence: location.confidence,
    },
    time: {
      mentioned: timeInfo.mentioned,
      whenText: timeInfo.whenText,
    },
    privacy: {
      sensitiveInfoPresent,
      sensitiveInfoTypes,
    },
    matching: {
      keywords,
      mustMatch,
      niceToMatch,
    },
  };

  return extractedData;
}

function detectLanguage(hint: string | undefined, text: string): string {
  if (hint && ["en", "fr"].includes(hint)) return hint;

  const frenchWords = [
    "le",
    "la",
    "les",
    "un",
    "une",
    "de",
    "du",
    "et",
    "à",
    "est",
  ];
  const frenchCount = frenchWords.filter((w) => text.includes(w)).length;

  return frenchCount > 5 ? "fr" : "en";
}

function extractCategory(text: string): ItemCategory {
  const categories: Record<ItemCategory, string[]> = {
    keys: ["key", "keys", "keychain", "fob", "door key"],
    wallet: ["wallet", "purse", "card holder", "billfold"],
    phone: ["phone", "iphone", "android", "smartphone", "mobile"],
    earbuds: ["airpods", "earbuds", "earphones", "wireless earbuds", "buds"],
    laptop: ["laptop", "macbook", "notebook", "computer"],
    id_card: [
      "student id",
      "license",
      "id card",
      "opus",
      "metro card",
      "transit card",
    ],
    bag: ["backpack", "handbag", "tote", "bag", "rucksack", "duffel"],
    clothing: [
      "jacket",
      "hoodie",
      "hat",
      "coat",
      "sweater",
      "shirt",
      "pants",
      "shoes",
    ],
    jewelry: ["ring", "bracelet", "necklace", "earring", "watch", "pendant"],
  };

  for (const [cat, keywords] of Object.entries(categories)) {
    if (keywords.some((kw) => text.includes(kw))) {
      return cat as ItemCategory;
    }
  }

  return "other";
}

function extractColors(text: string): { primary: string; secondary: string[] } {
  const colorMap: Record<string, string> = {
    black: "black",
    white: "white",
    red: "red",
    blue: "blue",
    green: "green",
    yellow: "yellow",
    orange: "orange",
    purple: "purple",
    pink: "pink",
    gray: "gray",
    grey: "gray",
    brown: "brown",
    silver: "silver",
    gold: "gold",
  };

  const foundColors = Object.keys(colorMap)
    .filter((color) => text.includes(color))
    .map((color) => colorMap[color]);

  return {
    primary: foundColors[0] || "",
    secondary: foundColors.slice(1) || [],
  };
}

function extractMaterial(text: string): string {
  const materials = [
    "leather",
    "plastic",
    "metal",
    "fabric",
    "canvas",
    "nylon",
    "rubber",
    "glass",
    "aluminum",
  ];
  return materials.find((m) => text.includes(m)) || "";
}

function extractCondition(text: string): Condition {
  if (text.includes("new")) return "new";
  if (text.includes("good") || text.includes("excellent")) return "good";
  if (text.includes("worn") || text.includes("used")) return "worn";
  if (
    text.includes("damage") ||
    text.includes("broken") ||
    text.includes("crack")
  )
    return "damaged";
  return "unknown";
}

function extractDistinctiveMarks(text: string): string[] {
  const marks: string[] = [];
  if (text.includes("sticker")) marks.push("stickers");
  if (text.includes("scratch")) marks.push("scratches");
  if (text.includes("crack")) marks.push("cracks");
  if (text.includes("engrav")) marks.push("engravings");
  if (text.includes("dent") || text.includes("bent")) marks.push("dents");
  if (text.includes("scuff")) marks.push("scuffs");
  return marks;
}

function extractLocation(text: string): {
  placeName: string;
  locationType: LocationType;
  confidence: number;
} {
  const locations: Record<
    LocationType,
    { keywords: string[]; confidence: number }
  > = {
    building: {
      keywords: ["library", "hall", "building", "office", "classroom", "lab"],
      confidence: 80,
    },
    room: {
      keywords: ["room", "floor", "suite", "102", "203"],
      confidence: 85,
    },
    campus: {
      keywords: ["campus", "concordia", "mcgill", "uqam"],
      confidence: 60,
    },
    transport: {
      keywords: ["bus", "metro", "train", "taxi", "uber", "transit"],
      confidence: 70,
    },
    outdoor: {
      keywords: ["park", "street", "sidewalk", "plaza", "square"],
      confidence: 50,
    },
    unknown: { keywords: [], confidence: 0 },
  };

  let bestMatch: LocationType = "unknown";
  let bestConfidence = 0;
  let placeName = "";

  for (const [type, data] of Object.entries(locations)) {
    for (const kw of data.keywords) {
      if (text.includes(kw)) {
        if (data.confidence > bestConfidence) {
          bestMatch = type as LocationType;
          bestConfidence = data.confidence;
          placeName = kw;
        }
      }
    }
  }

  return {
    placeName,
    locationType: bestMatch,
    confidence: bestConfidence,
  };
}

function extractContents(text: string): string[] {
  const items: string[] = [];
  const contentKeywords = [
    ["card", "cards"],
    ["cash", "money"],
    ["id", "identification"],
    ["key", "keys"],
    ["phone", "smartphone"],
    ["wallet"],
    ["documents", "papers"],
    ["bag", "backpack"],
  ];

  for (const keywords of contentKeywords) {
    if (keywords.some((kw) => text.includes(kw))) {
      items.push(keywords[0]);
    }
  }

  return items;
}

function extractTime(text: string): { mentioned: boolean; whenText: string } {
  const timePatterns = [
    "today",
    "yesterday",
    "morning",
    "afternoon",
    "evening",
    "night",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
    "january",
    "february",
    "march",
    "april",
    "may",
    "june",
    "july",
    "august",
    "september",
    "october",
    "november",
    "december",
  ];

  const mentioned = timePatterns.some((pattern) => text.includes(pattern));
  const whenText = mentioned ? "see description for timing details" : "";

  return { mentioned, whenText };
}

function checkSensitiveInfo(text: string): {
  sensitiveInfoPresent: boolean;
  sensitiveInfoTypes: string[];
} {
  const types: string[] = [];

  // Phone number pattern (basic)
  if (/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/.test(text)) types.push("phone");

  // Email pattern
  if (/@/.test(text)) types.push("email");

  // ID number (generalized)
  if (/id\s*#?:\s*\d+|student\s*#?:\s*\d+/.test(text)) types.push("id_number");

  return {
    sensitiveInfoPresent: types.length > 0,
    sensitiveInfoTypes: types,
  };
}

function extractBrand(text: string, category: ItemCategory): string {
  const brandMap: Record<string, string[]> = {
    phone: ["apple", "samsung", "iphone", "google", "pixel"],
    laptop: ["apple", "dell", "hp", "lenovo", "asus", "macbook"],
    earbuds: ["apple", "airpods", "sony", "bose", "beats"],
    wallet: ["gucci", "louis vuitton", "coach", "leather"],
  };

  const brands = brandMap[category] || [];
  return brands.find((b) => text.includes(b.toLowerCase())) || "";
}

function extractModel(text: string, category: ItemCategory): string {
  if (category === "phone") {
    if (text.includes("iphone 13")) return "iPhone 13";
    if (text.includes("iphone 14")) return "iPhone 14";
    if (text.includes("iphone 15")) return "iPhone 15";
    if (text.includes("galaxy s")) return "Galaxy S";
  }
  if (category === "laptop") {
    if (text.includes("macbook pro")) return "MacBook Pro";
    if (text.includes("macbook air")) return "MacBook Air";
  }
  return "";
}

function extractTextOnItem(description: string): string {
  // Look for engraving, initials, writing, labels mentioned in description
  if (
    description.toLowerCase().includes("engrav") ||
    description.toLowerCase().includes("initial")
  ) {
    return "see description for text details";
  }
  return "";
}

function extractSize(text: string): string {
  const sizes = [
    "small",
    "medium",
    "large",
    "xl",
    "extra large",
    "compact",
    "standard",
  ];
  return sizes.find((s) => text.includes(s)) || "";
}

function generateKeywords(
  title: string,
  category: ItemCategory,
  color: string,
  location: string,
): string[] {
  const keywords: string[] = [
    category,
    title.split(" ").slice(0, 2).join(" ").toLowerCase(),
  ];

  if (color) keywords.push(color);
  if (location) keywords.push(location);

  // Add some generic search terms
  if (title.length > 0) {
    keywords.push(...title.toLowerCase().split(" ").slice(0, 3));
  }

  return [...new Set(keywords)].filter((k) => k.length > 0).slice(0, 12);
}

function generateMatchingCriteria(
  category: ItemCategory,
  colors: { primary: string; secondary: string[] },
  material: string,
  condition: Condition,
): { mustMatch: string[]; niceToMatch: string[] } {
  const mustMatch: string[] = [category];
  const niceToMatch: string[] = [];

  if (colors.primary) {
    mustMatch.push(colors.primary);
  }

  if (material) {
    niceToMatch.push(material);
  }

  if (condition !== "unknown") {
    niceToMatch.push(condition);
  }

  if (colors.secondary.length > 0) {
    niceToMatch.push(...colors.secondary);
  }

  return {
    mustMatch: mustMatch.slice(0, 4),
    niceToMatch: niceToMatch.slice(0, 6),
  };
}
