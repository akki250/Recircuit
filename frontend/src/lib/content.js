import { Camera, Boxes, Coins, MapPin, FileCheck2, IndianRupee, Smartphone, BrainCircuit, Code2, Database, Map, CreditCard } from "lucide-react";

export const STEPS = [
  { n: 1, title: "Capture", sub: "Photo of material", icon: Camera, tech: "Browser camera / file API",
    desc: "Snap the lot straight from a phone. Every listing starts with visual proof of what is on the ground." },
  { n: 2, title: "Categorize", sub: "Type & weight", icon: Boxes, tech: "Rule engine v1 → CNN classifier",
    desc: "Describe the item; the classifier maps it to one of 11 e-waste classes and you confirm the weight." },
  { n: 3, title: "Value", sub: "Price estimate", icon: Coins, tech: "FastAPI pricing service",
    desc: "A transparent ₹/kg table times a condition multiplier. The same number for every collector, every time." },
  { n: 4, title: "Match", sub: "Recycler options", icon: MapPin, tech: "Matching service",
    desc: "Verified recyclers browse open lots in the marketplace and lock a match in one tap." },
  { n: 5, title: "Handover", sub: "Digital record", icon: FileCheck2, tech: "MongoDB + REST API",
    desc: "A tamper-evident handover code with timestamp is written for every lot that changes hands." },
  { n: 6, title: "Payment", sub: "Earnings updated", icon: IndianRupee, tech: "Stripe Checkout",
    desc: "The recycler pays through Stripe; the collector's wallet is credited the second it clears." },
];

export const ARCH = [
  { title: "Mobile App", spec: "Flutter (Dart) or React Native", built: "React 19 responsive web", icon: Smartphone },
  { title: "AI / ML Model", spec: "TensorFlow / PyTorch CNN", built: "Rule-based classifier v1", icon: BrainCircuit },
  { title: "Backend API", spec: "Node (Express) or FastAPI", built: "Python FastAPI", icon: Code2 },
  { title: "Database", spec: "PostgreSQL or MongoDB", built: "MongoDB", icon: Database },
  { title: "Maps & Matching", spec: "Google Maps / Mapbox SDK", built: "Recycler marketplace matching", icon: Map },
  { title: "Payments", spec: "Razorpay (India) or Stripe", built: "Stripe Checkout (INR)", icon: CreditCard },
];

export const IMAGES = {
  circuit: "https://images.unsplash.com/photo-1518770660439-4636190af475?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600",
  recycler: "https://images.pexels.com/photos/22989049/pexels-photo-22989049.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
  glow: "https://images.unsplash.com/photo-1648614593495-e0955bf287e5?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200",
};

export const META = { psId: "Open Innovation", title: "Digitalizing the Informal E-Waste Recycling System", theme: "Clean & Technology", team: "The Null Set" };
