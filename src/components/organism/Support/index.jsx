import React from "react";
import SuperAdminTour from "../SuperAdminTour";
import FaqChat from "../FaqChat";
import { useCookies } from "react-cookie";
import { useLocation } from "react-router-dom";
import { PRIVACY_PATH } from "@/constants/routes";
import { readActiveSessionRole } from "@/lib/active-session";

const Support = () => {
  const notShowLocation = [
    "/",
    "/register",
    "/reset-password",
    "/login",
    "/forgot-password",
    "/home",
    PRIVACY_PATH
  ];

  const location = useLocation();
  const [cookies] = useCookies();
  const hasActiveSession = Boolean(readActiveSessionRole(cookies.user));

  return (
    <div className="space-y-6">
      {hasActiveSession && !notShowLocation.includes(location.pathname) && (
        <>
          <SuperAdminTour />
          <FaqChat />
        </>
      )}
    </div>
  );
};

export default Support;
