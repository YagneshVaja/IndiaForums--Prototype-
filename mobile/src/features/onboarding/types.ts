export interface OnboardingSlide {
  id: string;
  title: string;
  description: string;
  gradientStops: readonly [string, string];
  accent: string;
}
