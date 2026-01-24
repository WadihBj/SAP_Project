// Fraud prevention and security mechanisms

interface RateLimitEntry {
  userId: string;
  timestamp: number;
  count: number;
}

interface DuplicateCheckResult {
  isDuplicate: boolean;
  existingInquiryId?: string;
  similarityScore: number;
}

interface FraudAssessment {
  riskScore: number;
  flags: string[];
  recommendedAction: "approve" | "review" | "block";
}

// In-memory rate limiting (in production, use Redis)
const rateLimitStore = new Map<string, RateLimitEntry[]>();

const RATE_LIMITS = {
  INQUIRIES_PER_HOUR: 10,
  INQUIRIES_PER_DAY: 50,
  MATCHES_CLAIMED_PER_WEEK: 5,
};

/**
 * Check if user has exceeded rate limits
 */
export function checkRateLimit(userId: string): { allowed: boolean; reason?: string } {
  const now = Date.now();
  const oneHourAgo = now - 60 * 60 * 1000;
  const oneDayAgo = now - 24 * 60 * 60 * 1000;

  let entries = rateLimitStore.get(userId) || [];
  
  // Clean up old entries
  entries = entries.filter(e => e.timestamp > oneDayAgo);

  const hourlyCount = entries.filter(e => e.timestamp > oneHourAgo).length;
  const dailyCount = entries.length;

  if (hourlyCount >= RATE_LIMITS.INQUIRIES_PER_HOUR) {
    return { 
      allowed: false, 
      reason: "Too many inquiries in the last hour. Please try again later." 
    };
  }

  if (dailyCount >= RATE_LIMITS.INQUIRIES_PER_DAY) {
    return { 
      allowed: false, 
      reason: "Daily inquiry limit reached. Try again tomorrow." 
    };
  }

  return { allowed: true };
}

/**
 * Log an inquiry for rate limiting
 */
export function recordInquiry(userId: string): void {
  const entries = rateLimitStore.get(userId) || [];
  entries.push({
    userId,
    timestamp: Date.now(),
    count: 1,
  });
  rateLimitStore.set(userId, entries);
}

/**
 * Detect potential duplicate inquiries
 */
export async function checkForDuplicateInquiry(
  userId: string,
  title: string,
  description: string,
): Promise<DuplicateCheckResult> {
  try {
    // This would typically query the database
    // For now, returning a basic structure
    // Implementation would compare text similarity using cosine similarity or similar
    
    const titleLower = title.toLowerCase();
    const descLower = description.toLowerCase();
    
    // Simple duplicate check - exact or near-exact matches
    // In production, use more sophisticated NLP/similarity algorithms
    const combinedText = `${titleLower} ${descLower}`;
    
    // Placeholder for actual duplicate detection logic
    // This would need to be integrated with Supabase query
    
    return {
      isDuplicate: false,
      similarityScore: 0,
    };
  } catch (err) {
    console.error("Error checking for duplicates:", err);
    return {
      isDuplicate: false,
      similarityScore: 0,
    };
  }
}

/**
 * Generate ownership verification questions for match confirmation
 */
export function generateOwnershipQuestions(
  category: string,
  itemDetails: Record<string, any>,
): { question: string; expectedFormat: string }[] {
  const categoryQuestions: Record<string, { question: string; expectedFormat: string }[]> = {
    phone: [
      {
        question: "What is the IMEI number of this phone?",
        expectedFormat: "15-digit number",
      },
      {
        question: "What was the last 4 digits of the phone number on this device?",
        expectedFormat: "4 digits",
      },
      {
        question: "Name an app installed on this device",
        expectedFormat: "App name",
      },
    ],
    wallet: [
      {
        question: "How many credit cards were in this wallet?",
        expectedFormat: "Number",
      },
      {
        question: "What is the brand of the wallet?",
        expectedFormat: "Brand name",
      },
      {
        question: "What color is the inside lining?",
        expectedFormat: "Color",
      },
    ],
    keys: [
      {
        question: "How many keys are on this keychain?",
        expectedFormat: "Number",
      },
      {
        question: "Describe a unique marking or feature on the keychain",
        expectedFormat: "Description",
      },
    ],
    laptop: [
      {
        question: "What is the serial number of this laptop?",
        expectedFormat: "Serial number",
      },
      {
        question: "What is the operating system?",
        expectedFormat: "OS name",
      },
      {
        question: "Name one program installed on this laptop",
        expectedFormat: "Program name",
      },
    ],
  };

  return categoryQuestions[category] || [
    {
      question: "Can you describe a distinctive feature of this item in detail?",
      expectedFormat: "Description",
    },
    {
      question: "What was the approximate condition when you lost it?",
      expectedFormat: "Condition description",
    },
  ];
}

