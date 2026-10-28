/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { X, Save } from "lucide-react";
import { createReservation } from "@/services/reservation";
import { getLocationDetail } from "@/services/location";
import { useLocations } from "@/queries/useLocations";
import { getTablesByStore } from "@/services/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TimePicker } from "@/components/ui/time-picker";
import { DatePicker } from "@/components/ui/date-picker";
import { format } from "date-fns";
import { Textarea } from "@/components/ui/textarea";
import { Loading } from "@/components/ui/loading";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription
} from "@/components/ui/form";
import { Card } from "@/components/ui/card";
import Modal from "@/components/organism/modal";
import { useTranslation } from "react-i18next";
import MissingFieldsModal from "@/components/organism/MissingFieldsModal";
import { getMissingFields } from "@/lib/validation";
import PageHeader from "@/components/ui/PageHeader";
import UserGuide from "@/components/organism/UserGuide";
import { FIELD_LIMITS } from "@/constants/fieldLimits";
import { useFormExit } from "@/hooks/useLeaveGuard";
import { createdId } from "@/utils/createdRecord";
import LoadErrorBanner from "@/components/ui/LoadErrorBanner";

const DAY_NAMES = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

function generateTimeSlots(open, close) {
  const [oh, om] = open.split(":").map(Number);
  const [ch, cm] = close.split(":").map(Number);
  const start = oh * 60 + om,
    end = ch * 60 + cm;
  const slots = [];
  for (let m = start; m <= end; m += 30)
    slots.push(`${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`);
  return slots;
}

