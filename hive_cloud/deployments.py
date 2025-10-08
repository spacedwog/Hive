from vercel_client import VercelClient

class Deployments:
    def __init__(self, client: VercelClient):
        self.client = client

    def list_deployments(self, project_id=None):
        params = {"projectId": project_id} if project_id else None
        return self.client.get("/v13/deployments", params=params)

    def get_deployment(self, deployment_id):
        return self.client.get(f"/v13/deployments/{deployment_id}")