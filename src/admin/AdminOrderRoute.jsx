import { useParams } from "react-router-dom";
import AdminOrderDetail from "./AdminOrderDetail.jsx";

// The key makes a new order number start with fresh state.
export default function AdminOrderRoute() {
  const { orderNumber } = useParams();
  return <AdminOrderDetail key={orderNumber} orderNumber={orderNumber} />;
}
