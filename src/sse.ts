import { Request, Response } from "express";
import { Order, Product } from "./types";

// orderId null = abonne a tout, sinon seulement a sa commande
type Client = { res: Response; orderId: number | null };

const clients = new Set<Client>();
let lastId = 0;

function send(res: Response, id: number, event: string, data: string): void {
  res.write(`id: ${id}\nevent: ${event}\ndata: ${data}\n\n`);
}

export function subscribe(req: Request, res: Response, orderId: number | null): void {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  // B3 : le navigateur attend 5 s avant de se reconnecter
  res.write("retry: 5000\n\n");

  const client: Client = { res, orderId };
  clients.add(client);

  // B4 : un commentaire toutes les 20 s garde la connexion active
  const ping = setInterval(() => res.write(": ping\n\n"), 20000);

  req.on("close", () => {
    clearInterval(ping);
    clients.delete(client);
  });
}

export function sendOrder(event: string, order: Order): void {
  lastId++;
  const data = JSON.stringify(order);
  for (const client of clients) {
    if (client.orderId === null || client.orderId === order.id) {
      send(client.res, lastId, event, data);
    }
  }
}

export function sendStock(product: Product): void {
  lastId++;
  const data = JSON.stringify(product);
  for (const client of clients) {
    if (client.orderId === null) {
      send(client.res, lastId, "stock", data);
    }
  }
}
