import React, { useState, useEffect } from "react";
import { usePageParam, useSearchParam } from "@/hooks/usePageParam";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { toast } from "sonner";
import { FolderOpen, Trash2, Edit, Plus, CheckCircle, XCircle, Tag, Eye } from "lucide-react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import {
  getAllSupplierCategories,
  addSupplierCategory,
  editSupplierCategory,
  deleteSupplierCategory
} from "@/services/supplier";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loading } from "@/components/ui/loading";
import { Switch } from "@/components/ui/switch";
import Modal from "@/components/organism/modal";
import PageHeader from "@/components/ui/PageHeader";
import DataTable from "@/components/ui/DataTable";
import TableActions from "@/components/ui/TableActions";
import TableToolbar from "@/components/ui/TableToolbar";
import { SearchInput } from "@/components/ui/SearchInput";
import StatCard from "@/components/ui/StatCard";
import AbortController from "@/components/organism/abort-controller";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormControl,
  FormDescription
} from "@/components/ui/form";
import { Card } from "@/components/ui/card";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FIELD_LIMITS } from "@/constants/fieldLimits";

const SupplierCategoryList = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [page, setPage] = usePageParam();
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useSearchParam();
  const [statusFilter, setStatusFilter] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [formModal, setFormModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);

  const isFiltered = search !== "" || statusFilter !== "";

  const resetFilters = () => {
    setSearch("");
    setStatusFilter("");
  };

  const formSchema = z.object({
    name: z.string().min(1, t("page.supplierCategory.name") + " wajib diisi"),
    description: z.string().optional().or(z.literal("")),
    isActive: z.boolean().default(true)
  });

  const form = useForm({
    resolver: zodResolver(formSchema),
    mode: "onChange",
    defaultValues: { name: "", description: "", isActive: true }
  });

  const { data, isLoading, isFetching, isError, refetch } = useQuery(
    ["supplierCategories", page, limit, search, statusFilter],
    () => getAllSupplierCategories({ page, limit, search, status: statusFilter || undefined }),
    { keepPreviousData: true }
  );

  const categories = data?.data || data?.categories || [];
  // ponytail: BE /supplier-category mengembalikan { data: [], stats: { total } } tanpa pagination
  const total = data?.total || data?.pagination?.total || data?.stats?.total || categories.length;
  const totalPages = data?.pagination?.totalPages || Math.ceil(total / limit) || 1;
  const stats = data?.stats || {};

  const activeCount =
    stats.active ?? categories.filter((c) => c.status === "active" || c.isActive === true).length;
  const inactiveCount =
    stats.inactive ??
    categories.filter((c) => c.status === "inactive" || c.isActive === false).length;

  const createMutation = useMutation(addSupplierCategory, {
    onSuccess: () => {
      toast.success(t("common.success"), {
        description: t("page.supplierCategory.createSuccess")
      });
      queryClient.invalidateQueries(["supplierCategories"]);
      setFormModal(false);
      form.reset({ name: "", description: "", isActive: true });
    },
    onError: (err) => {
      toast.error(t("common.error"), {
        description: err?.response?.data?.message || err.message
      });
    }
  });

  const updateMutation = useMutation(editSupplierCategory, {
    onSuccess: () => {
      toast.success(t("common.success"), {
        description: t("page.supplierCategory.updateSuccess")
      });
      queryClient.invalidateQueries(["supplierCategories"]);
      setFormModal(false);
      setEditingCategory(null);
      form.reset({ name: "", description: "", isActive: true });
    },
    onError: (err) => {
      toast.error(t("common.error"), {
        description: err?.response?.data?.message || err.message
      });
    }
  });

  const deleteMutation = useMutation(deleteSupplierCategory, {
    onSuccess: () => {
      toast.success(t("common.success"), {
        description: t("page.supplierCategory.deleteSuccess")
      });
      queryClient.invalidateQueries(["supplierCategories"]);
    },
    onError: (err) => {
      toast.error(t("common.error"), {
        description: err?.response?.data?.message || err.message
      });
    }
  });

  const handleCreate = () => {
    setEditingCategory(null);
    form.reset({ name: "", description: "", isActive: true });
    setFormModal(true);
  };

  const handleEdit = (cat) => {
    setEditingCategory(cat);
    form.reset({
      name: cat.name || "",
      description: cat.description || "",
      isActive: cat.status === "active" || cat.isActive === true
    });
    setFormModal(true);
  };

  const handleFormSubmit = (values) => {
    if (editingCategory) {
      updateMutation.mutate({ id: editingCategory.id, ...values });
    } else {
      createMutation.mutate(values);
    }
  };

  // ponytail: ?edit=<id> dari halaman detail — buka modal edit otomatis
  useEffect(() => {
    const editId = searchParams.get("edit");
    if (!editId || isLoading || categories.length === 0) return;
    const cat = categories.find((c) => String(c.id) === String(editId));
    if (cat) {
      handleEdit(cat);
      setSearchParams(
        (prev) => {
          const params = new URLSearchParams(prev);
          params.delete("edit");
          return params;
        },
        { replace: true }
      );
    }
  }, [searchParams, isLoading, categories]);

  const columns = [
    {
      header: "#",
      align: "center",
      stickyLeft: true,
      render: (_, idx) => (
        <span className="text-sm text-muted-foreground">{(page - 1) * limit + idx + 1}</span>
      )
    },
    {
      header: t("page.supplierCategory.name"),
      align: "center",
      stickyLeft: true,
      render: (cat) => (
        <button
          type="button"
          className="flex items-center justify-center gap-3 hover:opacity-80 transition-opacity"
          onClick={() => navigate(`/detail-supplier-category?id=${cat.id}`)}>
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Tag size={20} className="text-primary" />
          </div>
          <p className="text-sm font-semibold text-foreground truncate max-w-[220px] hover:text-primary">
            {cat.name}
          </p>
        </button>
      )
    },
    {
      header: t("page.supplierCategory.descriptionField", "Deskripsi"),
      align: "center",
      render: (cat) => (
        <span
          className={`text-sm max-w-[250px] truncate inline-block ${
            cat.description ? "text-muted-foreground" : "text-muted-foreground/50"
          }`}>
          {cat.description || "-"}
        </span>
      )
    },
    {
      header: t("page.supplierCategory.status"),
      align: "center",
      render: (cat) => {
        const isActive = cat.status === "active" || cat.isActive === true;
        return (
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
              isActive
                ? "bg-green-100 text-green-700 border border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800"
                : "bg-red-100 text-red-700 border border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800"
            }`}>
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isActive ? "bg-green-500 dark:bg-green-400" : "bg-red-500 dark:bg-red-400"
              }`}
            />
            {isActive ? t("common.active") : t("common.inactive")}
          </span>
        );
      }
    },
    {
      header: t("common.createdBy"),
      align: "center",
      render: (cat) => (
        <span className="text-sm text-muted-foreground">
          {cat.createdByUser?.fullName || cat.createdByUser?.userName || "-"}
        </span>
      )
    },
    {
      header: t("common.createdAt", "Dibuat"),
      align: "center",
      render: (cat) => (
        <span className="text-sm text-muted-foreground whitespace-nowrap">
          {cat.createdAt ? format(new Date(cat.createdAt), "dd MMM yyyy HH:mm") : "-"}
        </span>
      )
    },
    {
      header: t("common.modifiedBy", "Diubah Oleh"),
      align: "center",
      render: (cat) => (
        <span className="text-sm text-muted-foreground">
          {cat.modifiedByUser?.fullName ||
            cat.modifiedByUser?.userName ||
            (cat.modifiedBy ? `#${cat.modifiedBy}` : "-")}
        </span>
      )
    },
    {
      header: t("page.supplier.table.updatedAt", "Terakhir Diubah"),
      align: "center",
      render: (cat) => (
        <span className="text-sm text-muted-foreground whitespace-nowrap">
          {cat.updatedAt ? format(new Date(cat.updatedAt), "dd MMM yyyy HH:mm") : "-"}
        </span>
      )
    },
    {
      header: t("common.actions"),
      align: "center",
      stickyRight: true,
      legend: [
        { icon: Eye, label: t("common.detail", "Detail") },
        { icon: Edit, label: t("common.edit") },
        { icon: Trash2, label: t("common.delete") }
      ],
      render: (cat) => (
        <TableActions
          align="center"
          visible={2}
          items={[
            {
              label: t("common.detail", "Detail"),
              icon: Eye,
              onClick: () => navigate(`/detail-supplier-category?id=${cat.id}`)
            },
            {
              label: t("common.edit"),
              icon: Edit,
              onClick: () => handleEdit(cat)
            },
            {
              label: t("common.delete"),
              icon: Trash2,
              onClick: () => setDeleteTarget(cat),
              danger: true
            }
          ]}
        />
      )
    }
  ];

  if (isError) return <AbortController refetch={refetch} />;

  return (
    <div
      data-tour="page-supplier-category"
      className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
      {deleteMutation.isLoading && <Loading fullscreen size="lg" label={t("common.loadingData")} />}

      <PageHeader
        breadcrumbs={[
          {
            label: t("breadcrumb.home"),
            href: "/dashboard-super-admin",
            i18nKey: "breadcrumb.home"
          },
          { label: t("breadcrumb.supplier"), href: "/supplier", i18nKey: "breadcrumb.supplier" },
          { label: t("page.supplierCategory.title"), i18nKey: "page.supplierCategory.title" }
        ]}
        title={t("page.supplierCategory.title")}
        description={t("page.supplierCategory.description")}
        backLink="/supplier">
        <Button variant="success" onClick={handleCreate} className="gap-1.5 shadow-md">
          <Plus size={16} />
          {t("page.supplierCategory.add")}
        </Button>
      </PageHeader>

      {/* Stat Cards */}
      {isFetching || isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-card rounded-xl border border-border p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="h-3 w-24 rounded bg-muted animate-pulse" />
                <div className="h-4 w-4 rounded bg-muted animate-pulse" />
              </div>
              <div className="h-8 w-28 rounded bg-muted animate-pulse mb-2" />
              <div className="h-3 w-20 rounded bg-muted animate-pulse" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard
            label={t("page.supplierCategory.title")}
            value={total}
            icon={FolderOpen}
            variant="default"
          />
          <StatCard
            label={t("common.active")}
            value={activeCount}
            icon={CheckCircle}
            variant="active"
          />
          <StatCard
            label={t("common.inactive")}
            value={inactiveCount}
            icon={XCircle}
            variant="inactive"
          />
        </div>
      )}

      {/* DataTable */}
      <Card className="p-0">
        <DataTable
          columns={columns}
          data={categories}
          isLoading={isLoading || isFetching}
          emptyMessage={t("page.supplierCategory.empty")}
          emptyIcon={FolderOpen}
          emptyAction={{ label: t("page.supplierCategory.add"), onClick: handleCreate }}
          toolbar={
            <TableToolbar
              title={t("page.supplierCategory.title")}
              onReset={resetFilters}
              isFiltered={isFiltered}>
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="supplier-category-list-status"
                  className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("page.supplierCategory.status")}
                </label>
                <select
                  id="supplier-category-list-status"
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(1);
                  }}
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="">{t("common.all")}</option>
                  <option value="active">{t("common.active")}</option>
                  <option value="inactive">{t("common.inactive")}</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="supplier-category-list-search"
                  className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("common.search")}
                </label>
                <SearchInput
                  id="supplier-category-list-search"
                  value={search}
                  onChange={(v) => {
                    setSearch(v);
                  }}
                  isLoading={isFetching}
                  placeholder={`${t("common.search")}...`}
                />
              </div>
            </TableToolbar>
          }
          pagination={{
            page,
            totalPages,
            total,
            pageSize: limit,
            onPageChange: setPage,
            onPageSizeChange: (v) => {
              setLimit(v);
              setPage(1);
            }
          }}
        />
      </Card>

      {/* Form Modal */}
      <Modal
        type="form"
        open={formModal}
        className="sm:w-[80vw] sm:max-w-[80vw]"
        onOpenChange={(o) => {
          if (!o) {
            setFormModal(false);
            setEditingCategory(null);
            form.reset({ name: "", description: "", isActive: true });
          }
        }}
        title={editingCategory ? t("page.supplierCategory.edit") : t("page.supplierCategory.add")}
        confirmText={editingCategory ? t("common.save") : t("common.add")}
        onConfirm={() => form.handleSubmit(handleFormSubmit)()}
        loading={createMutation.isLoading || updateMutation.isLoading}>
        <Form {...form}>
          <div className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">
                    {t("page.supplierCategory.name")} <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t("page.supplierCategory.namePlaceholder")}
                      className="h-10"
                      {...field}
                      maxLength={FIELD_LIMITS.SHORT_LABEL}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">
                    {t("page.supplierCategory.descriptionField")}
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t("page.supplierCategory.descriptionPlaceholder")}
                      rows={3}
                      className="resize-none"
                      {...field}
                      maxLength={FIELD_LIMITS.DESCRIPTION}
                    />
                  </FormControl>
                  <FormDescription className="text-xs text-muted-foreground">
                    {t("common.optionalField")}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
                    <div className="space-y-0.5">
                      <FormLabel className="text-sm font-medium">
                        {t("page.supplierCategory.status")}
                      </FormLabel>
                      <p className="text-xs text-muted-foreground">
                        {field.value
                          ? t("page.supplierCategory.active")
                          : t("page.supplierCategory.inactive")}
                      </p>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </div>
                </FormItem>
              )}
            />
          </div>
        </Form>
      </Modal>

      {/* Delete Modal */}
      <Modal
        type="confirm"
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title={t("page.supplierCategory.deleteConfirm")}
        description={t("page.supplierCategory.deleteDesc")}
        confirmText={t("common.delete")}
        loading={deleteMutation.isLoading}
        onConfirm={() => {
          deleteMutation.mutate({ id: deleteTarget.id });
          setDeleteTarget(null);
        }}
      />
    </div>
  );
};

export default SupplierCategoryList;
