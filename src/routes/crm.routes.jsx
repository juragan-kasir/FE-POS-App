import React from "react";
import { Route } from "react-router-dom";

// Member
const MemberList = React.lazy(() => import("@/page/member/MemberList"));
const AddMember = React.lazy(() => import("@/page/member/AddMember"));
const EditMember = React.lazy(() => import("@/page/member/EditMember"));
const MemberDetail = React.lazy(() => import("@/page/member/MemberDetail"));
const MemberPointHistory = React.lazy(() => import("@/page/member/MemberPointHistory"));

// Member Tier
const MemberTier = React.lazy(() => import("@/page/member-tier"));
const AddMemberTier = React.lazy(() => import("@/page/member-tier/AddMemberTier"));
const EditMemberTier = React.lazy(() => import("@/page/member-tier/EditMemberTier"));
const DetailMemberTier = React.lazy(() => import("@/page/member-tier/DetailMemberTier"));

// Discount
const DiscountList = React.lazy(() => import("@/page/discount/DiscountList"));
const AddDiscount = React.lazy(() => import("@/page/discount/AddDiscount"));
const EditDiscount = React.lazy(() => import("@/page/discount/EditDiscount"));
const DetailDiscount = React.lazy(() => import("@/page/discount/DetailDiscount"));

// Type Payment
const TypePaymentList = React.lazy(() => import("@/page/type-payment/TypePaymentList"));
const AddTypePayment = React.lazy(() => import("@/page/type-payment/AddTypePayment"));
const EditTypePayment = React.lazy(() => import("@/page/type-payment/EditTypePayment"));
const DetailTypePayment = React.lazy(() => import("@/page/type-payment/DetailTypePayment"));

// Reservation
const ReservationList = React.lazy(() => import("@/page/reservation/ReservationList"));
const AddReservation = React.lazy(() => import("@/page/reservation/AddReservation"));
const EditReservation = React.lazy(() => import("@/page/reservation/EditReservation"));
const DetailReservation = React.lazy(() => import("@/page/reservation/DetailReservation"));

// Member Loyalty
const MemberLoyalty = React.lazy(() => import("@/page/member-loyalty/MemberLoyalty"));

export const crmRoutes = (
  <>
    <Route path="/member-list" element={<MemberList />} />
    <Route path="/add-member" element={<AddMember />} />
    <Route path="/edit-member" element={<EditMember />} />
    <Route path="/detail-member" element={<MemberDetail />} />
    <Route path="/member-point-history" element={<MemberPointHistory />} />

    <Route path="/member-tier" element={<MemberTier />} />
    <Route path="/add-member-tier" element={<AddMemberTier />} />
    <Route path="/edit-member-tier/:id" element={<EditMemberTier />} />
    <Route path="/detail-member-tier" element={<DetailMemberTier />} />

    <Route path="/discount-list" element={<DiscountList />} />
    <Route path="/add-discount" element={<AddDiscount />} />
    <Route path="/edit-discount" element={<EditDiscount />} />
    <Route path="/detail-discount" element={<DetailDiscount />} />

    <Route path="/type-payment-list" element={<TypePaymentList />} />
    <Route path="/add-type-payment" element={<AddTypePayment />} />
    <Route path="/edit-type-payment" element={<EditTypePayment />} />
    <Route path="/detail-type-payment" element={<DetailTypePayment />} />

    <Route path="/reservation" element={<ReservationList />} />
    <Route path="/add-reservation" element={<AddReservation />} />
    <Route path="/edit-reservation" element={<EditReservation />} />
    <Route path="/reservation/:id" element={<DetailReservation />} />

    <Route path="/member-loyalty" element={<MemberLoyalty />} />
  </>
);
