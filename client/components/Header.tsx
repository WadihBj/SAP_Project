import { Link } from "react-router-dom";
import { Package, Plus, Search } from "lucide-react";

export default function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white shadow-sm dark:bg-slate-900">
      <div className="container mx-auto max-w-6xl px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link
            to="/"
            className="flex items-center gap-2 font-bold text-lg text-primary hover:text-primary/80 transition-colors"
          >
            <Package className="w-6 h-6" />
            <span className="hidden sm:inline">Lost & Found</span>
            <span className="sm:hidden">L&F</span>
          </Link>

          {/* Navigation */}
          <nav className="flex items-center gap-1 sm:gap-4">
            <Link
              to="/submit"
              className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium text-sm sm:text-base"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Report Item</span>
              <span className="sm:hidden">Report</span>
            </Link>

            <Link
              to="/reports"
              className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-foreground hover:bg-muted transition-colors font-medium text-sm sm:text-base"
            >
              <Search className="w-4 h-4" />
              <span className="hidden sm:inline">View All</span>
              <span className="sm:hidden">All</span>
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
