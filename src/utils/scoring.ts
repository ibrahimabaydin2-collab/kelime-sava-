/**
 * Dynamically calculates the score based on word difficulty (length),
 * response speed (seconds left), and attempts used.
 * 
 * @param wordLength The length of the secret word (difficulty indicator)
 * @param secondsLeft The remaining time in seconds (speed indicator)
 * @param attemptCount The number of attempts used (accuracy indicator, 1 to 6)
 * @param isDaily Whether the game is in Daily Puzzle mode
 * @returns The calculated score (with a minimum guaranteed limit of 50 points)
 */
export function calculateDynamicScore(
  wordLength: number,
  secondsLeft: number,
  attemptCount: number,
  isDaily: boolean = false
): number {
  // 1. Difficulty: base score scaled by word length (e.g. 5 letters = 100, 6 letters = 120, etc.)
  const baseDifficultyScore = wordLength * 20;

  // 2. Speed Bonus: remaining time scaled (5 points per remaining second)
  const speedBonus = Math.max(0, secondsLeft * 5);

  // 3. Accuracy Modifier: deduct 15 points for each wrong attempt after the 1st
  const accuracyDeduction = (attemptCount - 1) * 15;

  // 4. Daily Puzzle Bonus: additional weight for the puzzle of the day
  const dailyBonus = isDaily ? 35 : 0;

  // Combined score
  let calculatedScore = baseDifficultyScore + speedBonus - accuracyDeduction + dailyBonus;

  // 5. Floor Limit: En Düşük Limit of 50 points is guaranteed for any correct answer
  const minGuaranteedLimit = 50;
  if (calculatedScore < minGuaranteedLimit) {
    calculatedScore = minGuaranteedLimit;
  }

  return Math.round(calculatedScore);
}

/**
 * Verification function to ensure the scoring calculation conforms to expected ranges
 * and guards against any mathematical edge cases.
 */
export function verifyScoringAccuracy(score: number): boolean {
  if (isNaN(score) || !isFinite(score)) return false;
  // Score should be at least 50 (floor limit) and realistically not exceed 1000
  return score >= 50 && score <= 1000;
}
