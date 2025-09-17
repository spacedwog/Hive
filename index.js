import IndexApiHandler from "./lib/handler/indexApiHandler.js";

export default function handler(req, res) {
  IndexApiHandler.handle(req, res);
}