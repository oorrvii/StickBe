import { Navigate, useSearchParams } from "react-router-dom";
import { Spinner } from "../ui/index.js";
import { AuthForm } from "../CustomerAuth.jsx";
import { useAccount } from "../app/AccountContext.jsx";

export function safeNext(raw) {
  return raw && raw.startsWith("/") && !raw.startsWith("//") ? raw : "/account";
}

export default function SignInPage() {
  const { user, authChecked } = useAccount();
  const [params] = useSearchParams();
  const next = safeNext(params.get("next"));

  if (authChecked && user) return <Navigate to={next} replace />;

  return (
    <div className="sb-page sb-signin">
      <div className="sb-signin__intro">
        <p className="sb-eyebrow">Your account</p>
        <h1>Log in to save your picks.</h1>
        <p>
          You can browse and fill your cart without an account. Log in to keep your wishlist and delivery details on every device.
        </p>
      </div>
      {authChecked ? <AuthForm onDone={() => {}} /> : <div className="sb-signin__wait"><Spinner label="Checking your login" /></div>}
    </div>
  );
}
