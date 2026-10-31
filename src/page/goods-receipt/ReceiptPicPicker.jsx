import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Search } from "lucide-react";
import { Label } from "@/components/ui/label";

const ReceiptPicPicker = ({ idPrefix, employees, value, onChange }) => {
  const { t } = useTranslation();
  const [picSearch, setPicSearch] = useState("");
  const [picOpen, setPicOpen] = useState(false);
  const picRef = useRef(null);
  const filteredEmployees = employees.filter((e) =>
    (e.fullName || e.userName)?.toLowerCase().includes(picSearch.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (picRef.current && !picRef.current.contains(e.target)) {
        setPicOpen(false);
        setPicSearch("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handlePick = (employee) => {
    onChange(employee);
    setPicSearch("");
    setPicOpen(false);
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={`${idPrefix}-goods-receipt-pic`}>
        {t("page.goodsReceipt.add.form.pic")}{" "}
        <span className="text-xs font-normal text-muted-foreground">({t("common.optional")})</span>
      </Label>
      <div className="relative" ref={picRef}>
        <div
          className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm flex items-center cursor-pointer"
          onClick={() => setPicOpen(!picOpen)}>
          <Search size={14} className="mr-2 text-muted-foreground shrink-0" />
          <input
            id={`${idPrefix}-goods-receipt-pic`}
            type="text"
            value={picOpen ? picSearch : value?.fullName || value?.userName || ""}
            readOnly={!picOpen}
            onFocus={() => setPicOpen(true)}
            onChange={(e) => setPicSearch(e.target.value)}
            placeholder={t("page.goodsReceipt.add.form.picPlaceholder")}
            className="flex-1 bg-transparent outline-none text-sm"
          />
        </div>
        {picOpen && (
          <div className="absolute z-50 top-full mt-1 w-full bg-popover border border-border rounded-md shadow-md max-h-60 overflow-auto">
            {filteredEmployees.length === 0 ? (
              <div className="px-3 py-2 text-sm text-muted-foreground">
                {t("page.goodsReceipt.add.form.picEmpty")}
              </div>
            ) : (
              filteredEmployees.map((emp) => (
                <div
                  key={emp.id}
                  className={`px-3 py-2 text-sm cursor-pointer hover:bg-accent ${
                    value?.id === emp.id ? "bg-accent" : ""
                  }`}
                  onClick={() => handlePick(emp)}>
                  {emp.fullName || emp.userName}
                </div>
              ))
            )}
          </div>
        )}
      </div>
      {value && (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="text-xs text-muted-foreground hover:text-destructive">
          {t("page.goodsReceipt.add.form.clearPic")}
        </button>
      )}
    </div>
  );
};

export default ReceiptPicPicker;
