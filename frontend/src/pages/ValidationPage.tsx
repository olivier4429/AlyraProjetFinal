import { useConnection } from "wagmi";
import type { Address } from "viem";
import { useAudits, AuditStatus } from "../hooks/useAudits";
import Alert from "../components/ui/Alert";
import AuditCard from "../components/audits/AuditCard";
import { shortenAddress } from "../utils";

export default function ValidationPage() {
  const { address, isConnected } = useConnection();
  const { audits, isLoading, error, refreshAudit } = useAudits(
    isConnected ? (address as Address) : undefined
  );

  const pending = audits.filter((a) => a.status === AuditStatus.PENDING);
  const validated = audits.filter((a) => a.status === AuditStatus.VALIDATED);
  const closed = audits.filter((a) => a.status === AuditStatus.CLOSED);

  if (!isConnected) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center">
        <p className="text-gray-400 text-lg">Connectez votre wallet pour voir vos audits.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8 flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold text-white font-display">Mes audits</h1>
        <p className="text-gray-400 text-sm mt-1 font-mono">
          {shortenAddress(address!)}
        </p>
      </div>

      {error && (
        <Alert variant="danger">Erreur de chargement : {error.message}</Alert>
      )}

      {/* À valider */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">À valider</h2>
          <span className="text-xs text-gray-500 font-mono">
            {isLoading ? "…" : `${pending.length} audit${pending.length !== 1 ? "s" : ""}`}
          </span>
        </div>

        {isLoading ? (
          <div className="flex flex-col gap-3">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="h-40 rounded-xl bg-[#1F2937] animate-pulse" />
            ))}
          </div>
        ) : pending.length === 0 ? (
          <p className="text-gray-500 text-sm py-8 text-center border border-dashed border-[#374151] rounded-xl">
            Aucun audit en attente de validation.
          </p>
        ) : (
          pending.map((a) => (
            <AuditCard
              key={a.auditId.toString()}
              {...a}
              onRefresh={refreshAudit}
            />
          ))
        )}
      </section>

      {/* Validés */}
      {validated.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-bold text-white">Validés</h2>
          {validated.map((a) => (
            <AuditCard
              key={a.auditId.toString()}
              {...a}
              onRefresh={refreshAudit}
            />
          ))}
        </section>
      )}

      {/* Clôturés */}
      {closed.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-bold text-white">Clôturés</h2>
          {closed.map((a) => (
            <AuditCard
              key={a.auditId.toString()}
              {...a}
              onRefresh={refreshAudit}
            />
          ))}
        </section>
      )}
    </div>
  );
}
