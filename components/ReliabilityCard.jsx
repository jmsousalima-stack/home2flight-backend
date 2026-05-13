// /components/ReliabilityCard.jsx

export default function ReliabilityCard({ data }) {
  const reliability = data?.reliability;
  const confidence = data?.confidence;
  const airportIntel = data?.airportIntelligence;
  const airportOperational = airportIntel?.operationalIntelligence;

  if (!data || !reliability || !confidence || !airportOperational) {
    return null;
  }

  const riskLabel =
    reliability.riskLevel === "high"
      ? "Risco elevado"
      : reliability.riskLevel === "medium"
      ? "Risco moderado"
      : "Risco baixo";

  const confidenceLabel =
    confidence.level === "high"
      ? "Confiança elevada"
      : confidence.level === "medium"
      ? "Confiança moderada"
      : "Confiança reduzida";

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
          Reliability Engine
        </p>

        <h2 className="mt-1 text-xl font-bold text-slate-950">
          Fiabilidade operacional
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Avaliação baseada no novo Airport Intelligence Engine.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-xs font-medium text-slate-500">Fiabilidade</p>
          <p className="mt-1 text-2xl font-bold text-slate-950">
            {reliability.score}
          </p>
          <p className="text-xs text-slate-500">/100</p>
        </div>

        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-xs font-medium text-slate-500">Confiança</p>
          <p className="mt-1 text-2xl font-bold text-slate-950">
            {confidence.score}
          </p>
          <p className="text-xs text-slate-500">{confidenceLabel}</p>
        </div>

        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-xs font-medium text-slate-500">Risco</p>
          <p className="mt-1 text-base font-bold text-slate-950">
            {riskLabel}
          </p>
          <p className="text-xs text-slate-500">
            Aeroporto: {airportOperational.airportRisk}
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-2xl bg-slate-950 p-4 text-white">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
          Fonte operacional
        </p>

        <p className="mt-2 text-sm font-medium">
          {airportOperational.sourceType}
        </p>

        <p className="mt-2 text-xs leading-relaxed text-slate-300">
          Buffer aeroportuário recomendado:{" "}
          <strong>{airportOperational.recommendedAirportBuffer} min</strong>
        </p>

        <p className="mt-1 text-xs leading-relaxed text-slate-300">
          Segurança estimada:{" "}
          <strong>{airportOperational.estimatedSecurityMinutes} min</strong> ·
          Caminhada interna:{" "}
          <strong>{airportOperational.estimatedWalkingMinutes} min</strong>
        </p>
      </div>

      {data?.alerts?.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-sm font-semibold text-slate-900">
            Alertas operacionais
          </p>

          <div className="space-y-2">
            {data.alerts.map((alert, index) => (
              <div
                key={`${alert.type}-${index}`}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-3"
              >
                <p className="text-sm font-medium text-slate-900">
                  {alert.label}
                </p>
                <p className="text-xs text-slate-500">
                  Severidade: {alert.severity}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {confidence?.weaknesses?.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-sm font-semibold text-slate-900">
            Limitações conhecidas
          </p>

          <ul className="space-y-1">
            {confidence.weaknesses.slice(0, 3).map((item, index) => (
              <li key={index} className="text-xs leading-relaxed text-slate-500">
                • {item}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}