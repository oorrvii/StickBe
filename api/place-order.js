import { getDb, verifyToken } from "./_lib/firebaseAdmin.js";
import { placeOrder } from "./_lib/placeOrder.js";
import { OrderError } from "./_lib/pricing.js";

export function createHandler({ getDb: db = getDb, verifyToken: verify = verifyToken } = {}) {
  return async function handler(req, res) {
    res.setHeader("Cache-Control", "no-store");
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      return res.status(405).json({ error: "METHOD_NOT_ALLOWED", message: "Use POST." });
    }
    try {
      let uid = null;
      const header = req.headers.authorization || "";
      if (header.startsWith("Bearer ")) {
        try {
          uid = (await verify(header.slice(7))).uid;
        } catch {
          throw new OrderError(401, "BAD_LOGIN", "Please log in again and retry.");
        }
      }
      const result = await placeOrder({ db: db(), body: req.body, uid });
      return res.status(200).json(result);
    } catch (err) {
      if (err instanceof OrderError) {
        return res.status(err.status).json({ error: err.code, message: err.message, ...err.extra });
      }
      console.error("place-order failed:", err);
      return res.status(500).json({ error: "SERVER_ERROR", message: "Something went wrong on our side. Please try again in a minute." });
    }
  };
}

export default createHandler();
