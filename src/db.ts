import { JsonDB, Config } from "node-json-db";
import { User, Product, Order } from "./types";

type Data = {
  users: User[];
  products: Product[];
  orders: Order[];
};

const db = new JsonDB(new Config("data/db", true, true, "/"));

// donnees gardees en memoire, ecrites dans le fichier a chaque changement
export const data: Data = {
  users: [
    { id: 1, name: "Alice Martin", username: "alice", email: "alice@mail.com" },
    { id: 2, name: "Bob Durand", username: "bob", email: "bob@mail.com" },
  ],
  products: [
    { id: 1, name: "Clavier", stock: 10 },
    { id: 2, name: "Souris", stock: 5 },
    { id: 3, name: "Ecran", stock: 3 },
  ],
  orders: [],
};

export async function load(): Promise<void> {
  if (await db.exists("/users")) {
    data.users = await db.getObject<User[]>("/users");
    data.products = await db.getObject<Product[]>("/products");
    data.orders = await db.getObject<Order[]>("/orders");
  } else {
    await save();
  }
}

export async function save(): Promise<void> {
  await db.push("/", data);
}
