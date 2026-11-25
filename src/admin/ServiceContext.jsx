import { createContext, useContext } from "react";
import { createFirestoreOrderService } from "./orderService.js";

const defaultService = createFirestoreOrderService();
export const OrderServiceContext = createContext(defaultService);
export const useOrderService = () => useContext(OrderServiceContext);
