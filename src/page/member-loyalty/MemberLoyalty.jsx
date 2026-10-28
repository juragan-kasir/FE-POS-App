import React, { useState } from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import { useCookies } from "react-cookie";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { Award, Gift, Plus, Edit, Trash, RefreshCw, Eye } from "lucide-react";
import {
  getAllMemberTier,
  addMemberTier,
  editMemberTier,
  deleteMemberTier,
  updateAllMemberTiers
} from "@/services/member-tier";
import { getAllMember, addMemberPoints } from "@/services/member";
import { formatCurrency, formatNumber } from "@/utils/reportUtils";
import Modal from "@/components/organism/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import AbortController from "@/components/organism/abort-controller";
import TableActionLegend from "@/components/ui/TableActionLegend";
import PageHeader from "@/components/ui/PageHeader";
import { useLocations } from "@/queries/useLocations";

const MemberLoyalty = () => {
  const { t } = useTranslation();
  const [cookie] = useCookies();
  const user = cookie?.user;
  const isSuperAdmin = user?.roleType === "super_admin";
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [store, setStore] = useState("");
  const [activeTab, setActiveTab] = useState("tiers");
  const [search, setSearch] = useState("");
  const [selectedMember, setSelectedMember] = useState(null);
  const [redeemPoints, setRedeemPoints] = useState("");
  const [deleteTierTarget, setDeleteTierTarget] = useState(null);

  const { data: locData } = useLocations("active", {
    enabled: isSuperAdmin
  });
  const locations = locData?.data || [];
  const storeId = store || cookie?.activeStore;

  const {
    data: tiersData,
    isLoading: tiersLoading,
    isError: tiersError,
    refetch: refetchTiers
  } = useQuery(["member-tiers", storeId], () => getAllMemberTier({ store: storeId }), {
    enabled: !!storeId
  });
  const tiers = tiersData?.data || tiersData?.tiers || [];

  const {
    data: membersData,
    isLoading: membersLoading,
    isError: membersError,
    refetch: refetchMembers
  } = useQuery(
    ["members-loyalty", storeId, search],
    () => getAllMember({ store: storeId, nameMember: search, page: 1, limit: 20 }),
    { enabled: !!storeId }
  );
  const members = membersData?.data || [];

  const deleteTierMutation = useMutation({
    mutationFn: deleteMemberTier,
    onSuccess: () => {
      toast.success(t("page.memberLoyalty.ui.tierDeleted"));
      queryClient.invalidateQueries(["member-tiers"]);
      setDeleteTierTarget(null);
    },
    onError: (err) => toast.error(err?.message || "Gagal menghapus tier")
  });

  const updateTiersMutation = useMutation({
    mutationFn: updateAllMemberTiers,
    onSuccess: (data) => {
      toast.success(`Berhasil update ${data.data.updated} member tier`);
      queryClient.invalidateQueries(["member-tiers"]);
      queryClient.invalidateQueries(["members-loyalty"]);
    },
    onError: (err) => toast.error(err?.message || "Gagal update tier member")
  });

  const redeemMutation = useMutation({
    mutationFn: ({ phoneNumber, points }) =>
      addMemberPoints(phoneNumber, { points: -Math.abs(points) }),
    onSuccess: () => {
      toast.success(t("page.memberLoyalty.ui.pointsRedeemed"));
      queryClient.invalidateQueries(["members-loyalty"]);
      queryClient.invalidateQueries(["member-detail-loyalty"]);
      setRedeemPoints("");
    },
    onError: (err) =>
      toast.error(err?.response?.data?.message || err?.message || "Gagal meredeem poin")
  });

  const handleRedeemPoints = (memberId) => {
    const points = Number(redeemPoints);
    if (!points || points <= 0) {
      toast.error(t("page.memberLoyalty.ui.pointsMustBeGreaterThan"));
      return;
    }
    const member = members.find((m) => m.id === memberId);
    if (!member) return;
    if (points > (member.totalPoints || 0)) {
      toast.error(t("page.memberLoyalty.ui.notEnoughPoints"));
      return;
    }
    redeemMutation.mutate({ phoneNumber: member.phoneNumber, points });
  };

  const getTierBadge = (tier) => {
    if (!tier) return <Badge variant="secondary">{t("page.memberLoyalty.ui.noTier")}</Badge>;
    const colors = {
      active: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
      inactive: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
      draft: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
    };
    return <Badge className={colors[tier.status] || colors.active}>{tier.name}</Badge>;
  };

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        breadcrumbs={[
          {
            label: t("breadcrumb.home"),
            href: "/dashboard-super-admin",
            i18nKey: "breadcrumb.home"
          },
          { label: t("page.memberLoyalty.title") }
        ]}
        title={t("page.memberLoyalty.title")}>
        {isSuperAdmin && (
          <Select value={store} onValueChange={setStore}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={t("page.table.form.storePlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              {locations.map((loc) => (
                <SelectItem key={loc.id} value={String(loc.id)}>
                  {loc.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Button
          variant="success"
          onClick={() => updateTiersMutation.mutate()}
          disabled={updateTiersMutation.isLoading}>
          <RefreshCw
            className={`w-4 h-4 mr-2 ${updateTiersMutation.isLoading ? "animate-spin" : ""}`}
          />
          {t("page.memberLoyalty.ui.updateAllTiers")}
        </Button>
      </PageHeader>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="tiers">{t("page.memberLoyalty.tabs.tiers")}</TabsTrigger>
          <TabsTrigger value="members">{t("page.memberLoyalty.tabs.members")}</TabsTrigger>
          <TabsTrigger value="redeem">{t("page.memberLoyalty.tabs.redeem")}</TabsTrigger>
        </TabsList>

        <TabsContent value="tiers">
          {tiersError ? (
            <AbortController refetch={refetchTiers} />
          ) : tiersLoading ? (
            <Skeleton className="h-64 rounded-lg" />
          ) : (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>{t("common.ui.memberTiers")}</CardTitle>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="success">
                      <Plus className="w-4 h-4 mr-2" />
                      {t("common.ui.addTier")}
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{t("page.member.list.addMemberTier")}</DialogTitle>
                    </DialogHeader>
                    <AddTierForm
                      onSuccess={() => queryClient.invalidateQueries(["member-tiers"])}
                    />
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {tiers.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    {t("page.memberLoyalty.ui.noTiers")}
                  </p>
                ) : (
                  <div className="space-y-4">
                    {tiers.map((tier) => (
                      <div
                        key={tier.id}
                        className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-4">
                          <div
                            className="w-12 h-12 rounded-full flex items-center justify-center text-2xl"
                            style={{ backgroundColor: tier.color || "#00000020" }}>
                            <Award className="w-6 h-6" />
                          </div>
                          <div>
                            <h3 className="font-semibold">{tier.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              {tier.minPoints} - {tier.maxPoints ?? "∞"}{" "}
                              {t("page.memberLoyalty.ui.points")} {tier.discountPercent}
                              {t("page.memberLoyalty.ui.discount")}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {tier.memberCount || 0} member
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={tier.status === "active" ? "default" : "secondary"}>
                            {tier.status}
                          </Badge>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                <Edit className="w-4 h-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>{t("page.memberLoyalty.ui.editTier")}</DialogTitle>
                              </DialogHeader>
                              <EditTierForm
                                tier={tier}
                                onSuccess={() => queryClient.invalidateQueries(["member-tiers"])}
                              />
                            </DialogContent>
                          </Dialog>
                          <Button
                            variant="destructive"
                            size="sm"
                            aria-label={`Hapus tier ${tier.name}`}
                            onClick={() => setDeleteTierTarget(tier)}>
                            <Trash className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="members">
          {membersError ? (
            <AbortController refetch={refetchMembers} />
          ) : membersLoading ? (
            <Skeleton className="h-64 rounded-lg" />
          ) : (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{t("common.ui.members")}</CardTitle>
                  <Input
                    placeholder={t("page.memberLoyalty.ui.searchMembers")}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-[200px]"
                  />
                </div>
              </CardHeader>
              <CardContent>
                {members.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    {t("page.memberLoyalty.ui.noMembers")}
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("document.name")}</TableHead>
                        <TableHead>{t("document.phone")}</TableHead>
                        <TableHead>{t("page.memberLoyalty.tabs.tiers")}</TableHead>
                        <TableHead>{t("page.cashier.modal.memberPoints")}</TableHead>
                        <TableHead>{t("page.cashier.modal.totalShopping")}</TableHead>
                        <TableHead>{t("common.action")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {members.map((member) => (
                        <TableRow key={member.id}>
                          <TableCell className="font-medium">{member.name}</TableCell>
                          <TableCell>{member.phoneNumber}</TableCell>
                          <TableCell>{getTierBadge(member.tierData)}</TableCell>
                          <TableCell>{formatNumber(member.totalPoints || 0)}</TableCell>
                          <TableCell>{formatCurrency(member.totalSpent || 0)}</TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigate(`/detail-member?id=${member.id}`)}>
                              <Eye className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="redeem">
          <Card>
            <CardHeader>
              <CardTitle>{t("page.product.form.redeemPoints")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-4 items-end">
                  <div className="flex-1">
                    <Label htmlFor="redeem-member">{t("breadcrumb.member")}</Label>
                    <Select
                      onValueChange={(val) => {
                        setSelectedMember(Number(val));
                        // A points amount typed for the previous member is
                        // meaningless once a different member is selected —
                        // clear it so the field can't be misread as still
                        // applying to whoever is now selected.
                        setRedeemPoints("");
                      }}>
                      <SelectTrigger id="redeem-member">
                        <SelectValue placeholder={t("page.memberLoyalty.ui.selectMember")} />
                      </SelectTrigger>
                      <SelectContent>
                        {members.map((m) => (
                          <SelectItem key={m.id} value={String(m.id)}>
                            {m.name} ({m.totalPoints || 0} {t("page.memberLoyalty.ui.points2")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1">
                    <Label htmlFor="redeem-points">
                      {t("page.memberLoyalty.ui.redeemedPoints")}
                    </Label>
                    <Input
                      id="redeem-points"
                      type="number"
                      min={1}
                      value={redeemPoints}
                      onChange={(e) => setRedeemPoints(e.target.value)}
                      placeholder={t("page.memberLoyalty.ui.pointsAmount")}
                    />
                  </div>
                  <Button
                    onClick={() => selectedMember && handleRedeemPoints(selectedMember)}
                    disabled={redeemMutation.isLoading}>
                    <Gift className="w-4 h-4 mr-2" />
                    {redeemMutation.isLoading ? t("common.processing") : "Redeem"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <TableActionLegend
        className="mt-4"
        items={[
          { icon: Eye, label: t("common.view") },
          { icon: Edit, label: t("common.edit") },
          { icon: Trash, label: t("common.delete") }
        ]}
      />

      <Modal
        type="confirm"
        open={!!deleteTierTarget}
        onOpenChange={(open) => !open && setDeleteTierTarget(null)}
        title={t("page.memberTier.edit.deleteTier")}
        description={`Yakin ingin menghapus tier "${deleteTierTarget?.name}"? Tindakan ini tidak dapat dibatalkan.`}
        confirmText="Hapus"
        confirmVariant="destructive"
        onConfirm={() => deleteTierMutation.mutate({ id: deleteTierTarget.id })}
        loading={deleteTierMutation.isLoading}
      />
    </div>
  );
};

const AddTierForm = ({ onSuccess }) => {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [minPoints, setMinPoints] = useState(0);
  const [maxPoints, setMaxPoints] = useState(0);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [color, setColor] = useState("#000000");
  const [status, setStatus] = useState("active");
  const addTier = useMutation({
    mutationFn: (payload) => addMemberTier(payload),
    onSuccess: () => {
      toast.success(t("page.memberLoyalty.ui.tierAdded"));
      onSuccess();
    },
    onError: (err) => toast.error(err?.message || "Gagal menambahkan tier")
  });
  const handleSubmit = (e) => {
    e.preventDefault();
    // maxPoints of 0 is this form's "no upper bound" sentinel (matches the
    // "∞" shown for it in the tier list), so only flag a real max < min.
    if (maxPoints > 0 && maxPoints < minPoints) {
      toast.error(t("page.memberLoyalty.tier.validation.maxLessThanMin"));
      return;
    }
    if (discountPercent < 0 || discountPercent > 100) {
      toast.error(t("page.memberLoyalty.tier.validation.discountRange"));
      return;
    }
    addTier.mutate({ name, minPoints, maxPoints, discountPercent, color, status });
  };
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="member-loyalty-name">{t("page.memberTier.table.name")}</Label>
        <Input
          id="member-loyalty-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="member-loyalty-min-points">{t("page.memberTier.detail.minPoints")}</Label>
          <Input
            id="member-loyalty-min-points"
            type="number"
            value={minPoints}
            onChange={(e) => setMinPoints(Number(e.target.value))}
          />
        </div>
        <div>
          <Label htmlFor="member-loyalty-max-points">{t("page.memberTier.detail.maxPoints")}</Label>
          <Input
            id="member-loyalty-max-points"
            type="number"
            value={maxPoints}
            onChange={(e) => setMaxPoints(Number(e.target.value))}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="member-loyalty-discount2">{t("page.memberLoyalty.ui.discount2")}</Label>
          <Input
            id="member-loyalty-discount2"
            type="number"
            value={discountPercent}
            onChange={(e) => setDiscountPercent(Number(e.target.value))}
          />
        </div>
        <div>
          <Label htmlFor="member-loyalty-color">{t("page.category.form.color")}</Label>
          <Input
            id="member-loyalty-color"
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
          />
        </div>
      </div>
      <div>
        <Label htmlFor="member-loyalty-status">{t("common.status")}</Label>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger id="member-loyalty-status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">{t("page.location.map.active")}</SelectItem>
            <SelectItem value="inactive">{t("page.location.map.inactive")}</SelectItem>
            <SelectItem value="draft">{t("common.draft")}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button variant="success" type="submit" disabled={addTier.isLoading}>
        {addTier.isLoading ? "Saving..." : "Add Tier"}
      </Button>
    </form>
  );
};

const EditTierForm = ({ tier, onSuccess }) => {
  const { t } = useTranslation();
  const [name, setName] = useState(tier.name || "");
  const [minPoints, setMinPoints] = useState(tier.minPoints || 0);
  const [maxPoints, setMaxPoints] = useState(tier.maxPoints ?? 0);
  const [discountPercent, setDiscountPercent] = useState(tier.discountPercent || 0);
  const [color, setColor] = useState(tier.color || "#000000");
  const [status, setStatus] = useState(tier.status || "active");
  const editTier = useMutation({
    mutationFn: (payload) => editMemberTier({ id: tier.id, ...payload }),
    onSuccess: () => {
      toast.success(t("page.memberLoyalty.ui.tierUpdated"));
      onSuccess();
    },
    onError: (err) => toast.error(err?.message || "Gagal memperbarui tier")
  });
  const handleSubmit = (e) => {
    e.preventDefault();
    if (maxPoints > 0 && maxPoints < minPoints) {
      toast.error(t("page.memberLoyalty.tier.validation.maxLessThanMin"));
      return;
    }
    if (discountPercent < 0 || discountPercent > 100) {
      toast.error(t("page.memberLoyalty.tier.validation.discountRange"));
      return;
    }
    editTier.mutate({ name, minPoints, maxPoints, discountPercent, color, status });
  };
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="member-loyalty-name-2">{t("page.memberTier.table.name")}</Label>
        <Input
          id="member-loyalty-name-2"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="member-loyalty-min-points-2">
            {t("page.memberTier.detail.minPoints")}
          </Label>
          <Input
            id="member-loyalty-min-points-2"
            type="number"
            value={minPoints}
            onChange={(e) => setMinPoints(Number(e.target.value))}
          />
        </div>
        <div>
          <Label htmlFor="member-loyalty-max-points-2">
            {t("page.memberTier.detail.maxPoints")}
          </Label>
          <Input
            id="member-loyalty-max-points-2"
            type="number"
            value={maxPoints}
            onChange={(e) => setMaxPoints(Number(e.target.value))}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="member-loyalty-discount2-2">{t("page.memberLoyalty.ui.discount2")}</Label>
          <Input
            id="member-loyalty-discount2-2"
            type="number"
            value={discountPercent}
            onChange={(e) => setDiscountPercent(Number(e.target.value))}
          />
        </div>
        <div>
          <Label htmlFor="member-loyalty-color-2">{t("page.category.form.color")}</Label>
          <Input
            id="member-loyalty-color-2"
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
          />
        </div>
      </div>
      <div>
        <Label htmlFor="member-loyalty-status-2">{t("common.status")}</Label>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger id="member-loyalty-status-2">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">{t("page.location.map.active")}</SelectItem>
            <SelectItem value="inactive">{t("page.location.map.inactive")}</SelectItem>
            <SelectItem value="draft">{t("common.draft")}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button variant="success" type="submit" disabled={editTier.isLoading}>
        {editTier.isLoading ? "Saving..." : "Update Tier"}
      </Button>
    </form>
  );
};

AddTierForm.propTypes = {
  onSuccess: PropTypes.func
};

EditTierForm.propTypes = {
  tier: PropTypes.object,
  onSuccess: PropTypes.func
};

export default MemberLoyalty;
