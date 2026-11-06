import { Request, Response } from "express";
import { Order, Product } from "./types";

// orderId null = abonne a tout, sinon seulement a sa commande
type Client = { res: Response; orderId: number | null };

// evenement de commande garde pour le rattrapage apres coupure
type SavedEvent = { id: number; event: string; order: Order };

const clients = new Set<Client>();
const history: SavedEvent[] = [];
// part de l heure actuelle pour rester croissant apres un redemarrage
let lastId = Date.now();

function send(res: Response, id: number, event: string, data: string): void {
  res.write(`id: ${id}\nevent: ${event}\ndata: ${data}\n\n`);
}

function isFinished(order: Order): boolean {
  return order.status === "delivered" || order.status === "cancelled";
}

export function subscribe(req: Request, res: Response, orderId: number | null): void {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  // B3 : le navigateur attend 5 s avant de se reconnecter
  res.write("retry: 5000\n\n");

  // B1 : renvoie les evenements de la commande manques pendant la coupure
  const lastEventId = Number(req.header("Last-Event-ID"));
  if (orderId !== null && lastEventId) {
    for (const saved of history) {
      if (saved.order.id === orderId && saved.id > lastEventId) {
        send(res, saved.id, saved.event, JSON.stringify(saved.order));
        if (isFinished(saved.order)) {
          res.end();
          return;
        }
      }
    }
  }

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
  // copie : la commande peut encore changer ensuite
  history.push({ id: lastId, event, order: { ...order } });

  const data = JSON.stringify(order);
  for (const client of clients) {
    if (client.orderId === null || client.orderId === order.id) {
      send(client.res, lastId, event, data);
      // B2 : le flux de suivi se termine quand la commande est finie
      if (client.orderId !== null && isFinished(order)) {
        client.res.end();
      }
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
