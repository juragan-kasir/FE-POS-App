import React from "react";
import { Route } from "react-router-dom";

import { RequireRole } from "@/components/ui/RequireRole";

// User / Admin
const AdminList = React.lazy(() => import("@/page/user/AdminList"));
const AddAdmin = React.lazy(() => import("@/page/user/AddAdmin"));
const AddRole = React.lazy(() => import("@/page/user/AddRole"));

// Role
const RoleManagement = React.lazy(() => import("@/page/role/RoleManagement"));
const EditRole = React.lazy(() => import("@/page/role/EditRole"));
const DetailRole = React.lazy(() => import("@/page/role/DetailRole"));

// Employee
const EmployeeList = React.lazy(() => import("@/page/employee/EmployeeList"));
const AddEmployee = React.lazy(() => import("@/page/employee/AddEmployee"));
const EditEmployee = React.lazy(() => import("@/page/employee/EditEmployee"));
const DetailEmployee = React.lazy(() => import("@/page/employee/DetailEmployee"));

// Position
const PositionList = React.lazy(() => import("@/page/position/PositionList"));
const AddPosition = React.lazy(() => import("@/page/position/AddPosition"));
const EditPosition = React.lazy(() => import("@/page/position/EditPosition"));
const DetailPosition = React.lazy(() => import("@/page/position/DetailPosition"));

// Department
const DepartmentList = React.lazy(() => import("@/page/department/DepartmentList"));
const AddDepartment = React.lazy(() => import("@/page/department/AddDepartment"));
const EditDepartment = React.lazy(() => import("@/page/department/EditDepartment"));
const DetailDepartment = React.lazy(() => import("@/page/department/DetailDepartment"));

// Shift
const ShiftList = React.lazy(() => import("@/page/shift/ShiftList"));
const AddShift = React.lazy(() => import("@/page/shift/AddShift"));
const EditShift = React.lazy(() => import("@/page/shift/EditShift"));
const DetailShift = React.lazy(() => import("@/page/shift/DetailShift"));
const MyShift = React.lazy(() => import("@/page/shift/MyShift"));

// Shift Template
const ShiftTemplateList = React.lazy(() => import("@/page/shift-template/ShiftTemplateList"));
const AddShiftTemplate = React.lazy(() => import("@/page/shift-template/AddShiftTemplate"));
const EditShiftTemplate = React.lazy(() => import("@/page/shift-template/EditShiftTemplate"));
const DetailShiftTemplate = React.lazy(() => import("@/page/shift-template/DetailShiftTemplate"));

// Overtime
const MyOvertime = React.lazy(() => import("@/page/overtime/MyOvertime"));
const OvertimeApproval = React.lazy(() => import("@/page/overtime/OvertimeApproval"));

export const hrRoutes = (
  <>
    <Route
      path="/user-list"
      element={
        <RequireRole roles={["super_admin", "admin"]}>
          <AdminList />
        </RequireRole>
      }
    />
    <Route
      path="/add-user"
      element={
        <RequireRole roles={["super_admin", "admin"]}>
          <AddAdmin />
        </RequireRole>
      }
    />
    <Route
      path="/add-role"
      element={
        <RequireRole roles={["super_admin"]}>
          <AddRole />
        </RequireRole>
      }
    />
    <Route
      path="/edit-role/:id"
      element={
        <RequireRole roles={["super_admin"]}>
          <EditRole />
        </RequireRole>
      }
    />
    <Route
      path="/detail-role/:id"
      element={
        <RequireRole roles={["super_admin"]}>
          <DetailRole />
        </RequireRole>
      }
    />
    <Route
      path="/role-management"
      element={
        <RequireRole roles={["super_admin"]}>
          <RoleManagement />
        </RequireRole>
      }
    />

    <Route
      path="/employee-list"
      element={
        <RequireRole roles={["super_admin", "admin"]}>
          <EmployeeList />
        </RequireRole>
      }
    />
    <Route
      path="/add-employee"
      element={
        <RequireRole roles={["super_admin", "admin"]}>
          <AddEmployee />
        </RequireRole>
      }
    />
    <Route
      path="/edit-employee"
      element={
        <RequireRole roles={["super_admin", "admin"]}>
          <EditEmployee />
        </RequireRole>
      }
    />
    <Route
      path="/detail-employee"
      element={
        <RequireRole roles={["super_admin", "admin"]}>
          <DetailEmployee />
        </RequireRole>
      }
    />

    <Route
      path="/position-list"
      element={
        <RequireRole roles={["super_admin", "admin"]}>
          <PositionList />
        </RequireRole>
      }
    />
    <Route
      path="/add-position"
      element={
        <RequireRole roles={["super_admin", "admin"]}>
          <AddPosition />
        </RequireRole>
      }
    />
    <Route
      path="/edit-position"
      element={
        <RequireRole roles={["super_admin", "admin"]}>
          <EditPosition />
        </RequireRole>
      }
    />
    <Route
      path="/detail-position"
      element={
        <RequireRole roles={["super_admin", "admin"]}>
          <DetailPosition />
        </RequireRole>
      }
    />

    <Route
      path="/department-list"
      element={
        <RequireRole roles={["super_admin", "admin"]}>
          <DepartmentList />
        </RequireRole>
      }
    />
    <Route
      path="/add-department"
      element={
        <RequireRole roles={["super_admin", "admin"]}>
          <AddDepartment />
        </RequireRole>
      }
    />
    <Route
      path="/edit-department"
      element={
        <RequireRole roles={["super_admin", "admin"]}>
          <EditDepartment />
        </RequireRole>
      }
    />
    <Route
      path="/detail-department"
      element={
        <RequireRole roles={["super_admin", "admin"]}>
          <DetailDepartment />
        </RequireRole>
      }
    />

    <Route
      path="/shift-list"
      element={
        <RequireRole roles={["super_admin", "admin"]}>
          <ShiftList />
        </RequireRole>
      }
    />
    <Route
      path="/add-shift"
      element={
        <RequireRole roles={["super_admin", "admin"]}>
          <AddShift />
        </RequireRole>
      }
    />
    <Route
      path="/edit-shift"
      element={
        <RequireRole roles={["super_admin", "admin"]}>
          <EditShift />
        </RequireRole>
      }
    />
    <Route
      path="/detail-shift"
      element={
        <RequireRole roles={["super_admin", "admin"]}>
          <DetailShift />
        </RequireRole>
      }
    />
    <Route path="/my-shift" element={<MyShift />} />

    <Route
      path="/shift-template-list"
      element={
        <RequireRole roles={["super_admin", "admin"]}>
          <ShiftTemplateList />
        </RequireRole>
      }
    />
    <Route
      path="/add-shift-template"
      element={
        <RequireRole roles={["super_admin", "admin"]}>
          <AddShiftTemplate />
        </RequireRole>
      }
    />
    <Route
      path="/edit-shift-template"
      element={
        <RequireRole roles={["super_admin", "admin"]}>
          <EditShiftTemplate />
        </RequireRole>
      }
    />
    <Route
      path="/detail-shift-template"
      element={
        <RequireRole roles={["super_admin", "admin"]}>
          <DetailShiftTemplate />
        </RequireRole>
      }
    />

    <Route path="/my-overtime" element={<MyOvertime />} />
    <Route
      path="/overtime-approval"
      element={
        <RequireRole roles={["super_admin", "admin"]}>
          <OvertimeApproval />
        </RequireRole>
      }
    />
  </>
);