/**
 * Assess fraud risk based on multiple factors
 */
export function assessFraudRisk(
  inquiry: Record<string, any>,
  matchConfidence: number,
  userHistory: Record<string, any>,
): FraudAssessment {
  const flags: string[] = [];
  let riskScore = 0;

  // Check match confidence
  if (matchConfidence < 0.6) {
    flags.push("Low match confidence");
    riskScore += 25;
  } else if (matchConfidence < 0.75) {
    flags.push("Medium match confidence");
    riskScore += 10;
  }

  // Check user history
  if (userHistory.reportCount === 0) {
    flags.push("First-time user");
    riskScore += 15;
  }

  if (userHistory.confirmedMatches === 0 && userHistory.reportCount > 3) {
    flags.push("No confirmed matches despite multiple reports");
    riskScore += 30;
  }

  // Check description quality
  const descriptionLength = inquiry.description?.length || 0;
  if (descriptionLength < 50) {
    flags.push("Vague description");
    riskScore += 10;
  }

  // Check if multiple images provided (reduces fraud risk)
  const imageCount = inquiry.imageCount || 0;
  if (imageCount > 1) {
    riskScore -= 10; // Reduce risk for multiple images
  }

  // Check temporal patterns
  if (inquiry.createdAt) {
    const timeSinceLoss = Date.now() - new Date(inquiry.createdAt).getTime();
    const daysSinceLoss = timeSinceLoss / (1000 * 60 * 60 * 24);
    
    if (daysSinceLoss > 90) {
      flags.push("Item lost more than 90 days ago");
      riskScore += 15; // Lower priority but still valid
    }
  }

  // Determine recommended action
  let recommendedAction: "approve" | "review" | "block" = "approve";
  if (riskScore > 60) {
    recommendedAction = "block";
  } else if (riskScore > 35) {
    recommendedAction = "review";
  }

  return {
    riskScore: Math.min(100, Math.max(0, riskScore)),
    flags,
    recommendedAction,
  };
}

/**
 * Check for anomalies in inquiry patterns
 */
export function detectAnomalies(
  userId: string,
  inquiry: Record<string, any>,
  userHistory: Record<string, any>,
): string[] {
  const anomalies: string[] = [];

  // Unusual category patterns
  const categories = userHistory.inquiryCategories || [];
  if (categories.length > 0) {
    const currentCategory = inquiry.category;
    const mostCommonCategory = categories[0];
    
    if (currentCategory !== mostCommonCategory && categories.includes(currentCategory) === false) {
      anomalies.push("Unusual item category compared to user history");
    }
  }

  // Unusual location patterns
  if (userHistory.commonLocations && userHistory.commonLocations.length > 0) {
    if (!userHistory.commonLocations.includes(inquiry.location)) {
      anomalies.push("Loss reported in unusual location for this user");
    }
  }

  // Rapid successive claims
  const recentClaims = userHistory.recentClaimsCount || 0;
  if (recentClaims > 5) {
    anomalies.push("Multiple claims in short time period");
  }

  return anomalies;
}

/**
 * Generate a confidence-adjusted match recommendation
 */
export function generateMatchRecommendation(
  baseConfidence: number,
  fraudRisk: FraudAssessment,
): { finalConfidence: number; requiresVerification: boolean } {
  let adjustedConfidence = baseConfidence;

  // Adjust based on fraud risk
  if (fraudRisk.recommendedAction === "block") {
    adjustedConfidence *= 0.5;
  } else if (fraudRisk.recommendedAction === "review") {
    adjustedConfidence *= 0.75;
  }

  return {
    finalConfidence: Math.max(0, Math.min(1, adjustedConfidence)),
    requiresVerification: fraudRisk.riskScore > 40,
  };
}