const AddReservation = () => {
  const { t } = useTranslation();
  const formSchema = z.object({
    customerName: z.string().min(1, t("page.reservation.edit.validation.customerName")),
    customerPhone: z.string().max(16).optional().or(z.literal("")),
    customerEmail: z.string().optional().or(z.literal("")),
    guestCount: z.coerce.number().min(1, t("page.reservation.add.validation.guestCount")),
    store: z.string().min(1, t("page.ingredientCategory.add.storeRequired")),
    reservationDate: z.date({
      required_error: t("page.reservation.edit.validation.reservationDate")
    }),
    startTime: z.string().min(1, t("page.reservation.add.validation.startTime")),
    endTime: z.string().optional().or(z.literal("")),
    tableId: z.string().optional().or(z.literal("")),
    notes: z.string().optional().or(z.literal(""))
  });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [cancelModal, setCancelModal] = useState(false);
  const [errorModal, setErrorModal] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const { data: storesData } = useLocations();
  const stores = storesData?.data || [];
  const [availableTables, setAvailableTables] = useState([]);
  const [loadingTables, setLoadingTables] = useState(false);
  const [locationDetail, setLocationDetail] = useState(null);
  const [missingFieldsModal, setMissingFieldsModal] = useState(false);
  const [missingFieldsList, setMissingFieldsList] = useState([]);
  const [confirmSaveModal, setConfirmSaveModal] = useState(false);

  const fieldLabels = {
    customerName: "Nama Customer",
    customerPhone: "No. Telepon",
    customerEmail: "Email",
    guestCount: "Jumlah Tamu",
    store: "Toko",
    reservationDate: "Tanggal",
    startTime: "Jam Mulai",
    endTime: "Jam Selesai",
    tableId: "Meja",
    notes: "Catatan"
  };

  const form = useForm({
    resolver: zodResolver(formSchema),
    mode: "onChange",
    defaultValues: {
      customerName: "",
      customerPhone: "",
      customerEmail: "",
      guestCount: 2,
      store: "",
      reservationDate: undefined,
      startTime: "",
      endTime: "",
      tableId: "none",
      notes: ""
    }
  });
  const { request: requestLeave, leave } = useFormExit(
    "/reservation",
    () => setCancelModal(true),
    form
  );

  const selectedStore = form.watch("store");
  const reservationDate = form.watch("reservationDate");
  const startTime = form.watch("startTime");
  const endTime = form.watch("endTime");

  useEffect(() => {
    if (selectedStore) {
      form.setValue("tableId", "none");
      loadTablesByStore();
      getLocationDetail({ id: selectedStore })
        .then((res) => setLocationDetail(res.data || null))
        .catch(() => setLocationDetail(null));
    } else {
      setAvailableTables([]);
      setLocationDetail(null);
    }
  }, [selectedStore]);

  const openingHours = locationDetail?.openingHours || [];
  const offDays = openingHours
    .filter((oh) => !oh.open && !oh.close)
    .map((oh) => DAY_NAMES.indexOf(oh.day));
  const isOffDay = reservationDate ? offDays.includes(reservationDate.getDay()) : false;
  const dayName = reservationDate ? DAY_NAMES[reservationDate.getDay()] : null;
  const dayHours = openingHours.find((oh) => oh.day === dayName);
  const timeSlots = isOffDay
    ? []
    : dayHours?.open && dayHours?.close
      ? generateTimeSlots(dayHours.open, dayHours.close)
      : null;
  const detailLoading = !!selectedStore && !locationDetail;

  useEffect(() => {
    if (isOffDay && (startTime || endTime)) {
      form.setValue("startTime", "");
      form.setValue("endTime", "");
    }
  }, [isOffDay]);

  useEffect(() => {
    if (reservationDate && dayHours?.open && dayHours?.close) {
      const valid = generateTimeSlots(dayHours.open, dayHours.close);
      if (startTime && !valid.includes(startTime)) form.setValue("startTime", "");
      if (endTime && !valid.includes(endTime)) form.setValue("endTime", "");
    }
  }, [locationDetail, reservationDate]);

  const loadTablesByStore = async () => {
    setLoadingTables(true);
    try {
      const res = await getTablesByStore({ location: selectedStore });
      setAvailableTables(res.data || []);
    } catch (e) {
      setAvailableTables([]);
    } finally {
      setLoadingTables(false);
    }
  };

  const createMutation = useMutation(createReservation, {
    onSuccess: (res) => {
      // Saving used to return to the list without a word.
      const id = createdId(res);
      toast.success(
        t("page.reservation.add.toastSuccess", { defaultValue: "Reservasi berhasil dibuat" }),
        {
          action: id
            ? { label: t("common.viewDetail"), onClick: () => navigate(`/reservation/${id}`) }
            : undefined
        }
      );
      queryClient.invalidateQueries(["reservations"]);
      navigate("/reservation");
    },
    onError: (err) => {
      setModalMessage(err?.response?.data?.message || err.message || "Gagal membuat reservasi");
      setErrorModal(true);
    }
  });

  const onSubmit = (values) => {
    const payload = {
      store: Number(values.store),
      customerName: values.customerName,
      customerPhone: values.customerPhone || null,
      customerEmail: values.customerEmail || null,
      guestCount: Number(values.guestCount),
      reservationDate: values.reservationDate ? format(values.reservationDate, "yyyy-MM-dd") : "",
      startTime: values.startTime,
      endTime: values.endTime || null,
      tableId: values.tableId && values.tableId !== "none" ? Number(values.tableId) : null,
      notes: values.notes || null
    };
    createMutation.mutate(payload);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          {
            label: t("breadcrumb.home"),
            href: "/dashboard-super-admin",
            i18nKey: "breadcrumb.home"
          },
          {
            label: "Reservasi",
            href: "/reservation",
            i18nKey: "breadcrumb.reservation"
          },
          { label: t("page.reservation.addButton") }
        ]}
        title={t("page.reservation.addButton")}
        description={t("page.reservation.ui.createANewTableReservation")}
        onBack={requestLeave}
        dynamicInfo={false}>
        <UserGuide guideKey="add-reservation" />
      </PageHeader>
      <LoadErrorBanner />

      <Card className="p-6">
        <Form {...form}>
          <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="col-span-full">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                  {t("page.reservation.detailTitle")}
                </h3>
              </div>
              <FormField
                control={form.control}
                name="store"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("document.store")} <span className="text-destructive">*</span>
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder={t("page.table.form.storePlaceholder")} />
                      </SelectTrigger>
                      <SelectContent>
                        {stores.map((s) => (
                          <SelectItem key={s.id} value={String(s.id)}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="reservationDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("document.date")} <span className="text-destructive">*</span>
                    </FormLabel>
                    <DatePicker
                      date={field.value}
                      setDate={(d) => {
                        if (d && offDays.includes(d.getDay())) return;
                        field.onChange(d);
                      }}
                      disabledDates={(date) => offDays.includes(date.getDay())}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("page.shift.form.startTime")} <span className="text-destructive">*</span>
                    </FormLabel>
                    <TimePicker
                      {...field}
                      placeholder={t("page.discount.form.placeholder.startTime")}
                      slots={timeSlots}
                      disabled={detailLoading}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="endTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("page.shift.form.endTime")}</FormLabel>
                    <TimePicker
                      {...field}
                      placeholder={t("page.discount.form.placeholder.endTime")}
                      slots={timeSlots}
                      disabled={detailLoading}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="col-span-full">
                <div className="border-t border-border my-2" />
              </div>
              <FormField
                control={form.control}
                name="customerName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("page.cashier.addCustomerName")}{" "}
                      <span className="text-destructive">*</span>
                    </FormLabel>
                    <Input
                      placeholder={t("page.reservation.ui.customerName")}
                      {...field}
                      maxLength={FIELD_LIMITS.PERSON_NAME}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="customerPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("page.member.table.phone")}</FormLabel>
                    <Input placeholder="08123456789" maxLength={FIELD_LIMITS.PHONE} {...field} />
                    <FormMessage />
                    <FormDescription>{t("common.phoneHint")}</FormDescription>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="customerEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <Input
                      type="email"
                      placeholder="email@example.com"
                      {...field}
                      maxLength={FIELD_LIMITS.EMAIL}
                    />
                    <FormMessage />
                    <FormDescription>{t("common.optionalField")}</FormDescription>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="guestCount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("page.reservation.edit.form.guestCount")}{" "}
                      <span className="text-destructive">*</span>
                    </FormLabel>
                    <Input
                      type="number"
                      min="1"
                      {...field}
                      onChange={(e) =>
                        field.onChange(e.target.value === "" ? "" : Number(e.target.value))
                      }
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="col-span-full">
                <div className="border-t border-border my-2" />
              </div>
              <FormField
                control={form.control}
                name="tableId"
                render={({ field }) => (
                  <FormItem className="col-span-full">
                    <FormLabel>{t("sidebar.meja")}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={loadingTables ? "Memuat meja..." : "Pilih meja (opsional)"}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">
                          {t("page.reservation.edit.form.noTable")}
                        </SelectItem>
                        {availableTables.map((table) => {
                          const unavailable = table.status !== "available";
                          return (
                            <SelectItem
                              key={table.id}
                              value={String(table.id)}
                              disabled={unavailable}
                              className={unavailable ? "text-muted-foreground" : ""}>
                              {table.name} {t("page.reservation.ui.cap")} {table.capacity})
                              {unavailable && (
                                <span className="text-destructive ml-1">
                                  {t("page.reservation.ui.notAvailable")}
                                </span>
                              )}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    {!selectedStore ? (
                      <p className="text-xs text-muted-foreground mt-1">
                        {t("page.bom.add.form.selectStoreFirst")}
                      </p>
                    ) : loadingTables ? (
                      <p className="text-xs text-muted-foreground mt-1">
                        {t("page.reservation.ui.loadingTables")}
                      </p>
                    ) : availableTables.length === 0 ? (
                      <p className="text-xs text-destructive mt-1">
                        {t("page.reservation.ui.noTablesAvailable")}
                      </p>
                    ) : null}
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("page.bom.detail.notes")}</FormLabel>
                  <Textarea
                    placeholder={t("page.reservation.ui.reservationNote")}
                    rows={3}
                    {...field}
                    maxLength={FIELD_LIMITS.DESCRIPTION}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-6 bg-card border border-border rounded-xl p-4">
              <Button
                variant="danger"
                onClick={requestLeave}
                className="gap-2 w-full sm:w-auto justify-center">
                <X size={18} /> {t("breadcrumb.back")}
              </Button>
              <Button
                variant="success"
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  const values = form.getValues();
                  const missing = getMissingFields(values, formSchema, fieldLabels);
                  if (missing.length > 0) {
                    setMissingFieldsList(missing);
                    setMissingFieldsModal(true);
                    return;
                  }
                  setConfirmSaveModal(true);
                }}
                disabled={createMutation.isLoading}
                className="gap-2 w-full sm:w-auto justify-center">
                <Save size={18} />
                {createMutation.isLoading ? "Menyimpan..." : "Simpan"}
              </Button>
            </div>
          </form>
        </Form>
        <Modal
          type="confirm"
          open={confirmSaveModal}
          onOpenChange={setConfirmSaveModal}
          title={t("common.confirmSave")}
          description={t("page.supplier.modal.confirmSaveDesc")}
          confirmText="Ya, Simpan"
          onConfirm={() => {
            setConfirmSaveModal(false);
            const values = form.getValues();
            onSubmit(values);
          }}
        />
      </Card>

      <Modal
        type="confirm"
        open={cancelModal}
        onOpenChange={setCancelModal}
        title={t("page.expense.add.cancelTitle")}
        description={t("page.role.edit.discardDesc")}
        confirmText="Ya, Batalkan"
        onConfirm={() => setTimeout(leave, 150)}
      />
      <MissingFieldsModal
        open={missingFieldsModal}
        onOpenChange={setMissingFieldsModal}
        fields={missingFieldsList}
      />
      <Modal
        type="error"
        open={errorModal}
        onOpenChange={setErrorModal}
        title={t("common.error")}
        description={modalMessage}
        onConfirm={() => setErrorModal(false)}
      />
      {createMutation.isLoading && <Loading fullscreen size="lg" label={t("common.saving")} />}
    </div>
  );
};

export default AddReservation;
