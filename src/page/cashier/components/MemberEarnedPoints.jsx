import React from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";

const P = "page.cashier.memberPoints";

export const earnedPoints = (items = []) =>
  items.reduce((sum, item) => sum + (Number(item.point) || 0) * (Number(item.count) || 0), 0);

const MemberEarnedPoints = ({ items }) => {
  const { t } = useTranslation();
  const points = earnedPoints(items);
  if (points > 0) {
    return (
      <p className="text-xs text-emerald-600">
        {t(`${P}.earned`, { points: points.toLocaleString("id-ID") })}
      </p>
    );
  }
  return <p className="text-xs text-muted-foreground">{t(`${P}.none`)}</p>;
};

MemberEarnedPoints.propTypes = {
  items: PropTypes.arrayOf(PropTypes.object).isRequired
};

export default MemberEarnedPoints;
