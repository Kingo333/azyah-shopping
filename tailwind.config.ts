
import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))',
					glow: 'hsl(var(--primary-glow))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent-cartier))',
					foreground: 'hsl(var(--accent-foreground))',
				cartier: {
					50: 'hsl(0 86% 97%)',
					100: 'hsl(0 93% 94%)',
					200: 'hsl(0 96% 89%)',
					300: 'hsl(0 94% 82%)',
					400: 'hsl(0 91% 71%)',
					500: 'hsl(0 84% 60%)',
					600: 'hsl(351 82% 41%)',
					700: 'hsl(0 100% 32%)',
					800: 'hsl(0 63% 31%)',
					900: 'hsl(0 62% 27%)',
					DEFAULT: 'hsl(var(--accent-cartier))'
				}
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				},
				// Luxury palette additions
				'lux-bg': 'hsl(var(--lux-bg))',
				'lux-card': 'hsl(var(--lux-card))',
				'lux-primary': 'hsl(var(--lux-primary))',
				'lux-secondary': 'hsl(var(--lux-secondary))',
				'lux-accent': 'hsl(var(--lux-accent))',
				'cartier': {
					50: 'hsl(0 86% 97%)',
					100: 'hsl(0 93% 94%)',
					200: 'hsl(0 96% 89%)',
					300: 'hsl(0 94% 82%)',
					400: 'hsl(0 91% 71%)',
					500: 'hsl(0 84% 60%)',
					600: 'hsl(351 82% 41%)',
					700: 'hsl(0 100% 32%)',
					800: 'hsl(0 63% 31%)',
					900: 'hsl(0 62% 27%)',
				},
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			keyframes: {
				'accordion-down': {
					from: {
						height: '0'
					},
					to: {
						height: 'var(--radix-accordion-content-height)'
					}
				},
				'accordion-up': {
					from: {
						height: 'var(--radix-accordion-content-height)'
					},
					to: {
						height: '0'
					}
				},
				'fade-in': {
					'0%': {
						opacity: '0',
						transform: 'translateY(10px)'
					},
					'100%': {
						opacity: '1',
						transform: 'translateY(0)'
					}
				},
				'scale-in': {
					'0%': {
						transform: 'scale(0.95)',
						opacity: '0'
					},
					'100%': {
						transform: 'scale(1)',
						opacity: '1'
					}
				},
				'slide-up': {
					'0%': {
						transform: 'translateY(100%)',
						opacity: '0'
					},
					'100%': {
						transform: 'translateY(0)',
						opacity: '1'
					}
				},
				'glow-pulse': {
					'0%, 100%': {
						boxShadow: '0 0 20px hsl(var(--primary) / 0.3)'
					},
					'50%': {
						boxShadow: '0 0 40px hsl(var(--primary) / 0.6)'
					}
				},
				'luxury-glow': {
					'0%, 100%': {
						boxShadow: '0 0 30px hsl(var(--lux-primary) / 0.3)'
					},
					'50%': {
						boxShadow: '0 0 60px hsl(var(--lux-primary) / 0.6)'
					}
				},
				'cartier-glow': {
					'0%, 100%': {
						boxShadow: '0 0 20px hsl(var(--accent-cartier) / 0.3)'
					},
					'50%': {
						boxShadow: '0 0 40px hsl(var(--accent-cartier) / 0.6)'
					}
				},
				'aurora-flow': {
					'0%': {
						transform: 'translate(-8%, -12%) rotate(0deg) scale(1) skewY(2deg)',
						opacity: '0.7'
					},
					'15%': {
						transform: 'translate(-12%, -8%) rotate(15deg) scale(1.03) skewY(-1deg)',
						opacity: '0.85'
					},
					'30%': {
						transform: 'translate(-6%, -14%) rotate(30deg) scale(0.98) skewY(3deg)',
						opacity: '0.6'
					},
					'45%': {
						transform: 'translate(-14%, -6%) rotate(45deg) scale(1.05) skewY(-2deg)',
						opacity: '0.8'
					},
					'60%': {
						transform: 'translate(-10%, -10%) rotate(60deg) scale(1.01) skewY(1deg)',
						opacity: '0.65'
					},
					'75%': {
						transform: 'translate(-4%, -16%) rotate(75deg) scale(0.96) skewY(-3deg)',
						opacity: '0.75'
					},
					'90%': {
						transform: 'translate(-16%, -4%) rotate(90deg) scale(1.04) skewY(2deg)',
						opacity: '0.9'
					},
					'100%': {
						transform: 'translate(-8%, -12%) rotate(0deg) scale(1) skewY(2deg)',
						opacity: '0.7'
					}
				},
				'scan': {
					'0%': {
						transform: 'translateY(-100%)',
						opacity: '0'
					},
					'50%': {
						opacity: '1'
					},
					'100%': {
						transform: 'translateY(6400%)',
						opacity: '0'
					}
				},
				'clock-tick': {
					'0%, 100%': {
						transform: 'rotate(0deg)'
					},
					'25%': {
						transform: 'rotate(90deg)'
					},
					'50%': {
						transform: 'rotate(180deg)'
					},
					'75%': {
						transform: 'rotate(270deg)'
					}
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'fade-in': 'fade-in 0.3s ease-out',
				'scale-in': 'scale-in 0.2s ease-out',
				'slide-up': 'slide-up 0.3s ease-out',
				'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
				'luxury-glow': 'luxury-glow 3s ease-in-out infinite',
				'cartier-glow': 'cartier-glow 2s ease-in-out infinite',
				'aurora-flow': 'aurora-flow 30s ease-in-out infinite'
			},
			boxShadow: {
				'glow': 'var(--shadow-glow)',
				'crimson': 'var(--shadow-crimson)',
				'elegant': 'var(--shadow-elegant)',
				'cartier': '0 4px 24px hsl(var(--accent-cartier) / 0.15)'
			},
				fontFamily: {
					'luxury': ['Inter', 'system-ui', 'sans-serif'],
					'playfair': ['Playfair Display', 'serif'],
					'cormorant': ['Cormorant Garamond', 'serif']
				},
			spacing: {
				'mobile-safe': 'env(safe-area-inset-bottom)'
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
	safelist: [
		'bg-accent-cartier-600',
		'bg-accent-cartier-700',
		'text-accent-cartier-600',
		'text-accent-cartier-700',
		'border-accent-cartier-600',
		'border-accent-cartier-700',
		'ring-accent-cartier-600',
		'hover:bg-accent-cartier-700',
		'focus:ring-accent-cartier-600'
	]
} satisfies Config;
