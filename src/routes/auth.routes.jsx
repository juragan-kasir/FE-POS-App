import React from "react";
import { Navigate, Route } from "react-router-dom";
import { LANDING_PATH, LOGIN_PATH, PRIVACY_PATH } from "@/constants/routes";
import { isPublicRegistrationEnabled } from "@/utils/publicRegistration";

const LandingPage = React.lazy(() => import("@/page/landing"));
const LoginPage = React.lazy(() => import("@/page/auth/login"));
const Register = React.lazy(() => import("@/page/auth/register"));
const ResetPassword = React.lazy(() => import("@/page/auth/reset-password"));
const PrivacyPage = React.lazy(() => import("@/page/privacy"));

export const authRoutes = (
  <>
    <Route path={LANDING_PATH} element={<LandingPage />} />
    <Route path={LOGIN_PATH} element={<LoginPage />} />
    {/* D-08: closed sign-up sends old links/bookmarks back to login. */}
    <Route
      path="/register"
      element={isPublicRegistrationEnabled() ? <Register /> : <Navigate to={LOGIN_PATH} replace />}
    />
    <Route path="/reset-password" element={<ResetPassword />} />
    <Route path={PRIVACY_PATH} element={<PrivacyPage />} />
  </>
);
