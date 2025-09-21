import { Users, Star, Shield, Sparkles } from 'lucide-react';

export function TrustBadges() {
  const badges = [
    { icon: Users, text: "50k+ Users", value: "50,000+" },
    { icon: Star, text: "AI-Curated", value: "10k+ Styles" },
    { icon: Shield, text: "Secure", value: "100% Safe" },
    { icon: Sparkles, text: "Premium", value: "Luxury Brands" }
  ];

  return (
    <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 lg:gap-8">
      {badges.map(({ icon: Icon, text, value }, index) => (
        <div 
          key={text}
          className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-3 py-2 border border-white/20 animate-fade-in-up"
          style={{
            animationDelay: `${2 + index * 0.1}s`,
            animationFillMode: 'both'
          }}
        >
          <Icon className="w-4 h-4 text-primary" />
          <div className="text-xs">
            <div className="font-semibold text-white">{value}</div>
            <div className="text-gray-300">{text}</div>
          </div>
        </div>
      ))}
    </div>
  );
}