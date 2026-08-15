import { Suspense } from "react";
import WriteReviewContent from "./WriteReviewContent";

export default function WriteReviewPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <WriteReviewContent />
    </Suspense>
  );
}