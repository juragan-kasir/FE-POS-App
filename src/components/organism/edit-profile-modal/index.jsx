import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useCookies } from "react-cookie";
import { toast } from "sonner";
import Modal from "@/components/organism/modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { editProfile } from "@/services/auth";
import { isSessionEnding } from "@/services/session";
import { getToken } from "@/utils/cookies";
import { isRememberMeEnabled, rememberSession } from "@/lib/remembered-session";
import { sessionCookieOptions } from "@/lib/session-cookie";
import { FIELD_LIMITS } from "@/constants/fieldLimits";

export default function EditProfileModal({ open, onOpenChange, user, onSuccess }) {
  const { t } = useTranslation();
  const [, setCookie] = useCookies();

  const [fullName, setFullName] = useState("");
  const [userName, setUserName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [address, setAddress] = useState("");
  const [gender, setGender] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState();
  const [placeOfBirth, setPlaceOfBirth] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open && user) {
      setFullName(user.fullName || "");
      setUserName(user.userName || "");
      setPhoneNumber(user.phoneNumber || "");
      setAddress(user.address || "");
      setGender(user.gender || "");
      setDateOfBirth(user.dateOfBirth ? new Date(user.dateOfBirth) : undefined);
      setPlaceOfBirth(user.placeOfBirth || "");
      setImageFile(null);
      setSubmitting(false);
    }
  }, [open, user]);

  const handleConfirm = async () => {
    // Returning `false` (Modal now awaits this async function) keeps the
    // shared Modal open instead of letting it close on click regardless of
    // outcome — both on a validation failure and on a request error the
    // user needs the modal to stay put so they can fix the field or retry.
    if (!fullName.trim()) {
      toast.error(t("page.profile.editModal.validation"));
      return false;
    }
    if (!user?.email) {
      toast.error(t("page.profile.editModal.error"), {
        description: t("page.profile.editModal.noEmail")
      });
      return false;
    }

    setSubmitting(true);
    try {
      const result = await editProfile({
        email: user.email,
        fullName,
        userName,
        phoneNumber,
        address,
        gender,
        dateOfBirth: dateOfBirth ? dateOfBirth.toISOString() : "",
        placeOfBirth,
        ...(imageFile ? { image: imageFile } : {})
      });

      // TP-13 / KF-NEW-11: a profile edit changes no authentication or
      // authorization state, so the session token from login stays as-is.
      // The `token` editUser returns carries only {id, sessionId}; adopting it
      // would drop roleType/roleId/store and deny every role-gated request
      // until re-login. Only the displayed user data is refreshed below.
      // A response landing after the session started ending must not write
      // the old user's data back (it would survive the reload).
      if (isSessionEnding()) return false;

      const updatedUser = { ...user, ...result.user };
      const isRemembered = isRememberMeEnabled();
      try {
        sessionStorage.setItem("user", JSON.stringify(updatedUser));
      } catch {
        // sessionStorage unavailable (private mode / quota) — cookie below still updates
      }
      if (isRemembered) rememberSession(updatedUser);
      // destructure-to-strip: accessMenu is deliberately excluded from the cookie
      // payload (4KB cookie limit; see login's identical pattern in
      // src/page/auth/login/index.jsx)
      // eslint-disable-next-line no-unused-vars
      const { accessMenu, ...userSlim } = updatedUser;
      setCookie("user", userSlim, sessionCookieOptions(getToken(), isRemembered));

      toast.success(t("page.profile.editModal.success"));
      onSuccess?.(updatedUser);
      // No `return false` here — Modal closes itself on the (non-false)
      // resolution, so this component no longer needs to call
      // onOpenChange(false) itself.
    } catch (err) {
      toast.error(t("page.profile.editModal.error"), {
        description: err?.response?.data?.message || err.message
      });
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      type="form"
      open={open}
      onOpenChange={onOpenChange}
      title={t("page.profile.editProfile")}
      confirmText={t("common.save")}
      onConfirm={handleConfirm}
      loading={submitting}>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="edit-profile-fullName">{t("page.employee.form.fullName")}</Label>
          <Input
            id="edit-profile-fullName"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            maxLength={FIELD_LIMITS.PERSON_NAME}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="edit-profile-userName">{t("page.profile.username")}</Label>
            <Input
              id="edit-profile-userName"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              maxLength={FIELD_LIMITS.SHORT_LABEL}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-profile-phoneNumber">{t("page.employee.form.phoneNumber")}</Label>
            <Input
              id="edit-profile-phoneNumber"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              maxLength={FIELD_LIMITS.PHONE}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-profile-address">{t("page.profile.address")}</Label>
          <Input
            id="edit-profile-address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            maxLength={FIELD_LIMITS.ADDRESS}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="edit-profile-gender">{t("page.profile.gender")}</Label>
            <Select onValueChange={setGender} value={gender}>
              <SelectTrigger id="edit-profile-gender">
                <SelectValue placeholder={t("page.employee.add.genderPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Laki-laki">{t("page.employee.add.male")}</SelectItem>
                <SelectItem value="Perempuan">{t("page.employee.add.female")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-profile-dateOfBirth">{t("page.profile.dateOfBirth")}</Label>
            <DatePicker id="edit-profile-dateOfBirth" date={dateOfBirth} setDate={setDateOfBirth} />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-profile-placeOfBirth">{t("page.profile.placeOfBirth")}</Label>
          <Input
            id="edit-profile-placeOfBirth"
            value={placeOfBirth}
            onChange={(e) => setPlaceOfBirth(e.target.value)}
            maxLength={FIELD_LIMITS.SHORT_LABEL}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-profile-photo">{t("page.profile.editModal.photo")}</Label>
          <input
            id="edit-profile-photo"
            type="file"
            accept="image/*"
            onChange={(e) => setImageFile(e.target.files?.[0] || null)}
            className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
          />
        </div>
      </div>
    </Modal>
  );
}
