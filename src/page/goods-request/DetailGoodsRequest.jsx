import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { useTranslation } from "react-i18next";
import { useCookies } from "react-cookie";
import { toast } from "sonner";
import {
  Edit,
  Trash2,
  ShoppingCart,
  User,
  Truck,
  FileText,
  Check,
  Ban,
  ArrowLeft
} from "lucide-react";
import { canAccess } from "@/utils/permission";
import {
  getGoodsRequestById,
  deleteGoodsRequest,
  changeGoodsRequestStatus
} from "@/services/goods-request";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import Modal from "@/components/organism/modal";
import { Loading } from "@/components/ui/loading";
import { FormalDocument, PrintButton } from "@/components/document/FormalDocument";
import { getDocumentSpecForGoodsRequest } from "@/components/document/documentMappers";
import AbortController from "@/components/organism/abort-controller";
import PageHeader from "@/components/ui/PageHeader";
import HorizontalScrollArea from "@/components/ui/HorizontalScrollArea";

const statusMap = {
  pending: { class: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" },
  approved: { class: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
  rejected: { class: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" },
  cancelled: { class: "bg-gray-100 text-gray-700 dark:bg-gray-800/40 dark:text-gray-400" }
};

const DetailGoodsRequest = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const id = searchParams.get("id");
  const [cookie] = useCookies();
  const user = cookie?.user;
  const MENU_KEY = "/goods-request";

  const [approveModal, setApproveModal] = useState(false);
  const [rejectModal, setRejectModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery(
    ["goods-request-detail", id],
    () => getGoodsRequestById(id),
    { enabled: !!id }
  );

  const request = data?.data;
  const printSpec = request ? getDocumentSpecForGoodsRequest(request, t) : null;

  const deleteMutation = useMutation(deleteGoodsRequest, {
    onSuccess: () => {
      toast.success(t("page.goodsRequest.list.toast.deleteSuccess"), {
        description: t("page.goodsRequest.list.toast.deleteSuccessDesc")
      });
      queryClient.invalidateQueries(["goods-requests"]);
      navigate("/goods-request");
    },
    onError: (err) =>
      toast.error(t("page.goodsRequest.list.toast.deleteError"), {
        description: err?.response?.data?.message || err.message
      })
  });

  const statusMutation = useMutation(({ id, status }) => changeGoodsRequestStatus(id, status), {
    onSuccess: () => {
      toast.success(
        t(
          statusMutation.variables?.status === "approved"
            ? "page.goodsRequest.list.toast.approveSuccess"
            : "page.goodsRequest.list.toast.rejectSuccess"
        ),
        {
          description: t(
            statusMutation.variables?.status === "approved"
              ? "page.goodsRequest.list.toast.approveSuccessDesc"
              : "page.goodsRequest.list.toast.rejectSuccessDesc"
          )
        }
      );
      queryClient.invalidateQueries(["goods-requests"]);
      queryClient.invalidateQueries(["purchase-orders"]);
      setApproveModal(false);
      setRejectModal(false);
      refetch();
    },
    onError: (err) =>
      toast.error(t("page.goodsRequest.list.toast.statusError"), {
        description: err?.response?.data?.message || err.message
      })
  });

  if (isError) return <AbortController refetch={refetch} />;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
      <PageHeader
        breadcrumbs={[
          {
            label: t("breadcrumb.home"),
            href: "/dashboard-super-admin",
            i18nKey: "breadcrumb.home"
          },
          {
            label: t("breadcrumb.goodsRequest"),
            href: "/goods-request",
            i18nKey: "breadcrumb.goodsRequest"
          },
          { label: t("breadcrumb.detail") }
        ]}
        title={isLoading ? t("common.loading") : t("page.goodsRequest.detail.title")}
        description={request?.requestNumber}
        backLink="/goods-request"
        dynamicInfo={false}>
        {!isLoading && request && <PrintButton />}
        {!isLoading && request && request.status === "pending" && (
          <>
            {canAccess(user, MENU_KEY, "update") && (
              <Button
                variant="outline"
                className="border-green-600 text-green-600 hover:bg-green-600/10"
                onClick={() => setApproveModal(true)}>
                <Check size={16} className="mr-1" /> {t("page.goodsRequest.list.approve")}
              </Button>
            )}
            {canAccess(user, MENU_KEY, "delete") && (
              <Button
                variant="outline"
                className="border-red-600 text-red-600 hover:bg-red-600/10"
                onClick={() => setRejectModal(true)}>
                <Ban size={16} className="mr-1" /> {t("page.goodsRequest.list.reject")}
              </Button>
            )}
            {canAccess(user, MENU_KEY, "update") && (
              <Button
                variant="outline"
                onClick={() => navigate(`/edit-goods-request?id=${request.id}`)}>
                <Edit size={16} className="mr-1" /> {t("common.edit")}
              </Button>
            )}
            {canAccess(user, MENU_KEY, "delete") && (
              <Button
                variant="destructive"
                className="border-destructive text-destructive hover:bg-destructive/10"
                onClick={() => setDeleteModal(true)}>
                <Trash2 size={16} className="mr-1" /> {t("common.delete")}
              </Button>
            )}
          </>
        )}
        {!isLoading && request && request.status === "approved" && request.purchaseOrderData && (
          <Button
            onClick={() => navigate(`/purchase-order/detail?id=${request.purchaseOrderData.id}`)}
            className="shrink-0 gap-1.5">
            <ShoppingCart size={16} />
            {request.purchaseOrderData.orderNumber} — {t("page.goodsRequest.detail.viewPO")}
          </Button>
        )}
      </PageHeader>

      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="p-6 space-y-4">
              <Skeleton className="h-5 w-36" />
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex gap-4">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-48" />
                  </div>
                ))}
              </div>
            </Card>
            <Card className="p-6 space-y-4">
              <Skeleton className="h-5 w-40" />
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex gap-4">
                    <Skeleton className="h-4 w-36" />
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-12" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                ))}
              </div>
            </Card>
          </div>
          <div className="space-y-6">
            <Card className="p-6 space-y-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-6 w-32 rounded-full" />
            </Card>
          </div>
        </div>
      ) : !request ? (
        <div className="p-6">
          <p className="text-muted-foreground">{t("page.goodsRequest.detail.notFound")}</p>
          <Button variant="danger" onClick={() => navigate("/goods-request")} className="mt-4">
            <ArrowLeft size={16} className="mr-1" /> {t("page.goodsRequest.detail.back")}
          </Button>
        </div>
      ) : (
        (() => {
          const st = statusMap[request.status] || statusMap.pending;

          return (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-card p-6 rounded-xl border border-border">
                  <h2 className="text-lg font-semibold mb-4">
                    {t("page.goodsRequest.detail.requestInfo")}
                  </h2>
                  <HorizontalScrollArea>
                    <table className="w-full text-sm">
                      <tbody>
                        {[
                          [t("page.goodsRequest.detail.requestNumber"), request.requestNumber],
                          [t("page.goodsRequest.detail.store"), request.storeData?.name || "-"],
                          [t("page.goodsRequest.detail.requestedBy"), request.requestedBy || "-"],
                          [
                            t("page.goodsRequest.detail.requestDate"),
                            request.requestDate
                              ? new Date(request.requestDate).toLocaleDateString("id", {
                                  day: "numeric",
                                  month: "long",
                                  year: "numeric"
                                })
                              : "-"
                          ],
                          [
                            t("page.goodsRequest.detail.neededDate"),
                            request.neededDate
                              ? new Date(request.neededDate).toLocaleDateString("id", {
                                  day: "numeric",
                                  month: "long",
                                  year: "numeric"
                                })
                              : "-"
                          ],
                          [
                            t("page.goodsRequest.detail.createdAt"),
                            request.createdAt
                              ? new Date(request.createdAt).toLocaleDateString("id", {
                                  day: "numeric",
                                  month: "long",
                                  year: "numeric"
                                })
                              : "-"
                          ],
                          [t("page.goodsRequest.detail.notes"), request.notes || "-"],
                          [
                            t("page.goodsRequest.detail.createdBy"),
                            request.createdByUser?.fullName ||
                              request.createdByUser?.userName ||
                              "-"
                          ],
                          [
                            t("page.goodsRequest.detail.updatedAt"),
                            request.updatedAt
                              ? new Date(request.updatedAt).toLocaleDateString("id", {
                                  day: "numeric",
                                  month: "long",
                                  year: "numeric"
                                })
                              : "-"
                          ]
                        ].map(([label, value]) => (
                          <tr key={label} className="border-b border-muted/30">
                            <td className="py-2 pr-4 text-muted-foreground w-40">{label}</td>
                            <td className="py-2 font-medium">{value}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </HorizontalScrollArea>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-card p-6 rounded-xl border border-border">
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    {t("page.goodsRequest.detail.statusLabel")}
                  </h2>
                  <div
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold ${st.class}`}>
                    <FileText size={14} />{" "}
                    {t(`page.goodsRequest.list.status.${request.status || "pending"}`)}
                  </div>
                </div>

                {request.status === "approved" && (
                  <div className="bg-card p-6 rounded-xl border border-border">
                    <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                      {t("page.goodsRequest.detail.approvalInfo")}
                    </h2>
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs text-muted-foreground">
                          {t("page.goodsRequest.detail.approvedBy")}
                        </p>
                        <p className="text-sm font-medium flex items-center gap-1.5">
                          <User size={14} className="text-muted-foreground" />
                          {request.approvedByUser?.fullName ||
                            request.approvedByUser?.userName ||
                            "-"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          {t("page.goodsRequest.detail.approvedAt")}
                        </p>
                        <p className="text-sm font-medium">
                          {request.approvedAt
                            ? new Date(request.approvedAt).toLocaleDateString("id", {
                                day: "numeric",
                                month: "long",
                                year: "numeric"
                              })
                            : "-"}
                        </p>
                      </div>
                      {request.purchaseOrderData && (
                        <div className="border-t border-border pt-3">
                          <p className="text-xs text-muted-foreground">
                            {t("page.goodsRequest.detail.poReference")}
                          </p>
                          <button
                            onClick={() =>
                              navigate(`/purchase-order/detail?id=${request.purchaseOrderData.id}`)
                            }
                            className="text-sm font-medium flex items-center gap-1.5 text-blue-600 hover:underline">
                            <ShoppingCart size={14} />
                            {request.purchaseOrderData.orderNumber}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-card p-6 rounded-xl border border-border lg:col-span-3">
                <h2 className="text-lg font-semibold mb-4">
                  {t("page.goodsRequest.detail.itemsRequested")}
                </h2>
                {request.items?.length > 0 ? (
                  (() => {
                    const groups = [];
                    // ponytail: Map menghindari object injection
                    const groupMap = new Map();
                    for (const it of request.items) {
                      const sid = it.supplier;
                      const key = sid ? String(sid) : "unassigned";
                      if (!groupMap.has(key)) {
                        groupMap.set(key, {
                          supplierId: key,
                          supplierName: sid
                            ? it.supplierData?.name || `Supplier #${sid}`
                            : t("page.goodsRequest.detail.unassignedSupplier"),
                          items: []
                        });
                        groups.push(groupMap.get(key));
                      }
                      groupMap.get(key).items.push(it);
                    }
                    return (
                      <div className="space-y-3">
                        {groups.map((g) => (
                          <div
                            key={g.supplierId}
                            className="border border-border rounded-xl overflow-hidden">
                            <div className="flex items-center gap-3 px-4 py-3 bg-muted/40 border-b">
                              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white shrink-0">
                                <Truck size={14} />
                              </div>
                              <span className="font-semibold text-foreground">
                                {g.supplierName}
                              </span>
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                                {g.items.length}{" "}
                                {g.items.length > 1
                                  ? t("page.goodsRequest.detail.items")
                                  : t("page.goodsRequest.detail.item")}
                              </span>
                            </div>
                            <HorizontalScrollArea>
                              <table className="w-full text-sm min-w-[640px]">
                                <thead>
                                  <tr className="border-b text-left text-muted-foreground">
                                    <th className="px-4 py-2 font-medium">
                                      {t("page.goodsRequest.detail.itemName")}
                                    </th>
                                    <th className="px-4 py-2 font-medium">
                                      {t("page.goodsRequest.detail.type")}
                                    </th>
                                    <th className="px-4 py-2 font-medium text-center">
                                      {t("page.goodsRequest.detail.qty")}
                                    </th>
                                    <th className="px-4 py-2 font-medium text-center">
                                      {t("page.goodsRequest.detail.unit")}
                                    </th>
                                    <th className="px-4 py-2 font-medium">
                                      {t("page.goodsRequest.detail.notes")}
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {g.items.map((item, i) => {
                                    const name =
                                      item.ingredientData?.name ||
                                      item.ingredientName ||
                                      item.productData?.nameProduct ||
                                      item.productName ||
                                      "-";
                                    const isIngredient = !!(
                                      item.ingredientData || item.ingredientName
                                    );
                                    return (
                                      <tr
                                        key={i}
                                        className="border-b border-muted/20 last:border-0">
                                        <td className="px-4 py-2">{name}</td>
                                        <td className="px-4 py-2">
                                          {isIngredient ? (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                                              {t("page.goodsRequest.detail.typeIngredient")}
                                            </span>
                                          ) : (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                                              {t("page.goodsRequest.detail.typeProduct")}
                                            </span>
                                          )}
                                        </td>
                                        <td className="px-4 py-2 text-center font-mono">
                                          {item.qty}
                                        </td>
                                        <td className="px-4 py-2 text-center">
                                          {item.unit || "pcs"}
                                        </td>
                                        <td className="px-4 py-2">{item.notes || "-"}</td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </HorizontalScrollArea>
                          </div>
                        ))}
                      </div>
                    );
                  })()
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    {t("page.goodsRequest.detail.noItems")}
                  </p>
                )}
              </div>
            </div>
          );
        })()
      )}

      <Modal
        type="confirm"
        open={approveModal}
        onOpenChange={setApproveModal}
        title={t("page.goodsRequest.list.modal.approveTitle")}
        description={t("page.goodsRequest.list.modal.approveDescription")}
        confirmText={t("page.goodsRequest.list.modal.confirmApprove")}
        loading={statusMutation.isLoading}
        onConfirm={() => statusMutation.mutate({ id, status: "approved" })}
      />
      <Modal
        type="confirm"
        open={rejectModal}
        onOpenChange={setRejectModal}
        title={t("page.goodsRequest.list.modal.rejectTitle")}
        description={t("page.goodsRequest.list.modal.rejectDescription")}
        confirmText={t("page.goodsRequest.list.modal.confirmReject")}
        loading={statusMutation.isLoading}
        onConfirm={() => statusMutation.mutate({ id, status: "rejected" })}
      />
      <Modal
        type="confirm"
        open={deleteModal}
        onOpenChange={setDeleteModal}
        title={t("page.goodsRequest.list.modal.deleteTitle")}
        description={t("page.goodsRequest.list.modal.deleteDescription")}
        confirmText={t("page.goodsRequest.list.modal.confirmDelete")}
        loading={deleteMutation.isLoading}
        onConfirm={() => deleteMutation.mutate(id)}
      />
      {(deleteMutation.isLoading || statusMutation.isLoading) && (
        <Loading fullscreen size="lg" label={t("common.loadingData")} />
      )}
      {printSpec && (
        <div className="hidden print:block print-doc">
          <FormalDocument spec={printSpec} />
        </div>
      )}
    </div>
  );
};

export default DetailGoodsRequest;
