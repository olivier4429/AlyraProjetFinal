import { NavLink } from "react-router-dom";

export default function Navbar() {
  return (
    <nav className="sticky top-0 z-50 bg-[#0A0E1A]/90 backdrop-blur-sm border-b border-[#374151]">
      <div className="max-w-6xl mx-auto w-full px-6 sm:px-8 lg:px-12">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <div className="flex items-center gap-8">
            <NavLink to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-500/40 flex items-center justify-center">
                <span className="text-blue-400 font-bold text-sm font-mono">A</span>
              </div>
              <span className="font-bold text-white font-display text-lg">
                Audit<span className="text-blue-400">Registry</span>
              </span>
            </NavLink>

            {/* Nav links */}
            <div className="hidden md:flex items-center gap-1">
              <NavLink
                to="/"
                end
                className={({ isActive }) =>
                  `px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                    isActive
                      ? "bg-blue-500/10 text-blue-400"
                      : "text-gray-400 hover:text-white hover:bg-[#1F2937]"
                  }`
                }
              >
                Auditeurs
              </NavLink>
              <NavLink
                to="/explorer"
                className={({ isActive }) =>
                  `px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                    isActive
                      ? "bg-blue-500/10 text-blue-400"
                      : "text-gray-400 hover:text-white hover:bg-[#1F2937]"
                  }`
                }
              >
                Explorer
              </NavLink>
              <NavLink
                to="/depot"
                className={({ isActive }) =>
                  `px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                    isActive
                      ? "bg-blue-500/10 text-blue-400"
                      : "text-gray-400 hover:text-white hover:bg-[#1F2937]"
                  }`
                }
              >
                Déposer
              </NavLink>
              <NavLink
                to="/validation"
                className={({ isActive }) =>
                  `px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                    isActive
                      ? "bg-blue-500/10 text-blue-400"
                      : "text-gray-400 hover:text-white hover:bg-[#1F2937]"
                  }`
                }
              >
                Valider
              </NavLink>
              <NavLink
                to="/inscription"
                className={({ isActive }) =>
                  `px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                    isActive
                      ? "bg-blue-500/10 text-blue-400"
                      : "text-gray-400 hover:text-white hover:bg-[#1F2937]"
                  }`
                }
              >
                S'inscrire
              </NavLink>
            </div>
          </div>

          {/* Wallet buttons */}
          <div className="flex items-center gap-3">
            <appkit-network-button />
            <appkit-button balance="hide" />
          </div>
        </div>
      </div>
    </nav>
  );
}
