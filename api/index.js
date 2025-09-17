import os from "os";
import IndexApiHandler from "./lib/handler/indexApiHandler.js";
import ProjectInfo from "./lib/project/projectInfo.js";
import ApiResponse from "./lib/response/apiResponse.js";

const apiResponse = new ApiResponse();
const projectInfo = new ProjectInfo(os, apiResponse);
const indexApiHandler = new IndexApiHandler(projectInfo, apiResponse);

export default function handler(req, res) {
  indexApiHandler.handle(req, res);
}