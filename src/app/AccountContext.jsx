import { createContext, useContext } from "react";
import { useCustomerAccount } from "../CustomerAuth.jsx";

export const AccountContext = createContext(null);

export function AccountProvider({ children }) {
  const value = useCustomerAccount();
  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}

export function useAccount() {
  return useContext(AccountContext);
}
