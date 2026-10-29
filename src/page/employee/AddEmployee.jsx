import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  CloudUpload,
  X,
  Eye,
  FileText,
  FileSpreadsheet,
  FileImage,
  File as FileIcon,
  Check,
  User,
  Briefcase,
  DollarSign,
  Lock,
  FileText as FileTextIcon,
  Building2,
  Plus,
  BadgeCheck,
  Store,
  Banknote,
  EyeOff,
  ArrowLeft,
  Save
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { addMonths, format } from "date-fns";
import { formatDateOnly, parseDateOnly } from "@/utils/dateOnly";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { addEmployee, generateEmployeeId } from "@/services/employee";
import { getShiftDropdown } from "@/services/shift";
import { getAllPosition } from "@/services/position";
import { getAllDepartment } from "@/services/department";
import { getAllRole, getRoleById } from "@/services/role";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loading } from "@/components/ui/loading";
import { Skeleton } from "@/components/ui/skeleton";
import Modal from "@/components/organism/modal";
import AccessMenuModal from "@/components/organism/AccessMenuModal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { DatePicker } from "@/components/ui/date-picker";
import { Combobox } from "@/components/ui/combobox";
import {
  Form,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import PageHeader from "@/components/ui/PageHeader";
import UserGuide from "@/components/organism/UserGuide";
import MissingFieldsModal from "@/components/organism/MissingFieldsModal";
import { getMissingFields } from "@/lib/validation";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useLocations } from "@/queries/useLocations";
import { FIELD_LIMITS } from "@/constants/fieldLimits";
import { useFormExit } from "@/hooks/useLeaveGuard";
import LoadErrorBanner from "@/components/ui/LoadErrorBanner";

