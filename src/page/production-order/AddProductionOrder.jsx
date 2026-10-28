import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "react-query";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Save, X } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import UserGuide from "@/components/organism/UserGuide";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import {
  addProductionOrder,
  editProductionOrder,
  getProductionOrderById
} from "@/services/production-order";
import { getAllProduct } from "@/services/product";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import Modal from "@/components/organism/modal";
import { Loading } from "@/components/ui/loading";
import HorizontalScrollArea from "@/components/ui/HorizontalScrollArea";
import { FIELD_LIMITS } from "@/constants/fieldLimits";
import { formatDateOnly } from "@/utils/dateOnly";
import { useFormExit } from "@/hooks/useLeaveGuard";
import { createdId } from "@/utils/createdRecord";
import LoadErrorBanner from "@/components/ui/LoadErrorBanner";

const AddProductionOrder = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const id = searchParams.get("id");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorModal, setErrorModal] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [cancelModal, setCancelModal] = useState(false);
  const [draftModal, setDraftModal] = useState(false);

  const poSchema = z.object({
    productId: z.string().min(1, t("page.productionOrder.add.validation.productRequired")),
    plannedQty: z
      .string()
      .min(1, t("page.productionOrder.add.validation.plannedQtyRequired"))
      .refine(
        (v) => parseInt(v, 10) >= 1,
        t("page.productionOrder.add.validation.plannedQtyRequired")
      ),
    scheduledDate: z.date().nullable().optional(),
    notes: z.string().optional()
  });

  const form = useForm({
    resolver: zodResolver(poSchema),
    mode: "onChange",
    defaultValues: {
      productId: "",
      plannedQty: "",
      scheduledDate: new Date(),
      notes: ""
    }
  });
  const { request: requestLeave, leave } = useFormExit(
    "/production-order",
    () => setCancelModal(true),
    form
  );

  const {
    control,
    formState: { errors },
    handleSubmit,
    watch
  } = form;

  const { data: productsData } = useQuery(["products-for-po"], () => getAllProduct({}), {});
  const products = productsData?.data || [];

  const { data: editData } = useQuery(["production-order", id], () => getProductionOrderById(id), {
    enabled: !!id
  });

  React.useEffect(() => {
    if (editData?.data) {
      const d = editData.data;
      form.reset({
        productId: String(d.productItemId || ""),
        plannedQty: String(d.plannedQty || ""),
        scheduledDate: d.scheduledDate ? new Date(d.scheduledDate) : new Date(),
        notes: d.notes || ""
      });
    }
  }, [editData]);

  const selectedProduct = products.find((p) => p.id === parseInt(watch("productId")));

  const doSubmit = async (data, saveAsDraft = false) => {
    setIsSubmitting(true);
    try {
      const payload = {
        productItemId: parseInt(data.productId),
        plannedQty: parseInt(data.plannedQty),
        scheduledDate: formatDateOnly(data.scheduledDate),
        notes: data.notes,
        ...(saveAsDraft && { status: "draft" })
      };
      const saved = id ? await editProductionOrder(id, payload) : await addProductionOrder(payload);
      const orderId = id || createdId(saved);
      toast.success(t("page.productionOrder.add.toastSuccess"), {
        description: id
          ? t("page.productionOrder.add.toastSuccessDescEdit")
          : t("page.productionOrder.add.toastSuccessDescAdd"),
        action: orderId
          ? {
              label: t("common.viewDetail"),
              onClick: () => navigate(`/production-order/detail?id=${orderId}`)
            }
          : undefined
      });
      queryClient.invalidateQueries(["production-orders"]);
      navigate("/production-order");
    } catch (err) {
      setModalMessage(err?.response?.data?.message || err.message);
      setErrorModal(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
      <PageHeader
        breadcrumbs={[
          {
            label: t("page.productionOrder.add.breadcrumbDashboard"),
            href: "/dashboard-super-admin",
            i18nKey: "page.productionOrder.add.breadcrumbDashboard"
          },
          {
            label: t("page.productionOrder.add.breadcrumbPO"),
            href: "/production-order",
            i18nKey: "page.productionOrder.add.breadcrumbPO"
          },
          {
            label: id
              ? t("page.productionOrder.add.breadcrumbEdit")
              : t("page.productionOrder.add.breadcrumbAdd")
          }
        ]}
        title={
          id ? t("page.productionOrder.add.titleEdit") : t("page.productionOrder.add.titleAdd")
        }
        description={
          id
            ? t("page.productionOrder.add.subtitleEdit")
            : t("page.productionOrder.add.subtitleAdd")
        }
        onBack={requestLeave}
        dynamicInfo={false}>
        <UserGuide guideKey="add-production-order" mode={id ? "edit" : "add"} />
      </PageHeader>
      <LoadErrorBanner />

      <form
        onSubmit={handleSubmit((data) => doSubmit(data, false))}
        className="bg-card p-6 rounded-xl border border-border space-y-6 max-w-2xl">
        <div className="space-y-2">
          <Label>
            {t("page.productionOrder.add.labelProduk")} <span className="text-destructive">*</span>
          </Label>
          <Controller
            control={control}
            name="productId"
            render={({ field }) => (
              <Combobox
                options={[
                  { value: "", label: t("page.productionOrder.add.placeholderPilihProduk") },
                  ...products.map((p) => ({
                    value: p.id,
                    label: `${p.nameProduct} (${p.sku || "-"})`
                  }))
                ]}
                value={field.value}
                onChange={field.onChange}
                placeholder={t("page.productionOrder.add.placeholderPilihProduk")}
                searchPlaceholder="Cari produk..."
              />
            )}
          />
          {errors.productId && (
            <p className="text-xs text-destructive">{errors.productId.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label>
            {t("page.productionOrder.add.labelJumlahProduksi")}{" "}
            <span className="text-destructive">*</span>
          </Label>
          <Input
            type="number"
            min="1"
            {...form.register("plannedQty")}
            placeholder={t("page.productionOrder.add.placeholderJumlah")}
          />
          {errors.plannedQty && (
            <p className="text-xs text-destructive">{errors.plannedQty.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label>{t("page.productionOrder.add.labelJadwal")}</Label>
          <Controller
            control={control}
            name="scheduledDate"
            render={({ field }) => <DatePicker date={field.value} setDate={field.onChange} />}
          />
        </div>

        <div className="space-y-2">
          <Label>{t("page.productionOrder.add.labelCatatan")}</Label>
          <Textarea
            rows={3}
            {...form.register("notes")}
            placeholder={t("page.productionOrder.add.placeholderCatatan")}
            maxLength={FIELD_LIMITS.DESCRIPTION}
          />
        </div>

        {selectedProduct?.composition?.length > 0 && (
          <div className="bg-blue-50/80 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <p className="text-sm font-semibold text-blue-700 dark:text-blue-300 mb-2">
              {t("page.productionOrder.add.bomComponents")}
            </p>
            <HorizontalScrollArea>
              <table className="w-full text-xs min-w-[420px]">
                <thead>
                  <tr className="text-left text-blue-600 dark:text-blue-400">
                    <th className="pb-1">{t("page.productionOrder.add.bomBahan")}</th>
                    <th className="pb-1">{t("page.productionOrder.add.bomQtyPerUnit")}</th>
                    <th className="pb-1">{t("page.productionOrder.add.bomUnit")}</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedProduct.composition.map((c, i) => (
                    <tr key={i} className="text-blue-800 dark:text-blue-200">
                      <td>{c.ingredientName || c.name}</td>
                      <td>{c.qty}</td>
                      <td>{c.unit || "pcs"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </HorizontalScrollArea>
          </div>
        )}

        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-4 border-t">
          <Button
            type="button"
            variant="success"
            className="w-full sm:w-auto"
            onClick={requestLeave}>
            <X size={16} className="mr-1" /> {t("page.productionOrder.add.cancelButton")}
          </Button>
          <div className="flex flex-col-reverse sm:flex-row gap-3 w-full sm:w-auto">
            <Button
              variant="draft"
              className="w-full sm:w-auto"
              onClick={() => setDraftModal(true)}
              disabled={isSubmitting}>
              {t("common.saveAsDraft")}
            </Button>
            <Button
              variant="success"
              type="submit"
              className="w-full sm:w-auto"
              disabled={isSubmitting}>
              <Save size={16} className="mr-1" />{" "}
              {isSubmitting
                ? t("page.productionOrder.add.savingButton")
                : t("page.productionOrder.add.saveButton")}
            </Button>
          </div>
        </div>
      </form>

      {isSubmitting && (
        <Loading fullscreen size="lg" label={t("page.productionOrder.add.loadingLabel")} />
      )}

      <Modal
        type="confirm"
        open={cancelModal}
        onOpenChange={(o) => !o && setCancelModal(false)}
        title={t("modal.cancelTitle")}
        description={t("modal.cancelDescription")}
        confirmText={t("modal.yesCancel")}
        onConfirm={() => {
          setCancelModal(false);
          setTimeout(leave, 150);
        }}
      />

      <Modal
        type="confirm"
        open={draftModal}
        onOpenChange={setDraftModal}
        title={t("common.saveAsDraftTitle")}
        description={t("common.saveAsDraftDesc")}
        confirmText={t("common.yesSaveDraft")}
        onConfirm={() => {
          setDraftModal(false);
          doSubmit(form.getValues(), true);
        }}
      />
      <Modal
        type="error"
        open={errorModal}
        onOpenChange={setErrorModal}
        title={t("common.error")}
        description={modalMessage}
        onConfirm={() => setErrorModal(false)}
      />
    </div>
  );
};

export default AddProductionOrder;
