// Ownership verification questions based on item category
export function generateVerificationQuestions(
  category: string,
  itemDetails: any,
): string[] {
  const baseQuestions = [
    "Can you describe a distinctive feature of this item?",
    "What was the condition of this item when you lost it?",
  ];

  const categoryQuestions: Record<string, string[]> = {
    phone: [
      "What color is the back of the phone?",
      "What is the phone model/version?",
      "Do you have any case or protective accessories?",
      "What was the battery percentage when you lost it?",
    ],
    wallet: [
      "What color is the inside lining?",
      "How many card slots does it have?",
      "Is there a coin pocket?",
      "What material is it made of?",
    ],
    keys: [
      "How many keys are attached?",
      "What color is the keychain?",
      "What brand is the key",
      "Are there any name tags or labels?",
    ],
    laptop: [
      "What brand is the laptop?",
      'What is the screen size (13\", 14\", 15\", etc)?',
      "Does it have any stickers or markings?",
      "What color is the casing?",
    ],
    id_card: [
      "What institution issued this ID?",
      "What is your full name on the ID?",
      "What is the expiration year?",
      "What color is the ID card?",
    ],
    earbuds: [
      "What brand are the earbuds?",
      "Do they have a charging case?",
      "Are they wireless or wired?",
      "What color are they?",
    ],
    bag: [
      "What brand is the bag?",
      "How many pockets does it have?",
      "What color is it?",
      "Does it have any logos or emblems?",
    ],
    jewelry: [
      "What metal is it made of?",
      "Are there any engravings?",
      "What is the approximate size?",
      "Does it have any gems or stones?",
    ],
    clothing: [
      "What brand is it?",
      "What size is it?",
      "What color is it?",
      "Does it have any logos or patterns?",
    ],
  };

  const questions = [...baseQuestions];
  const categorySpecific =
    categoryQuestions[category] || categoryQuestions["other"] || [];
  questions.push(...categorySpecific.slice(0, 2));

  return questions.slice(0, 3); // Return top 3 questions
}

export interface VerificationAttempt {
  matchId: string;
  userAnswers: Record<string, string>;
  isVerified: boolean;
  confidenceScore: number;
}

// Score verification answers (simple implementation)
export function scoreVerificationAnswers(
  userAnswers: string[],
  expectedAnswers: string[],
): { score: number; isVerified: boolean } {
  // In a real system, you'd use more sophisticated matching
  // For now, we'll give credit if user provides non-empty answers

  const emptyAnswers = userAnswers.filter(
    (a) => !a || a.trim().length === 0,
  ).length;
  const score = Math.max(0, 1 - emptyAnswers / Math.max(userAnswers.length, 1));

  // Require at least 60% answers filled for verification
  const isVerified = score >= 0.6;

  return {
    score: Math.round(score * 100) / 100,
    isVerified,
  };
}
