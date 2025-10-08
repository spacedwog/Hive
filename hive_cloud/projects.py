from vercel_client import VercelClient

class Projects:
    def __init__(self, client: VercelClient):
        self.client = client

    def list_projects(self):
        return self.client.get("/v9/projects")

    def get_project(self, project_id):
        return self.client.get(f"/v9/projects/{project_id}")