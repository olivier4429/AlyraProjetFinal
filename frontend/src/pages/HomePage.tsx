import { useNavigate } from "react-router-dom";
import StatBox from "../components/ui/StatBox";
import AuditorCard from "../components/auditors/AuditorCard";
import { useAuditors } from "../hooks/useAuditors";
import { useProtocolStats } from "../hooks/useProtocolStats";

export default function HomePage() {
  const navigate = useNavigate();
  const { auditors, isLoading, error } = useAuditors();
  const stats = useProtocolStats(auditors);

  const sortedAuditors = [...auditors].sort(
    (a, b) => b.reputationScore - a.reputationScore
  );

  return (
    <div className="flex flex-col gap-10">
      {/* Hero */}
      <section className="text-center py-12 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-transparent rounded-2xl pointer-events-none" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-semibold mb-6">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            Réseau Sepolia Testnet
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold font-display leading-tight mb-4">
            Trouvez un auditeur
            <br />
            de{" "}
            <span className="text-blue-400">confiance</span>
          </h1>

          <p className="text-gray-400 text-lg max-w-2xl mx-auto mb-8">
            Des auditeurs de smart contracts vérifiés on-chain. Leur réputation
            est immuable, transparente et calculée à partir de leurs audits réels.
          </p>

          <div className="flex items-center justify-center gap-4 flex-wrap">
            <button
              onClick={() => navigate("/depot")}
              className="px-8 py-3 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-lg transition-colors"
            >
              Déposer un audit
            </button>
            <button
              onClick={() => navigate("/inscription")}
              className="px-8 py-3 border border-blue-500/40 text-blue-300 hover:text-white hover:border-blue-500 font-bold rounded-lg transition-colors"
            >
              Devenir auditeur
            </button>
            <button
              onClick={() =>
                document
                  .getElementById("auditors-list")
                  ?.scrollIntoView({ behavior: "smooth" })
              }
              className="px-8 py-3 border border-[#374151] text-gray-300 hover:text-white hover:border-[#4B5563] font-bold rounded-lg transition-colors"
            >
              Explorer →
            </button>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatBox
            value={isLoading ? "…" : String(stats.auditorCount)}
            label="Auditeurs inscrits"
            accentColor="#3B82F6"
          />
          <StatBox
            value={isLoading ? "…" : String(stats.auditCount)}
            label="Audits enregistrés"
            accentColor="#22D3EE"
          />
          <StatBox
            value={isLoading ? "…" : `${stats.exploitFreePercent}%`}
            label="Sans exploit"
            accentColor="#34D399"
          />
          <StatBox
            value={stats.totalVolumeUsdc}
            label="Volume audité"
            accentColor="#F59E0B"
          />
        </div>
      </section>

      {/* Auditors list */}
      <section id="auditors-list">
        <div className="flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white font-display">Auditeurs</h2>
              <p className="text-gray-400 text-sm mt-1">
                {isLoading
                  ? "Chargement…"
                  : `${sortedAuditors.length} résultat${sortedAuditors.length !== 1 ? "s" : ""}`}
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
              </svg>
              Trié par score
            </div>
          </div>

          {error && (
            <p className="text-red-400 text-sm">
              Erreur de chargement : {error.message}
            </p>
          )}

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="h-40 rounded-xl bg-[#1F2937] animate-pulse"
                />
              ))}
            </div>
          ) : sortedAuditors.length === 0 ? (
            <p className="text-gray-500 text-center py-12">
              Aucun auditeur inscrit pour le moment.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sortedAuditors.map((auditor, i) => (
                <AuditorCard key={auditor.address} auditor={auditor} rank={i + 1} />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
