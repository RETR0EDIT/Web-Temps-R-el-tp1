import express, { Response } from "express";
import { data, load, save } from "./db";
import { Order, Status } from "./types";

const app = express();
app.use(express.json());
app.use(express.static("public"));

function error(res: Response, code: number, message: string): void {
  res.status(code).json({ error: message });
}

function isPositiveInt(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function findOrder(id: string): Order | undefined {
  return data.orders.find((o) => o.id === Number(id));
}

// statut suivant autorise pour chaque statut
const nextStatus: Record<Status, Status | null> = {
  preparing: "shipped",
  shipped: "delivered",
  delivered: null,
  cancelled: null,
};

async function setStatus(order: Order, status: Status): Promise<void> {
  order.status = status;
  await save();
  if (status === "shipped") {
    setTimeout(() => deliver(order.id), 20000);
  }
}

function deliver(id: number): void {
  const order = data.orders.find((o) => o.id === id);
  if (order && order.status === "shipped") {
    setStatus(order, "delivered");
  }
}

app.get("/users", (req, res) => {
  res.json(data.users);
});

app.get("/products", (req, res) => {
  res.json(data.products);
});

app.get("/orders", (req, res) => {
  res.json(data.orders);
});

app.get("/orders/:id", (req, res) => {
  const order = findOrder(req.params.id);
  if (!order) return error(res, 404, "Commande introuvable");
  res.json(order);
});

app.post("/orders", async (req, res) => {
  const body: Record<string, unknown> = req.body ?? {};
  const { userId, productId, quantity } = body;

  if (!isPositiveInt(userId) || !isPositiveInt(productId) || !isPositiveInt(quantity)) {
    return error(res, 400, "userId, productId et quantity doivent etre des entiers positifs");
  }
  if (!data.users.some((u) => u.id === userId)) {
    return error(res, 404, "Client introuvable");
  }
  const product = data.products.find((p) => p.id === productId);
  if (!product) return error(res, 404, "Produit introuvable");
  if (product.stock < quantity) return error(res, 409, "Stock insuffisant");

  product.stock -= quantity;
  const order: Order = {
    id: Math.max(0, ...data.orders.map((o) => o.id)) + 1,
    userId,
    productId,
    quantity,
    status: "preparing",
    createdAt: new Date().toISOString(),
  };
  data.orders.push(order);
  await save();
  res.status(201).json(order);
});

app.patch("/orders/:id/status", async (req, res) => {
  const order = findOrder(req.params.id);
  if (!order) return error(res, 404, "Commande introuvable");

  const body: Record<string, unknown> = req.body ?? {};
  const status = body.status;
  if (status !== "shipped" && status !== "delivered" && status !== "cancelled") {
    return error(res, 400, "status doit valoir shipped, delivered ou cancelled");
  }

  if (status === "cancelled") {
    if (order.status !== "preparing") {
      return error(res, 409, "Seule une commande en preparation peut etre annulee");
    }
    const product = data.products.find((p) => p.id === order.productId);
    if (product) product.stock += order.quantity;
  } else if (nextStatus[order.status] !== status) {
    return error(res, 409, `Passage de ${order.status} a ${status} interdit`);
  }

  await setStatus(order, status);
  res.json(order);
});

load().then(() => {
  // relance la livraison auto des commandes deja expediees
  for (const order of data.orders) {
    if (order.status === "shipped") setTimeout(() => deliver(order.id), 20000);
  }
  app.listen(3000, () => console.log("Serveur sur http://localhost:3000"));
});
