import StatusApiHandler from "../lib/handler/StatusApiHandler";

export default function handler(req, res) {
  StatusApiHandler.handle(req, res);
}