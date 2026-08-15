import { Suspense } from "react";
import VerifyResetOtpContent from "./VerifyResetOtpContent";

export default function VerifyResetOtpPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <VerifyResetOtpContent />
    </Suspense>
  );
}