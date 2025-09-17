import os from "os";
import ApiResponse from "../lib/ApiResponse.js";
import IndexApiHandler from "../lib/IndexApiHandler.js";
import ProjectInfo from "../lib/ProjectInfo.js";

const apiResponse = new ApiResponse();
const projectInfo = new ProjectInfo(os, apiResponse);
const indexApiHandler = new IndexApiHandler(projectInfo, apiResponse);

export default function handler(req, res) {
  indexApiHandler.handle(req, res);
}