import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { TrendingUp, ArrowRight, BarChart3, Users, Target, Award } from "lucide-react";

const LandingPage = () => {
  const { user } = useAuth();

  const features = [
    {
      icon: Target,
      title: "Make Predictions",
      description: "Submit probability forecasts on real-world events across crypto, politics, tech, and sports."
    },
    {
      icon: BarChart3,
      title: "Track Accuracy",
      description: "Build your forecasting track record with Brier scoring. Every prediction counts."
    },
    {
      icon: Award,
      title: "Climb the Ranks",
      description: "Compete on global leaderboards. Prove your forecasting skill isn't just luck."
    }
  ];

  const stats = [
    { label: "Active Forecasters", value: "2.4K+" },
    { label: "Predictions Made", value: "48K+" },
    { label: "Questions Resolved", value: "1.2K+" },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link to="/" className="flex items-center gap-2" data-testid="landing-logo">
              <TrendingUp className="h-6 w-6 text-blue-900" />
              <span className="font-heading font-semibold text-xl text-slate-900">
                SignalRanking
              </span>
            </Link>
            <div className="flex items-center gap-3">
              {user ? (
                <Button 
                  asChild
                  className="bg-blue-900 hover:bg-blue-800 text-white"
                  data-testid="go-to-dashboard-btn"
                >
                  <Link to="/dashboard">
                    Go to Dashboard
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              ) : (
                <>
                  <Button 
                    asChild 
                    variant="ghost"
                    className="text-slate-600 hover:text-slate-900"
                    data-testid="login-btn"
                  >
                    <Link to="/login">Log in</Link>
                  </Button>
                  <Button 
                    asChild
                    className="bg-blue-900 hover:bg-blue-800 text-white"
                    data-testid="get-started-btn"
                  >
                    <Link to="/signup">Get Started</Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-slate-50" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: Text Content */}
            <div className="space-y-8">
              <div className="space-y-4">
                <p className="font-mono text-xs tracking-widest uppercase text-blue-900">
                  Forecasting Platform
                </p>
                <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-slate-900 leading-tight">
                  Predict the future.<br />
                  <span className="text-blue-900">Build your record.</span>
                </h1>
                <p className="text-lg text-slate-600 max-w-lg leading-relaxed">
                  Compete with others to forecast real-world events. Track your accuracy 
                  with precision scoring. Rise through the ranks and prove your signal 
                  from the noise.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                {user ? (
                  <Button 
                    asChild 
                    size="lg"
                    className="bg-blue-900 hover:bg-blue-800 text-white px-8"
                    data-testid="hero-dashboard-btn"
                  >
                    <Link to="/dashboard">
                      View Questions
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                ) : (
                  <>
                    <Button 
                      asChild 
                      size="lg"
                      className="bg-blue-900 hover:bg-blue-800 text-white px-8"
                      data-testid="hero-start-btn"
                    >
                      <Link to="/signup">
                        Start Forecasting
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                    <Button 
                      asChild 
                      size="lg"
                      variant="outline"
                      className="border-slate-300"
                      data-testid="hero-learn-btn"
                    >
                      <a href="#how-it-works">Learn More</a>
                    </Button>
                  </>
                )}
              </div>

              {/* Stats */}
              <div className="flex gap-8 pt-4">
                {stats.map((stat) => (
                  <div key={stat.label}>
                    <p className="font-mono text-2xl font-semibold text-slate-900">
                      {stat.value}
                    </p>
                    <p className="text-sm text-slate-500">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Visual */}
            <div className="hidden lg:block">
              <div className="relative">
                {/* Mock Dashboard Preview */}
                <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="font-heading font-semibold text-slate-900">
                      Your Accuracy
                    </h3>
                    <span className="font-mono text-2xl font-semibold text-emerald-600">
                      76.4%
                    </span>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between py-3 border-b border-slate-100">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
                          <span className="text-xs font-medium text-amber-700">C</span>
                        </div>
                        <span className="text-sm text-slate-600">Crypto</span>
                      </div>
                      <span className="font-mono text-sm text-slate-900">82.1%</span>
                    </div>
                    <div className="flex items-center justify-between py-3 border-b border-slate-100">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                          <span className="text-xs font-medium text-red-700">P</span>
                        </div>
                        <span className="text-sm text-slate-600">Politics</span>
                      </div>
                      <span className="font-mono text-sm text-slate-900">71.3%</span>
                    </div>
                    <div className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                          <span className="text-xs font-medium text-blue-700">T</span>
                        </div>
                        <span className="text-sm text-slate-600">Tech</span>
                      </div>
                      <span className="font-mono text-sm text-slate-900">78.9%</span>
                    </div>
                  </div>
                </div>

                {/* Floating rank badge */}
                <div className="absolute -top-4 -right-4 bg-white rounded-lg border border-slate-200 px-4 py-2 shadow-sm">
                  <div className="flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-amber-500" />
                    <span className="font-mono text-sm font-medium text-slate-900">#42</span>
                  </div>
                  <p className="text-xs text-slate-500">Global Rank</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="font-mono text-xs tracking-widest uppercase text-blue-900 mb-4">
              How It Works
            </p>
            <h2 className="font-heading text-3xl font-semibold text-slate-900">
              Three steps to forecast mastery
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div 
                  key={feature.title}
                  className="relative p-6 bg-white border border-slate-200 rounded-lg hover:border-blue-300 transition-colors"
                >
                  <div className="absolute -top-3 left-6">
                    <span className="font-mono text-xs bg-blue-900 text-white px-2 py-1 rounded">
                      0{index + 1}
                    </span>
                  </div>
                  <div className="mt-4">
                    <div className="w-10 h-10 rounded-md bg-blue-50 flex items-center justify-center mb-4">
                      <Icon className="h-5 w-5 text-blue-900" />
                    </div>
                    <h3 className="font-heading font-semibold text-lg text-slate-900 mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-heading text-3xl font-semibold text-white mb-4">
            Ready to prove your forecasting skill?
          </h2>
          <p className="text-slate-400 mb-8 max-w-lg mx-auto">
            Join thousands of forecasters building their track record. 
            No real money. Just pure prediction.
          </p>
          {!user && (
            <Button 
              asChild 
              size="lg"
              className="bg-white text-slate-900 hover:bg-slate-100 px-8"
              data-testid="cta-signup-btn"
            >
              <Link to="/signup">
                Create Free Account
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-900" />
              <span className="font-heading font-medium text-slate-900">SignalRanking</span>
            </div>
            <p className="text-sm text-slate-500">
              © 2024 SignalRanking. Not gambling. Just forecasting.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;

// Add Trophy import
const Trophy = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/>
    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
    <path d="M4 22h16"/>
    <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/>
    <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
    <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>
  </svg>
);
