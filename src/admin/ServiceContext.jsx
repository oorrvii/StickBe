import { createContext, useContext } from "react";
import { createFirestoreOrderService } from "./orderService.js";
import { createFirestoreCatalogService } from "./catalogService.js";

export const OrderServiceContext = createContext(createFirestoreOrderService());
export const useOrderService = () => useContext(OrderServiceContext);

export const CatalogServiceContext = createContext(createFirestoreCatalogService());
export const useCatalogService = () => useContext(CatalogServiceContext);
