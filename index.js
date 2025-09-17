import IndexApiHandler from "./indexApiHandler.js";

export default function handler(req, res) {
  IndexApiHandler.handle(req, res);
}