import React from "react";
import { useNavigate } from "react-router-dom";
import { TrendingUp, TrendingDown, AlertTriangle, Users } from "lucide-react";

const DashboardStats = ({ summaryCards }) => {
  const navigate = useNavigate();

  const handleClick = (card) => {
    if (card.onClick) return card.onClick();
    if (card.icon === AlertTriangle) return navigate("/low-stock-all");
    if (card.icon === Users) return navigate("/member-list");
    return undefined;
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {summaryCards.map((card) => {
        const Icon = card.icon;
        const clicked = handleClick(card);
        const trendUp = card.growth !== undefined ? card.growth >= 0 : !!card.trendUp;
        return (
          <div
            key={card.id || card.label}
            onClick={clicked || undefined}
            className={`bg-card rounded-xl border border-border p-4 shadow-sm transition-all ${
              card.bg || ""
            } ${clicked ? "cursor-pointer hover:shadow-md hover:ring-2 hover:ring-primary/30" : ""}`}>
            <div className="flex items-start justify-between mb-2">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider truncate">
                  {card.label}
                </p>
                {card.sub && (
                  <p className="text-xs text-muted-foreground/80 mt-0.5 truncate">{card.sub}</p>
                )}
              </div>
              <span
                className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                  card.iconBg || "bg-primary/10"
                } ${card.color || "text-primary"}`}>
                <Icon size={17} />
              </span>
            </div>
            <h2 className="text-2xl font-bold text-foreground truncate">{card.value}</h2>
            <div className="flex items-center gap-1.5 mt-1.5 min-h-4">
              {card.growth !== undefined ? (
                <span
                  className={`inline-flex items-center gap-1 text-xs font-medium ${
                    trendUp ? "text-green-600 dark:text-green-400" : "text-destructive"
                  }`}>
                  {trendUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                  {card.growth > 0 ? "+" : ""}
                  {card.growth}%
                </span>
              ) : card.trend ? (
                <span
                  className={`inline-flex items-center gap-1 text-xs font-medium ${
                    trendUp ? "text-green-600 dark:text-green-400" : "text-destructive"
                  }`}>
                  {trendUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                  <span className="truncate">{card.trend}</span>
                </span>
              ) : null}
              {card.trendNote && (
                <span className="text-xs text-muted-foreground truncate">{card.trendNote}</span>
              )}
            </div>
            {card.progress !== undefined && (
              <div className="mt-2.5">
                <div className="flex items-center justify-between text-xs mb-1 gap-2">
                  <span className="text-muted-foreground truncate">{card.progressLabel}</span>
                  <span className="font-semibold text-foreground shrink-0">
                    {Math.round(card.progress)}%
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      card.progressColor || "bg-primary"
                    }`}
                    style={{ width: `${Math.min(100, Math.max(0, card.progress))}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default DashboardStats;
