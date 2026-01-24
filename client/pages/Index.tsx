import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowRight, Heart, MapPin, Zap } from "lucide-react";
import { toast } from "sonner";

export default function Index() {
  const [stats, setStats] = useState({
    total: 0,
    lost: 0,
    found: 0,
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      // Just set default stats - don't query the database on home page
      // Stats will be loaded from user dashboard instead
      setStats({ total: 0, lost: 0, found: 0 });
    } catch (err) {
      console.error(
        "Error loading stats:",
        err instanceof Error ? err.message : JSON.stringify(err),
      );
      setStats({ total: 0, lost: 0, found: 0 });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50 dark:from-slate-900 dark:to-slate-800">
      <Header />

      <main className="flex flex-col">
        {/* Hero Section */}
        <section className="container max-w-6xl mx-auto px-4 py-20 text-center">
          <div className="space-y-6 max-w-3xl mx-auto">
            <h1 className="text-5xl md:text-6xl font-bold text-foreground leading-tight">
              Find What You've Lost
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
                Help Others Find Theirs
              </span>
            </h1>

            <p className="text-xl text-muted-foreground">
              A community-driven platform to reunite lost items with their
              owners. Report what you've lost or found and let our intelligent
              matching system help make connections.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
              <Button
                asChild
                size="lg"
                className="h-14 text-base font-semibold"
              >
                <Link to="/submit">
                  Report an Item
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="h-14 text-base font-semibold"
              >
                <Link to="/reports">Browse Reports</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="container max-w-6xl mx-auto px-4 py-12">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard icon="📊" label="Reports" value={stats.total} />
            <StatCard icon="😞" label="Lost Items" value={stats.lost} />
            <StatCard icon="🎁" label="Found Items" value={stats.found} />
          </div>
        </section>

        {/* Features Section */}
        <section className="container max-w-6xl mx-auto px-4 py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              How It Works
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Our intelligent system analyzes item descriptions to find matches
              between lost and found reports
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <FeatureCard
              number="1"
              icon={<Zap className="w-8 h-8" />}
              title="Quick Report"
              description="Submit a detailed report about your lost or found item in minutes"
            />
            <FeatureCard
              number="2"
              icon={<MapPin className="w-8 h-8" />}
              title="Smart Matching"
              description="Our system analyzes item details to find potential matches automatically"
            />
            <FeatureCard
              number="3"
              icon={<Heart className="w-8 h-8" />}
              title="Reunite"
              description="Connect with other community members to reunite items with owners"
            />
          </div>
        </section>

        {/* CTA Section */}
        <section className="container max-w-4xl mx-auto px-4 py-16">
          <Card className="p-8 md:p-12 bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/20">
            <div className="text-center space-y-6">
              <h3 className="text-3xl font-bold text-foreground">
                Have you lost something?
              </h3>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Don't give up! Every item reported has a chance of being found.
                Our community is here to help reunite you with your belongings.
              </p>
              <Button asChild size="lg" className="h-12 text-base">
                <Link to="/submit">
                  Report Lost Item
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Link>
              </Button>
            </div>
          </Card>
        </section>

        {/* Footer */}
        <footer className="container max-w-6xl mx-auto px-4 py-12 mt-12 border-t border-border">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div>
              <h4 className="font-bold text-foreground mb-4">About</h4>
              <p className="text-muted-foreground text-sm">
                Lost & Found is a community platform built to help reunite lost
                items with their rightful owners through intelligent matching.
              </p>
            </div>
            <div>
              <h4 className="font-bold text-foreground mb-4">Quick Links</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link
                    to="/submit"
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    Report Item
                  </Link>
                </li>
                <li>
                  <Link
                    to="/reports"
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    View Reports
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-foreground mb-4">Safety</h4>
              <p className="text-muted-foreground text-sm">
                Never share personal contact information in reports. Use our
                secure platform for all communications.
              </p>
            </div>
          </div>
          <div className="border-t border-border pt-6 text-center text-sm text-muted-foreground">
            <p>
              &copy; 2024 Lost & Found. Helping reunite items with their owners.
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: number;
}) {
  return (
    <Card className="p-6 text-center hover:shadow-lg transition-shadow">
      <div className="text-4xl mb-3">{icon}</div>
      <div className="text-3xl font-bold text-foreground mb-1">{value}</div>
      <div className="text-muted-foreground">{label}</div>
    </Card>
  );
}

function FeatureCard({
  number,
  icon,
  title,
  description,
}: {
  number: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Card className="p-8 hover:shadow-lg transition-all hover:scale-105">
      <div className="relative mb-6">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4">
          {icon}
        </div>
        <div className="absolute top-0 right-0 w-8 h-8 rounded-full bg-secondary/20 flex items-center justify-center text-secondary font-bold text-sm">
          {number}
        </div>
      </div>
      <h3 className="text-xl font-bold text-foreground mb-3">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </Card>
  );
}
