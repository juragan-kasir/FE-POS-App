import { safeGet } from "@/lib/safe-lookup";
import React, { useState, useRef, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  CloudUpload,
  X,
  Download,
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
  BadgeCheck,
  Building2,
  Plus,
  Store,
  Banknote,
  EyeOff,
  ArrowLeft,
  Save
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { addMonths, format } from "date-fns";
import { formatDateOnly, parseDateOnly } from "@/utils/dateOnly";
import { toast } from "sonner";
import { editEmployee, getEmployeeById } from "@/services/employee";
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
import UserGuide from "@/components/organism/UserGuide";
import AbortController from "@/components/organism/abort-controller";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription
} from "@/components/ui/form";
import PageHeader from "@/components/ui/PageHeader";
import MissingFieldsModal from "@/components/organism/MissingFieldsModal";
import { getMissingFields } from "@/lib/validation";
import { useLocations } from "@/queries/useLocations";
import { FIELD_LIMITS } from "@/constants/fieldLimits";
import { useFormExit } from "@/hooks/useLeaveGuard";

const EditEmployee = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const employeeId = searchParams.get("id");

  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [existingImageUrl, setExistingImageUrl] = useState(null);
  const fileInputRef = useRef(null);
  const documentInputRef = useRef(null);
  const [documents, setDocuments] = useState([]);
  const [existingDocuments, setExistingDocuments] = useState([]);
  const [deletedDocs, setDeletedDocs] = useState([]);
  const [successModal, setSuccessModal] = useState(false);
  const [cancelModal, setCancelModal] = useState(false);
  const [draftModal, setDraftModal] = useState(false);
  const [accessMenuModalOpen, setAccessMenuModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");

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
      fullName: z.string().min(2, t("page.employee.edit.validation.fullNameMin")),
      userName: z.string().min(1, t("page.employee.edit.validation.userNameRequired")),
      email: z.string().email(t("page.employee.edit.validation.emailInvalid")),
      password: z.string().optional().or(z.literal("")),
      phoneNumber: z
        .string()
        .regex(/^\d+$/, t("page.employee.edit.validation.phoneOnlyNumbers"))
        .min(8, t("page.employee.edit.validation.phoneMinDigits"))
        .max(16, t("page.employee.edit.validation.phoneMaxDigits")),
      placeOfBirth: z.string().min(2, t("page.employee.edit.validation.placeOfBirthMin")),
      address: z.string().min(5, t("page.employee.edit.validation.addressMin")),
      gender: z.string().min(1, t("page.employee.edit.validation.genderRequired")),
      dateOfBirth: z.string().min(1, t("page.employee.edit.validation.dateOfBirthRequired")),
      employeeId: z.string().min(1, t("page.employee.edit.validation.employeeIdRequired")),
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
      monthlySalary: z.coerce.number().min(1, t("page.employee.edit.validation.salaryRequired"))
    });
  }, []);

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

  const employeeTabs = [
    {
      value: "profile",
      title: t("page.employee.edit.personalInfo"),
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
      title: t("page.employee.edit.jobInfo"),
      mandatory: ["employeeId"],
      group: ["employeeId"]
    },
    {
      value: "salary",
      title: t("page.employee.edit.payroll"),
      mandatory: ["monthlySalary"],
      group: ["monthlySalary"]
    },
    {
      value: "account",
      title: t("page.employee.edit.accountAccess"),
      mandatory: ["userName"],
      group: ["userName"]
    },
    {
      value: "documents",
      title: t("page.employee.edit.documents"),
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

  const {
    data: employeeData,
    isLoading: isEmployeeLoading,
    isError,
    refetch
  } = useQuery(["employee-edit", employeeId], () => getEmployeeById({ id: employeeId }), {
    enabled: !!employeeId
  });

  const employee = employeeData?.data || employeeData?.employee || {};

  useEffect(() => {
    if (!employee.id) return;

    setExistingImageUrl(employee.image || null);
    if (employee.image) {
      setPreviewImage(employee.image);
    }
    const raw =
      typeof employee.documents === "string"
        ? JSON.parse(employee.documents)
        : employee.documents || [];
    setExistingDocuments(raw.map(normalizeDoc));

    const durationMap = {
      "1 year": "12",
      "2 years": "24",
      "3 years": "36",
      "4 years": "48",
      "5 years": "60",
      "3 bulan": "3",
      "6 bulan": "6",
      "9 bulan": "9",
      "12 bulan": "12",
      "1 tahun": "12"
    };

    const normalizeDuration = (val) => {
      if (!val) return "";
      const lower = String(val).toLowerCase();
      if (safeGet(durationMap, lower)) return safeGet(durationMap, lower);
      const num = parseInt(val);
      if (!isNaN(num)) return String(num);
      return String(val);
    };

    const genderMap = {
      male: "Laki-laki",
      female: "Perempuan",
      "laki-laki": "Laki-laki",
      perempuan: "Perempuan"
    };
    const employmentTypeMap = { fulltime: "full-time", parttime: "part-time" };

    const empId = String(employee.employeeID || "");
    const isDraftPlaceholder = (val, pattern) =>
      !val || val === pattern || (empId && val === `draft-${empId}`);
    const clearDraft = (val, pattern) => (isDraftPlaceholder(val, pattern) ? "" : val || "");

    form.reset({
      fullName: clearDraft(employee.fullName),
      userName: clearDraft(employee.userName),
      email: clearDraft(employee.email),
      password: "",
      phoneNumber: employee.phoneNumber || "",
      placeOfBirth: employee.placeOfBirth || "",
      address: employee.address || "",
      gender: genderMap[employee.gender?.toLowerCase()] || employee.gender || "",
      dateOfBirth: employee.dateOfBirth || "",
      employeeId: String(employee.employeeID || ""),
      departmentId: String(employee.departmentId || employee.departmentData?.id || ""),
      position: String(employee.position || employee.positionData?.id || ""),
      store: String(employee.store || employee.storeData?.id || ""),
      employmentType:
        employmentTypeMap[employee.employmentType?.toLowerCase()] || employee.employmentType || "",
      contractDuration: normalizeDuration(employee.contractDuration),
      endDate: employee.endDate || "",
      shift: String(employee.shift || ""),
      startDate: employee.startDate || "",
      isActive: employee.status === "active",
      roleId:
        employee.roleId !== null && employee.roleId !== undefined ? String(employee.roleId) : "",
      accessMenu:
        typeof employee.accessMenu === "string"
          ? employee.accessMenu
          : Array.isArray(employee.accessMenu)
            ? JSON.stringify(employee.accessMenu)
            : "",
      monthlySalary: employee.monthlySalary || ""
    });
  }, [employee, form]);

  const employmentType = form.watch("employmentType");
  const startDate = form.watch("startDate");
  const contractDuration = form.watch("contractDuration");

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

  const { data: locationsData } = useLocations();
  const locations = locationsData?.data || locationsData?.locations || [];

  const { data: positionsData } = useQuery(["positions-all"], () => getAllPosition(), {});
  const positions = positionsData?.data || positionsData?.positions || [];

  const { data: departmentsData } = useQuery(["departments-all"], () => getAllDepartment(), {});
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

  const { data: rolesData } = useQuery(["roles"], getAllRole, {});
  const roles = rolesData?.data || rolesData?.roles || [];

  const selectedRoleIdForAccess =
    form.watch("roleId") && accessMenuModalOpen ? form.watch("roleId") : null;

  const { data: selectedRoleData } = useQuery(
    ["role-detail", selectedRoleIdForAccess],
    () => getRoleById(selectedRoleIdForAccess),
    {
      enabled: !!selectedRoleIdForAccess
    }
  );
  const selectedRoleAccessMenu =
    selectedRoleData?.data?.accessMenu || selectedRoleData?.accessMenu || {};

  const selectedStore = form.watch("store");

  const { data: shiftsData } = useQuery(
    ["shifts-all", selectedStore],
    () => getShiftDropdown({ store: selectedStore, statusShift: "active" }),
    {
      enabled: !!selectedStore
    }
  );
  const shifts = shiftsData?.data || shiftsData?.shifts || [];

  const currentShift = form.watch("shift");

  useEffect(() => {
    if (!employee.id || !employeeId || shifts.length === 0) return;
    if (currentShift) return;

    const matched = (shifts || []).find((s) =>
      (s.karyawan || []).some((k) => String(k) === String(employee.id))
    );
    if (matched) {
      form.setValue("shift", String(matched.id), {
        shouldValidate: false,
        shouldDirty: false
      });
    }
  }, [employee, employeeId, shifts, currentShift, form]);

  const updateMutation = useMutation(editEmployee, {
    onSuccess: () => {
      queryClient.invalidateQueries(["employees"]);
      queryClient.invalidateQueries(["employee-edit"]);
      queryClient.invalidateQueries(["employee-detail"]);
      setIsSubmitting(false);
      setSuccessModal(true);
    },
    onError: (err) => {
      setModalMessage(err?.response?.data?.message || err.message);
      setErrorModal(true);
      setIsSubmitting(false);
    }
  });

  const normalizeDoc = (doc) => {
    if (typeof doc === "string") {
      const fileName = doc.split("/").pop() || doc;
      const ext = fileName.split(".").pop()?.toLowerCase();
      return {
        fileUrl: doc,
        fileName,
        mimeType:
          ext === "pdf"
            ? "application/pdf"
            : ext === "docx"
              ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              : ext === "jpg" || ext === "jpeg"
                ? "image/jpeg"
                : ext === "png"
                  ? "image/png"
                  : undefined
      };
    }
    return doc;
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

  const removeExistingDocument = (index) => {
    setExistingDocuments((prev) => {
      const doc = prev.at(index);
      setDeletedDocs((d) => [...d, doc.fileUrl || doc]);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handlePreviewDocument = (doc) => {
    if (doc.previewUrl) {
      window.open(doc.previewUrl, "_blank");
    }
  };

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
    setPreviewImage(existingImageUrl || null);
    setImageFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const onSubmit = (values, saveAsDraft = false) => {
    if (!saveAsDraft && documents.length === 0 && existingDocuments.length === 0) {
      toast.error(t("common.error"), { description: t("page.employee.edit.documentRequired") });
      setIsSubmitting(false);
      return;
    }
    setIsSubmitting(true);
    const payload = {
      ...values,
      id: employeeId,
      status: saveAsDraft ? "draft" : values.isActive ? "active" : "inactive"
    };
    delete payload.isActive;
    if (imageFile) {
      payload.image = imageFile;
    }
    if (deletedDocs.length > 0) {
      payload.deletedDocuments = JSON.stringify(deletedDocs);
    }
    if (documents.length > 0) {
      payload.documents = documents.map((d) => d.file);
    }
    if (values.monthlySalary) {
      payload.monthlySalary = Number(values.monthlySalary);
      payload.dailySalary = dailySalary;
    }
    if (!payload.password) {
      delete payload.password;
    }
    if (!payload.roleId) {
      delete payload.roleId;
    }
    updateMutation.mutate(payload);
  };

  if (isEmployeeLoading) {
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
                { label: t("breadcrumb.hrm") },
                { label: t("breadcrumb.employee"), href: "/employee-list" },
                { label: t("breadcrumb.edit") }
              ]}
              title={t("page.employee.edit.title")}
              description={t("page.employee.edit.description")}
              backLink="/employee-list"
              onBack={requestLeave}
            />
          </div>
        </div>
        <div>
          <div>
            <div className="bg-card p-6 rounded-xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-border overflow-hidden space-y-6">
              <div className="grid grid-cols-12 gap-6">
                <div className="col-span-12 space-y-6">
                  <Skeleton className="h-64 w-full rounded-xl" />
                  <Skeleton className="h-48 w-full rounded-xl" />
                  <Skeleton className="h-64 w-full rounded-xl" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return <AbortController refetch={refetch} />;
  }

  if (!employeeId || !employee.id) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <BadgeCheck size={18} className="text-6xl text-muted-foreground" />
        <p className="text-muted-foreground">{t("page.employee.edit.notFound")}</p>
        <Button variant="danger" onClick={() => navigate("/employee-list")}>
          {t("common.cancel")}
        </Button>
      </div>
    );
  }

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
              { label: t("breadcrumb.hrm") },
              { label: t("breadcrumb.employee"), href: "/employee-list" },
              {
                label: t("breadcrumb.detail"),
                href: `/detail-employee?employeeID=${employee.employeeID}`
              },
              { label: t("breadcrumb.edit") }
            ]}
            title={t("page.employee.edit.title")}
            description={t("page.employee.edit.description")}
            backLink="/employee-list"
            onBack={requestLeave}>
            <UserGuide guideKey="add-employee" />
          </PageHeader>
        </div>
      </div>
      <div>
        <div>
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
                          {t("page.employee.edit.personalInfo")}
                          <span
                            className={`w-2 h-2 rounded-full ${employeeTabDot(employeeTabs[0])}`}
                          />
                        </TabsTrigger>
                        <TabsTrigger value="employment" className="gap-1.5">
                          <Briefcase size={14} />
                          {t("page.employee.edit.jobInfo")}
                          <span
                            className={`w-2 h-2 rounded-full ${employeeTabDot(employeeTabs[1])}`}
                          />
                        </TabsTrigger>
                        <TabsTrigger value="salary" className="gap-1.5">
                          <DollarSign size={14} />
                          {t("page.employee.edit.payroll")}
                          <span
                            className={`w-2 h-2 rounded-full ${employeeTabDot(employeeTabs[2])}`}
                          />
                        </TabsTrigger>
                        <TabsTrigger value="account" className="gap-1.5">
                          <Lock size={14} />
                          {t("page.employee.edit.accountAccess")}
                          <span
                            className={`w-2 h-2 rounded-full ${employeeTabDot(employeeTabs[3])}`}
                          />
                        </TabsTrigger>
                        <TabsTrigger value="documents" className="gap-1.5">
                          <FileText size={14} />
                          {t("page.employee.edit.documents")}
                          <span
                            className={`w-2 h-2 rounded-full ${employeeTabDot(employeeTabs[4])}`}
                          />
                        </TabsTrigger>
                      </TabsList>
                    </div>

                    {/* Tab 1: Profil */}
                    <TabsContent value="profile" className="mt-6">
                      <div className="bg-card rounded-xl shadow-sm border border-border p-6">
                        <div className="flex items-center gap-3 mb-5 pb-3 border-b border-border">
                          <User size={18} className="text-primary" />
                          <h4 className="text-base font-semibold text-foreground">
                            {t("page.employee.edit.personalInfo")}
                          </h4>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                          <div className="flex flex-col items-center gap-3">
                            <label
                              htmlFor="edit-employee-photo"
                              className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                              {t("page.employee.edit.photo")}
                            </label>

                            <input
                              id="edit-employee-photo"
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
                                    {t("page.employee.edit.uploadPhoto")}
                                  </span>
                                </div>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground text-center">
                              {t("page.employee.edit.photoHint")}
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
                                    <FormDescription>{t("common.emailHint")}</FormDescription>
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
                                      {t("page.employee.form.phone")}{" "}
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
                                          .slice(0, 16);
                                        field.onChange(value);
                                      }}
                                    />
                                    <FormMessage />
                                    <FormDescription>{t("common.phoneHintMin")}</FormDescription>
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
                                          placeholder={t("page.employee.form.selectPlaceholder")}
                                        />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="Laki-laki">
                                          {t("page.employee.edit.male")}
                                        </SelectItem>
                                        <SelectItem value="Perempuan">
                                          {t("page.employee.edit.female")}
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
                                      placeholder={t("page.employee.form.placeOfBirthPlaceholder")}
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
                                    placeholder={t("page.employee.form.addressPlaceholder")}
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

                    {/* Tab 2: Pekerjaan */}
                    <TabsContent value="employment" className="mt-6">
                      <div className="bg-card rounded-xl shadow-sm border border-border p-6">
                        <div className="flex items-center gap-3 mb-5 pb-3 border-b border-border">
                          <Briefcase size={18} className="text-primary" />
                          <h4 className="text-base font-semibold text-foreground">
                            {t("page.employee.edit.jobInfo")}
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
                                  placeholder={t("page.employee.form.employeeIdPlaceholder")}
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
                                        {t("page.employee.edit.noDepartments")}
                                      </p>
                                      <p className="text-xs text-muted-foreground mt-0.5">
                                        {t("page.employee.edit.addDepartmentFirst")}
                                      </p>
                                    </div>
                                    <Button
                                      type="button"
                                      variant="success"
                                      size="sm"
                                      onClick={() => navigate("/add-department")}
                                      className="gap-2">
                                      <Plus size={18} className="text-base" />
                                      {t("page.employee.edit.addDepartment")}
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
                                        placeholder={t("page.employee.form.departmentPlaceholder")}
                                      />
                                    </div>
                                    <Button
                                      type="button"
                                      variant="success"
                                      size="icon"
                                      className="shrink-0"
                                      onClick={() => navigate("/add-department")}
                                      title={t("page.employee.edit.addDepartmentNew")}>
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
                                  {t("page.employee.table.position")}
                                </FormLabel>
                                {positions.length === 0 ? (
                                  <div className="flex flex-col items-center gap-3 p-6 border-2 border-dashed border-border rounded-lg bg-muted/20">
                                    <BadgeCheck
                                      size={18}
                                      className="text-3xl text-muted-foreground"
                                    />
                                    <div className="text-center">
                                      <p className="text-sm font-medium text-foreground">
                                        {t("page.employee.edit.noPositions")}
                                      </p>
                                      <p className="text-xs text-muted-foreground mt-0.5">
                                        {t("page.employee.edit.addPositionFirst")}
                                      </p>
                                    </div>
                                    <Button
                                      type="button"
                                      variant="success"
                                      size="sm"
                                      onClick={() => navigate("/add-position")}
                                      className="gap-2">
                                      <Plus size={18} className="text-base" />
                                      {t("page.employee.edit.addPosition")}
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
                                            ? t("page.employee.form.positionPlaceholder")
                                            : t("page.employee.form.positionSelectDepartmentFirst")
                                        }
                                      />
                                    </div>
                                    <Button
                                      type="button"
                                      variant="success"
                                      size="icon"
                                      className="shrink-0"
                                      onClick={() => navigate("/add-position")}
                                      title={t("page.employee.edit.addPositionNew")}>
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
                                  {t("page.employee.form.store")}
                                </FormLabel>
                                {locations.length === 0 ? (
                                  <div className="flex flex-col items-center gap-3 p-6 border-2 border-dashed border-border rounded-lg bg-muted/20">
                                    <Store size={18} className="text-3xl text-muted-foreground" />
                                    <div className="text-center">
                                      <p className="text-sm font-medium text-foreground">
                                        {t("page.employee.edit.noStores")}
                                      </p>
                                      <p className="text-xs text-muted-foreground mt-0.5">
                                        {t("page.employee.edit.addStoreFirst")}
                                      </p>
                                    </div>
                                    <Button
                                      type="button"
                                      variant="success"
                                      size="sm"
                                      onClick={() => navigate("/add-location")}
                                      className="gap-2">
                                      <Plus size={18} className="text-base" />
                                      {t("page.employee.edit.addStore")}
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
                                        placeholder={t("page.employee.form.storePlaceholder")}
                                        searchPlaceholder={t(
                                          "page.employee.form.storeSearchPlaceholder"
                                        )}
                                      />
                                    </div>
                                    <Button
                                      type="button"
                                      variant="success"
                                      size="icon"
                                      className="shrink-0"
                                      onClick={() => navigate("/add-location")}
                                      title={t("page.employee.edit.addStoreNew")}>
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
                                  {t("page.employee.detail.employmentType")}
                                </FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <SelectTrigger>
                                    <SelectValue
                                      placeholder={t(
                                        "page.employee.form.employmentTypePlaceholder"
                                      )}
                                    />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="full-time">
                                      {t("page.employee.detail.employmentTypeFullTime")}
                                    </SelectItem>
                                    <SelectItem value="part-time">
                                      {t("page.employee.detail.employmentTypePartTime")}
                                    </SelectItem>
                                    <SelectItem value="contract">
                                      {t("page.employee.detail.employmentTypeContract")}
                                    </SelectItem>
                                    <SelectItem value="internship">
                                      {t("page.employee.detail.employmentTypeInternship")}
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
                                  {t("page.employee.detail.startDate")}
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
                                        ? t("page.employee.detail.internshipDuration")
                                        : t("page.employee.detail.contractDuration")}
                                    </FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                      <SelectTrigger>
                                        <SelectValue
                                          placeholder={t("page.employee.form.durationPlaceholder")}
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
                                      {t("page.employee.detail.endDate")}
                                    </FormLabel>
                                    <div className="flex h-10 w-full items-center rounded-lg border border-border bg-muted/50 px-3 text-sm text-muted-foreground">
                                      {field.value
                                        ? format(parseDateOnly(field.value), "dd MMM yyyy")
                                        : contractDuration && startDate
                                          ? t("page.employee.form.selectDurationFirst")
                                          : t("page.employee.form.selectStartDateAndDuration")}
                                    </div>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </>
                          )}
                          <div className="flex flex-col gap-1.5 justify-end">
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
                                        {t("common.status")}{" "}
                                        {field.value ? t("common.active") : t("common.inactive")}
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        {field.value
                                          ? t("page.employee.edit.statusActiveDesc")
                                          : t("page.employee.edit.statusInactiveDesc")}
                                      </p>
                                    </div>
                                  </div>
                                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                                </div>
                              )}
                            />
                          </div>
                        </div>
                      </div>
                    </TabsContent>

                    {/* Tab 3: Gaji */}
                    <TabsContent value="salary" className="mt-6">
                      <div className="bg-card rounded-xl shadow-sm border border-border p-6">
                        <div className="flex items-center gap-3 mb-5 pb-3 border-b border-border">
                          <Banknote size={18} className="text-primary" />
                          <h4 className="text-base font-semibold text-foreground">
                            {t("page.employee.edit.payroll")}
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
                                    Rp
                                  </span>
                                  <Input
                                    type="text"
                                    className="pl-10"
                                    placeholder="0"
                                    value={
                                      field.value ? Number(field.value).toLocaleString("id-ID") : ""
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
                                Rp
                              </span>
                              <Input
                                value={dailySalary ? dailySalary.toLocaleString("id-ID") : ""}
                                readOnly
                                className="pl-10 bg-muted/50 text-muted-foreground"
                                placeholder={t("page.employee.form.dailySalaryPlaceholder")}
                              />
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {t("page.employee.form.dailySalaryHint", { days: daysInMonth })}
                            </p>
                          </FormItem>
                        </div>
                      </div>
                    </TabsContent>

                    {/* Tab 4: Akun & Akses */}
                    <TabsContent value="account" className="mt-6">
                      <div className="bg-card rounded-xl shadow-sm border border-border p-6">
                        <div className="flex items-center gap-3 mb-5 pb-3 border-b border-border">
                          <Lock size={18} className="text-primary" />
                          <h4 className="text-base font-semibold text-foreground">
                            {t("page.employee.edit.accountAccess")}
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
                                  placeholder={t("page.employee.form.usernamePlaceholder")}
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
                                  {t("page.employee.form.password")}
                                </FormLabel>
                                <div className="relative">
                                  <Input
                                    {...field}
                                    type={showPassword ? "text" : "password"}
                                    className="pr-10"
                                    placeholder={t("page.employee.form.passwordPlaceholder")}
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
                                <p className="text-xs text-muted-foreground mt-1">
                                  {t("page.employee.form.passwordHint")}
                                </p>
                                <FormMessage />
                                <FormDescription>
                                  {t("common.optionalField")} — {t("common.passwordMin6")}
                                </FormDescription>
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
                                </Select>
                                <FormDescription>{t("page.employee.add.roleHint")}</FormDescription>
                                <FormMessage />
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
                                  <div className="flex gap-2">
                                    <Button
                                      type="button"
                                      variant="outline"
                                      className="w-full justify-start text-left font-normal"
                                      disabled={disableAccess}
                                      disabledReason={t("page.employee.add.selectRoleFirst")}
                                      onClick={() => setAccessMenuModalOpen(true)}>
                                      {disableAccess
                                        ? t("page.employee.edit.selectRoleFirst")
                                        : permCount > 0
                                          ? t("page.employee.form.accessMenuCount", {
                                              count: permCount
                                            })
                                          : t("page.employee.form.accessMenuButton")}
                                    </Button>
                                  </div>
                                  <FormDescription>
                                    {t("page.employee.add.accessMenuHint")}
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              );
                            }}
                          />
                          <AccessMenuModal
                            open={accessMenuModalOpen}
                            onOpenChange={setAccessMenuModalOpen}
                            value={form.watch("accessMenu")}
                            roleAccessMenu={selectedRoleAccessMenu}
                            onSave={(json) => form.setValue("accessMenu", json)}
                          />
                        </div>
                      </div>
                    </TabsContent>

                    {/* Tab 5: Dokumen */}
                    <TabsContent value="documents" className="mt-6">
                      <div className="bg-card rounded-xl shadow-sm border border-border p-6">
                        <div className="flex items-center gap-3 mb-5 pb-3 border-b border-border">
                          <FileText size={18} className="text-primary" />
                          <h4 className="text-base font-semibold text-foreground">
                            {t("page.employee.edit.documents")}
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
                              {t("page.employee.edit.uploadDocument")}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {t("page.employee.edit.documentTypes")}
                            </p>
                          </div>

                          {existingDocuments.length > 0 && (
                            <div className="space-y-2">
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                {t("page.employee.edit.savedDocuments")}
                              </p>
                              {existingDocuments.map((doc, index) => (
                                <div
                                  key={doc.id || index}
                                  className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/20">
                                  <a
                                    href={doc.fileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-3 flex-1 min-w-0 hover:opacity-80 transition-opacity">
                                    {getFileIcon(
                                      doc.mimeType || doc.fileType,
                                      doc.fileName || doc.name
                                    )}
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium text-foreground truncate">
                                        {doc.fileName || doc.name}
                                      </p>
                                    </div>
                                    <Download
                                      size={16}
                                      className="text-muted-foreground hover:text-primary transition-colors shrink-0"
                                    />
                                  </a>
                                  <button
                                    aria-label={t("common.delete")}
                                    type="button"
                                    onClick={() => removeExistingDocument(index)}
                                    className="p-1.5 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0">
                                    <X size={16} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}

                          {documents.length > 0 && (
                            <div className="space-y-2">
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                {t("page.employee.edit.newDocuments")}
                              </p>
                              {documents.map((doc, index) => (
                                <div
                                  key={index}
                                  className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/20">
                                  {getFileIcon(doc.file?.type, doc.name)}
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-foreground truncate">
                                      {doc.name}
                                    </p>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handlePreviewDocument(doc)}
                                    className="p-1.5 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                                    title={t("common.view")}>
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
                  <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-5 border-t border-border mt-6">
                    <Button
                      type="button"
                      variant="danger"
                      className="w-full sm:w-auto"
                      onClick={requestLeave}>
                      <ArrowLeft size={20} className="text-lg" />
                      {t("common.cancel")}
                    </Button>
                    <div className="flex gap-3">
                      <Button
                        type="button"
                        variant="draft"
                        onClick={() => setDraftModal(true)}
                        disabled={isSubmitting}>
                        {t("page.employee.edit.saveAsDraft")}
                      </Button>
                      <Button
                        variant="success"
                        type="button"
                        disabled={isSubmitting}
                        className="w-full sm:w-auto gap-2"
                        onClick={(e) => {
                          e.preventDefault();
                          const values = form.getValues();
                          const missing = getMissingFields(values, formSchema, employeeFieldLabels);
                          if (missing.length > 0) {
                            setMissingFieldsList(missing);
                            setMissingFieldsByTab(buildMissingByTab(values));
                            setMissingFieldsModal(true);
                            return;
                          }
                          setConfirmSaveModal(true);
                        }}>
                        <Save size={20} className="text-lg" />
                        {t("page.employee.edit.saveChanges")}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </form>
          </Form>
        </div>
      </div>

      <Modal
        type="confirm"
        open={confirmSaveModal}
        onOpenChange={setConfirmSaveModal}
        title={t("common.confirmSave")}
        description={t("page.employee.ui.areYouSureYouWant")}
        confirmText={t("common.confirm.yesSave")}
        onConfirm={() => {
          setConfirmSaveModal(false);
          onSubmit(form.getValues(), false);
        }}
      />

      {isSubmitting && <Loading fullscreen size="lg" label={t("common.saving")} />}

      <Modal
        type="success"
        open={successModal}
        onOpenChange={setSuccessModal}
        title={t("page.employee.edit.successTitle")}
        description={t("page.employee.edit.successDescription")}
        onConfirm={() => setTimeout(() => navigate("/employee-list"), 150)}
      />
      <Modal
        type="confirm"
        open={cancelModal}
        onOpenChange={setCancelModal}
        title={t("modal.cancelTitle")}
        description={t("modal.cancelDescription")}
        confirmText={t("modal.yesCancel")}
        onConfirm={() => setTimeout(leave, 150)}
      />
      <Modal
        type="confirm"
        open={draftModal}
        onOpenChange={setDraftModal}
        title={t("page.employee.edit.draftTitle")}
        description={t("page.employee.edit.draftDescription")}
        confirmText={t("page.employee.edit.draftConfirm")}
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

export default EditEmployee;
