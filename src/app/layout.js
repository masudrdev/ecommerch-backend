import "./globals.css";
import ReduxProvider from "@/redux/provider";
import AuthLoader from "@/components/shared/AuthLoader";
import { Toaster } from "react-hot-toast";

export const metadata = {
  title: "FriendBazar",
  description: "Online shopping marketplace in Bangladesh",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        
        <ReduxProvider>
          <AuthLoader>
            {children}
            <Toaster position="top-center" />
          </AuthLoader>
        </ReduxProvider>
      </body>
    </html>
  );
}