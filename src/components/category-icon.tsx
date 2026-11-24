import {
  Stethoscope, Sparkles, Car, HardHat, House, Briefcase, Scale, Landmark, Utensils, Bed, GraduationCap, Laptop,
  ShoppingBag, PartyPopper, Tractor, SprayCan, ShieldCheck, Truck, Building, Layers, type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  stethoscope: Stethoscope, sparkles: Sparkles, car: Car, "hard-hat": HardHat, house: House, briefcase: Briefcase,
  scale: Scale, landmark: Landmark, utensils: Utensils, bed: Bed, "graduation-cap": GraduationCap, laptop: Laptop,
  "shopping-bag": ShoppingBag, "party-popper": PartyPopper, tractor: Tractor, "spray-can": SprayCan,
  "shield-check": ShieldCheck, truck: Truck, building: Building, layers: Layers,
};
export const CATEGORY_ICON_NAMES = Object.keys(ICONS);

export function CategoryIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICONS[name] ?? Briefcase;
  return <Icon className={className} aria-hidden />;
}