const AddEmployee = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const fileInputRef = useRef(null);
  const documentInputRef = useRef(null);
  const [documents, setDocuments] = useState([]);
  const [successModal, setSuccessModal] = useState(false);
  const [createdRecordId, setCreatedRecordId] = useState(null);
  const [cancelModal, setCancelModal] = useState(false);
  const [draftModal, setDraftModal] = useState(false);
  const [accessMenuModalOpen, setAccessMenuModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");
  const { t } = useTranslation();

  const employeeFieldLabels = {
    fullName: "Nama Lengkap",
    userName: "Username",
    email: "Email",
    password: "Password",
    phoneNumber: "Nomor Telepon",
    placeOfBirth: "Tempat Lahir",
    address: "Alamat",
    gender: "Jenis Kelamin",
    dateOfBirth: "Tanggal Lahir",
    employeeId: "ID Employee",
    monthlySalary: "Gaji Pokok"
  };

  const [missingFieldsModal, setMissingFieldsModal] = useState(false);
  const [missingFieldsList, setMissingFieldsList] = useState([]);
  const [missingFieldsByTab, setMissingFieldsByTab] = useState([]);
  const [confirmSaveModal, setConfirmSaveModal] = useState(false);
  const [errorModal, setErrorModal] = useState(false);
  const [modalMessage, setModalMessage] = useState("");

  const formSchema = useMemo(() => {
    return z.object({
      fullName: z.string().min(2, t("page.employee.form.fullNameMin")),
      userName: z.string().min(1, t("page.employee.form.userNameRequired")),
      email: z.string().email(t("page.employee.form.emailInvalid")),
      password: z.string().min(6, t("page.employee.form.passwordMin")),
      phoneNumber: z
        .string()
        .regex(/^\d+$/, t("page.employee.form.phoneOnlyNumbers"))
        .min(8, t("page.employee.form.phoneMinDigits"))
        .max(14, t("page.employee.form.phoneMaxDigits")),
      placeOfBirth: z.string().min(2, t("page.employee.form.placeOfBirthMin")),
      address: z.string().min(5, t("page.employee.form.addressMin")),
      gender: z.string().min(1, t("page.employee.form.genderRequired")),
      dateOfBirth: z.string().min(1, t("page.employee.form.dateOfBirthRequired")),
      employeeId: z.string().min(1, t("page.employee.form.employeeIdRequired")),
      departmentId: z.string().optional().or(z.literal("")),
      position: z.string().optional().or(z.literal("")),
      store: z.string().optional().or(z.literal("")),
      employmentType: z.string().optional().or(z.literal("")),
      contractDuration: z.string().optional().or(z.literal("")),
      endDate: z.string().optional().or(z.literal("")),
      shift: z.string().optional().or(z.literal("")),
      startDate: z.string().optional().or(z.literal("")),
      isActive: z.boolean().default(true),
      roleId: z.string().optional().or(z.literal("")),
      accessMenu: z.string().optional().or(z.literal("")),
      monthlySalary: z.coerce.number().min(1, t("page.employee.form.salaryRequired"))
    });
  }, [t]);

  const form = useForm({
    resolver: zodResolver(formSchema),
    mode: "onChange",
    defaultValues: {
      fullName: "",
      userName: "",
      email: "",
      password: "",
      phoneNumber: "",
      placeOfBirth: "",
      address: "",
      gender: "",
      dateOfBirth: "",
      employeeId: "",
      departmentId: "",
      position: "",
      store: "",
      employmentType: "",
      contractDuration: "",
      endDate: "",
      shift: "",
      startDate: "",
      isActive: true,
      roleId: "",
      accessMenu: "",
      monthlySalary: ""
    }
  });
  const { request: requestLeave, leave } = useFormExit(
    "/employee-list",
    () => setCancelModal(true),
    form
  );

  const employmentType = form.watch("employmentType");
  const startDate = form.watch("startDate");
  const contractDuration = form.watch("contractDuration");

  const employeeTabs = [
    {
      value: "profile",
      title: t("page.employee.add.personalInfo"),
      mandatory: [
        "fullName",
        "email",
        "phoneNumber",
        "gender",
        "placeOfBirth",
        "dateOfBirth",
        "address"
      ],
      group: [
        "fullName",
        "email",
        "phoneNumber",
        "gender",
        "placeOfBirth",
        "dateOfBirth",
        "address"
      ]
    },
    {
      value: "employment",
      title: t("page.employee.add.jobInfo"),
      mandatory: ["employeeId"],
      group: ["employeeId"]
    },
    {
      value: "salary",
      title: t("page.employee.add.salarySection"),
      mandatory: ["monthlySalary"],
      group: ["monthlySalary"]
    },
    {
      value: "account",
      title: t("page.employee.add.accountSection"),
      mandatory: ["userName", "password"],
      group: ["userName", "password"]
    },
    {
      value: "documents",
      title: t("page.employee.add.documents"),
      mandatory: [],
      group: []
    }
  ];

  const watchedEmployeeValues = form.watch();

  const isEmptyEmployeeValue = (v) =>
    v === undefined || v === null || v === "" || (typeof v === "number" && Number.isNaN(v));

  const getEmployeeTabStatus = (tab) => {
    const mandatory = tab.mandatory;
    if (mandatory.length === 0) return "complete";
    const empties = mandatory.filter((f) => isEmptyEmployeeValue(watchedEmployeeValues[f]));
    if (empties.length === 0) return "complete";
    if (empties.length === mandatory.length) return "untouched";
    return "incomplete";
  };

  const employeeTabDot = (tab) => {
    const status = getEmployeeTabStatus(tab);
    if (status === "complete") return "bg-green-500";
    if (status === "incomplete") return "bg-red-500";
    return "bg-muted-foreground/40";
  };

  const buildMissingByTab = (values) => {
    const result = formSchema.safeParse(values);
    const missingNames = [];
    if (!result.success) {
      const seen = new Set();
      result.error.errors.forEach((err) => {
        const name = err.path[0];
        if (!seen.has(name)) {
          seen.add(name);
          missingNames.push(name);
        }
      });
    }
    return employeeTabs
      .map((tab) => ({
        stepNum: employeeTabs.findIndex((x) => x.value === tab.value) + 1,
        title: tab.title,
        fields: tab.group
          .filter((f) => missingNames.includes(f))
          .map((f) => employeeFieldLabels[f] || f)
      }))
      .filter((g) => g.fields.length > 0);
  };

  const contractDurations = [
    { value: "3", label: t("page.employee.form.contractDuration.3months") },
    { value: "6", label: t("page.employee.form.contractDuration.6months") },
    { value: "9", label: t("page.employee.form.contractDuration.9months") },
    { value: "12", label: t("page.employee.form.contractDuration.12months") },
    { value: "24", label: t("page.employee.form.contractDuration.2years") },
    { value: "36", label: t("page.employee.form.contractDuration.3years") },
    { value: "48", label: t("page.employee.form.contractDuration.4years") },
    { value: "60", label: t("page.employee.form.contractDuration.5years") }
  ];

  const getDaysInMonth = () => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  };

  const monthlySalary = form.watch("monthlySalary");
  const daysInMonth = getDaysInMonth();
  const dailySalary = monthlySalary
    ? Math.round((Number(monthlySalary) / daysInMonth) * 100) / 100
    : 0;

  useEffect(() => {
    if (startDate && contractDuration && ["contract", "internship"].includes(employmentType)) {
      const start = parseDateOnly(startDate);
      const months = parseInt(contractDuration);
      if (!isNaN(months)) {
        const end = addMonths(start, months);
        form.setValue("endDate", formatDateOnly(end));
      }
    } else {
      form.setValue("endDate", "");
    }
  }, [startDate, contractDuration, employmentType, form]);

  const empIdFetched = useRef(false);
  useEffect(() => {
    if (empIdFetched.current) return;
    empIdFetched.current = true;
    const fetchId = async () => {
      try {
        const res = await generateEmployeeId();
        const empId = res?.data?.employeeId || res?.employeeId || "";
        form.setValue("employeeId", String(empId));
      } catch {
        // silently fail
      }
    };
    fetchId();
  }, []);

  const {
    data: locationsData,
    isLoading: locLoading,
    isFetching: locFetching
  } = useLocations("active", { retry: 0 });
  const locations = locationsData?.data || locationsData?.locations || [];

  const {
    data: positionsData,
    isLoading: posLoading,
    isFetching: posFetching
  } = useQuery(["positions-all"], () => getAllPosition(), { retry: 0 });
  const positions = positionsData?.data || positionsData?.positions || [];

  const {
    data: departmentsData,
    isLoading: deptLoading,
    isFetching: deptFetching
  } = useQuery(["departments-all"], () => getAllDepartment(), { retry: 0 });
  const departments = departmentsData?.data || departmentsData?.departments || [];

  const departmentId = form.watch("departmentId");

  const positionsByDepartment = useMemo(() => {
    const deptId = departmentId ? String(departmentId) : "";
    return (positions || []).filter(
      (p) => !deptId || String(p.departmentId ?? p.department ?? "") === deptId
    );
  }, [positions, departmentId]);

  useEffect(() => {
    const deptId = departmentId ? String(departmentId) : "";
    const position = form.watch("position");
    if (position && deptId && positions.length > 0) {
      const belongs = (positions || []).some(
        (p) =>
          String(p.id) === String(position) &&
          String(p.departmentId ?? p.department ?? "") === deptId
      );
      if (!belongs) form.setValue("position", "");
    }
  }, [departmentId, positions, form]);

  const {
    data: rolesData,
    isLoading: roleLoading,
    isFetching: roleFetching
  } = useQuery(["roles"], () => getAllRole(), {
    retry: 0
  });
  const roles = rolesData?.data || rolesData?.roles || [];

  const dropdownsLoading =
    locLoading ||
    posLoading ||
    deptLoading ||
    roleLoading ||
    locFetching ||
    posFetching ||
    deptFetching ||
    roleFetching;

  const selectedRoleIdForAccess =
    form.watch("roleId") && accessMenuModalOpen ? form.watch("roleId") : null;

  const { data: selectedRoleData } = useQuery(
    ["role-detail", selectedRoleIdForAccess],
    () => getRoleById(selectedRoleIdForAccess),
    {
      enabled: !!selectedRoleIdForAccess,
      retry: 0
    }
  );
  const selectedRoleAccessMenu =
    selectedRoleData?.data?.accessMenu || selectedRoleData?.accessMenu || {};

  const selectedStore = form.watch("store");

  const { data: shiftsData } = useQuery(
    ["shifts-all", selectedStore],
    () => getShiftDropdown({ store: selectedStore, statusShift: "active" }),
    {
      retry: 0,
      enabled: !!selectedStore
    }
  );
  const shifts = shiftsData?.data || shiftsData?.shifts || [];

  const createMutation = useMutation(addEmployee, {
    onSuccess: (res) => {
      // The detail page is keyed by the employee code, not the user id.
      setCreatedRecordId(res?.data?.employeeID || null);
      queryClient.invalidateQueries(["employees"]);
      setIsSubmitting(false);
      setSuccessModal(true);
    },
    onError: (err) => {
      setModalMessage(err?.response?.data?.message || err.message);
      setErrorModal(true);
      setIsSubmitting(false);
    }
  });

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setPreviewImage(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const clearImage = (e) => {
    e.stopPropagation();
    setPreviewImage(null);
    setImageFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const getFileIcon = (type, name) => {
    const ext = name?.split(".").pop()?.toLowerCase();
    if (type?.startsWith("image/") || ["png", "jpg", "jpeg", "gif", "webp"].includes(ext))
      return <FileImage size={20} className="text-blue-500 shrink-0" />;
    if (["pdf"].includes(ext)) return <FileText size={20} className="text-red-500 shrink-0" />;
    if (["xls", "xlsx", "csv"].includes(ext))
      return <FileSpreadsheet size={20} className="text-green-600 shrink-0" />;
    if (["doc", "docx"].includes(ext))
      return <FileText size={20} className="text-blue-700 shrink-0" />;
    return <FileIcon size={20} className="text-muted-foreground shrink-0" />;
  };

  const handleDocumentSelect = (e) => {
    const files = Array.from(e.target.files || []);
    const newDocs = files.map((file) => ({
      file,
      name: file.name,
      size: file.size,
      previewUrl: URL.createObjectURL(file)
    }));
    setDocuments((prev) => [...prev, ...newDocs]);
    if (documentInputRef.current) documentInputRef.current.value = "";
  };

  const removeDocument = (index) => {
    setDocuments((prev) => {
      const doc = prev.at(index);
      if (doc.previewUrl) URL.revokeObjectURL(doc.previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handlePreviewDocument = (doc) => {
    if (doc.previewUrl) {
      window.open(doc.previewUrl, "_blank");
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const onSubmit = (values, saveAsDraft = false) => {
    if (!saveAsDraft && documents.length === 0) {
      toast.error(t("page.employee.add.toast.error"), {
        description: t("page.employee.add.toast.documentRequired")
      });
      setIsSubmitting(false);
      return;
    }
    setIsSubmitting(true);
    const payload = {
      ...values,
      confirmPassword: values.password,
      status: saveAsDraft ? "draft" : values.isActive ? "active" : "inactive"
    };
    delete payload.isActive;
    if (imageFile) {
      payload.image = imageFile;
    }
    if (documents.length > 0) {
      payload.documents = documents.map((d) => d.file);
    }
    if (values.monthlySalary) {
      payload.monthlySalary = Number(values.monthlySalary);
      payload.dailySalary = dailySalary;
    }
    if (!payload.employeeId) {
      delete payload.employeeId;
    }
    if (!payload.roleId) {
      delete payload.roleId;
    }
    createMutation.mutate(payload);
  };

  return (
    <div className="space-y-6">
      <div>
        <div>
          <PageHeader
            breadcrumbs={[
              {
                label: t("breadcrumb.home"),
                href: "/dashboard-super-admin",
                i18nKey: "breadcrumb.home"
              },
              { i18nKey: "sidebar.karyawan" },
              { i18nKey: "page.employee.list.title", href: "/employee-list" },
              { i18nKey: "page.employee.add.title" }
            ]}
            title={t("page.employee.add.title")}
            description={t("page.employee.add.description")}
            backLink="/employee-list"
            onBack={requestLeave}>
            <UserGuide guideKey="add-employee" />
          </PageHeader>
          <LoadErrorBanner />
        </div>
      </div>
      <div>
        <div>
          <div className="bg-card p-6 rounded-xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-border overflow-hidden space-y-6">
            {dropdownsLoading ? (
              <div className="grid grid-cols-12 gap-6">
                <div className="col-span-12 space-y-6">
                  <Skeleton className="h-64 w-full rounded-xl" />
                  <Skeleton className="h-48 w-full rounded-xl" />
                  <Skeleton className="h-40 w-full rounded-xl" />
                </div>
                <div className="col-span-12">
                  <Skeleton className="h-64 w-full rounded-xl" />
                </div>
              </div>
            ) : (
              <Form {...form}>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                  }}>
                  <div className="grid grid-cols-12 gap-6">
                    <div className="col-span-12 space-y-6">
                      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <div className="overflow-x-auto -mx-1 px-1 mb-4">
                          <TabsList className="grid w-full grid-cols-5 min-w-[680px]">
                            <TabsTrigger value="profile" className="gap-1.5">
                              <User size={14} />
                              {t("page.employee.add.personalInfo")}
                              <span
                                className={`w-2 h-2 rounded-full ${employeeTabDot(employeeTabs[0])}`}
                              />
                            </TabsTrigger>
                            <TabsTrigger value="employment" className="gap-1.5">
                              <Briefcase size={14} />
                              {t("page.employee.add.jobInfo")}
                              <span
                                className={`w-2 h-2 rounded-full ${employeeTabDot(employeeTabs[1])}`}
                              />
                            </TabsTrigger>
                            <TabsTrigger value="salary" className="gap-1.5">
                              <DollarSign size={14} />
                              {t("page.employee.add.salarySection")}
                              <span
                                className={`w-2 h-2 rounded-full ${employeeTabDot(employeeTabs[2])}`}
                              />
                            </TabsTrigger>
                            <TabsTrigger value="account" className="gap-1.5">
                              <Lock size={14} />
                              {t("page.employee.add.accountSection")}
                              <span
                                className={`w-2 h-2 rounded-full ${employeeTabDot(employeeTabs[3])}`}
                              />
                            </TabsTrigger>
                            <TabsTrigger value="documents" className="gap-1.5">
                              <FileTextIcon size={14} />
                              {t("page.employee.add.documents")}
                              <span
                                className={`w-2 h-2 rounded-full ${employeeTabDot(employeeTabs[4])}`}
                              />
                            </TabsTrigger>
                          </TabsList>
                        </div>

                        <TabsContent value="profile">
                          <div className="bg-card rounded-xl shadow-sm border border-border p-6">
                            <div className="flex items-center gap-3 mb-5 pb-3 border-b border-border">
                              <User size={18} className="text-primary" />
                              <h4 className="text-base font-semibold text-foreground">
                                {t("page.employee.add.personalInfo")}
                              </h4>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                              <div className="flex flex-col items-center gap-3">
                                <label
                                  htmlFor="add-employee-photo"
                                  className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                  {t("page.employee.edit.photo")}{" "}
                                  <span className="text-destructive">*</span>
                                </label>

                                <input
                                  id="add-employee-photo"
                                  ref={fileInputRef}
                                  type="file"
                                  accept="image/*"
                                  onChange={handleImageChange}
                                  className="hidden"
                                />
                                <div
                                  onClick={handleImageClick}
                                  className="relative w-full aspect-square rounded-lg border-2 border-dashed border-border hover:border-primary transition-all flex flex-col items-center justify-center bg-muted/30 overflow-hidden cursor-pointer group">
                                  {previewImage ? (
                                    <>
                                      <img
                                        src={previewImage}
                                        alt={t("page.product.form.preview")}
                                        className="w-full h-full object-cover"
                                      />
                                      <button
                                        aria-label={t("common.delete")}
                                        type="button"
                                        onClick={clearImage}
                                        className="absolute top-2 right-2 z-10 p-1.5 bg-background/90 rounded-full text-muted-foreground hover:text-foreground shadow-md">
                                        <X size={14} />
                                      </button>
                                    </>
                                  ) : (
                                    <div className="flex flex-col items-center text-muted-foreground group-hover:text-primary transition-colors p-4">
                                      <CloudUpload size={36} className="mb-2" />
                                      <span className="text-xs font-semibold text-center">
                                        {t("page.employee.add.uploadPhoto")}
                                      </span>
                                    </div>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground text-center">
                                  {t("page.employee.add.photoHint")}
                                </p>
                              </div>

                              <div className="md:col-span-2 space-y-5">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                  <FormField
                                    control={form.control}
                                    name="fullName"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                          {t("page.employee.form.fullName")}{" "}
                                          <span className="text-destructive">*</span>
                                        </FormLabel>
                                        <Input
                                          {...field}
                                          placeholder={t("page.employee.form.fullNamePlaceholder")}
                                          maxLength={FIELD_LIMITS.PERSON_NAME}
                                        />
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                  <FormField
                                    control={form.control}
                                    name="email"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                          {t("page.employee.form.email")}{" "}
                                          <span className="text-destructive">*</span>
                                        </FormLabel>
                                        <Input
                                          {...field}
                                          type="email"
                                          placeholder={t("page.employee.form.emailPlaceholder")}
                                          maxLength={FIELD_LIMITS.EMAIL}
                                        />
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                  <FormField
                                    control={form.control}
                                    name="phoneNumber"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                          {t("page.employee.form.phoneNumber")}{" "}
                                          <span className="text-destructive">*</span>
                                        </FormLabel>
                                        <Input
                                          {...field}
                                          type="tel"
                                          placeholder={t("page.employee.form.phonePlaceholder")}
                                          maxLength={FIELD_LIMITS.PHONE}
                                          onChange={(e) => {
                                            const value = e.target.value
                                              .replace(/\D/g, "")
                                              .slice(0, 14);
                                            field.onChange(value);
                                          }}
                                        />
                                        <FormMessage />
                                        <p className="text-xs text-muted-foreground">
                                          {t("common.phoneHint")}
                                        </p>
                                      </FormItem>
                                    )}
                                  />
                                  <FormField
                                    control={form.control}
                                    name="gender"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                          {t("page.employee.form.gender")}{" "}
                                          <span className="text-destructive">*</span>
                                        </FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                          <SelectTrigger>
                                            <SelectValue
                                              placeholder={t("page.employee.add.genderPlaceholder")}
                                            />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="Laki-laki">
                                              {t("page.employee.add.male")}
                                            </SelectItem>
                                            <SelectItem value="Perempuan">
                                              {t("page.employee.add.female")}
                                            </SelectItem>
                                          </SelectContent>
                                        </Select>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                  <FormField
                                    control={form.control}
                                    name="placeOfBirth"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                          {t("page.employee.form.placeOfBirth")}{" "}
                                          <span className="text-destructive">*</span>
                                        </FormLabel>
                                        <Input
                                          {...field}
                                          placeholder={t(
                                            "page.employee.add.placeOfBirthPlaceholder"
                                          )}
                                          maxLength={FIELD_LIMITS.SHORT_LABEL}
                                        />
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                  <FormField
                                    control={form.control}
                                    name="dateOfBirth"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                          {t("page.employee.form.dateOfBirth")}{" "}
                                          <span className="text-destructive">*</span>
                                        </FormLabel>
                                        <DatePicker
                                          date={parseDateOnly(field.value)}
                                          setDate={(date) => field.onChange(formatDateOnly(date))}
                                        />
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                </div>
                                <FormField
                                  control={form.control}
                                  name="address"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                        {t("page.employee.form.address")}{" "}
                                        <span className="text-destructive">*</span>
                                      </FormLabel>
                                      <Textarea
                                        {...field}
                                        rows={3}
                                        className="resize-none"
                                        placeholder={t("page.employee.add.addressPlaceholder")}
                                        maxLength={FIELD_LIMITS.ADDRESS}
                                      />
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>
                            </div>
                          </div>
                        </TabsContent>

                        <TabsContent value="employment">
                          <div className="bg-card rounded-xl shadow-sm border border-border p-6">
                            <div className="flex items-center gap-3 mb-5 pb-3 border-b border-border">
                              <Briefcase size={18} className="text-primary" />
                              <h4 className="text-base font-semibold text-foreground">
                                {t("page.employee.add.jobInfo")}
                              </h4>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                              <FormField
                                control={form.control}
                                name="employeeId"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                      {t("page.employee.form.employeeId")}{" "}
                                      <span className="text-destructive">*</span>
                                    </FormLabel>
                                    <Input
                                      {...field}
                                      disabled
                                      className="font-mono bg-muted/50"
                                      placeholder={t("page.employee.add.loading")}
                                      maxLength={FIELD_LIMITS.CODE}
                                    />
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name="departmentId"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                      {t("page.employee.form.department")}
                                    </FormLabel>
                                    {departments.length === 0 ? (
                                      <div className="flex flex-col items-center gap-3 p-6 border-2 border-dashed border-border rounded-lg bg-muted/20">
                                        <Building2
                                          size={18}
                                          className="text-3xl text-muted-foreground"
                                        />
                                        <div className="text-center">
                                          <p className="text-sm font-medium text-foreground">
                                            {t("page.employee.add.noDepartment")}
                                          </p>
                                          <p className="text-xs text-muted-foreground mt-0.5">
                                            {t("page.employee.add.addDepartmentFirst")}
                                          </p>
                                        </div>
                                        <Button
                                          type="button"
                                          variant="success"
                                          size="sm"
                                          onClick={() => navigate("/add-department")}
                                          className="gap-2">
                                          <Plus size={18} className="text-base" />
                                          {t("page.employee.add.addDepartmentButton")}
                                        </Button>
                                      </div>
                                    ) : (
                                      <div className="flex gap-2">
                                        <div className="flex-1">
                                          <Combobox
                                            options={(departments || []).map((d) => ({
                                              value: String(d.id),
                                              label: d.name
                                            }))}
                                            value={field.value || ""}
                                            onChange={field.onChange}
                                            placeholder={t(
                                              "page.employee.add.departmentPlaceholder"
                                            )}
                                          />
                                        </div>
                                        <Button
                                          type="button"
                                          variant="success"
                                          size="icon"
                                          className="shrink-0"
                                          onClick={() => navigate("/add-department")}
                                          title={t("page.employee.add.addDepartment")}>
                                          <Plus size={18} className="text-base" />
                                        </Button>
                                      </div>
                                    )}
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name="position"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                      {t("page.employee.form.position")}
                                    </FormLabel>
                                    {positions.length === 0 ? (
                                      <div className="flex flex-col items-center gap-3 p-6 border-2 border-dashed border-border rounded-lg bg-muted/20">
                                        <BadgeCheck
                                          size={18}
                                          className="text-3xl text-muted-foreground"
                                        />
                                        <div className="text-center">
                                          <p className="text-sm font-medium text-foreground">
                                            {t("page.employee.add.noPosition")}
                                          </p>
                                          <p className="text-xs text-muted-foreground mt-0.5">
                                            {t("page.employee.add.addPositionFirst")}
                                          </p>
                                        </div>
                                        <Button
                                          type="button"
                                          variant="success"
                                          size="sm"
                                          onClick={() => navigate("/add-position")}
                                          className="gap-2">
                                          <Plus size={18} className="text-base" />
                                          {t("page.employee.add.addPositionButton")}
                                        </Button>
                                      </div>
                                    ) : (
                                      <div className="flex gap-2">
                                        <div className="flex-1">
                                          <Combobox
                                            options={(positionsByDepartment || []).map((p) => ({
                                              value: String(p.id),
                                              label: p.name
                                            }))}
                                            value={field.value || ""}
                                            onChange={field.onChange}
                                            disabled={!departmentId}
                                            placeholder={
                                              departmentId
                                                ? t("page.employee.add.positionPlaceholder")
                                                : t(
                                                    "page.employee.form.positionSelectDepartmentFirst"
                                                  )
                                            }
                                          />
                                        </div>
                                        <Button
                                          type="button"
                                          variant="success"
                                          size="icon"
                                          className="shrink-0"
                                          onClick={() => navigate("/add-position")}
                                          title={t("page.employee.add.addPosition")}>
                                          <Plus size={18} className="text-base" />
                                        </Button>
                                      </div>
                                    )}
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name="store"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                      {t("page.employee.form.storePlacement")}
                                    </FormLabel>
                                    {locations.length === 0 ? (
                                      <div className="flex flex-col items-center gap-3 p-6 border-2 border-dashed border-border rounded-lg bg-muted/20">
                                        <Store
                                          size={18}
                                          className="text-3xl text-muted-foreground"
                                        />
                                        <div className="text-center">
                                          <p className="text-sm font-medium text-foreground">
                                            {t("page.employee.add.noStore")}
                                          </p>
                                          <p className="text-xs text-muted-foreground mt-0.5">
                                            {t("page.employee.add.addStoreFirst")}
                                          </p>
                                        </div>
                                        <Button
                                          type="button"
                                          variant="success"
                                          size="sm"
                                          onClick={() => navigate("/add-location")}
                                          className="gap-2">
                                          <Plus size={18} className="text-base" />
                                          {t("page.employee.add.addStoreButton")}
                                        </Button>
                                      </div>
                                    ) : (
                                      <div className="flex gap-2">
                                        <div className="flex-1">
                                          <Combobox
                                            options={(locations || []).map((loc) => ({
                                              value: String(loc.id || loc._id),
                                              label: loc.name
                                            }))}
                                            value={field.value || ""}
                                            onChange={field.onChange}
                                            placeholder={t("page.employee.add.storePlaceholder")}
                                            searchPlaceholder={t(
                                              "page.employee.add.storeSearchPlaceholder"
                                            )}
                                          />
                                        </div>
                                        <Button
                                          type="button"
                                          variant="success"
                                          size="icon"
                                          className="shrink-0"
                                          onClick={() => navigate("/add-location")}
                                          title={t("page.employee.add.addStore")}>
                                          <Plus size={18} className="text-base" />
                                        </Button>
                                      </div>
                                    )}
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name="employmentType"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                      {t("page.employee.form.employmentType")}
                                    </FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                      <SelectTrigger>
                                        <SelectValue
                                          placeholder={t(
                                            "page.employee.add.employmentTypePlaceholder"
                                          )}
                                        />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="full-time">
                                          {t("page.employee.add.fullTime")}
                                        </SelectItem>
                                        <SelectItem value="part-time">
                                          {t("page.employee.add.partTime")}
                                        </SelectItem>
                                        <SelectItem value="contract">
                                          {t("page.employee.add.contract")}
                                        </SelectItem>
                                        <SelectItem value="internship">
                                          {t("page.employee.add.internship")}
                                        </SelectItem>
                                      </SelectContent>
                                    </Select>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name="shift"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                      {t("page.employee.form.shift")}
                                    </FormLabel>
                                    <Combobox
                                      options={(shifts || []).map((s) => ({
                                        value: String(s.id),
                                        label: s.shiftName || s.name
                                      }))}
                                      value={field.value || ""}
                                      onChange={field.onChange}
                                      placeholder={
                                        selectedStore
                                          ? t("page.employee.form.shiftPlaceholder")
                                          : t("page.employee.form.shiftSelectStoreFirst")
                                      }
                                      disabled={!selectedStore}
                                    />
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name="startDate"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                      {t("page.employee.form.startDate")}
                                    </FormLabel>
                                    <DatePicker
                                      date={parseDateOnly(field.value)}
                                      setDate={(date) => field.onChange(formatDateOnly(date))}
                                    />
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              {["contract", "internship"].includes(employmentType) && (
                                <>
                                  <FormField
                                    control={form.control}
                                    name="contractDuration"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                          {employmentType === "internship"
                                            ? t("page.employee.form.internshipDuration")
                                            : t("page.employee.form.contractDurationLabel")}
                                        </FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                          <SelectTrigger>
                                            <SelectValue
                                              placeholder={t(
                                                "page.employee.add.durationPlaceholder"
                                              )}
                                            />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {contractDurations.map((d) => (
                                              <SelectItem key={d.value} value={d.value}>
                                                {d.label}
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
                                    name="endDate"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                          {t("page.employee.form.endDate")}
                                        </FormLabel>
                                        <div className="flex h-10 w-full items-center rounded-lg border border-border bg-muted/50 px-3 text-sm text-muted-foreground">
                                          {field.value
                                            ? format(parseDateOnly(field.value), "dd MMM yyyy")
                                            : contractDuration && startDate
                                              ? t("page.employee.add.selectDurationFirst")
                                              : t("page.employee.add.selectStartAndDuration")}
                                        </div>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                </>
                              )}
                            </div>
                            <div className="flex flex-col gap-1.5 justify-end mt-6">
                              <FormField
                                control={form.control}
                                name="isActive"
                                render={({ field }) => (
                                  <div
                                    className={`pt-2 flex items-center justify-between p-4 rounded-lg ${
                                      field.value
                                        ? "bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800"
                                        : "bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800"
                                    }`}>
                                    <div className="flex items-center gap-3">
                                      <div
                                        className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                          field.value
                                            ? "bg-green-600 text-secondary"
                                            : "bg-destructive/10 text-destructive"
                                        }`}>
                                        {field.value ? (
                                          <Check size={20} />
                                        ) : (
                                          <span className="text-lg font-bold">⏻</span>
                                        )}
                                      </div>
                                      <div>
                                        <p className="text-sm font-semibold text-foreground">
                                          {t("page.employee.form.statusLabel", {
                                            status: field.value ? "active" : "inactive"
                                          })}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                          {field.value
                                            ? t("page.employee.add.statusActiveDescription")
                                            : t("page.employee.add.statusInactiveDescription")}
                                        </p>
                                      </div>
                                    </div>
                                    <Switch
                                      checked={field.value}
                                      onCheckedChange={field.onChange}
                                    />
                                  </div>
                                )}
                              />
                            </div>
                          </div>
                        </TabsContent>

                        <TabsContent value="salary">
                          <div className="bg-card rounded-xl shadow-sm border border-border p-6">
                            <div className="flex items-center gap-3 mb-5 pb-3 border-b border-border">
                              <Banknote size={18} className="text-primary" />
                              <h4 className="text-base font-semibold text-foreground">
                                {t("page.employee.add.salarySection")}
                              </h4>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                              <FormField
                                control={form.control}
                                name="monthlySalary"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                      {t("page.employee.form.monthlySalary")}{" "}
                                      <span className="text-destructive">*</span>
                                    </FormLabel>
                                    <div className="relative">
                                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                                        {t("page.employee.add.currencyPrefix")}
                                      </span>
                                      <Input
                                        type="text"
                                        className="pl-10"
                                        placeholder={t("page.employee.add.salaryPlaceholder")}
                                        value={
                                          field.value
                                            ? Number(field.value).toLocaleString("id-ID")
                                            : ""
                                        }
                                        onChange={(e) => {
                                          const raw = e.target.value.replace(/\D/g, "");
                                          field.onChange(raw ? parseInt(raw) : "");
                                        }}
                                      />
                                    </div>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormItem>
                                <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                  {t("page.employee.form.dailySalary")}
                                </FormLabel>
                                <div className="relative">
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                                    {t("page.employee.add.currencyPrefix")}
                                  </span>
                                  <Input
                                    value={dailySalary ? dailySalary.toLocaleString("id-ID") : ""}
                                    readOnly
                                    className="pl-10 bg-muted/50 text-muted-foreground"
                                    placeholder={t("page.employee.add.autoCalculated")}
                                  />
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {t("page.employee.add.dailySalaryHint", { days: daysInMonth })}
                                </p>
                              </FormItem>
                            </div>
                          </div>
                        </TabsContent>

                        <TabsContent value="account">
                          <div className="bg-card rounded-xl shadow-sm border border-border p-6">
                            <div className="flex items-center gap-3 mb-5 pb-3 border-b border-border">
                              <Lock size={18} className="text-primary" />
                              <h4 className="text-base font-semibold text-foreground">
                                {t("page.employee.add.accountSection")}
                              </h4>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                              <FormField
                                control={form.control}
                                name="userName"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                      {t("page.employee.form.username")}{" "}
                                      <span className="text-destructive">*</span>
                                    </FormLabel>
                                    <Input
                                      {...field}
                                      placeholder={t("page.employee.add.usernamePlaceholder")}
                                      maxLength={FIELD_LIMITS.SHORT_LABEL}
                                    />
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name="password"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                      {t("page.employee.form.password")}{" "}
                                      <span className="text-destructive">*</span>
                                    </FormLabel>
                                    <div className="relative">
                                      <Input
                                        {...field}
                                        type={showPassword ? "text" : "password"}
                                        className="pr-10"
                                        placeholder={t("page.employee.add.passwordPlaceholder")}
                                      />
                                      <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground cursor-pointer">
                                        {showPassword ? (
                                          <Eye size={18} className="text-base" />
                                        ) : (
                                          <EyeOff size={18} className="text-base" />
                                        )}
                                      </button>
                                    </div>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name="roleId"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                      {t("page.employee.form.roleSelect")}
                                    </FormLabel>
                                    <Select
                                      onValueChange={field.onChange}
                                      value={String(field.value || "")}>
                                      <SelectTrigger>
                                        <SelectValue
                                          placeholder={t("page.employee.form.rolePlaceholder")}
                                        />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {roles.map((role) => (
                                          <SelectItem
                                            key={role.id || role._id}
                                            value={String(role.id || role._id)}>
                                            {role.name || role.role}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                      <FormMessage />
                                      <FormDescription>
                                        {t("page.employee.add.roleHint")}
                                      </FormDescription>
                                    </Select>
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name="accessMenu"
                                render={({ field }) => {
                                  let permCount = 0;
                                  try {
                                    const parsed = field.value ? JSON.parse(field.value) : [];
                                    if (Array.isArray(parsed)) permCount = parsed.length;
                                  } catch {
                                    permCount = 0;
                                  }
                                  const selectedRoleId = form.watch("roleId");
                                  const disableAccess = !selectedRoleId;
                                  return (
                                    <FormItem>
                                      <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                        {t("page.employee.form.accessMenu")}
                                      </FormLabel>
                                      <Button
                                        type="button"
                                        variant="success"
                                        className="w-full justify-start text-left font-normal"
                                        disabled={disableAccess}
                                        disabledReason={t("page.employee.add.selectRoleFirst")}
                                        onClick={() => setAccessMenuModalOpen(true)}>
                                        {disableAccess
                                          ? t("page.employee.add.selectRoleFirst")
                                          : permCount > 0
                                            ? t("page.employee.form.accessMenuCount", {
                                                count: permCount
                                              })
                                            : t("page.employee.form.accessMenuButton")}
                                      </Button>
                                      <FormMessage />
                                      <FormDescription>
                                        {t("page.employee.add.accessMenuHint")}
                                      </FormDescription>
                                    </FormItem>
                                  );
                                }}
                              />
                            </div>
                          </div>
                        </TabsContent>

                        <TabsContent value="documents">
                          <div className="bg-card rounded-xl shadow-sm border border-border p-6">
                            <div className="flex items-center gap-3 mb-5 pb-3 border-b border-border">
                              <FileText size={18} className="text-primary" />
                              <h4 className="text-base font-semibold text-foreground">
                                {t("page.employee.add.documents")}{" "}
                                <span className="text-destructive">*</span>
                              </h4>
                            </div>
                            <p className="text-xs text-muted-foreground mb-4">
                              {t("page.employee.add.documentsDescription")}
                            </p>

                            <input
                              ref={documentInputRef}
                              type="file"
                              multiple
                              onChange={handleDocumentSelect}
                              className="hidden"
                            />

                            <div className="space-y-4">
                              <div
                                onClick={() => documentInputRef.current?.click()}
                                className="w-full rounded-lg border-2 border-dashed border-border hover:border-primary transition-all flex flex-col items-center justify-center py-8 bg-muted/30 cursor-pointer group">
                                <CloudUpload
                                  size={40}
                                  className="text-muted-foreground group-hover:text-primary transition-colors mb-2"
                                />
                                <p className="text-sm font-semibold text-muted-foreground group-hover:text-primary transition-colors">
                                  {t("page.employee.add.clickToUpload")}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {t("page.employee.add.documentTypes")}
                                </p>
                              </div>

                              {documents.length > 0 && (
                                <div className="space-y-2">
                                  {documents.map((doc, index) => (
                                    <div
                                      key={index}
                                      className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/20">
                                      {getFileIcon(doc.file?.type, doc.name)}
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-foreground truncate">
                                          {doc.name}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                          {formatFileSize(doc.size)}
                                        </p>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => handlePreviewDocument(doc)}
                                        className="p-1.5 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                                        title={t("page.employee.add.viewFile")}>
                                        <Eye size={16} />
                                      </button>
                                      <button
                                        aria-label={t("common.delete")}
                                        type="button"
                                        onClick={() => removeDocument(index)}
                                        className="p-1.5 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                                        <X size={16} />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </TabsContent>
                      </Tabs>
                    </div>

                    <div className="col-span-12">
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 bg-card border border-border rounded-xl p-4">
                        <Button
                          type="button"
                          variant="danger"
                          className="w-full sm:w-auto"
                          onClick={requestLeave}>
                          <ArrowLeft size={20} className="text-lg" />
                          {t("page.employee.add.cancelButton")}
                        </Button>
                        <div className="flex gap-3">
                          <Button
                            type="button"
                            variant="draft"
                            onClick={() => setDraftModal(true)}
                            disabled={isSubmitting}>
                            {t("page.employee.add.saveDraftButton")}
                          </Button>
                          <Button
                            variant="success"
                            type="button"
                            disabled={isSubmitting}
                            className="w-full sm:w-auto gap-2"
                            onClick={(e) => {
                              e.preventDefault();
                              const values = form.getValues();
                              const missing = getMissingFields(
                                values,
                                formSchema,
                                employeeFieldLabels
                              );
                              if (missing.length > 0) {
                                setMissingFieldsList(missing);
                                setMissingFieldsByTab(buildMissingByTab(values));
                                setMissingFieldsModal(true);
                                return;
                              }
                              setConfirmSaveModal(true);
                            }}>
                            <Save size={20} className="text-lg" />
                            {t("page.employee.add.saveButton")}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </form>
              </Form>
            )}
          </div>
        </div>
      </div>

      <AccessMenuModal
        open={accessMenuModalOpen}
        onOpenChange={setAccessMenuModalOpen}
        value={form.watch("accessMenu")}
        roleAccessMenu={selectedRoleAccessMenu}
        onSave={(json) => form.setValue("accessMenu", json)}
      />

      <Modal
        type="confirm"
        open={confirmSaveModal}
        onOpenChange={setConfirmSaveModal}
        title={t("modal.saveTitle")}
        description={t("modal.saveDescription")}
        confirmText={t("modal.yesSave")}
        confirmVariant="success"
        onConfirm={() => {
          setConfirmSaveModal(false);
          onSubmit(form.getValues(), false);
        }}
      />

      {isSubmitting && <Loading fullscreen size="lg" label={t("page.employee.add.saving")} />}

      <Modal
        type="success"
        open={successModal}
        secondaryText={createdRecordId ? t("common.viewDetail") : undefined}
        onSecondary={() => navigate(`/detail-employee?employeeID=${createdRecordId}`)}
        onOpenChange={setSuccessModal}
        title={t("page.employee.add.successTitle")}
        description={t("page.employee.add.successDescription")}
        onConfirm={() => setTimeout(() => navigate("/employee-list"), 150)}
      />
      <Modal
        type="confirm"
        open={cancelModal}
        onOpenChange={setCancelModal}
        title={t("page.employee.add.cancelTitle")}
        description={t("modal.cancelDescription")}
        confirmText={t("page.employee.add.cancelConfirm")}
        confirmVariant="success"
        onConfirm={() => setTimeout(leave, 150)}
      />
      <Modal
        type="confirm"
        open={draftModal}
        onOpenChange={setDraftModal}
        title={t("page.employee.add.draftTitle")}
        description={t("page.employee.add.draftDescription")}
        confirmText={t("page.employee.add.draftConfirm")}
        confirmVariant="success"
        onConfirm={() => {
          setDraftModal(false);
          const values = form.getValues();
          onSubmit(values, true);
        }}
      />
      <MissingFieldsModal
        open={missingFieldsModal}
        onOpenChange={setMissingFieldsModal}
        fields={missingFieldsList}
        items={missingFieldsByTab}
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

export default AddEmployee;
