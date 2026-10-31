import { useState } from "react";
import { format } from "date-fns";
import { DEFAULT_OVER_DELIVERY_TOLERANCE } from "./poForm";

const TIME_FORMAT = "HH:mm";

export const usePoHeaderState = ({ initialStore = "", initialOrderDate = null } = {}) => {
  const [selectedStore, setSelectedStore] = useState(initialStore);
  const [notes, setNotes] = useState("");
  const [orderDate, setOrderDate] = useState(initialOrderDate);
  const [orderTime, setOrderTime] = useState(
    initialOrderDate ? format(initialOrderDate, TIME_FORMAT) : ""
  );
  const [dueDate, setDueDate] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [tenor, setTenor] = useState(0);
  const [dpPercent, setDpPercent] = useState(0);
  const [picSearch, setPicSearch] = useState("");
  const [picId, setPicId] = useState(null);
  const [isPicListOpen, setIsPicListOpen] = useState(false);
  const [discount, setDiscount] = useState(0);
  const [taxRate, setTaxRate] = useState(0);
  const [additionalCost, setAdditionalCost] = useState(0);
  const [additionalCostNotes, setAdditionalCostNotes] = useState("");
  const [overDeliveryTolerance, setOverDeliveryTolerance] = useState(
    DEFAULT_OVER_DELIVERY_TOLERANCE
  );
  const [errors, setErrors] = useState({});

  const clearError = (field) => setErrors((prev) => ({ ...prev, [field]: undefined }));

  const resetCredit = () => {
    setTenor(0);
    setDpPercent(0);
    setDueDate(null);
  };

  const selectPaymentMethod = (method) => {
    setPaymentMethod(method);
    if (method === "cash") resetCredit();
  };

  const selectPic = (employee) => {
    setPicSearch(employee.fullName || employee.userName);
    setPicId(employee.id || employee._id);
    setIsPicListOpen(false);
  };

  const searchPic = (value) => {
    setPicSearch(value);
    setPicId(null);
    setIsPicListOpen(true);
    clearError("pic");
  };

  const resetPic = () => {
    setPicSearch("");
    setPicId(null);
    setIsPicListOpen(false);
  };

  const hydrate = (po) => {
    const loadedDate = po.orderDate ? new Date(po.orderDate) : new Date();
    setSelectedStore(po.store || "");
    setPicSearch(po.picData?.fullName || "");
    setPicId(po.pic);
    setNotes(po.notes || "");
    setDiscount(po.discount || 0);
    setTaxRate(po.taxRate || 0);
    setAdditionalCost(po.additionalCost || 0);
    setAdditionalCostNotes(po.additionalCostNotes || "");
    setOverDeliveryTolerance(po.overDeliveryTolerance ?? DEFAULT_OVER_DELIVERY_TOLERANCE);
    setOrderDate(loadedDate);
    setOrderTime(format(loadedDate, TIME_FORMAT));
    setDueDate(po.dueDate ? new Date(po.dueDate) : null);
    setPaymentMethod(po.paymentMethod || "cash");
    setTenor(po.tenor || 0);
    setDpPercent(po.dpPercent || 0);
  };

  return {
    selectedStore,
    setSelectedStore,
    notes,
    setNotes,
    orderDate,
    setOrderDate,
    orderTime,
    setOrderTime,
    dueDate,
    setDueDate,
    paymentMethod,
    setPaymentMethod,
    selectPaymentMethod,
    resetCredit,
    tenor,
    setTenor,
    dpPercent,
    setDpPercent,
    picSearch,
    picId,
    isPicListOpen,
    setIsPicListOpen,
    selectPic,
    searchPic,
    resetPic,
    discount,
    setDiscount,
    taxRate,
    setTaxRate,
    additionalCost,
    setAdditionalCost,
    additionalCostNotes,
    setAdditionalCostNotes,
    overDeliveryTolerance,
    setOverDeliveryTolerance,
    errors,
    setErrors,
    clearError,
    hydrate
  };
};
